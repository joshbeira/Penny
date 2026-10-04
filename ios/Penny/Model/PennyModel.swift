import Combine
import Foundation
import PhotosUI
import SwiftUI

enum PennyTab: Hashable { case home, read, library, settings }
enum PennyRoute: Hashable { case practice, receipts }

struct ExportFile: Identifiable {
    let id = UUID()
    let name: String
    let data: Data
    let json: Bool
}

@MainActor
final class PennyModel: ObservableObject {
    @Published private(set) var archive = LibraryArchive()
    @Published private(set) var loaded = false
    @Published private(set) var storageUnavailable = false
    @Published private(set) var busy = false
    @Published private(set) var recognizing = false
    @Published private(set) var text = ""
    @Published private(set) var source = ""
    @Published var message = ""
    @Published var tab: PennyTab = .home
    @Published var path: [PennyRoute] = []
    @Published var export: ExportFile?
    let speech = SpeechReader()
    let voice = VoiceCommands()
    let sounds = PracticeAudio()
    private let store: LibraryStore
    private let recognizer: any TextRecognizing
    private var readingTask: Task<Void, Never>?
    private var readingID = UUID()
    var preferences: ReadingPreferences {
        archive.preferences
    }

    init(store: LibraryStore = LibraryStore(directory: LibraryStore.applicationDirectory()), recognizer: any TextRecognizing = TextRecognition()) {
        self.store = store
        self.recognizer = recognizer
        speech.report = { [weak self] in self?.message = $0 }
        voice.report = { [weak self] in self?.message = $0 }
        voice.command = { [weak self] in self?.handleCommand($0) }
    }

    func load() async {
        guard !loaded else { return }
        do { archive = try await store.load() }
        catch { storageUnavailable = true; message = "Your saved library could not be opened. It has not been changed. Use Settings to export a recovery copy or retry." }
        loaded = true
    }

    func retryStorage() async {
        do { archive = try await store.load(); storageUnavailable = false; message = "Library opened." }
        catch { message = "The library is still unavailable. Your original file has not been changed." }
    }

    func edit(_ value: String) {
        cancelReading()
        speech.stop()
        text = String(value.prefix(LetterText.limit))
        source = "Your reviewed text"
        if value.count > LetterText.limit {
            message = "A reading can contain up to 16,000 characters. Read longer letters a page at a time."
        } else {
            message = "Changes are not saved yet."
        }
    }

    func sample() {
        cancelReading()
        stopAudio()
        text = LetterText.sample
        source = "Sample letter · fictional content"
        message = "Sample loaded. Your own photos are never replaced with this example."
        tab = .read
    }

    func open(_ letter: SavedLetter) {
        cancelReading()
        stopAudio()
        text = letter.text
        source = letter.title
        message = "Opened \(letter.title). Changes are saved as a new copy."
        tab = .read
    }

    func clear() {
        cancelReading()
        stopAudio()
        text = ""
        source = ""
        message = "Reading cleared. Saved letters are unchanged."
    }

    func importPhoto(_ item: PhotosPickerItem) {
        beginReading {
            guard let photo = try await item.loadTransferable(type: ImportedPhoto.self) else {
                throw PennyError.message("The selected photo could not be loaded.")
            }
            return photo.data
        }
    }

    func recognize(_ data: Data) {
        beginReading { data }
    }

    private func beginReading(load: @escaping () async throws -> Data) {
        cancelReading()
        stopAudio()
        let id = readingID
        let mask = preferences.maskNumbers
        recognizing = true
        message = "Reading the photo on your device…"
        readingTask = Task { [weak self] in
            guard let self else { return }
            do {
                let data = try await load()
                try Task.checkCancellation()
                let result = try await recognizer.recognize(data)
                guard !Task.isCancelled, readingID == id else { return }
                text = mask ? LetterText.mask(result) : result
                source = "Read from your photo · check names, dates and amounts"
                message = "Photo read. Review and correct the text before saving."
            } catch {
                guard !Task.isCancelled, readingID == id else { return }
                message = "\(error.localizedDescription)\(text.isEmpty ? "" : " Your previous reading is still on screen.")"
            }
            guard readingID == id else { return }
            recognizing = false
            readingTask = nil
        }
    }

