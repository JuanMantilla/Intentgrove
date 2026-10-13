// External acquisition helper. Does not modify or inject into the application.
import Foundation
import AppKit
import ScreenCaptureKit
import AVFoundation
import CoreMedia
import ImageIO
import UniformTypeIdentifiers

func continuous() -> Double {
    var info = mach_timebase_info_data_t(); mach_timebase_info(&info)
    return Double(mach_continuous_time()) * Double(info.numer) / Double(info.denom) / 1e9
}
func anchor() -> [String: Double] {
    let before = continuous()
    let absolute = mach_absolute_time()
    var info = mach_timebase_info_data_t(); mach_timebase_info(&info)
    let host = CMTimeGetSeconds(CMClockGetTime(CMClockGetHostTimeClock()))
    return ["continuousBefore": before, "hostSeconds": host, "absoluteTicks": Double(absolute),
            "tickSeconds": Double(info.numer) / Double(info.denom) / 1e9, "continuousAfter": continuous()]
}
func output(_ object: [String: Any]) {
    let data = try! JSONSerialization.data(withJSONObject: object, options: [.sortedKeys])
    FileHandle.standardOutput.write(data); FileHandle.standardOutput.write(Data([10]))
}
struct CaptureError: Error { let message: String }

final class Recorder: NSObject, SCStreamOutput, SCStreamDelegate, @unchecked Sendable {
    let directory: URL
    let timeline: FileHandle
    let writer: AVAssetWriter
    let input: AVAssetWriterInput
    let queue = DispatchQueue(label: "F002A.capture")
    var started = false, ready = false, failed = false
    var pid: pid_t = 0
    var frames = 0
    var lastPTS: Double?
    var lastAnchor: [String: Double]?
    let displayID: CGDirectDisplayID
    let refresh: Double
    let initialMode: CGDisplayMode
    var stream: SCStream?
    init(directory: URL, display: SCDisplay, refresh: Double) throws {
        self.directory = directory; self.displayID = display.displayID; self.refresh = refresh
        guard let mode = CGDisplayCopyDisplayMode(display.displayID) else { throw CaptureError(message: "display mode unavailable") }
        initialMode = mode
        let timelineURL = directory.appendingPathComponent("timeline.jsonl")
        guard FileManager.default.createFile(atPath: timelineURL.path, contents: nil) else { throw CaptureError(message: "timeline create failed") }
        timeline = try FileHandle(forWritingTo: timelineURL)
        writer = try AVAssetWriter(outputURL: directory.appendingPathComponent("capture.mov"), fileType: .mov)
        input = AVAssetWriterInput(mediaType: .video, outputSettings: [
            AVVideoCodecKey: AVVideoCodecType.proRes4444,
            AVVideoWidthKey: mode.pixelWidth, AVVideoHeightKey: mode.pixelHeight
        ])
        input.expectsMediaDataInRealTime = true
        guard writer.canAdd(input) else { throw CaptureError(message: "encoder unavailable") }
        writer.add(input)
        super.init()
        log(["kind":"configuration", "displayID":display.displayID, "pixelWidth":mode.pixelWidth,
             "pixelHeight":mode.pixelHeight, "scDisplayWidth":display.width, "scDisplayHeight":display.height,
             "logicalWidth":CGDisplayBounds(display.displayID).width, "logicalHeight":CGDisplayBounds(display.displayID).height,
             "refreshHz":refresh, "colorSpace":CGDisplayCopyColorSpace(display.displayID).name as String? ?? "unknown",
             "clock":"mach-continuous-seconds", "anchor":anchor(), "audio":false])
    }
    func log(_ object: [String: Any]) {
        do { let data = try JSONSerialization.data(withJSONObject: object, options: [.sortedKeys]); try timeline.write(contentsOf: data); try timeline.write(contentsOf: Data([10])) }
        catch { failed = true }
    }
    func invalidate(_ reason: String) { failed = true; log(["kind":"invalid", "reason":reason,"time":continuous()]) }
    func bounds() -> [[String: Any]] {
        guard pid > 0 else { return [] }
        let windows = CGWindowListCopyWindowInfo([.optionOnScreenOnly, .excludeDesktopElements], kCGNullWindowID) as? [[String: Any]] ?? []
        // Do not retain titles, paths, names or any other application's window records.
        return windows.filter { ($0[kCGWindowOwnerPID as String] as? Int32) == pid }.map {
            ["id":$0[kCGWindowNumber as String] ?? 0, "bounds":$0[kCGWindowBounds as String] ?? [:],
             "layer":$0[kCGWindowLayer as String] ?? 0, "alpha":$0[kCGWindowAlpha as String] ?? 0]
        }
    }
    func stream(_ stream: SCStream, didStopWithError error: Error) { queue.async { self.invalidate("stream stopped"); output(["event":"error","reason":"stream stopped"]) } }
    func stream(_ stream: SCStream, didOutputSampleBuffer sample: CMSampleBuffer, of type: SCStreamOutputType) {
        guard type == .screen else { return }
        let a = anchor()
        if let previous = lastAnchor,
           abs((a["continuousBefore"]! - previous["continuousBefore"]!) - (a["hostSeconds"]! - previous["hostSeconds"]!)) > 0.005 { invalidate("clock discontinuity or sleep") }
        lastAnchor = a
        guard let mode = CGDisplayCopyDisplayMode(displayID), mode.pixelWidth == initialMode.pixelWidth,
              mode.pixelHeight == initialMode.pixelHeight, mode.refreshRate == initialMode.refreshRate else { invalidate("display mode changed"); return }
        guard sample.isValid,
              let attachments = CMSampleBufferGetSampleAttachmentsArray(sample, createIfNecessary: false) as? [[SCStreamFrameInfo: Any]],
              let raw = attachments.first?[.status] as? Int,
              let status = SCFrameStatus(rawValue: raw) else { invalidate("missing frame status"); return }
        let pts = CMTimeGetSeconds(sample.presentationTimeStamp)
        if !pts.isFinite { invalidate("invalid PTS"); return }
        var row: [String: Any] = ["kind":"frame","index":frames,"pts":pts,"anchor":a,"status":raw,"windows":bounds()]
        if let ticks = attachments.first?[.displayTime] as? UInt64 {
            let delta = (Double(ticks) - a["absoluteTicks"]!) * a["tickSeconds"]!
            row["displayMachAbsoluteTicks"] = ticks
            row["displayContinuousBounds"] = [a["continuousBefore"]! + delta, a["continuousAfter"]! + delta]
        } else if ready { invalidate("missing display clock stamp") }
        row["contentRect"] = String(describing: attachments.first?[.contentRect] ?? "missing")
        log(row)
        if status == .idle { return } // Raw idle records retained; reviewer must establish unchanged content.
        guard status == .complete else { if ready { invalidate("noncomplete nonidle frame") }; return }
        if let previous = lastPTS, pts <= previous { invalidate("nonmonotonic PTS"); return }
        lastPTS = pts
        if !started {
            guard writer.startWriting() else { invalidate("writer start"); return }
            writer.startSession(atSourceTime: sample.presentationTimeStamp); started = true
        }
        guard input.isReadyForMoreMediaData, input.append(sample) else { invalidate("encoder backpressure or append failure"); return }
        frames += 1
        if !ready {
            // The ready signal requires a durable full first frame, not just an encoder enqueue.
            guard let buffer = sample.imageBuffer else { invalidate("missing image buffer"); return }
            let context = CIContext()
            guard let cg = context.createCGImage(CIImage(cvPixelBuffer:buffer), from:CGRect(x:0,y:0,width:CVPixelBufferGetWidth(buffer),height:CVPixelBufferGetHeight(buffer))),
                let destination = CGImageDestinationCreateWithURL(directory.appendingPathComponent("ready.png") as CFURL, UTType.png.identifier as CFString, 1, nil) else { invalidate("first-frame image"); return }
            CGImageDestinationAddImage(destination,cg,nil)
            guard CGImageDestinationFinalize(destination) else { invalidate("first-frame persist"); return }
            do { let file=try FileHandle(forWritingTo:directory.appendingPathComponent("ready.png")); try file.synchronize(); try file.close(); try timeline.synchronize() }
            catch { invalidate("first-frame sync"); return }
            ready = true; let time=continuous(); log(["kind":"ready","time":time]); output(["event":"ready","time":time])
        }
    }
    func control(_ object: [String: Any]) {
        queue.async {
            if object["event"] as? String == "launch", let pid = object["pid"] as? Int32, pid > 0 {
                self.pid = pid; self.log(["kind":"launch-notification","pid":pid,"time":continuous(),"runner":object])
            } else { self.invalidate("invalid control") }
        }
    }
    func finish() async {
        do { try await stream?.stopCapture() } catch { queue.sync { invalidate("stop capture failed") } }
        await withCheckedContinuation { (continuation: CheckedContinuation<Void, Never>) in
            queue.async {
                self.input.markAsFinished()
                if self.started {
                    self.writer.finishWriting {
                        self.queue.async {
                            if self.writer.status != .completed {self.invalidate("writer finalize failed")}
                            self.close(); continuation.resume()
                        }
                    }
                } else {self.invalidate("no complete frames"); self.close(); continuation.resume()}
            }
        }
    }
    func close() {
        log(["kind":"end","time":continuous(),"frames":frames,"acquisitionValid": !failed,"anchor":anchor()])
        do { try timeline.synchronize(); try timeline.close() } catch { failed = true }
        output(["event":"finished","acquisitionValid": !failed,"frames":frames,"acceptance":"NOT TESTED"])
    }
}

