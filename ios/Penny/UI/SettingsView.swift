import SwiftUI

struct SettingsView: View {
    @EnvironmentObject private var model: PennyModel
    @State private var deleteLetters = false
    @State private var reset = false
    var body: some View {
        PennyPage {
            Eyebrow(text: "Make Penny yours")
            ReadingControls()
            PennyCard {
                Toggle("Quiet Mode", isOn: preference(\.quiet))
                Text("Keep Penny’s speech silent. Visible feedback stays available.").font(.footnote).foregroundStyle(PennyTheme.muted)
                Toggle("Mask number sequences", isOn: preference(\.maskNumbers))
                Text("For new photos only. Hides long numbers and sort codes; may hide dates and miss personal details.").font(.footnote).foregroundStyle(PennyTheme.muted)
            }.disabled(model.busy || model.storageUnavailable || !model.loaded)
            PennyCard {
                Label("Your privacy, in plain English", systemImage: "lock.shield").font(.title2.bold())
                Text("Recognition runs on this device. Penny has no accounts, ads, analytics or cloud document processing. Photos taken here are not saved to Photos.")
                Text("Saved text uses iOS file protection and is excluded from device backups. Anyone who can unlock your device and open Penny can read it. Exporting or sharing creates a separate copy.").foregroundStyle(PennyTheme.muted)
                Text("Unsaved text survives ordinary navigation and rotation, but not app termination. There is no cross-device sync.").foregroundStyle(PennyTheme.muted)
            }
            PennyCard {
                Text("Speech and voice commands").font(.title2.bold())
                Text("Read-aloud uses an installed English system voice. Manage voices in iOS Settings → Accessibility → Spoken Content (or Read & Speak).")
                Text("Talk to Penny appears when on-device English recognition is supported. Microphone and Speech permissions are requested only when you tap it. No online fallback is used.").foregroundStyle(PennyTheme.muted)
            }
            if model.storageUnavailable {
                PennyCard {
                    Text("Recover your library").font(.title2.bold())
                    Text("The existing file has been kept. Export a recovery copy before resetting; resetting deletes all local letters, preferences and receipts.")
                    Button("Retry opening library") { Task { await model.retryStorage() } }.buttonStyle(PennyButtonStyle())
                    Button("Export recovery copy") { Task { await model.exportRecovery() } }.buttonStyle(PennyButtonStyle())
                    Button("Reset local data", role: .destructive) { reset = true }.frame(minHeight: 44)
                }
            }
            NavigationLink(value: PennyRoute.practice) { Label("Banking sandbox", systemImage: "waveform.path") }.buttonStyle(PennyButtonStyle())
            Link("Share feedback", destination: URL(string: "https://github.com/joshbeira/Penny/issues/new?template=feedback.yml")!).buttonStyle(PennyButtonStyle())
            Link("Privacy and user guide", destination: URL(string: "https://github.com/joshbeira/Penny/blob/main/docs/IOS.md")!).buttonStyle(PennyButtonStyle())
            Button("Delete all saved letters", role: .destructive) { deleteLetters = true }
                .frame(minHeight: 44).disabled(model.archive.letters.isEmpty || model.busy)
            Text("Penny for iOS · \(Bundle.main.object(forInfoDictionaryKey: "CFBundleShortVersionString") as? String ?? "2.1.0")\nBuilt by Josh Beira. English printed letters.").font(.footnote).foregroundStyle(PennyTheme.muted)
        }
        .navigationTitle("Preferences").navigationBarTitleDisplayMode(.inline)
        .confirmationDialog("Delete every saved letter on this device?", isPresented: $deleteLetters, titleVisibility: .visible) {
            Button("Delete all letters", role: .destructive) { Task { await model.deleteLetters() } }
        } message: { Text("Exported copies and practice receipts are unaffected.") }
        .confirmationDialog("Reset all Penny data on this device?", isPresented: $reset, titleVisibility: .visible) {
            Button("Reset local data", role: .destructive) { Task { await model.resetStorage() } }
        } message: { Text("This deletes the current library file, preferences and receipts. Keep a recovery export first if you need it.") }
    }

    private func preference(_ key: WritableKeyPath<ReadingPreferences, Bool>) -> Binding<Bool> {
        Binding(get: { model.preferences[keyPath: key] }, set: { value in
            var next = model.preferences
            next[keyPath: key] = value
            Task { await model.setPreferences(next) }
        })
    }
}
