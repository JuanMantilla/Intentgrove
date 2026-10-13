import AppKit
import CoreGraphics
import Foundation
let apps=NSWorkspace.shared.runningApplications.filter{$0.bundleIdentifier == "com.juanmantilla.markdownworkspace.links-smoke"}
let pids=Set(apps.map{Int($0.processIdentifier)})
let rows=(CGWindowListCopyWindowInfo([.optionAll,.excludeDesktopElements],kCGNullWindowID) as? [[String:Any]] ?? []).filter { pids.contains($0[kCGWindowOwnerPID as String] as? Int ?? -1) }
let result:[String:Any] = ["timestamp":ISO8601DateFormatter().string(from:Date()),"apps":apps.map{["pid":Int($0.processIdentifier),"bundle":$0.bundleIdentifier ?? ""]},"windows":rows,"screens":NSScreen.screens.map{["frame":["x":$0.frame.origin.x,"y":$0.frame.origin.y,"width":$0.frame.width,"height":$0.frame.height],"backingScaleFactor":$0.backingScaleFactor]}]
let bytes=try JSONSerialization.data(withJSONObject:result,options:[.prettyPrinted,.sortedKeys])
try bytes.write(to:URL(fileURLWithPath:CommandLine.arguments[1]))
print(String(data:bytes,encoding:.utf8)!)
