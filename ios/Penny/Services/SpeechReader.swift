import AVFoundation
import Combine
import Foundation

@MainActor
final class SpeechReader: NSObject, ObservableObject, AVSpeechSynthesizerDelegate {
    @Published private(set) var isSpeaking = false
    private let synthesizer = AVSpeechSynthesizer()
    private var remaining = 0
    var report: ((String) -> Void)?

    override init() {
        super.init()
        synthesizer.delegate = self
    }

    func read(_ text: String, preferences: ReadingPreferences) {
        stop()
        guard !preferences.quiet else { report?("Quiet Mode is on. Your text is ready to read on screen."); return }
        guard !text.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else { report?("Add some text to read first."); return }
        // speechVoices lists voices installed on the device; Penny does not fetch a voice.
        let voices = AVSpeechSynthesisVoice.speechVoices().filter { $0.language.hasPrefix("en") }
        guard let voice = voices.first(where: { $0.language == "en-GB" }) ?? voices.first else {
            report?("Install an English voice in iOS Settings → Accessibility → Spoken Content (or Read & Speak) → Voices.")
            return
        }
        do {
            try AVAudioSession.sharedInstance().setCategory(.playback, mode: .spokenAudio, options: [.duckOthers])
            try AVAudioSession.sharedInstance().setActive(true)
        } catch { report?("Audio is unavailable. Your text remains on screen."); return }
        let chunks = LetterText.chunks(text)
        remaining = chunks.count
        isSpeaking = !chunks.isEmpty
        for chunk in chunks {
            let utterance = AVSpeechUtterance(string: chunk)
            utterance.voice = voice
            utterance.rate = Float(preferences.speechRate)
            synthesizer.speak(utterance)
        }
    }

    func stop() {
        remaining = 0
        synthesizer.stopSpeaking(at: .immediate)
        isSpeaking = false
        try? AVAudioSession.sharedInstance().setActive(false, options: .notifyOthersOnDeactivation)
    }

    nonisolated func speechSynthesizer(_ synthesizer: AVSpeechSynthesizer, didFinish utterance: AVSpeechUtterance) {
        Task { @MainActor [weak self] in
            guard let self, self.remaining > 0 else { return }
            self.remaining -= 1
            if self.remaining == 0 {
                self.isSpeaking = false
                try? AVAudioSession.sharedInstance().setActive(false, options: .notifyOthersOnDeactivation)
            }
        }
    }
}