@main struct Main {
    static func main() async {
        let args = CommandLine.arguments
        if args.count == 2 && args[1] == "--self-test" {
            let a=anchor(); guard a["continuousBefore"]! <= a["continuousAfter"]!, a["hostSeconds"]!.isFinite else {exit(1)}
            output(["result":"PASS","check":"clock anchor only; no capture","anchor":a]); return
        }
        guard args.count == 6, args[1] == "--isolated-display", let id=UInt32(args[2]),
              let duration=Double(args[5]), duration>=1, duration<=120 else {
            fputs("Usage: startup-recorder --isolated-display DISPLAY_ID NEW_OUTPUT_DIRECTORY --seconds SECONDS\n",stderr); exit(2)
        }
        guard args[4] == "--seconds", CGPreflightScreenCaptureAccess() else {
            fputs("BLOCKED: existing screen recording permission required; no permission prompt requested\n",stderr); exit(1)
        }
        do {
            let directory=URL(fileURLWithPath:args[3]).standardizedFileURL
            guard !FileManager.default.fileExists(atPath:directory.path), directory.path==directory.resolvingSymlinksInPath().path else {throw CaptureError(message:"new nonsymlink output directory required")}
            try FileManager.default.createDirectory(at:directory,withIntermediateDirectories:false,attributes:[.posixPermissions:0o700])
            let content=try await SCShareableContent.excludingDesktopWindows(false,onScreenWindowsOnly:true)
            guard let display=content.displays.first(where:{$0.displayID==id}), let mode=CGDisplayCopyDisplayMode(id), mode.refreshRate>0 else {throw CaptureError(message:"display or refresh rate unavailable")}
            let recorder=try Recorder(directory:directory,display:display,refresh:mode.refreshRate)
            let config=SCStreamConfiguration(); config.width=mode.pixelWidth; config.height=mode.pixelHeight
            config.minimumFrameInterval=CMTime(seconds:1/mode.refreshRate,preferredTimescale:1_000_000)
            config.queueDepth=8; config.capturesAudio=false; config.captureMicrophone=false; config.showsCursor=true
            let filter=SCContentFilter(display:display,excludingApplications:[],exceptingWindows:[])
            let stream=SCStream(filter:filter,configuration:config,delegate:recorder); recorder.stream=stream
            try stream.addStreamOutput(recorder,type:.screen,sampleHandlerQueue:recorder.queue)
            try await stream.startCapture()
            DispatchQueue.global().async {
                while let line=readLine() {
                    if line.utf8.count>4096 {recorder.queue.async {recorder.invalidate("control too large")}; break}
                    if let data=line.data(using:.utf8), let value=try? JSONSerialization.jsonObject(with:data) as? [String:Any] {recorder.control(value)}
                }
            }
            try await Task.sleep(nanoseconds:UInt64(duration*1e9))
            await recorder.finish()
            if recorder.failed {exit(1)}
        } catch { fputs("BLOCKED: \(error)\n",stderr); exit(1) }
    }
}
