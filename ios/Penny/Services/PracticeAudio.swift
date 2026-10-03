import AVFoundation
import Foundation

@MainActor
final class PracticeAudio {
    private var player: AVAudioPlayer?

    func play() throws {
        stop()
        // A local PCM WAV: outgoing, rising incoming, then a lower review cue.
        let sampleRate = 22_050
        let tones: [(Double, Double)] = [(420, 0.2), (0, 0.25), (480, 0.18), (660, 0.22), (0, 0.25), (260, 0.35)]
        var samples = Data()
        for (frequency, duration) in tones {
            let count = Int(Double(sampleRate) * duration)
            for index in 0..<count {
                let fade = min(1, Double(min(index, count - index)) / 180)
                var value = Int16(sin(2 * .pi * frequency * Double(index) / Double(sampleRate)) * 5_000 * fade).littleEndian
                withUnsafeBytes(of: &value) { samples.append(contentsOf: $0) }
            }
        }
        var wav = Data()
        func ascii(_ value: String) { wav.append(contentsOf: value.utf8) }
        func u32(_ value: UInt32) { var v = value.littleEndian; withUnsafeBytes(of: &v) { wav.append(contentsOf: $0) } }
        func u16(_ value: UInt16) { var v = value.littleEndian; withUnsafeBytes(of: &v) { wav.append(contentsOf: $0) } }
        ascii("RIFF"); u32(UInt32(samples.count + 36)); ascii("WAVEfmt "); u32(16)
        u16(1); u16(1); u32(UInt32(sampleRate)); u32(UInt32(sampleRate * 2)); u16(2); u16(16)
        ascii("data"); u32(UInt32(samples.count)); wav.append(samples)
        try AVAudioSession.sharedInstance().setCategory(.playback, mode: .default, options: [.duckOthers])
        try AVAudioSession.sharedInstance().setActive(true)
        player = try AVAudioPlayer(data: wav)
        player?.play()
    }

    func stop() {
        player?.stop()
        player = nil
        try? AVAudioSession.sharedInstance().setActive(false, options: .notifyOthersOnDeactivation)
    }
}
