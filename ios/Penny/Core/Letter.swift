import Foundation

enum PennyError: LocalizedError, Equatable {
    case message(String)
    var errorDescription: String? {
        switch self { case .message(let message): return message }
    }
}

enum LetterText {
    static let limit = 16_000
    static let sample = """
    Oak Street Library
    Dear reader,
    The books you reserved are ready to collect. Please bring your library card to the front desk by Friday. We are open from nine in the morning until six in the evening.
    Thank you,
    The library team
    """

    static func checked(_ text: String) throws -> String {
        let trimmed = text.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else {
            throw PennyError.message("No text found. Try a clearer, well-lit photograph or paste the text.")
        }
        guard text.count <= limit else {
            throw PennyError.message("This letter is too long. Read one page at a time, up to 16,000 characters.")
        }
        return trimmed
    }

    static func mask(_ text: String) -> String {
        text.replacingOccurrences(of: #"\b\d{2}[- ]\d{2}[- ]\d{2}\b"#, with: "••-••-••", options: .regularExpression)
            .replacingOccurrences(of: #"\b\d(?:[ -]?\d){3,}\b"#, with: "••••", options: .regularExpression)
    }

    static func chunks(_ text: String, limit: Int = 2_000) -> [String] {
        guard limit > 0 else { return [] }
        var remaining = text.trimmingCharacters(in: .whitespacesAndNewlines)[...]
        var result: [String] = []
        while !remaining.isEmpty {
            let bound = remaining.index(remaining.startIndex, offsetBy: min(limit, remaining.count))
            let prefix = remaining[..<bound]
            let end = prefix.lastIndex(of: " ").flatMap {
                remaining.distance(from: remaining.startIndex, to: $0) > limit / 2 ? $0 : nil
            } ?? bound
            result.append(String(remaining[..<end]))
            remaining = remaining[end...].drop(while: { $0.isWhitespace })
        }
        return result
    }
}

struct SavedLetter: Codable, Identifiable, Equatable, Sendable {
    var id = UUID()
    var title: String
    var text: String
    var createdAt = Date()
    var favourite = false
}

struct ReadingPreferences: Codable, Equatable, Sendable {
    var textSize = 22.0
    var speechRate = 0.5
    var quiet = false
    var maskNumbers = true

    var valid: Bool {
        [18.0, 22, 28, 34].contains(textSize) && speechRate.isFinite && (0.3...0.65).contains(speechRate)
    }
}
