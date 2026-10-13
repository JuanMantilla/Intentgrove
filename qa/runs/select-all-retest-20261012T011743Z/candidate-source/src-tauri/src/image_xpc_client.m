#import <Foundation/Foundation.h>
#import <dispatch/dispatch.h>
#include <stdint.h>
#include <stdlib.h>
#include <string.h>


@protocol MDImageDecoderProtocol
- (void)decode:(NSData *)data protocolVersion:(NSNumber *)version requestId:(NSString *)requestId
    generation:(NSNumber *)generation claimed:(NSString *)claimed maxDimension:(NSNumber *)maxDimension
    withReply:(void (^)(NSString *replyId, NSNumber *replyGeneration, NSData *pixels, NSString *actual, NSNumber *width,
                         NSNumber *height, NSNumber *still, NSString *error))reply;
- (void)decodeTile:(NSData *)data protocolVersion:(NSNumber *)version requestId:(NSString *)requestId
    generation:(NSNumber *)generation claimed:(NSString *)claimed x:(NSNumber *)x y:(NSNumber *)y
    size:(NSNumber *)size withReply:(void (^)(NSString *replyId, NSNumber *replyGeneration, NSData *pixels, NSString *actual,
                                              NSNumber *width, NSNumber *height,
                                              NSString *error))reply;
@end

// Returns bounded inert PNG bytes. No file path or URL crosses this interface.
int md_image_xpc_decode(const uint8_t *input, size_t input_length, const char *format,
    uint32_t max_dimension, uint64_t generation, uint8_t **output, size_t *output_length,
    uint32_t *width, uint32_t *height, int *still, char **actual, char **error) {
    if (!input || !format || !output || !output_length || !width || !height || !still
        || !actual || !error || !input_length || input_length > 8 * 1024 * 1024) return -1;
    *output = NULL; *output_length = 0; *width = 0; *height = 0;
    *still = 0; *actual = NULL; *error = NULL;
    @autoreleasepool {
        NSXPCConnection *connection = [[NSXPCConnection alloc]
            initWithServiceName:@"com.juanmantilla.markdownworkspace.ImageDecoder"];
        connection.remoteObjectInterface = [NSXPCInterface interfaceWithProtocol:@protocol(MDImageDecoderProtocol)];
        [connection resume];
        dispatch_semaphore_t signal = dispatch_semaphore_create(0);
        __block NSData *received = nil;
        __block NSString *receivedId = nil;
        __block NSNumber *receivedGeneration = nil;
        __block NSString *receivedFormat = nil;
        __block NSNumber *receivedWidth = nil;
        __block NSNumber *receivedHeight = nil;
        __block NSNumber *receivedStill = nil;
        __block NSString *receivedError = nil;
        __block BOOL completed = NO;
        NSString *requestId = [NSUUID UUID].UUIDString;
        id<MDImageDecoderProtocol> remote = [connection remoteObjectProxyWithErrorHandler:^(NSError *failure) {
            (void)failure;
            @synchronized (connection) {
                if (completed) return;
                completed = YES;
                receivedError = @"decoder_unavailable";
                dispatch_semaphore_signal(signal);
            }
        }];
        [remote decode:[NSData dataWithBytes:input length:input_length]
       protocolVersion:@1 requestId:requestId generation:@(generation)
               claimed:[NSString stringWithUTF8String:format] maxDimension:@(max_dimension)
             withReply:^(NSString *replyId, NSNumber *replyGeneration, NSData *pixels,
                         NSString *actualFormat, NSNumber *w, NSNumber *h,
                         NSNumber *isStill, NSString *failure) {
            @synchronized (connection) {
                if (completed) return;
                completed = YES;
                receivedId = replyId;
                receivedGeneration = replyGeneration;
                received = pixels;
                receivedFormat = actualFormat;
                receivedWidth = w;
                receivedHeight = h;
                receivedStill = isStill;
                receivedError = failure;
                dispatch_semaphore_signal(signal);
            }
        }];
        long timedOut = dispatch_semaphore_wait(signal,
            dispatch_time(DISPATCH_TIME_NOW, 5000 * NSEC_PER_MSEC));
        [connection invalidate];
        if (timedOut) { *error = strdup("timeout"); return 1; }
        if (receivedError) { *error = strdup(receivedError.UTF8String); return 2; }
        if (![receivedId isEqualToString:requestId]
            || receivedGeneration.unsignedLongLongValue != generation
            || !received || received.length == 0 || received.length > 8 * 1024 * 1024
            || !receivedFormat || !receivedWidth || !receivedHeight
            || receivedWidth.unsignedLongLongValue == 0 || receivedHeight.unsignedLongLongValue == 0
            || receivedWidth.unsignedLongLongValue * receivedHeight.unsignedLongLongValue > 40000000) {
            *error = strdup("invalid_decoder_response"); return 3;
        }
        uint8_t *copy = malloc(received.length);
        if (!copy) { *error = strdup("memory_limit"); return 4; }
        memcpy(copy, received.bytes, received.length);
        *output = copy;
        *output_length = received.length;
        *width = receivedWidth.unsignedIntValue;
        *height = receivedHeight.unsignedIntValue;
        *still = receivedStill.boolValue ? 1 : 0;
        *actual = strdup(receivedFormat.UTF8String);
        if (!*actual) { free(copy); *output = NULL; *error = strdup("memory_limit"); return 4; }
        return 0;
    }
}

