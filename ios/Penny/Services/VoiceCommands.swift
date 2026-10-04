import AVFoundation
import Combine
import Speech

@MainActor
final class VoiceCommands: ObservableObject {
    @Published private(set) var listening = false
    private let recognizer = SFSpeechRecognizer(locale: Locale(identifier: "en-GB"))
    private let engine = AVAudioEngine()
    private var request: SFSpeechAudioBufferRecognitionRequest?
    private var task: SFSpeechRecognitionTask?
    private var timeout: Task<Void, Never>?
    private var silence: Task<Void, Never>?
    private var generation = UUID()
    private var tapInstalled = false
    var report: ((String) -> Void)?
    var command: ((String) -> Void)?
    var available: Bool {
        recognizer?.supportsOnDeviceRecognition == true
    }

    func start() async {
        stop()
        let generation = generation
        guard let recognizer, recognizer.supportsOnDeviceRecognition else {
            report?("Offline voice commands are unavailable on this device. Use the visible controls."); return
        }
        let status = await withCheckedContinuation { continuation in
            SFSpeechRecognizer.requestAuthorization { continuation.resume(returning: $0) }
        }
        guard generation == self.generation else { return }
        guard status == .authorized else { report?("Speech permission is off. You can enable it in iOS Settings or use the visible controls."); return }
        let microphone = await withCheckedContinuation { continuation in
            AVAudioApplication.requestRecordPermission { continuation.resume(returning: $0) }
        }
        guard generation == self.generation else { return }
        guard microphone else { report?("Microphone permission is off. Every feature is available through the visible controls."); return }
        do {
            let session = AVAudioSession.sharedInstance()
            try session.setCategory(.record, mode: .measurement, options: [])
            try session.setActive(true)
            let request = SFSpeechAudioBufferRecognitionRequest()
            request.requiresOnDeviceRecognition = true
            request.shouldReportPartialResults = true
            self.request = request
            let input = engine.inputNode
            let format = input.outputFormat(forBus: 0)
            guard format.sampleRate > 0, format.channelCount > 0 else { throw PennyError.message("The microphone is unavailable.") }
            input.installTap(onBus: 0, bufferSize: 1024, format: format) { buffer, _ in request.append(buffer) }
            tapInstalled = true
            task = recognizer.recognitionTask(with: request) { [weak self] result, error in
                let text = result?.bestTranscription.formattedString
                let final = result?.isFinal == true
                Task { @MainActor in
                    guard let self, self.generation == generation else { return }
                    if let text {
                        self.silence?.cancel()
                        if final {
                            self.finish(text)
                        } else {
                            self.silence = Task { [weak self] in
                                try? await Task.sleep(for: .seconds(1.5))
                                guard !Task.isCancelled, let self, self.generation == generation else { return }
                                finish(text)
                            }
                        }
                    } else if error != nil {
                        self.stop()
                        self.report?("The voice command could not be recognised offline. Try again or use the visible controls.")
                    }
                }
            }
            engine.prepare()
            try engine.start()
            listening = true
            report?("Listening once. Say home, read a letter, read aloud, library, settings, banking, receipts or stop.")
            timeout = Task { [weak self] in
                try? await Task.sleep(for: .seconds(12))
                guard !Task.isCancelled, let self, self.generation == generation else { return }
                stop()
                report?("Listening stopped. Tap Talk to Penny to try another command.")
            }
        } catch {
            stop()
            report?("Offline voice commands are unavailable right now. Use the visible controls.")
        }
    }

    private func finish(_ text: String) {
        stop(); command?(text.lowercased())
    }

    func stop() {
        generation = UUID()
        timeout?.cancel()
        silence?.cancel()
        engine.stop()
        if tapInstalled {
            engine.inputNode.removeTap(onBus: 0); tapInstalled = false
        }
        request?.endAudio()
        task?.cancel()
        task = nil
        request = nil
        listening = false
        try? AVAudioSession.sharedInstance().setActive(false, options: .notifyOthersOnDeactivation)
    }
}
