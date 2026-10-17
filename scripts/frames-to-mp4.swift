// Turns the frames from record-demo.mjs into an H.264 MP4 at a steady 30 fps,
// holding each frame until the next one's timestamp.
//   swift scripts/frames-to-mp4.swift <frames dir> <out.mp4>
import AVFoundation
import AppKit

let args = CommandLine.arguments
let dir = URL(fileURLWithPath: args[1])
let out = URL(fileURLWithPath: args[2])
try? FileManager.default.removeItem(at: out)

let frames: [(file: String, t: Double)] = try String(contentsOf: dir.appendingPathComponent("frames.txt"), encoding: .utf8)
  .split(separator: "\n").map { line in
    let parts = line.split(separator: " ")
    return (String(parts[0]), Double(parts[1])!)
  }
let width = 1440, height = 900, fps = 30

let writer = try AVAssetWriter(outputURL: out, fileType: .mp4)
let input = AVAssetWriterInput(mediaType: .video, outputSettings: [
  AVVideoCodecKey: AVVideoCodecType.h264, AVVideoWidthKey: width, AVVideoHeightKey: height,
  AVVideoCompressionPropertiesKey: [AVVideoAverageBitRateKey: 6_000_000],
])
let adaptor = AVAssetWriterInputPixelBufferAdaptor(assetWriterInput: input, sourcePixelBufferAttributes: [
  kCVPixelBufferPixelFormatTypeKey as String: kCVPixelFormatType_32ARGB, kCVPixelBufferWidthKey as String: width, kCVPixelBufferHeightKey as String: height,
])
writer.add(input)
writer.startWriting()
writer.startSession(atSourceTime: .zero)

func buffer(for file: String) -> CVPixelBuffer {
  let image = NSImage(contentsOf: dir.appendingPathComponent(file))!
  var cg = image.cgImage(forProposedRect: nil, context: nil, hints: nil)!
  var pb: CVPixelBuffer?
  CVPixelBufferCreate(nil, width, height, kCVPixelFormatType_32ARGB, nil, &pb)
  CVPixelBufferLockBaseAddress(pb!, [])
  let ctx = CGContext(data: CVPixelBufferGetBaseAddress(pb!), width: width, height: height, bitsPerComponent: 8,
                      bytesPerRow: CVPixelBufferGetBytesPerRow(pb!), space: CGColorSpaceCreateDeviceRGB(),
                      bitmapInfo: CGImageAlphaInfo.noneSkipFirst.rawValue)!
  ctx.draw(cg, in: CGRect(x: 0, y: 0, width: width, height: height))
  CVPixelBufferUnlockBaseAddress(pb!, [])
  cg = cg.copy()!
  return pb!
}

let end = frames.last!.t
var i = 0
var current = buffer(for: frames[0].file)
var shown = frames[0].file
for n in 0..<Int(end * Double(fps)) {
  let t = Double(n) / Double(fps)
  while i + 1 < frames.count && frames[i + 1].t <= t { i += 1 }
  if frames[i].file != shown { current = buffer(for: frames[i].file); shown = frames[i].file }
  while !input.isReadyForMoreMediaData { usleep(2000) }
  adaptor.append(current, withPresentationTime: CMTime(value: CMTimeValue(n), timescale: CMTimeScale(fps)))
}
input.markAsFinished()
let done = DispatchSemaphore(value: 0)
writer.finishWriting { done.signal() }
done.wait()
print(writer.status == .completed ? "Wrote \(out.path), \(String(format: "%.1f", end)) s" : "Failed: \(String(describing: writer.error))")
