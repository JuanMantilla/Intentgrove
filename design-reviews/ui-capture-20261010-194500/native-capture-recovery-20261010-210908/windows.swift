import Foundation
import AppKit
import CoreGraphics
let pid = Int32(CommandLine.arguments[1])!
let rows = (CGWindowListCopyWindowInfo([.optionAll, .excludeDesktopElements], kCGNullWindowID) as? [[String: Any]]) ?? []
let filtered = rows.filter { ($0[kCGWindowOwnerPID as String] as? Int32) == pid }
let app = NSRunningApplication(processIdentifier: pid)
let data: [String: Any] = ["pid": pid, "screenCapturePreflight": CGPreflightScreenCaptureAccess(), "bundleIdentifier": app?.bundleIdentifier ?? "none", "bundleURL": app?.bundleURL?.path ?? "none", "executableURL": app?.executableURL?.path ?? "none", "windows": filtered, "screens": NSScreen.screens.map { ["frame": NSStringFromRect($0.frame), "visibleFrame": NSStringFromRect($0.visibleFrame), "scale": $0.backingScaleFactor] as [String: Any] }]
let bytes = try JSONSerialization.data(withJSONObject: data, options: [.prettyPrinted, .sortedKeys])
print(String(data: bytes, encoding: .utf8)!)
