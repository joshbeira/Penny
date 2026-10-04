import CryptoKit
import Foundation

struct Receipt: Codable, Identifiable, Equatable, Sendable {
    static let genesis = String(repeating: "0", count: 64)
    var id = UUID()
    let ts: String
    let action: String
    var details: String
    let method: String
    let prevHash: String
    var hash: String

    var digest: String {
        SHA256.hash(data: Data("\(prevHash)|\(ts)|\(action)|\(details)|\(method)".utf8))
            .map { String(format: "%02x", $0) }.joined()
    }

    static func make(action: String, details: String, previous: String) -> Receipt {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        var entry = Receipt(ts: formatter.string(from: Date()), action: action, details: details,
                            method: "button", prevHash: previous, hash: "")
        entry.hash = entry.digest
        return entry
    }

    static func verify(_ entries: [Receipt]) -> Bool {
        var previous = genesis
        var ids = Set<UUID>()
        for entry in entries {
            guard ids.insert(entry.id).inserted, entry.prevHash == previous, entry.hash == entry.digest else { return false }
            previous = entry.hash
        }
        return true
    }
}

enum PracticeAction: String, Identifiable {
    case flag, card
    var id: String {
        rawValue
    }

    var title: String {
        self == .flag ? "Flag sample payment" : "Request sample replacement card"
    }

    var details: String {
        self == .flag ? "Flag the sample £79.00 payment to Unfamiliar merchant for review. No real payment is affected."
            : "Record a practice replacement-card request. No card will be ordered."
    }
}
