import Foundation
import UIKit
import XCTest
@testable import Penny

final class PennyTests: XCTestCase {
    private func directory() -> URL { FileManager.default.temporaryDirectory.appendingPathComponent("PennyTests-\(UUID())") }

    func testReadingBoundsMaskingAndUnicodeSpeech() throws {
        XCTAssertThrowsError(try LetterText.checked("  \n"))
        XCTAssertThrowsError(try LetterText.checked(String(repeating: "x", count: 16_001)))
        XCTAssertEqual(try LetterText.checked("  Library letter  "), "Library letter")
        XCTAssertEqual(LetterText.mask("Account 12345678, code 12-34-56, £79.00"), "Account ••••, code ••-••-••, £79.00")
        let text = String(repeating: "Read café 👩🏽‍💻 carefully. ", count: 180)
        let chunks = LetterText.chunks(text, limit: 80)
        XCTAssertTrue(chunks.allSatisfy { !$0.isEmpty && $0.count <= 80 })
        XCTAssertEqual(chunks.joined(separator: " "), text.trimmingCharacters(in: .whitespacesAndNewlines))
    }

    func testConcurrentSavesSurviveReopeningAndDeletion() async throws {
        let directory = directory()
        defer { try? FileManager.default.removeItem(at: directory) }
        let store = LibraryStore(directory: directory)
        async let first = store.save(title: "First", text: "First letter")
        async let second = store.save(title: "Second", text: "Second letter")
        _ = try await (first, second)
        let reopened = LibraryStore(directory: directory)
        let saved = try await reopened.load()
        XCTAssertEqual(saved.letters.count, 2)
        let favourite = try await reopened.favourite(saved.letters[0].id)
        XCTAssertTrue(favourite.letters[0].favourite)
        let deleted = try await reopened.delete(saved.letters[0].id)
        XCTAssertEqual(deleted.letters.count, 1)
        let disk = try await LibraryStore(directory: directory).load()
        XCTAssertEqual(disk, deleted)
        let values = try directory.resourceValues(forKeys: [.isExcludedFromBackupKey])
        XCTAssertEqual(values.isExcludedFromBackup, true)
    }

    func testCorruptLibraryIsPreservedUntilExplicitReset() async throws {
        let directory = directory()
        defer { try? FileManager.default.removeItem(at: directory) }
        try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
        let damaged = Data("{broken library".utf8)
        try damaged.write(to: directory.appendingPathComponent("library-v1.json"))
        let store = LibraryStore(directory: directory)
        do { _ = try await store.load(); XCTFail("Corrupt data must not become an empty library") } catch {}
        do { _ = try await store.save(title: "New", text: "Text"); XCTFail("A save must not overwrite damaged data") } catch {}
        let recovery = try await store.recoveryData()
        XCTAssertEqual(recovery, damaged)
        let reset = try await store.reset()
        XCTAssertTrue(reset.letters.isEmpty)
        let reopened = try await LibraryStore(directory: directory).load()
        XCTAssertEqual(reopened, reset)
    }

    func testFailedWriteDoesNotClaimSavedState() async throws {
        let directory = directory()
        defer { try? FileManager.default.removeItem(at: directory) }
        let store = LibraryStore(directory: directory)
        _ = try await store.load()
        // A directory at the exact file destination reliably prevents an atomic file write.
        try FileManager.default.createDirectory(at: directory.appendingPathComponent("library-v1.json"), withIntermediateDirectories: true)
        do { _ = try await store.save(title: "Unsaved", text: "Keep this reading"); XCTFail("Write should fail") } catch {}
        let unchanged = try await store.load()
        XCTAssertTrue(unchanged.letters.isEmpty)
    }

    func testReceiptChainDetectsEditsAndInteriorRemoval() {
        let first = Receipt.make(action: "Flag", details: "Sample", previous: Receipt.genesis)
        let second = Receipt.make(action: "Card", details: "Practice", previous: first.hash)
        XCTAssertTrue(Receipt.verify([first, second]))
        XCTAssertFalse(Receipt.verify([second]))
        var edited = second
        edited.details = "Changed"
        XCTAssertFalse(Receipt.verify([first, edited]))
    }

    func testActualVisionRecognitionFromSyntheticImage() async throws {
        let data = await MainActor.run {
            let format = UIGraphicsImageRendererFormat()
            format.scale = 1
            format.opaque = true
            return UIGraphicsImageRenderer(size: CGSize(width: 1_200, height: 700), format: format).pngData { context in
                UIColor.white.setFill()
                context.fill(CGRect(x: 0, y: 0, width: 1_200, height: 700))
                let text = "Oak Street Library\nYour books are ready to collect.\nPlease bring your library card on Friday."
                (text as NSString).draw(in: CGRect(x: 70, y: 70, width: 1_060, height: 550), withAttributes: [.font: UIFont.systemFont(ofSize: 48), .foregroundColor: UIColor.black])
            }
        }
        let text = try await TextRecognition().recognize(data)
        XCTAssertTrue(text.localizedCaseInsensitiveContains("Oak Street Library"), text)
        XCTAssertTrue(text.localizedCaseInsensitiveContains("Friday"), text)
        do { _ = try await TextRecognition().recognize(Data("not an image".utf8)); XCTFail("Invalid images must fail") } catch {}
    }

    @MainActor
    func testLateRecognitionCannotOverwriteSampleOrSavedReading() async throws {
        let directory = directory()
        defer { try? FileManager.default.removeItem(at: directory) }
        let controlled = ControlledRecognizer()
        let model = PennyModel(store: LibraryStore(directory: directory), recognizer: controlled)
        await model.load()
        model.recognize(Data([1, 2, 3]))
        for _ in 0..<100 {
            if await controlled.started { break }
            try await Task.sleep(for: .milliseconds(10))
        }
        let started = await controlled.started
        XCTAssertTrue(started)
        model.sample()
        await controlled.finish()
        try await Task.sleep(for: .milliseconds(50))
        XCTAssertEqual(model.text, LetterText.sample)
        XCTAssertFalse(model.recognizing)
        await model.save(title: "Library")
        model.edit("Unsaved changes")
        model.open(try XCTUnwrap(model.archive.letters.first))
        XCTAssertEqual(model.text, LetterText.sample)
        model.handleCommand("flag a payment")
        XCTAssertTrue(model.archive.receipts.isEmpty, "Voice must not bypass financial-practice confirmation")
    }

    func testUnknownSchemaAndInvalidSettingsAreRejected() throws {
        var archive = LibraryArchive()
        archive.version = 999
        XCTAssertThrowsError(try archive.validate())
        archive.version = 1
        archive.preferences.speechRate = .nan
        XCTAssertThrowsError(try archive.validate())
    }
}

private actor ControlledRecognizer: TextRecognizing {
    private var continuation: CheckedContinuation<String, Error>?
    var started: Bool { continuation != nil }
    func recognize(_ data: Data) async throws -> String {
        try await withCheckedThrowingContinuation { continuation = $0 }
    }
    func finish() { continuation?.resume(returning: "Late obsolete photo"); continuation = nil }
}