int md_image_xpc_decode_tile(const uint8_t *input, size_t input_length, const char *format,
    uint32_t x, uint32_t y, uint64_t generation, uint8_t **output, size_t *output_length,
    uint32_t *width, uint32_t *height, char **actual, char **error) {
    if (!input || !format || !output || !output_length || !width || !height || !actual || !error
        || !input_length || input_length > 8 * 1024 * 1024) return -1;
    *output = NULL; *output_length = 0; *width = 0; *height = 0; *actual = NULL; *error = NULL;
    @autoreleasepool {
        NSXPCConnection *connection = [[NSXPCConnection alloc]
            initWithServiceName:@"com.juanmantilla.markdownworkspace.ImageDecoder"];
        connection.remoteObjectInterface = [NSXPCInterface interfaceWithProtocol:@protocol(MDImageDecoderProtocol)];
        [connection resume];
        dispatch_semaphore_t signal = dispatch_semaphore_create(0);
        __block NSData *received = nil;
        __block NSString *receivedId = nil;
        __block NSNumber *receivedGeneration = nil;
        __block NSString *receivedFormat = nil;
        __block NSNumber *receivedWidth = nil, *receivedHeight = nil;
        __block NSString *receivedError = nil;
        __block BOOL completed = NO;
        NSString *requestId = [NSUUID UUID].UUIDString;
        id<MDImageDecoderProtocol> remote = [connection remoteObjectProxyWithErrorHandler:^(NSError *failure) {
            (void)failure;
            @synchronized (connection) {
                if (completed) return;
                completed = YES; receivedError = @"decoder_unavailable";
                dispatch_semaphore_signal(signal);
            }
        }];
        [remote decodeTile:[NSData dataWithBytes:input length:input_length]
           protocolVersion:@1 requestId:requestId generation:@(generation)
                   claimed:[NSString stringWithUTF8String:format] x:@(x) y:@(y) size:@1024
                 withReply:^(NSString *replyId, NSNumber *replyGeneration, NSData *pixels,
                             NSString *actualFormat, NSNumber *w,
                             NSNumber *h, NSString *failure) {
            @synchronized (connection) {
                if (completed) return;
                completed = YES; receivedId = replyId; receivedGeneration = replyGeneration;
                received = pixels; receivedFormat = actualFormat;
                receivedWidth = w; receivedHeight = h; receivedError = failure;
                dispatch_semaphore_signal(signal);
            }
        }];
        long timedOut = dispatch_semaphore_wait(signal,
            dispatch_time(DISPATCH_TIME_NOW, 5000 * NSEC_PER_MSEC));
        [connection invalidate];
        if (timedOut) { *error = strdup("timeout"); return 1; }
        if (receivedError) { *error = strdup(receivedError.UTF8String); return 2; }
        if (![receivedId isEqualToString:requestId]
            || receivedGeneration.unsignedLongLongValue != generation
            || !received || received.length < 24 || received.length > 8 * 1024 * 1024
            || !receivedFormat || !receivedWidth || !receivedHeight
            || !receivedWidth.unsignedIntValue || !receivedHeight.unsignedIntValue
            || receivedWidth.unsignedIntValue > 1024 || receivedHeight.unsignedIntValue > 1024) {
            *error = strdup("invalid_decoder_response"); return 3;
        }
        uint8_t *copy = malloc(received.length);
        if (!copy) { *error = strdup("memory_limit"); return 4; }
        memcpy(copy, received.bytes, received.length);
        *output = copy; *output_length = received.length;
        *width = receivedWidth.unsignedIntValue; *height = receivedHeight.unsignedIntValue;
        *actual = strdup(receivedFormat.UTF8String);
        if (!*actual) { free(copy); *output = NULL; *error = strdup("memory_limit"); return 4; }
        return 0;
    }
}
