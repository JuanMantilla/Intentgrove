import Foundation
let source = URL(fileURLWithPath: "/Applications/Intentgrove.app")
let fm = FileManager.default
let attrs = try fm.attributesOfItem(atPath: source.path)
guard (attrs[.ownerAccountID] as? NSNumber)?.uint32Value == getuid() else { fatalError("Unexpected ownership") }
var recovered: NSURL?
try fm.trashItem(at: source, resultingItemURL: &recovered)
let record: [String: Any] = ["method": "Foundation FileManager.trashItem", "source": source.path, "recoverablePath": recovered!.path!, "sourceAbsent": !fm.fileExists(atPath: source.path), "recoverableBundleExists": fm.fileExists(atPath: recovered!.path!)]
let data = try JSONSerialization.data(withJSONObject: record, options: [.prettyPrinted, .sortedKeys])
print(String(data: data, encoding: .utf8)!)
