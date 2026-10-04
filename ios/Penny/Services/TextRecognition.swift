import CoreTransferable
import Foundation
import ImageIO
import UniformTypeIdentifiers
import Vision

struct ImportedPhoto: Transferable, Sendable {
    static let byteLimit = 30_000_000
    let data: Data
    static var transferRepresentation: some TransferRepresentation {
        FileRepresentation(importedContentType: .image) { received in
            let handle = try FileHandle(forReadingFrom: received.file)
            defer { try? handle.close() }
            let data = try handle.read(upToCount: byteLimit + 1) ?? Data()
            guard data.count <= byteLimit else { throw PennyError.message("Choose a photo smaller than 30 MB.") }
            return ImportedPhoto(data: data)
        }
    }
}

protocol TextRecognizing: Sendable {
    func recognize(_ data: Data) async throws -> String
}

struct TextRecognition: TextRecognizing {
    func recognize(_ data: Data) async throws -> String {
        let job = RecognitionJob()
        return try await withTaskCancellationHandler {
            try await withCheckedThrowingContinuation { job.start(data, continuation: $0) }
        } onCancel: {
            job.cancel()
        }
    }
}

/// The lock protects cancellation, the Vision request and exactly-once continuation completion.
private final class RecognitionJob: @unchecked Sendable {
    private static let queue = DispatchQueue(label: "penny.vision", qos: .userInitiated)
    private let lock = NSLock()
    private var continuation: CheckedContinuation<String, Error>?
    private var request: VNRecognizeTextRequest?
    private var ended = false

    func start(_ data: Data, continuation: CheckedContinuation<String, Error>) {
        lock.lock()
        guard !ended else { lock.unlock(); continuation.resume(throwing: CancellationError()); return }
        self.continuation = continuation
        lock.unlock()
        Self.queue.async { self.perform(data) }
        DispatchQueue.global().asyncAfter(deadline: .now() + 45) { [weak self] in
            self?.finish(.failure(PennyError.message("Reading took too long. Try a smaller, clearer photo.")))
        }
    }

    func cancel() {
        finish(.failure(CancellationError()))
    }

    private func finish(_ result: Result<String, Error>) {
        lock.lock()
        guard !ended else { lock.unlock(); return }
        ended = true
        let continuation = continuation
        self.continuation = nil
        let request = request
        self.request = nil
        lock.unlock()
        request?.cancel()
        continuation?.resume(with: result)
    }

    private func perform(_ data: Data) {
        lock.lock()
        let cancelled = ended
        lock.unlock()
        guard !cancelled else { return }
        do {
            guard !data.isEmpty, data.count <= ImportedPhoto.byteLimit,
                  let source = CGImageSourceCreateWithData(data as CFData, nil),
                  let image = CGImageSourceCreateThumbnailAtIndex(source, 0, [
                      kCGImageSourceCreateThumbnailFromImageAlways: true,
                      kCGImageSourceCreateThumbnailWithTransform: true,
                      kCGImageSourceThumbnailMaxPixelSize: 2400,
                      kCGImageSourceShouldCacheImmediately: true,
                  ] as CFDictionary)
            else {
                throw PennyError.message("This photo could not be opened. Choose a JPEG, PNG or HEIC image.")
            }
            let request = VNRecognizeTextRequest()
            request.recognitionLevel = .accurate
            request.usesLanguageCorrection = true
            let supported = try request.supportedRecognitionLanguages()
            guard let english = supported.first(where: { $0 == "en-GB" }) ?? supported.first(where: { $0.hasPrefix("en") }) else {
                throw PennyError.message("English text recognition is unavailable on this device.")
            }
            request.recognitionLanguages = [english]
            lock.lock()
            guard !ended else { lock.unlock(); return }
            self.request = request
            lock.unlock()
            try VNImageRequestHandler(cgImage: image, options: [:]).perform([request])
            let text = (request.results ?? []).compactMap { $0.topCandidates(1).first?.string }.joined(separator: "\n")
            try finish(.success(LetterText.checked(text)))
        } catch { finish(.failure(error)) }
    }
}
