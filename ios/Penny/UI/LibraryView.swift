import SwiftUI

struct LibraryView: View {
    @EnvironmentObject private var model: PennyModel
    @State private var query = ""
    @State private var favourites = false
    @State private var deleting: SavedLetter?
    private var filtered: [SavedLetter] {
        model.archive.letters.filter {
            (!favourites || $0.favourite) && (query.isEmpty || $0.title.localizedCaseInsensitiveContains(query) || $0.text.localizedCaseInsensitiveContains(query))
        }
    }
    var body: some View {
        PennyPage {
            Eyebrow(text: "Your words, kept close")
            Text("Saved only on this device. Photos are never saved in your library. Deleting the app removes these letters.").foregroundStyle(PennyTheme.muted)
            TextField("Search letters", text: $query).textFieldStyle(.roundedBorder).accessibilityIdentifier("library-search")
            Toggle("Favourites only", isOn: $favourites)
            if model.storageUnavailable {
                Text("Your saved library is unavailable. It has not been overwritten. Open Settings to recover it.")
            } else if !model.loaded {
                ProgressView("Opening library…")
            } else if filtered.isEmpty {
                ContentUnavailableView(query.isEmpty && !favourites ? "Your next letter belongs here." : "No matching letters", systemImage: "books.vertical", description: Text("Save reviewed text from the reader, then find it here whenever you need it."))
            }
            ForEach(filtered) { letter in
                PennyCard {
                    Text(letter.title).font(.title2.bold()).accessibilityAddTraits(.isHeader)
                    Text(letter.createdAt, style: .date).font(.footnote).foregroundStyle(PennyTheme.muted)
                    Text(letter.text).lineLimit(3).foregroundStyle(PennyTheme.muted)
                    Button("Open letter") { model.open(letter) }.buttonStyle(PennyButtonStyle(primary: true))
                    Button { Task { await model.favourite(letter) } } label: {
                        Label(letter.favourite ? "Remove favourite" : "Add favourite", systemImage: letter.favourite ? "star.fill" : "star")
                    }.buttonStyle(PennyButtonStyle()).disabled(model.busy)
                    Button("Delete \(letter.title)", role: .destructive) { deleting = letter }.frame(minHeight: 44).disabled(model.busy)
                }
            }
            if !model.archive.letters.isEmpty {
                Button("Export library") { model.exportLibrary() }.buttonStyle(PennyButtonStyle())
            }
        }
        .navigationTitle("Your library").navigationBarTitleDisplayMode(.inline)
        .confirmationDialog("Delete this saved letter?", isPresented: Binding(get: { deleting != nil }, set: { if !$0 { deleting = nil } }), titleVisibility: .visible) {
            Button("Delete letter", role: .destructive) {
                if let letter = deleting { Task { await model.delete(letter) } }
                deleting = nil
            }
        } message: { Text("It will be removed from this device library. Exported copies are unaffected.") }
    }
}
