// Adapter/policy tests: no real workspace setter, prompt, or preference writes.
#import "../../src-tauri/src/default_markdown.m"
#include <assert.h>
@interface FakeBundle : NSObject
@property NSString *bundleIdentifier;
@property NSURL *bundleURL;
@property NSURL *executableURL;
@property NSDictionary *infoDictionary;
@end
@implementation FakeBundle
@end
@interface FakeWorkspace : NSObject <IGMarkdownWorkspace>
@property NSMutableDictionary<NSString *, NSURL *> *handlers;
@property NSMutableArray<NSString *> *writes;
@property NSString *failType;
@property BOOL mismatch;
@property NSInteger delayedReads;
@property NSURL *pendingHandler;
@end
@implementation FakeWorkspace
- (instancetype)init { if ((self=[super init])) { _handlers=[NSMutableDictionary new]; _writes=[NSMutableArray new]; } return self; }
- (NSURL *)URLForApplicationToOpenContentType:(UTType *)type {
    if (self.pendingHandler && --self.delayedReads <= 0) { self.handlers[type.identifier]=self.pendingHandler;self.pendingHandler=nil; }
    return self.handlers[type.identifier];
}
- (void)setDefaultApplicationAtURL:(NSURL *)url toOpenContentType:(UTType *)type completionHandler:(void (^)(NSError *))completion {
    assert([NSThread isMainThread]); [self.writes addObject:type.identifier];
    BOOL denied=[type.identifier isEqual:self.failType];
    if (!denied && !self.mismatch) { if (self.delayedReads>0) self.pendingHandler=url; else self.handlers[type.identifier]=url; }
    dispatch_async(dispatch_get_global_queue(QOS_CLASS_DEFAULT,0), ^{
        completion(denied ? [NSError errorWithDomain:NSCocoaErrorDomain code:NSUserCancelledError userInfo:nil] : nil);
    });
}
@end
static NSInteger Run(FakeWorkspace *w, NSArray *types, NSURL *target, NSUInteger *errorCount) {
    __block BOOL done=NO; __block NSInteger result=-99; __block NSUInteger count=0;
    IGRequest(w,target,[[NSOrderedSet orderedSetWithArray:types] array],0,[NSMutableArray new], ^{return types;}, ^(NSInteger matches,NSArray *errors) {
        assert([NSThread isMainThread]); result=matches;count=errors.count;done=YES;
    });
    NSDate *deadline=[NSDate dateWithTimeIntervalSinceNow:2];
    while (!done && deadline.timeIntervalSinceNow>0) [[NSRunLoop mainRunLoop] runMode:NSDefaultRunLoopMode beforeDate:[NSDate dateWithTimeIntervalSinceNow:.01]];
    assert(done); *errorCount=count; return result;
}
int main(int argc, const char **argv) { @autoreleasepool {
    if (argc>1 && !strcmp(argv[1],"--snapshot")) {
        NSMutableDictionary *record=[NSMutableDictionary new];
        for (NSString *ext in @[@"md",@"markdown",@"html",@"txt"]) {
            UTType *t=[UTType typeWithFilenameExtension:ext];
            NSURL *url=t ? [[NSWorkspace sharedWorkspace] URLForApplicationToOpenContentType:t] : nil;
            record[ext]=@{@"type":t.identifier ?: @"unknown",@"handler":url.path ?: @"unknown"};
        }
        NSData *data=[NSJSONSerialization dataWithJSONObject:record options:NSJSONWritingSortedKeys error:nil];
        puts([[NSString alloc] initWithData:data encoding:NSUTF8StringEncoding].UTF8String);return 0;
    }
    UTType *md=[UTType typeWithIdentifier:@"net.daringfireball.markdown"];
    assert(IGSpecificType(md));
    for (UTType *t in @[UTTypeHTML,UTTypePlainText,UTTypeText,[UTType typeWithIdentifier:@"dyn.fake"]]) assert(!IGSpecificType(t));
    assert(!IGSpecificType(nil));
    assert(!IGEligible(NSBundle.mainBundle)); assert(ig_default_markdown_cli(false)==4);
    FakeBundle *bundle=[FakeBundle new];bundle.bundleIdentifier=IGDomain;
    bundle.bundleURL=[NSURL fileURLWithPath:@"/tmp/Intentgrove.app"];
    bundle.executableURL=[NSURL fileURLWithPath:@"/tmp/Intentgrove.app/Contents/MacOS/md_reader"];
    bundle.infoDictionary=@{@"IGMarkdownDefaultConsent":@YES};assert(IGEligible((id)bundle));
    bundle.bundleIdentifier=@"com.juanmantilla.markdownworkspace.qa";assert(!IGEligible((id)bundle));bundle.bundleIdentifier=IGDomain;
    bundle.infoDictionary=@{};assert(!IGEligible((id)bundle));bundle.infoDictionary=@{@"IGMarkdownDefaultConsent":@YES};
    bundle.executableURL=[NSURL fileURLWithPath:@"/tmp/outside"];assert(!IGEligible((id)bundle));
    bundle.executableURL=[NSURL fileURLWithPath:@"/tmp/Intentgrove.app/Contents/MacOS/md_reader"];
    setenv("INTENTGROVE_DISABLE_DEFAULT_MARKDOWN","1",1);assert(!IGEligible((id)bundle));unsetenv("INTENTGROVE_DISABLE_DEFAULT_MARKDOWN");
    assert(IGShouldCheck(YES,YES,NO,YES));
    for (int n=0;n<4;n++) { BOOL v[]={YES,YES,NO,YES}; v[n]=!v[n]; assert(!IGShouldCheck(v[0],v[1],v[2],v[3])); }
    assert(!IGRemember(^{return NO;}) && IGAttempted);
    assert(!IGShouldCheck(YES,YES,IGAttempted,YES)); IGAttempted=NO;
    assert(IGRemember(^{return YES;}) && IGAttempted); IGAttempted=NO;
    assert(IGConsented(NSAlertFirstButtonReturn));
    for (NSNumber *r in @[@(NSAlertSecondButtonReturn),@(NSModalResponseCancel),@(NSModalResponseAbort),@(NSModalResponseStop)]) assert(!IGConsented(r.longValue));
    NSURL *target=[NSURL fileURLWithPath:@"/tmp/Intentgrove.app"];
    NSURL *other=[NSURL fileURLWithPath:@"/tmp/other/Intentgrove.app"];
    FakeWorkspace *w=[FakeWorkspace new];NSArray *same=@[md,md];NSUInteger errors;
    assert(IGMatches(w,same,target)==-1);
    w.handlers[md.identifier]=other; assert(IGMatches(w,same,target)==0);
    assert(Run(w,same,target,&errors)==2 && !errors && w.writes.count==1);
    [w.writes removeAllObjects]; w.handlers[md.identifier]=other;w.failType=md.identifier;
    assert(Run(w,same,target,&errors)==0 && errors==1 && w.writes.count==1);
    // Simulate a response, then a fresh launch after an external default switch.
    IGAttempted=YES; assert(!IGShouldCheck(YES,YES,IGAttempted,YES));
    IGAttempted=NO; assert(IGShouldCheck(YES,YES,IGAttempted,YES));
    assert(IGMatches(w,same,target)==0); // Must offer again despite prior response.
    assert(IGConsented(NSAlertFirstButtonReturn) && !IGConsented(NSAlertSecondButtonReturn));
    w.handlers[md.identifier]=target; assert(IGMatches(w,same,target)==2); // Skip prompt.
    w.handlers[md.identifier]=other;
    w.failType=nil;w.mismatch=YES;[w.writes removeAllObjects];
    assert(Run(w,same,target,&errors)==0 && errors==0 && w.writes.count==1);
    NSDictionary *diagnostic=IGDiagnostic(w,same,target);
    assert([diagnostic[@"extensions"][@"md"][@"handler"] isEqual:other.path]);
    assert([IGDiagnosticText(diagnostic,NO) containsString:other.path]);
    assert([IGDiagnosticText(diagnostic,YES) containsString:@"App solicitada"]);
    w.mismatch=NO;w.delayedReads=4;[w.writes removeAllObjects];
    assert(Run(w,same,target,&errors)==2 && errors==0 && w.writes.count==1); // read retries only
    w.delayedReads=0;w.pendingHandler=nil;
    // Distinct modeled Markdown types exercise partial completion, without registration.
    UTType *second=[UTType exportedTypeWithIdentifier:@"com.intentgrove.tests.markdown" conformingToType:UTTypePlainText];NSArray *different=@[md,second];w.mismatch=NO;
    w.handlers[second.identifier]=other;w.failType=second.identifier;[w.writes removeAllObjects];
    assert(Run(w,different,target,&errors)==1 && errors==1 && w.writes.count==2);
    [w.handlers removeObjectForKey:second.identifier];
    assert(IGMatches(w,different,target)==-2);
    assert(IGMatches(w,nil,target)==-1);
    assert([IGDiagnosticText(IGDiagnostic([FakeWorkspace new],nil,target),NO) containsString:@"Could not determine"]);
    NSURL *fixture=[NSURL fileURLWithPath:[NSTemporaryDirectory() stringByAppendingPathComponent:[NSString stringWithFormat:@"ig-duplicate-%@.app",NSUUID.UUID.UUIDString]]];
    NSURL *contents=[fixture URLByAppendingPathComponent:@"Contents"];
    assert([[NSFileManager defaultManager] createDirectoryAtURL:contents withIntermediateDirectories:YES attributes:nil error:nil]);
    assert(([@{@"CFBundleIdentifier":IGDomain,@"CFBundlePackageType":@"APPL"} writeToURL:[contents URLByAppendingPathComponent:@"Info.plist"] atomically:YES]));
    w.handlers[md.identifier]=fixture;
    diagnostic=IGDiagnostic(w,same,target);
    assert([diagnostic[@"extensions"][@"md"][@"different_copy_of_intentgrove"] boolValue]);
    assert([IGDiagnosticText(diagnostic,NO) containsString:@"different copy of Intentgrove"]);
    assert([[NSFileManager defaultManager] removeItemAtURL:fixture error:nil]);

    puts("PASS: diagnostics, delayed verification reads with one write,  narrow types, exact URL, unavailable defaults, per-launch readiness/process gates and external default switches, explicit choices, async main-queue completion, duplicate dedupe, denial, mismatch, partial outcomes, disabled CLI. Mock adapter only.");
} return 0; }
