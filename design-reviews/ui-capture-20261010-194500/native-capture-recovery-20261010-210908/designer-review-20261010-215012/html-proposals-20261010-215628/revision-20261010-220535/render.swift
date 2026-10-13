import AppKit
import CoreText
import Foundation
let input=URL(fileURLWithPath:CommandLine.arguments[1]);let out=URL(fileURLWithPath:CommandLine.arguments[2]);let spec=try JSONSerialization.jsonObject(with:Data(contentsOf:input)) as! [String:Any]
if let p=spec["fontPath"] as? String {CTFontManagerRegisterFontsForURL(URL(fileURLWithPath:p) as CFURL,.process,nil)}
let size=NSSize(width:1280,height:820)
var overflow:[[String:Any]]=[]
func color(_ s:String)->NSColor {let clean=s.replacingOccurrences(of:"#",with:"");let v=UInt64(clean,radix:16) ?? 0; return NSColor(calibratedRed:CGFloat((v>>16)&255)/255,green:CGFloat((v>>8)&255)/255,blue:CGFloat(v&255)/255,alpha:1)}
func number(_ c:[String:Any],_ k:String,_ defaultValue:Double=0)->CGFloat {CGFloat((c[k] as? NSNumber)?.doubleValue ?? defaultValue)}
for screen in spec["screens"] as! [[String:Any]] {
 let bitmap=NSBitmapImageRep(bitmapDataPlanes:nil,pixelsWide:1280,pixelsHigh:820,bitsPerSample:8,samplesPerPixel:4,hasAlpha:true,isPlanar:false,colorSpaceName:.deviceRGB,bytesPerRow:0,bitsPerPixel:0)!
 let gc=NSGraphicsContext(bitmapImageRep:bitmap)!;NSGraphicsContext.saveGraphicsState();NSGraphicsContext.current=gc
 gc.cgContext.translateBy(x:0,y:820);gc.cgContext.scaleBy(x:1,y:-1)
 for c in screen["commands"] as! [[String:Any]] {
  let kind=c["kind"] as! String
  if kind=="rect" {
   let rr=NSRect(x:number(c,"x"),y:number(c,"y"),width:number(c,"w"),height:number(c,"h"));let path=NSBezierPath(roundedRect:rr,xRadius:number(c,"r"),yRadius:number(c,"r"))
   if let fill=c["fill"] as? String {color(fill).withAlphaComponent(number(c,"alpha",1)).setFill();path.fill()}
   if let stroke=c["stroke"] as? String{color(stroke).setStroke();path.lineWidth=number(c,"sw",1);path.stroke()}
  }else if kind=="line" {
   let p=NSBezierPath();let pts=c["points"] as! [[Double]];p.move(to:NSPoint(x:pts[0][0],y:pts[0][1]));for a in pts.dropFirst(){p.line(to:NSPoint(x:a[0],y:a[1]))};color(c["color"] as! String).setStroke();p.lineWidth=number(c,"sw",1.4);p.lineCapStyle = .round;p.lineJoinStyle = .round;p.stroke()
  }else if kind=="ellipse" {let p=NSBezierPath(ovalIn:NSRect(x:number(c,"x"),y:number(c,"y"),width:number(c,"w"),height:number(c,"h")));if let fill=c["fill"] as? String{color(fill).setFill();p.fill()};if let stroke=c["stroke"] as? String{color(stroke).setStroke();p.lineWidth=number(c,"sw",1.4);p.stroke()}}
  else if kind=="text" {
   var label=c["text"] as! String;let fs=number(c,"size",14);let weight=number(c,"weight",400)
   let base=NSFont(name:"Roboto-Regular",size:fs) ?? NSFont(name:"Roboto",size:fs) ?? NSFont.systemFont(ofSize:fs)
   let font=weight>=600 ? NSFontManager.shared.convert(base,toHaveTrait:.boldFontMask) : base
   let paragraph=NSMutableParagraphStyle();paragraph.lineBreakMode = .byClipping
   let attrs:[NSAttributedString.Key:Any]=[.font:font,.foregroundColor:color(c["color"] as! String),.paragraphStyle:paragraph]
   let width=max(0,number(c,"w",1200));func measured(_ s:String)->CGFloat{(s as NSString).size(withAttributes:attrs).width}
   if measured(label)>width {
    if c["truncate"] as? String=="middle" {let chars=Array(label);var take=chars.count-1;while take>2{let head=max(1,take/2);let tail=take-head;label=String(chars.prefix(head))+"…"+String(chars.suffix(tail));if measured(label)<=width {break};take-=1}}
    else {overflow.append(["screen":screen["id"]!,"text":label,"actualWidth":Double(measured(label)),"available":Double(width)])}
   }
   let x=number(c,"x")+(c["align"] as? String=="center" ? max(0,(width-measured(label))/2):0)
   // Draw text in a flipped AppKit context so glyphs stay upright.
   NSGraphicsContext.saveGraphicsState();gc.cgContext.translateBy(x:x,y:number(c,"y"));gc.cgContext.scaleBy(x:1,y:-1)
   (label as NSString).draw(in:NSRect(x:0,y:-fs*0.75,width:width,height:fs*1.7),withAttributes:attrs)
   NSGraphicsContext.restoreGraphicsState()
  }else if kind=="image" {
   if let img=NSImage(contentsOfFile:c["path"] as! String) {
    NSGraphicsContext.saveGraphicsState();gc.cgContext.translateBy(x:number(c,"x"),y:number(c,"y")+number(c,"h"));gc.cgContext.scaleBy(x:1,y:-1)
    img.draw(in:NSRect(x:0,y:0,width:number(c,"w"),height:number(c,"h")),from:.zero,operation:.sourceOver,fraction:1);NSGraphicsContext.restoreGraphicsState()
   }
  }
 }
 NSGraphicsContext.restoreGraphicsState();let png=bitmap.representation(using:.png,properties:[:])!;try png.write(to:out.appendingPathComponent((screen["id"] as! String)+".png"))
}
try JSONSerialization.data(withJSONObject:overflow,options:[.prettyPrinted,.sortedKeys]).write(to:out.appendingPathComponent("text-overflow.json"))
print("Rendered \((spec["screens"] as! [Any]).count) standalone mockups. Text overflows: \(overflow.count)")
