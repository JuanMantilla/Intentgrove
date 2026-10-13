#import <Cocoa/Cocoa.h>
#import <UniformTypeIdentifiers/UniformTypeIdentifiers.h>
#import <CoreFoundation/CoreFoundation.h>
#include <sys/file.h>
#include <sys/stat.h>
#include <fcntl.h>
#include <unistd.h>

// No renderer-provided type, target URL, or association write capability.
static NSString *const IGDomain = @"com.juanmantilla.markdownworkspace";
static NSString *const IGAnswered = @"MarkdownDefaultPromptAnsweredV1";
static NSString *const IGLanguage = @"MarkdownDefaultPromptLanguageV1";
static BOOL IGEnabled, IGReady, IGAttempted;
static __weak NSWindow *IGWindow;
static NSTimer *IGTimer;
static int IGLock = -1;
static NSString *IGCopy(BOOL es, NSString *en, NSString *spanish) { return es ? spanish : en; }
static BOOL IGSpanish(void) {
    id value = CFBridgingRelease(CFPreferencesCopyAppValue((__bridge CFStringRef)IGLanguage, (__bridge CFStringRef)IGDomain));
    if ([value isEqual:@"es"]) return YES;
    if ([value isEqual:@"en"]) return NO;
    return [[[NSLocale preferredLanguages] firstObject] hasPrefix:@"es"];
}
static BOOL IGSave(NSString *key, id value) {
    CFPreferencesSetAppValue((__bridge CFStringRef)key, (__bridge CFPropertyListRef)value, (__bridge CFStringRef)IGDomain);
    return CFPreferencesAppSynchronize((__bridge CFStringRef)IGDomain);
}
static BOOL IGEligible(NSBundle *bundle) {
    NSURL *executable = bundle.executableURL.URLByResolvingSymlinksInPath;
    NSURL *root = bundle.bundleURL.URLByResolvingSymlinksInPath;
    return [bundle.bundleIdentifier isEqual:IGDomain]
        && [root.pathExtension isEqual:@"app"]
        && [bundle.infoDictionary[@"IGMarkdownDefaultConsent"] isEqual:@YES]
        && [executable.URLByDeletingLastPathComponent.path isEqual:[root.path stringByAppendingPathComponent:@"Contents/MacOS"]]
        && !getenv("INTENTGROVE_DISABLE_DEFAULT_MARKDOWN")
        && !getenv("INTENTGROVE_QA_DATA_DIR") && !getenv("MD_READER_QA_DIR");
}
// Fail closed on broad, HTML, dynamic, unknown or conflicting extension types.
static BOOL IGSpecificType(UTType *type) {
    return type && !type.dynamic && [type.identifier isEqual:@"net.daringfireball.markdown"];
}
static NSArray<UTType *> *IGTypes(void) {
    NSMutableArray *types = [NSMutableArray array];
    for (NSString *ext in @[@"md", @"markdown"]) {
        UTType *type = [UTType typeWithFilenameExtension:ext];
        if (!IGSpecificType(type)) return nil;
        [types addObject:type];
    }
    return types;
}
@protocol IGMarkdownWorkspace <NSObject>
- (NSURL *)URLForApplicationToOpenContentType:(UTType *)type;
- (void)setDefaultApplicationAtURL:(NSURL *)url toOpenContentType:(UTType *)type completionHandler:(void (^)(NSError *))completion;
@end
static NSInteger IGMatches(id<IGMarkdownWorkspace> workspace, NSArray<UTType *> *types, NSURL *target) {
    if (types.count != 2) return -1;
    NSInteger matches = 0; BOOL unknown = NO;
    for (UTType *type in types) {
        NSURL *handler = [workspace URLForApplicationToOpenContentType:type];
        if (!handler) { unknown = YES; continue; }
        if ([handler.URLByResolvingSymlinksInPath.path isEqual:target.URLByResolvingSymlinksInPath.path]) ++matches;
    }
    return unknown ? (matches > 0 ? -2 : -1) : matches;
}
// Read-only evidence: distinguish a different copy of this app from unknown status.
static NSDictionary *IGDiagnostic(id<IGMarkdownWorkspace> workspace, NSArray<UTType *> *types, NSURL *target) {
    NSMutableDictionary *handlers = [NSMutableDictionary new];
    NSArray *extensions = @[@"md", @"markdown"];
    for (NSUInteger n = 0; n < extensions.count; ++n) {
        UTType *type = n < types.count ? types[n] : [UTType typeWithFilenameExtension:extensions[n]];
        NSURL *handler = type ? [workspace URLForApplicationToOpenContentType:type] : nil;
        NSString *path = handler.URLByResolvingSymlinksInPath.path;
        BOOL exact = path && [path isEqual:target.URLByResolvingSymlinksInPath.path];
        NSString *identity = handler ? [NSBundle bundleWithURL:handler].bundleIdentifier : nil;
        handlers[extensions[n]] = @{@"type":type.identifier ?: @"unknown", @"handler":path ?: @"unknown",
            @"exact_application":@(exact), @"different_copy_of_intentgrove":@(!exact && [identity isEqual:IGDomain])};
    }
    return @{@"requested_application":target.URLByResolvingSymlinksInPath.path ?: @"unknown", @"extensions":handlers};
}
static NSString *IGDiagnosticText(NSDictionary *record, BOOL es) {
    NSMutableString *text = [NSMutableString stringWithFormat:@"%@: %@",IGCopy(es,@"Requested app",@"App solicitada"),record[@"requested_application"]];
    BOOL duplicate = NO;
    for (NSString *ext in @[@"md",@"markdown"]) {
        NSDictionary *row = record[@"extensions"][ext];
        [text appendFormat:@"\n.%@: %@",ext,[row[@"handler"] isEqual:@"unknown"] ? IGCopy(es,@"Could not determine the default",@"No se pudo determinar la app predeterminada") : row[@"handler"]];
        duplicate |= [row[@"different_copy_of_intentgrove"] boolValue];
    }
    if (duplicate) [text appendFormat:@"\n%@",IGCopy(es,@"macOS selected a different copy of Intentgrove. Multiple copies share the same app identity.",@"macOS seleccionó otra copia de Intentgrove. Varias copias comparten la misma identidad.")];
    return text;
}
// Bounded reads accommodate delayed visibility; never repeat an association write.
static void IGVerify(id<IGMarkdownWorkspace> workspace, NSURL *target, NSArray<UTType *> *(^resolve)(void),
                     NSUInteger remaining, NSArray<NSError *> *errors, void (^done)(NSInteger, NSArray<NSError *> *)) {
    NSInteger matches = IGMatches(workspace,resolve(),target);
    if (matches == 2 || !remaining || errors.count) { done(matches,errors); return; }
    dispatch_after(dispatch_time(DISPATCH_TIME_NOW, 250 * NSEC_PER_MSEC),dispatch_get_main_queue(),^{
        IGVerify(workspace,target,resolve,remaining-1,errors,done);
    });
}
static BOOL IGShouldCheck(BOOL enabled, BOOL ready, BOOL attempted, BOOL idle) {
    return enabled && ready && !attempted && idle;
}
static BOOL IGRemember(BOOL (^save)(void)) {
    IGAttempted = YES; // Latch first, even if durable persistence fails.
    return save();
}
static BOOL IGConsented(NSModalResponse response) { return response == NSAlertFirstButtonReturn; }
// Callback always arrives on the main queue; distinct types are requested serially.
static void IGRequest(id<IGMarkdownWorkspace> workspace, NSURL *target, NSArray<UTType *> *types,
                      NSUInteger index, NSMutableArray<NSError *> *errors, NSArray<UTType *> *(^resolve)(void), void (^done)(NSInteger, NSArray<NSError *> *)) {
    if (index == types.count) { IGVerify(workspace,target,resolve,3,errors,done); return; }
    __weak id<IGMarkdownWorkspace> weakWorkspace = workspace;
    [workspace setDefaultApplicationAtURL:target toOpenContentType:types[index] completionHandler:^(NSError *error) {
        dispatch_async(dispatch_get_main_queue(), ^{
            if (error) [errors addObject:error];
            id<IGMarkdownWorkspace> nextWorkspace = weakWorkspace;
            if (!nextWorkspace) { done(-1, errors); return; }
            IGRequest(nextWorkspace, target, types, index + 1, errors, resolve, done);
        });
    }];
}
static BOOL IGLockFlow(void) {
    NSString *path = [NSTemporaryDirectory() stringByAppendingPathComponent:@"intentgrove-markdown-consent.lock"];
    int fd = open(path.fileSystemRepresentation, O_CREAT | O_RDWR | O_NOFOLLOW | O_CLOEXEC, 0600);
    struct stat st;
    if (fd < 0) return NO;
    if (fstat(fd, &st) || !S_ISREG(st.st_mode) || st.st_uid != getuid() || (st.st_mode & 077) || flock(fd, LOCK_EX | LOCK_NB)) {
        close(fd); return NO;
    }
    IGLock = fd; return YES;
}
static void IGUnlock(void) { if (IGLock >= 0) { close(IGLock); IGLock = -1; } }
static void IGShow(NSString *title, NSString *body, NSWindow *window, void (^done)(void)) {
    if (window && (!window.visible || !IGReady || window.attachedSheet || NSApp.modalWindow)) {
        if (!window.visible) { NSLog(@"%@: %@",title,body); done(); return; }
        dispatch_after(dispatch_time(DISPATCH_TIME_NOW, NSEC_PER_SEC), dispatch_get_main_queue(), ^{ IGShow(title,body,window,done); });
        return;
    }
    NSAlert *alert = [NSAlert new]; alert.messageText = title; alert.informativeText = body;
    [alert addButtonWithTitle:IGCopy(IGSpanish(), @"OK", @"Aceptar")];
    if (window && !window.attachedSheet && !NSApp.modalWindow) {
        [alert beginSheetModalForWindow:window completionHandler:^(__unused NSModalResponse response) { done(); }];
    } else { [alert runModal]; done(); }
}
static void IGFlow(BOOL explicitRequest, NSWindow *window, void (^finished)(int)) {
    BOOL es = IGSpanish();
    if (!IGLockFlow()) {
        if (explicitRequest) IGShow(IGCopy(es,@"Markdown default request unavailable",@"Solicitud no disponible"),
            IGCopy(es,@"Another consent request is active, or its private lock is unavailable. Try the script again later.",@"Otra solicitud está activa o no se puede bloquear de forma segura. Vuelve a ejecutar el script más tarde."),nil,^{ finished(4); });
        return;
    }
    NSArray *types = IGTypes();
    NSURL *target = NSBundle.mainBundle.bundleURL;
    id<IGMarkdownWorkspace> workspace = (id)[NSWorkspace sharedWorkspace];
    NSInteger before = types ? IGMatches(workspace, types, target) : -1;
    if (before == 2) {
        // One check per process launch; previous launches never suppress it.
        IGAttempted = YES;
        IGUnlock();
        if (explicitRequest) IGShow(IGCopy(es,@"Intentgrove is already the default Markdown app.",@"Intentgrove ya es la app predeterminada para Markdown."), @"",nil,^{ finished(0); });
        return;
    }
    if (before < 0) {
        IGAttempted = YES; IGUnlock();
        if (explicitRequest) IGShow(IGCopy(es,@"Cannot safely determine Markdown defaults",@"No se pueden determinar las apps predeterminadas"),
            IGCopy(es,@"No change was requested. Try again with the script, or use Finder Get Info → Open with → Change All.",@"No se solicitó ningún cambio. Vuelve a usar el script o Finder: Obtener información → Abrir con → Cambiar todo."),nil,^{ finished(3); });
        return;
    }
    NSAlert *alert = [NSAlert new];
    alert.messageText = IGCopy(es,@"Open Markdown files with Intentgrove?",@"¿Abrir archivos Markdown con Intentgrove?");
    alert.informativeText = IGCopy(es,@"Make Intentgrove the default app for .md and .markdown files. macOS may ask you to confirm the change.",@"Usa Intentgrove como app predeterminada para archivos .md y .markdown. macOS puede pedirte que confirmes el cambio.");
    NSButton *make = [alert addButtonWithTitle:IGCopy(es,@"Make Default",@"Usar como predeterminada")]; make.keyEquivalent = @"";
    NSButton *cancel = [alert addButtonWithTitle:IGCopy(es,@"Not Now",@"Ahora no")]; cancel.keyEquivalent = @"\e";
    [alert.window setDefaultButtonCell:cancel.cell]; [alert.window setInitialFirstResponder:cancel];
    void (^response)(NSModalResponse) = ^(NSModalResponse choice) {
        BOOL saved = IGRemember(^{ return IGSave(IGAnswered, @YES); });
        NSString *warning = saved ? @"" : IGCopy(es,@"The response could not be saved.",@"No se pudo guardar la respuesta.");
        if (!IGConsented(choice)) {
            IGUnlock();
            if (explicitRequest || !saved) IGShow(IGCopy(es,@"No default change was requested.",@"No se solicitó ningún cambio."),warning,window,^{ finished(2); });
            return;
        }
        NSArray *distinct = [[NSOrderedSet orderedSetWithArray:types] array];
        IGRequest(workspace, target, distinct, 0, [NSMutableArray array], ^{ return IGTypes(); }, ^(NSInteger matches, NSArray<NSError *> *errors) {
            IGUnlock();
            NSString *title; int code;
            if (matches == 2) { code = 0; title = IGCopy(es,@"Intentgrove is now the default Markdown app.",@"Intentgrove es ahora la app predeterminada para Markdown."); }
            else if (matches > 0 || matches == -2) { code = 3; title = IGCopy(es,@"Only some Markdown associations changed.",@"Solo cambiaron algunas asociaciones de Markdown."); }
            else { code = 3; title = errors.count ? IGCopy(es,@"macOS did not complete the default change.",@"macOS no completó el cambio de app predeterminada.") : IGCopy(es,@"macOS did not verify this copy as the default Markdown app.",@"macOS no confirmó esta copia como app predeterminada para Markdown."); }
            NSMutableString *body = [warning mutableCopy];
            if (code) [body appendFormat:@"\n%@\n%@",IGDiagnosticText(IGDiagnostic(workspace,IGTypes(),target),es),IGCopy(es,@"Try the script again, or use Finder Get Info → Open with → Change All.",@"Vuelve a usar el script o Finder: Obtener información → Abrir con → Cambiar todo.")];
            for (NSError *error in errors) [body appendFormat:@"\n%@: %@ (%@ %ld)",IGCopy(es,@"macOS",@"macOS"),error.localizedDescription,error.domain,(long)error.code];
            IGShow(title,body,window,^{ finished(code); });
        });
    };
    if (window) [alert beginSheetModalForWindow:window completionHandler:response];
    else response([alert runModal]);
}
void ig_default_markdown_update(void *window, bool ready, bool spanish, bool enabled) {
    if (![NSThread isMainThread]) return;
    IGEnabled = enabled && IGEligible(NSBundle.mainBundle);
    if (!IGEnabled) return;
    IGWindow = (__bridge NSWindow *)window; IGReady = ready;
    NSString *language = spanish ? @"es" : @"en";
    id old = CFBridgingRelease(CFPreferencesCopyAppValue((__bridge CFStringRef)IGLanguage,(__bridge CFStringRef)IGDomain));
    if (![old isEqual:language]) IGSave(IGLanguage,language);
    if (IGTimer || IGAttempted) return;
    IGTimer = [NSTimer scheduledTimerWithTimeInterval:1 repeats:YES block:^(__unused NSTimer *timer) {
        NSWindow *parent = IGWindow;
        if (!IGShouldCheck(IGEnabled, IGReady, IGAttempted, parent.visible && parent.keyWindow && !parent.attachedSheet && !NSApp.modalWindow && IGLock < 0)) return;
        // The stored answered marker is historical only. Requery on each launch.
        if (!IGAttempted) IGFlow(NO,parent,^(__unused int code) {});
        if (IGAttempted || IGLock >= 0) { [IGTimer invalidate]; IGTimer = nil; }
    }];
}
int ig_default_markdown_cli(bool enabled) {
    @autoreleasepool {
        if (!enabled || !IGEligible(NSBundle.mainBundle)) { fprintf(stderr,"Markdown consent requires an eligible production Intentgrove.app.\n"); return 4; }
        [NSApplication sharedApplication]; [NSApp setActivationPolicy:NSApplicationActivationPolicyAccessory];
        [NSApp finishLaunching]; [NSApp activateIgnoringOtherApps:YES];
        __block BOOL completed = NO; __block int result = 3;
        IGFlow(YES,nil,^(int code) { result = code; completed = YES; });
        while (!completed) [[NSRunLoop mainRunLoop] runMode:NSDefaultRunLoopMode beforeDate:[NSDate dateWithTimeIntervalSinceNow:0.1]];
        fprintf(stdout,"Markdown consent result: %d (0 verified, 2 declined, 3 unverified/partial/error, 4 unavailable).\n",result);
        return result;
    }
}

// Diagnostic mode has no consent, preferences, workspace initialization or setters.
int ig_default_markdown_inspect(void) {
    @autoreleasepool {
        NSDictionary *record = IGDiagnostic((id)[NSWorkspace sharedWorkspace],IGTypes(),NSBundle.mainBundle.bundleURL);
        NSData *json = [NSJSONSerialization dataWithJSONObject:record options:NSJSONWritingPrettyPrinted error:nil];
        if (!json) return 3;
        fwrite(json.bytes,1,json.length,stdout); fputc('\n',stdout); return 0;
    }
}
