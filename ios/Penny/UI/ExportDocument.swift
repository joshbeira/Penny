import SwiftUI
import UniformTypeIdentifiers

struct ExportDocument: FileDocument {
    static let readableContentTypes: [UTType] = [.plainText, .json]
    let data: Data
    init(data: Data) {
        self.data = data
    }

    init(configuration: ReadConfiguration) throws {
        data = configuration.file.regularFileContents ?? Data()
    }

    func fileWrapper(configuration _: WriteConfiguration) throws -> FileWrapper {
        FileWrapper(regularFileWithContents: data)
    }
}

struct ExportView: View {
    let file: ExportFile
    @Environment(\.dismiss) private var dismiss
    @State private var showingExporter = false
    @State private var result = ""
    var body: some View {
        NavigationStack {
            PennyPage {
                Image(systemName: "square.and.arrow.up").font(.largeTitle).foregroundStyle(PennyTheme.amber).accessibilityHidden(true)
                Text("Your copy, your choice.").font(.title.bold())
                Text("This file contains letter text or practice records. Saving to iCloud Drive or sharing through another app moves a copy outside Penny. Delete exported copies separately.")
                    .foregroundStyle(PennyTheme.muted)
                Text(file.name).font(.headline)
                Button("Save to Files") { showingExporter = true }.buttonStyle(PennyButtonStyle(primary: true))
                if !file.json, let text = String(data: file.data, encoding: .utf8) {
                    ShareLink(item: text) { Label("Share text", systemImage: "square.and.arrow.up") }.buttonStyle(PennyButtonStyle())
                }
                if !result.isEmpty {
                    Text(result).accessibilityIdentifier("export-result")
                }
            }
            .navigationTitle("Export")
            .toolbar { ToolbarItem(placement: .confirmationAction) { Button("Done") { dismiss() } } }
            .fileExporter(isPresented: $showingExporter, document: ExportDocument(data: file.data), contentType: file.json ? .json : .plainText, defaultFilename: file.name) { outcome in
                switch outcome {
                case .success: result = "Export saved."
                case .failure: result = "The export was not saved. Try another location."
                }
            }
        }
        .preferredColorScheme(.dark)
        .tint(PennyTheme.amber)
        .modifier(PrivacyShield())
    }
}
