// Calibration stimulus only. Reviewer must verify its actual visible duration.
import AppKit
import CoreVideo

final class Flash: NSObject, NSApplicationDelegate, @unchecked Sendable {
    var window: NSWindow!
    var link: CVDisplayLink?
    var tick = 0
    let display: UInt32
    init(display: UInt32) { self.display = display }
    func applicationDidFinishLaunching(_ notification: Notification) {
        guard let screen = NSScreen.screens.first(where: { ($0.deviceDescription[NSDeviceDescriptionKey("NSScreenNumber")] as? NSNumber)?.uint32Value == display }) else { exit(1) }
        window = NSWindow(contentRect: NSRect(x: screen.frame.minX+80, y: screen.frame.minY+80, width: 300, height: 300),
                          styleMask: [.borderless], backing: .buffered, defer: false)
        window.backgroundColor = .black; window.isOpaque = true; window.makeKeyAndOrderFront(nil)
        guard CVDisplayLinkCreateWithCGDisplay(display, &link) == kCVReturnSuccess, let link else { exit(1) }
        CVDisplayLinkSetOutputCallback(link, { _, _, target, _, _, context in
            let app = Unmanaged<Flash>.fromOpaque(context!).takeUnretainedValue()
            let host = target.pointee.hostTime
            DispatchQueue.main.async { app.frame(host: host) }
            return kCVReturnSuccess
        }, Unmanaged.passUnretained(self).toOpaque())
        CVDisplayLinkStart(link)
    }
    func frame(host: UInt64) {
        tick += 1
        if tick == 120 || tick == 121 {
            window.backgroundColor = tick == 120 ? .white : .black
            window.displayIfNeeded()
            print("{\"tick\":\(tick),\"displayTargetHostTicks\":\(host),\"updateHostTicks\":\(mach_absolute_time()),\"white\":\(tick == 120)}")
            fflush(stdout)
        }
        if tick >= 240 { CVDisplayLinkStop(link!); NSApplication.shared.terminate(nil) }
    }
}
guard CommandLine.arguments.count == 2, let display=UInt32(CommandLine.arguments[1]) else {
    fputs("Usage: startup-flash ISOLATED_DISPLAY_ID (capture must already be ready)\n",stderr); exit(2)
}
let application=NSApplication.shared
let delegate=Flash(display:display)
application.delegate=delegate
application.setActivationPolicy(.accessory)
application.run()
