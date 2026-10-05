// Disposable WebKit renderer. Uses the actual bundled App with mocked Tauri APIs.
// No networking, application native-contract changes, or security setting changes.
import AppKit
import WebKit

final class Snapshot: NSObject, WKNavigationDelegate {
    let application = NSApplication.shared
    let window = NSWindow(contentRect: NSRect(x: 0, y: 0, width: 1440, height: 900), styleMask: [.titled, .closable], backing: .buffered, defer: false)
    let webView = WKWebView()
    let output = URL(fileURLWithPath: "/private/tmp/md-approved-gap-webkit")
    let cases: [[String: Any]]
    var index = 0
    override init() {
        cases = (try? JSONSerialization.jsonObject(with: Data(contentsOf: URL(fileURLWithPath: "/private/tmp/md-approved-gap-webkit/cases.json")))) as? [[String: Any]] ?? []
        super.init()
        window.title = "Disposable frontend renderer — native APIs mocked"
        window.contentView = webView
        webView.navigationDelegate = self
    }
    func next() {
        guard index < cases.count else { application.terminate(nil); return }
        let item = cases[index]
        window.setContentSize(NSSize(width: item["width"] as? Int ?? 1440, height: item["height"] as? Int ?? 900))
        webView.pageZoom = item["zoom"] as? Double ?? 1
        window.makeKeyAndOrderFront(nil)
        let source = URL(fileURLWithPath: item["html"] as! String)
        webView.loadFileURL(source, allowingReadAccessTo: source.deletingLastPathComponent())
    }
    func start() {
        next()
        DispatchQueue.main.asyncAfter(deadline: .now() + 100) { self.application.terminate(nil) }
    }
    func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
        let item = cases[index], name = item["name"] as! String
        DispatchQueue.main.asyncAfter(deadline: .now() + 1) {
            let script = item["scenario"] as? String == "reference" ? "return JSON.stringify({kind: 'Approved SVG reference rendered in WebKit'})" : "return await window.runFrontendChecks(scenario)"
            webView.callAsyncJavaScript(script, arguments: ["scenario": item["scenario"] as? String ?? "reading"], in: nil, in: .page) { result in
                let text: String
                switch result { case .success(let value): text = value as? String ?? String(describing: value); case .failure(let error): text = String(describing: error) }
                try? text.write(to: self.output.appendingPathComponent(name + ".json"), atomically: true, encoding: .utf8)
                webView.takeSnapshot(with: nil) { image, error in
                    if let image = image, let data = image.tiffRepresentation, let bitmap = NSBitmapImageRep(data: data), let png = bitmap.representation(using: .png, properties: [:]) {
                        try? png.write(to: self.output.appendingPathComponent(name + ".png"))
                    } else { try? String(describing: error).write(to: self.output.appendingPathComponent(name + "-snapshot-error.txt"), atomically: true, encoding: .utf8) }
                    self.index += 1
                    self.next()
                }
            }
        }
    }
}
let snapshot = Snapshot()
NSApplication.shared.setActivationPolicy(.accessory)
snapshot.start()
NSApplication.shared.run()
