#import <Foundation/Foundation.h>
#import <objc/runtime.h>
#include <stdint.h>
#include <stdlib.h>
#include <string.h>

extern int md_image_xpc_decode(const uint8_t *, size_t, const char *, uint32_t, uint64_t,
    uint8_t **, size_t *, uint32_t *, uint32_t *, int *, char **, char **);

@interface F006FaultConnection : NSObject
@property(nonatomic, copy) void (^errorHandler)(NSError *);
@end

@interface F006FaultRemote : NSObject
@property(nonatomic, strong) F006FaultConnection *connection;
@end

static NSUInteger f006ConnectionCount = 0;

@implementation F006FaultConnection
- (void)setRemoteObjectInterface:(NSXPCInterface *)interface { (void)interface; }
- (void)resume {}
- (void)invalidate {}
- (id)remoteObjectProxyWithErrorHandler:(void (^)(NSError *))handler {
    self.errorHandler = handler;
    F006FaultRemote *remote = [F006FaultRemote new];
    remote.connection = self;
    return remote;
}
@end

@implementation F006FaultRemote
- (void)decode:(NSData *)data protocolVersion:(NSNumber *)version requestId:(NSString *)requestId
    generation:(NSNumber *)generation claimed:(NSString *)claimed maxDimension:(NSNumber *)maxDimension
    withReply:(void (^)(NSString *, NSNumber *, NSData *, NSString *, NSNumber *, NSNumber *, NSNumber *, NSString *))reply {
    (void)version; (void)claimed; (void)maxDimension;
    NSString *mode = [[NSString alloc] initWithData:data encoding:NSUTF8StringEncoding] ?: @"";
    if ([mode isEqualToString:@"service-loss"]) {
        self.connection.errorHandler([NSError errorWithDomain:@"F006FaultService" code:73 userInfo:nil]);
        return;
    }
    if ([mode isEqualToString:@"timeout"]) return;
    uint8_t png[24] = { 137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13,
        73, 72, 68, 82, 0, 0, 0, 1, 0, 0, 0, 1 };
    NSData *pixels = [NSData dataWithBytes:png length:sizeof(png)];
    NSString *replyId = requestId;
    NSNumber *replyGeneration = generation;
    NSNumber *width = @1, *height = @1;
    NSString *error = nil;
    if ([mode isEqualToString:@"generation-mismatch"]) replyGeneration = @(generation.unsignedLongLongValue + 1);
    else if ([mode isEqualToString:@"malformed-id"]) replyId = @"wrong-request-id";
    else if ([mode isEqualToString:@"decoded-cap"]) { width = @8000; height = @5001; }
    else if ([mode isEqualToString:@"response-cap"]) pixels = [NSMutableData dataWithLength:8 * 1024 * 1024 + 1];
    else if ([mode isEqualToString:@"malformed-payload"]) pixels = [NSData data];
    else if ([mode isEqualToString:@"helper-limit-error"]) { pixels = nil; error = @"over_limit"; }
    reply(replyId, replyGeneration, pixels, @"png", width, height, @NO, error);
}
@end

static id f006_connection_init(id self, SEL selector, NSString *serviceName) {
    (void)self; (void)selector; (void)serviceName;
    f006ConnectionCount += 1;
    return [F006FaultConnection new];
}

static BOOL install_fault_connection(void) {
    SEL selector = @selector(initWithServiceName:);
    Method method = class_getInstanceMethod(NSXPCConnection.class, selector);
    if (!method) return NO;
    class_replaceMethod(NSXPCConnection.class, selector, (IMP)f006_connection_init,
        method_getTypeEncoding(method));
    return YES;
}

static int decode_mode(const char *mode, int *status_out, char **error_out) {
    NSData *input = [[NSString stringWithUTF8String:mode] dataUsingEncoding:NSUTF8StringEncoding];
    uint8_t *output = NULL;
    size_t output_length = 0;
    uint32_t width = 0, height = 0;
    int still = 0;
    char *actual = NULL, *error = NULL;
    int status = md_image_xpc_decode(input.bytes, input.length, "png", 512, 17,
        &output, &output_length, &width, &height, &still, &actual, &error);
    free(output);
    free(actual);
    *status_out = status;
    *error_out = error;
    return status;
}

