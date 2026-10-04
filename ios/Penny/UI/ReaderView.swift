import AVFoundation
import PhotosUI
import SwiftUI

struct ReaderView: View {
    @EnvironmentObject private var model: PennyModel
    @Environment(\.verticalSizeClass) private var heightClass
    @ScaledMetric(relativeTo: .body) private var textScale = 1.0
    @State private var photo: PhotosPickerItem?
    @State private var showCamera = false
    @State private var showSave = false
    @State private var showClear = false
    @State private var title = ""
    @State private var morePhotos = false
    @FocusState private var editing: Bool

    var body: some View {
        PennyPage {
            if model.text.isEmpty || morePhotos {
                Text("Make the small print speak.").font(.title.bold())
                Text("Photograph a printed English letter, choose a photo, or paste text below. Check names, dates and amounts against the original.").foregroundStyle(PennyTheme.muted)
                Button { Task { await openCamera() } } label: { Label("Photograph a letter", systemImage: "camera") }
                    .buttonStyle(PennyButtonStyle(primary: true)).disabled(model.recognizing)
                PhotosPicker(selection: $photo, matching: .images, photoLibrary: .shared()) {
                    Label("Choose a photo", systemImage: "photo")
                }.buttonStyle(PennyButtonStyle()).disabled(model.recognizing)
                Button("Try a sample letter") { model.sample(); morePhotos = false }
                    .buttonStyle(PennyButtonStyle()).accessibilityIdentifier("sample-letter")
            }
            if model.recognizing {
                ProgressView("Reading on your device…").tint(PennyTheme.amber)
                Button("Cancel reading") { model.cancelReading(); model.message = "Reading cancelled." }.buttonStyle(PennyButtonStyle())
            }
            if !model.text.isEmpty {
                Text(model.source).font(.footnote).foregroundStyle(PennyTheme.muted)
                Button { editing = false; model.readAloud() } label: { Label("Read aloud", systemImage: "speaker.wave.2") }
                    .buttonStyle(PennyButtonStyle(primary: true)).disabled(model.recognizing)
                Button("Stop reading") { model.stopAudio() }.buttonStyle(PennyButtonStyle())
            }
            VStack(alignment: .leading, spacing: 10) {
                Text("Letter text · tap to correct or paste").font(.headline)
                TextEditor(text: Binding(get: { model.text }, set: { model.edit($0) }))
                    .font(.system(size: model.preferences.textSize * textScale))
                    .lineSpacing(6)
                    .frame(minHeight: heightClass == .compact ? 160 : 230, maxHeight: heightClass == .compact ? 160 : 440)
                    .padding(10)
                    .scrollContentBackground(.hidden)
                    .background(PennyTheme.surface, in: RoundedRectangle(cornerRadius: 16))
                    .overlay(RoundedRectangle(cornerRadius: 16).stroke(PennyTheme.muted.opacity(0.5)))
                    .focused($editing)
                    .accessibilityLabel("Letter text")
                    .accessibilityIdentifier("letter-text")
                    .disabled(model.recognizing)
                Text("\(model.text.count.formatted()) / 16,000 characters · not saved automatically").font(.footnote).foregroundStyle(PennyTheme.muted)
            }
            ReadingControls()
            if !model.text.isEmpty {
                Button("Save to library") {
                    editing = false
                    title = String(model.text.split(separator: "\n").first.map(String.init)?.prefix(100) ?? "Letter"[...])
                    showSave = true
                }
                .buttonStyle(PennyButtonStyle(primary: true)).accessibilityIdentifier("save-to-library")
                .disabled(model.busy || model.storageUnavailable || !model.loaded || model.recognizing)
                Button("Export or share text") { editing = false; model.exportText() }.buttonStyle(PennyButtonStyle())
                Button(morePhotos ? "Hide photo controls" : "Read another photo") { morePhotos.toggle() }.buttonStyle(PennyButtonStyle())
                Button("Clear this reading", role: .destructive) { showClear = true }.frame(minHeight: 44)
            }
            Text(model.preferences.maskNumbers ? "Number masking is on for new photos. It can hide dates and miss personal details. Change it in Settings. Corrections and pasted text stay as entered." : "Number masking is off. Review sensitive details before exporting or sharing.")
                .font(.footnote).foregroundStyle(PennyTheme.muted)
        }
        .navigationTitle("Read a letter").navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItemGroup(placement: .keyboard) { Spacer(); Button("Done editing") { editing = false } }
        }
        .onChange(of: photo) { _, item in
            if let item {
                model.importPhoto(item); photo = nil; morePhotos = false
            }
        }
        .sheet(isPresented: $showCamera) {
            CameraPicker { result in
                showCamera = false
                switch result {
                case let .success(data): if let data {
                        model.recognize(data); morePhotos = false
                    }
                case let .failure(error): model.message = error.localizedDescription
                }
            }.ignoresSafeArea().modifier(PrivacyShield())
        }
        .alert("Save on this device", isPresented: $showSave) {
            TextField("Letter title", text: $title).accessibilityIdentifier("letter-title")
            Button("Cancel", role: .cancel) {}
            Button("Save letter") { Task { await model.save(title: title) } }
        } message: {
            Text("Only reviewed text is saved. Anyone who can unlock this device and open Penny can read it. Use a title of up to 100 characters.")
        }
        .confirmationDialog("Clear the current reading? Unsaved changes will be lost.", isPresented: $showClear, titleVisibility: .visible) {
            Button("Clear reading", role: .destructive) { model.clear() }
        }
    }

    private func openCamera() async {
        guard UIImagePickerController.isSourceTypeAvailable(.camera) else {
            model.message = "A camera is unavailable here. Choose a photo or paste text instead."; return
        }
        let granted = await AVCaptureDevice.requestAccess(for: .video)
        if granted {
            showCamera = true
        } else {
            model.message = "Camera access is off. Enable it in iOS Settings → Penny, or choose a photo instead."
        }
    }
}
