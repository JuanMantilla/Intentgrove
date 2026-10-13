import AppKit
import Foundation
let root=URL(fileURLWithPath:CommandLine.arguments[1]);let manifest=root.appendingPathComponent("manifest.json")
var m=try JSONSerialization.jsonObject(with:Data(contentsOf:manifest)) as! [String:Any]
var captures=m["captures"] as! [[String:Any]]
var decoded=[[String:Any]]()
for i in captures.indices {
 let p=captures[i]["screenshot"] as! String;let data=try Data(contentsOf:root.appendingPathComponent(p));guard let rep=NSBitmapImageRep(data:data) else{fatalError("Cannot decode \(p)")}
 captures[i]["capture_pixel_dimensions"]=["width":rep.pixelsWide,"height":rep.pixelsHigh]
 decoded.append(["path":p,"width":rep.pixelsWide,"height":rep.pixelsHigh,"bytes":data.count])
}
m["captures"]=captures
let accepted=captures.filter{($0["accepted"] as? Bool) == true}
let groups=Dictionary(grouping:accepted,by:{$0["surface"] as! String})
var sheets=[[String:Any]]()
for area in groups.keys.sorted() {
 let rows=groups[area]!
 for start in stride(from:0,to:rows.count,by:12) {
  let batch=Array(rows[start..<min(start+12,rows.count)]);let width=1500;let height=80+Int(ceil(Double(batch.count)/3))*360
  let bitmap=NSBitmapImageRep(bitmapDataPlanes:nil,pixelsWide:width,pixelsHigh:height,bitsPerSample:8,samplesPerPixel:4,hasAlpha:true,isPlanar:false,colorSpaceName:.deviceRGB,bytesPerRow:0,bitsPerPixel:0)!
  NSGraphicsContext.saveGraphicsState();NSGraphicsContext.current=NSGraphicsContext(bitmapImageRep:bitmap)
  NSColor(calibratedWhite:0.94,alpha:1).setFill();NSRect(x:0,y:0,width:width,height:height).fill()
  ("Intentgrove / \(area) / \(start/12+1) — navigation thumbnails; inspect originals" as NSString).draw(at:NSPoint(x:20,y:height-50),withAttributes:[.font:NSFont.boldSystemFont(ofSize:24),.foregroundColor:NSColor.black])
  for (n,c) in batch.enumerated() {
   let x=20+(n%3)*500;let top=height-80-(n/3)*360;let p=c["screenshot"] as! String
   let img=NSImage(contentsOf:root.appendingPathComponent(p))!;let bounds=NSRect(x:x,y:top-280,width:460,height:275);let ratio=min(bounds.width/img.size.width,bounds.height/img.size.height)
   let dest=NSRect(x:bounds.minX+(bounds.width-img.size.width*ratio)/2,y:bounds.minY+(bounds.height-img.size.height*ratio)/2,width:img.size.width*ratio,height:img.size.height*ratio)
   img.draw(in:dest,from:.zero,operation:.sourceOver,fraction:1)
   let runtime=(c["runtime"] as? String ?? "").contains("browser") ? "BROWSER PREVIEW / JPEG" : "NATIVE / JPEG"
   let label="\(c["capture_id"]!) · \(c["title"]!)\n\(c["theme"]!) / \(c["language"]!) · \(runtime)"
   (label as NSString).draw(in:NSRect(x:x,y:top-350,width:465,height:65),withAttributes:[.font:NSFont.systemFont(ofSize:16),.foregroundColor:NSColor.black])
  }
  NSGraphicsContext.restoreGraphicsState()
  let path="contact-sheets/\(area)-\(String(format:"%02d",start/12+1)).png"
  try bitmap.representation(using:.png,properties:[:])!.write(to:root.appendingPathComponent(path))
  sheets.append(["path":path,"captures":batch.map{$0["capture_id"]!},"purpose":"Labeled navigation aid; resized thumbnails of unchanged originals."])
 }
}
m["contact_sheets"]=sheets;m["file_validation"]=["method":"AppKit NSBitmapImageRep decoded every referenced original; metadata pixel dimensions measured from decoder", "files":decoded]
try JSONSerialization.data(withJSONObject:m,options:[.prettyPrinted,.sortedKeys]).write(to:manifest)
print("Decoded \(captures.count) references; created \(sheets.count) contact sheets")