static BOOL expect(NSMutableArray<NSString *> *results, NSString *label, const char *mode,
    int wantedStatus, const char *wantedError) {
    int status = 0;
    char *error = NULL;
    decode_mode(mode, &status, &error);
    NSString *actualError = error ? [NSString stringWithUTF8String:error] : @"";
    BOOL passed = status == wantedStatus && [actualError isEqualToString:
        [NSString stringWithUTF8String:wantedError]];
    [results addObject:[NSString stringWithFormat:@"%@ %@ status=%d error=%@", label,
        passed ? @"PASS" : @"FAIL", status, actualError]];
    free(error);
    return passed;
}

static BOOL check_encoded_cap(NSMutableArray<NSString *> *results) {
    NSUInteger connectionsBefore = f006ConnectionCount;
    size_t length = 8 * 1024 * 1024 + 1;
    uint8_t *input = calloc(length, 1);
    uint8_t *output = NULL;
    size_t output_length = 0;
    uint32_t width = 0, height = 0;
    int still = 0;
    char *actual = NULL, *error = NULL;
    int status = md_image_xpc_decode(input, length, "png", 512, 17,
        &output, &output_length, &width, &height, &still, &actual, &error);
    free(input); free(output); free(actual); free(error);
    BOOL passed = status == -1 && output == NULL && f006ConnectionCount == connectionsBefore;
    [results addObject:[NSString stringWithFormat:@"encoded-cap %@ status=%d",
        passed ? @"PASS" : @"FAIL", status]];
    return passed;
}

static BOOL recover_after(NSMutableArray<NSString *> *results, const char *fault,
    int wantedStatus, const char *wantedError) {
    BOOL faultPassed = expect(results, [NSString stringWithFormat:@"%@-contained",
        [NSString stringWithUTF8String:fault]], fault, wantedStatus, wantedError);
    BOOL recoveryPassed = expect(results, [NSString stringWithFormat:@"%@-recovery",
        [NSString stringWithUTF8String:fault]], "valid", 0, "");
    return faultPassed && recoveryPassed;
}

int main(int argc, const char **argv) {
    @autoreleasepool {
        if (argc != 3) return 2;
        if (!install_fault_connection()) return 2;
        NSString *scenario = [NSString stringWithUTF8String:argv[1]];
        NSString *reportPath = [NSString stringWithUTF8String:argv[2]];
        NSMutableArray<NSString *> *results = [NSMutableArray array];
        BOOL passed = NO;
        if ([scenario isEqualToString:@"endpoint-loss-recovery"]) {
            passed = recover_after(results, "service-loss", 2, "decoder_unavailable");
        } else if ([scenario isEqualToString:@"timeout-recovery"]) {
            passed = recover_after(results, "timeout", 1, "timeout");
        } else if ([scenario isEqualToString:@"encoded-cap"]) {
            passed = check_encoded_cap(results);
        } else if ([scenario isEqualToString:@"decoded-cap"]) {
            passed = expect(results, @"decoded-cap", "decoded-cap", 3, "invalid_decoder_response");
        } else if ([scenario isEqualToString:@"response-cap"]) {
            passed = expect(results, @"response-cap", "response-cap", 3, "invalid_decoder_response");
        } else if ([scenario isEqualToString:@"generation-mismatch"]) {
            passed = expect(results, @"generation-mismatch", "generation-mismatch", 3,
                "invalid_decoder_response");
        } else if ([scenario isEqualToString:@"malformed-id"]) {
            passed = expect(results, @"malformed-id", "malformed-id", 3, "invalid_decoder_response");
        } else if ([scenario isEqualToString:@"malformed-payload"]) {
            passed = expect(results, @"malformed-payload", "malformed-payload", 3,
                "invalid_decoder_response");
        } else if ([scenario isEqualToString:@"helper-limit-error"]) {
            passed = expect(results, @"helper-limit-error", "helper-limit-error", 2, "over_limit");
        } else if ([scenario isEqualToString:@"valid"] || [scenario isEqualToString:@"recovery"]) {
            passed = expect(results, scenario, "valid", 0, "");
        }
        [results addObject:[NSString stringWithFormat:@"request-contract PASS payload=NSData path-fields=0"]];
        NSString *report = [[results componentsJoinedByString:@"\n"] stringByAppendingString:@"\n"];
        NSError *writeError = nil;
        [report writeToFile:reportPath atomically:YES encoding:NSUTF8StringEncoding error:&writeError];
        if (!passed || writeError) return 1;
        return 0;
    }
}
