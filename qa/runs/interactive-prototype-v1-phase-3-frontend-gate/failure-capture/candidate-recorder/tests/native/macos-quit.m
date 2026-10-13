#import <Cocoa/Cocoa.h>
#include <stdbool.h>
#include <assert.h>

extern bool md_install_quit_guard_on_delegate(id delegate, bool (*guard)(void));
static bool blocked = true;
static int originalCalls = 0;
static bool shouldBlock(void) { return blocked; }

@interface FixtureDelegate : NSObject <NSApplicationDelegate>
@end
@implementation FixtureDelegate
- (NSApplicationTerminateReply)applicationShouldTerminate:(NSApplication *)sender {
    (void)sender;
    originalCalls += 1;
    return NSTerminateLater;
}
@end

@interface BareFixtureDelegate : NSObject <NSApplicationDelegate>
@end
@implementation BareFixtureDelegate
@end

int main(void) {
    @autoreleasepool {
        FixtureDelegate *delegate = [FixtureDelegate new];
        // The decision wrappers never message the sender; keep this harness free
        // of a live NSApplication or WindowServer session.
        NSApplication *sender = (NSApplication *)[NSObject new];
        assert(!md_install_quit_guard_on_delegate(nil, shouldBlock));
        assert(!md_install_quit_guard_on_delegate(delegate, NULL));
        assert(md_install_quit_guard_on_delegate(delegate, shouldBlock));
        assert([delegate applicationShouldTerminate:sender] == NSTerminateCancel);
        assert(originalCalls == 0);
        blocked = false;
        assert([delegate applicationShouldTerminate:sender] == NSTerminateLater);
        assert(originalCalls == 1);
        BareFixtureDelegate *bare = [BareFixtureDelegate new];
        assert(md_install_quit_guard_on_delegate(bare, shouldBlock));
        assert([bare applicationShouldTerminate:sender] == NSTerminateNow);
        blocked = true;
        assert([bare applicationShouldTerminate:sender] == NSTerminateCancel);
        puts("PASS: native termination guard cancels pending edits and preserves the delegate decision");
    }
    return 0;
}