    func cancelReading() {
        if recognizing { message = "Reading cancelled. Your previous text is unchanged." }
        readingID = UUID()
        readingTask?.cancel()
        readingTask = nil
        recognizing = false
    }

    func save(title: String) async {
        let reviewedText = text
        if await mutate(operation: { try await self.store.save(title: title, text: reviewedText) }) {
            message = text == reviewedText ? "Saved on this device." : "The earlier copy was saved. Your latest changes are not saved yet."
        }
    }

    func favourite(_ letter: SavedLetter) async {
        await mutate { try await self.store.favourite(letter.id) }
    }

    func delete(_ letter: SavedLetter) async {
        await mutate(success: "Letter deleted from this library.") { try await self.store.delete(letter.id) }
    }

    func deleteLetters() async {
        await mutate(success: "Saved letters deleted. Exported copies are unaffected.") { try await self.store.deleteLetters() }
    }

    func deleteReceipts() async {
        await mutate(success: "Practice receipts deleted.") { try await self.store.deleteReceipts() }
    }

    func confirm(_ action: PracticeAction) async {
        await mutate(success: "Practice action recorded. Nothing was sent to a bank.") { try await self.store.confirm(action) }
    }

    func setPreferences(_ next: ReadingPreferences) async {
        stopAudio()
        await mutate { try await self.store.settings(next) }
    }

    @discardableResult
    private func mutate(success: String? = nil, operation: () async throws -> LibraryArchive) async -> Bool {
        guard !busy, loaded, !storageUnavailable else { message = "Wait for the library to finish, or recover it in Settings."; return false }
        busy = true
        defer { busy = false }
        do {
            archive = try await operation(); if let success {
                message = success
            }
            return true
        } catch { message = "Could not save this change. \(error.localizedDescription) Your current reading is still available."; return false }
    }

    func resetStorage() async {
        guard !busy else { return }
        busy = true
        defer { busy = false }
        do { archive = try await store.reset(); storageUnavailable = false; message = "Local library, receipts and preferences reset." }
        catch { message = "The reset failed. \(error.localizedDescription)" }
    }

    func exportLibrary() {
        do { export = try ExportFile(name: "penny-letters.json", data: LibraryStore.encoder().encode(archive.letters), json: true) }
        catch { message = "The export could not be prepared." }
    }

    func exportReceipts() {
        do { export = try ExportFile(name: "penny-receipts.json", data: LibraryStore.encoder().encode(archive.receipts), json: true) }
        catch { message = "The export could not be prepared." }
    }

    func exportText() {
        export = ExportFile(name: "penny-letter.txt", data: Data(text.utf8), json: false)
    }

    func exportRecovery() async {
        do { export = try await ExportFile(name: "penny-recovery.json", data: store.recoveryData(), json: true) }
        catch { message = "The recovery copy could not be opened. \(error.localizedDescription)" }
    }

    func readAloud(_ value: String? = nil) {
        voice.stop()
        sounds.stop()
        speech.read(value ?? text, preferences: preferences)
    }

    func talk() async {
        speech.stop()
        sounds.stop()
        await voice.start()
    }

    func stopAudio() {
        voice.stop(); speech.stop(); sounds.stop()
    }

    func handleCommand(_ command: String) {
        let command = command.trimmingCharacters(in: .whitespacesAndNewlines).replacingOccurrences(of: ".", with: "")
        switch command {
        case "stop", "stop reading": stopAudio(); message = "Stopped."
        case "read aloud", "read this", "read it": path = []; tab = .read; readAloud()
        case "home", "go home": navigate(.home)
        case "read", "read a letter", "letter": navigate(.read)
        case "library", "my letters": navigate(.library)
        case "settings", "preferences": navigate(.settings)
        case "banking", "practice": navigate(.home); path = [.practice]
        case "receipts": navigate(.home); path = [.receipts]
        default: message = "Command not recognised. Try home, read a letter, read aloud, library, settings, banking, receipts or stop."
        }
    }

    private func navigate(_ target: PennyTab) {
        stopAudio()
        path = []
        tab = target
    }
}
