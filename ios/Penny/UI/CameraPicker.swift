import AVFoundation
import SwiftUI
import UIKit

struct CameraPicker: UIViewControllerRepresentable {
    let finished: (Result<Data?, Error>) -> Void

    func makeUIViewController(context: Context) -> UIImagePickerController {
        let controller = UIImagePickerController()
        controller.sourceType = .camera
        controller.cameraCaptureMode = .photo
        controller.delegate = context.coordinator
        return controller
    }
    func updateUIViewController(_ uiViewController: UIImagePickerController, context: Context) {}
    func makeCoordinator() -> Coordinator { Coordinator(finished: finished) }

    final class Coordinator: NSObject, UIImagePickerControllerDelegate, UINavigationControllerDelegate {
        let finished: (Result<Data?, Error>) -> Void
        init(finished: @escaping (Result<Data?, Error>) -> Void) { self.finished = finished }
        func imagePickerControllerDidCancel(_ picker: UIImagePickerController) { finished(.success(nil)) }
        func imagePickerController(_ picker: UIImagePickerController, didFinishPickingMediaWithInfo info: [UIImagePickerController.InfoKey: Any]) {
            guard let image = info[.originalImage] as? UIImage else {
                finished(.failure(PennyError.message("The camera did not return a photo."))); return
            }
            let ratio = min(1, 2_400 / max(image.size.width, image.size.height))
            let size = CGSize(width: image.size.width * ratio, height: image.size.height * ratio)
            let format = UIGraphicsImageRendererFormat()
            format.scale = 1
            format.opaque = true
            let normalized = UIGraphicsImageRenderer(size: size, format: format).image { _ in image.draw(in: CGRect(origin: .zero, size: size)) }
            guard let data = normalized.jpegData(compressionQuality: 0.9) else {
                finished(.failure(PennyError.message("The camera photo could not be opened."))); return
            }
            // No UIImageWriteToSavedPhotosAlbum, temporary file or photo-library write.
            finished(.success(data))
        }
    }
}
