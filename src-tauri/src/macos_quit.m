#import <Cocoa/Cocoa.h>
#import <objc/runtime.h>
#include <stdbool.h>

typedef bool (*MDQuitGuard)(void);

// Preserve the framework delegate and its other methods. Only its termination
// decision is wrapped; Cancel keeps the native app alive for the editing prompt.
bool md_install_quit_guard_on_delegate(id delegate, MDQuitGuard guard) {
    if (!delegate || !guard) return false;
    Class delegateClass = object_getClass(delegate);
    SEL selector = @selector(applicationShouldTerminate:);
    Method original = class_getInstanceMethod(delegateClass, selector);
    IMP previous = original ? method_getImplementation(original) : NULL;
    const char *encoding = original ? method_getTypeEncoding(original) : "q@:@";
    IMP replacement = imp_implementationWithBlock(^NSApplicationTerminateReply(id receiver, NSApplication *sender) {
        if (guard()) return NSTerminateCancel;
        if (previous) {
            typedef NSApplicationTerminateReply (*Decision)(id, SEL, NSApplication *);
            return ((Decision)previous)(receiver, selector, sender);
        }
        return NSTerminateNow;
    });
    class_replaceMethod(delegateClass, selector, replacement, encoding);
    return method_getImplementation(class_getInstanceMethod(delegateClass, selector)) == replacement;
}

bool md_install_quit_guard(MDQuitGuard guard) {
    if (![NSThread isMainThread]) return false;
    return md_install_quit_guard_on_delegate([NSApp delegate], guard);
}
