import Foundation

struct LibraryArchive: Codable, Equatable, Sendable {
    var version = 1
    var revision = 0
    var letters: [SavedLetter] = []
    var receipts: [Receipt] = []
    var preferences = ReadingPreferences()

    func validate() throws {
        guard version == 1, revision >= 0, letters.count <= 100, receipts.count <= 1_000,
              Set(letters.map(\.id)).count == letters.count, preferences.valid else {
            throw PennyError.message("The saved library format could not be read. The original file has been preserved.")
        }
        for letter in letters {
            _ = try LetterText.checked(letter.text)
            guard !letter.title.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty,
                  letter.title.count <= 100, letter.createdAt.timeIntervalSince1970.isFinite else {
                throw PennyError.message("A saved letter could not be read. The original file has been preserved.")
            }
        }
        guard Receipt.verify(receipts) else {
            throw PennyError.message("The practice receipt history failed verification. The original file has been preserved.")
        }
    }
}

/// One actor serialises every read/modify/write. A failed atomic write never changes visible state.
actor LibraryStore {
    let directory: URL
    private var archive: LibraryArchive?
    private var file: URL { directory.appendingPathComponent("library-v1.json") }

    init(directory: URL) { self.directory = directory }

    static func applicationDirectory() -> URL {
        FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask)[0]
            .appendingPathComponent("Penny", isDirectory: true)
    }

    static func encoder() -> JSONEncoder {
        let encoder = JSONEncoder()
        encoder.dateEncodingStrategy = .iso8601
        encoder.outputFormatting = [.prettyPrinted, .sortedKeys]
        return encoder
    }

    func load() throws -> LibraryArchive {
        if let archive { return archive }
        try prepareDirectory()
        guard FileManager.default.fileExists(atPath: file.path) else {
            let empty = LibraryArchive()
            archive = empty
            return empty
        }
        let data = try recoveryData()
        let decoder = JSONDecoder()
        decoder.dateDecodingStrategy = .iso8601
        let decoded = try decoder.decode(LibraryArchive.self, from: data)
        try decoded.validate()
        archive = decoded
        return decoded
    }

    func save(title: String, text: String) throws -> LibraryArchive {
        var next = try load()
        guard next.letters.count < 100 else { throw PennyError.message("Your library has 100 letters. Export or delete a letter before saving another.") }
        let title = title.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !title.isEmpty, title.count <= 100 else { throw PennyError.message("Enter a title of up to 100 characters.") }
        next.letters.insert(SavedLetter(title: title, text: try LetterText.checked(text)), at: 0)
        return try commit(next)
    }

    func favourite(_ id: UUID) throws -> LibraryArchive {
        var next = try load()
        guard let index = next.letters.firstIndex(where: { $0.id == id }) else { return next }
        next.letters[index].favourite.toggle()
        return try commit(next)
    }

    func delete(_ id: UUID) throws -> LibraryArchive {
        var next = try load()
        next.letters.removeAll { $0.id == id }
        return try commit(next)
    }

    func deleteLetters() throws -> LibraryArchive {
        var next = try load()
        next.letters.removeAll()
        return try commit(next)
    }

    func settings(_ preferences: ReadingPreferences) throws -> LibraryArchive {
        var next = try load()
        next.preferences = preferences
        return try commit(next)
    }

    func confirm(_ action: PracticeAction) throws -> LibraryArchive {
        var next = try load()
        guard next.receipts.count < 1_000 else { throw PennyError.message("Export and clear your practice receipts before adding more.") }
        next.receipts.append(Receipt.make(action: action.title, details: action.details, previous: next.receipts.last?.hash ?? Receipt.genesis))
        return try commit(next)
    }

    func deleteReceipts() throws -> LibraryArchive {
        var next = try load()
        next.receipts.removeAll()
        return try commit(next)
    }

    func recoveryData() throws -> Data {
        let attributes = try FileManager.default.attributesOfItem(atPath: file.path)
        guard let size = attributes[.size] as? NSNumber, size.intValue <= 12_000_000 else {
            throw PennyError.message("The library file is too large to open safely. It has not been changed.")
        }
        return try Data(contentsOf: file)
    }

    /// Called only after an explicit destructive confirmation, including when decoding fails.
    func reset() throws -> LibraryArchive {
        try commit(LibraryArchive())
    }

    private func prepareDirectory() throws {
        try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
        var protectedDirectory = directory
        var values = URLResourceValues()
        values.isExcludedFromBackup = true
        try protectedDirectory.setResourceValues(values)
    }

    private func commit(_ proposed: LibraryArchive) throws -> LibraryArchive {
        var next = proposed
        next.revision = (archive?.revision ?? 0) + 1
        try next.validate()
        try prepareDirectory()
        let data = try Self.encoder().encode(next)
        try data.write(to: file, options: [.atomic, .completeFileProtection])
        archive = next
        return next
    }
}
