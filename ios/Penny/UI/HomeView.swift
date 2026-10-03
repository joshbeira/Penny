import SwiftUI

struct HomeView: View {
    @EnvironmentObject private var model: PennyModel
    var body: some View {
        PennyPage {
            Text("penny").font(.largeTitle.weight(.heavy)).foregroundStyle(PennyTheme.amber).accessibilityAddTraits(.isHeader)
            Eyebrow(text: "Every letter. A little clearer.")
            Text("A little clarity.\nA lot more independence.").font(.largeTitle.bold()).fixedSize(horizontal: false, vertical: true)
            Text("Read everyday letters with your eyes, your ears, or both. Your pace. Your device.").font(.title3).foregroundStyle(PennyTheme.muted)
            Button { model.tab = .read } label: { Label("Read a letter", systemImage: "doc.text.viewfinder") }
                .buttonStyle(PennyButtonStyle(primary: true)).accessibilityIdentifier("read-letter")
            PennyCard {
                Label("Private by design", systemImage: "lock.shield").font(.title2.bold())
                Text("No account. No photo uploads. Letter recognition runs on this device.").foregroundStyle(PennyTheme.muted)
                Text("Photograph → review → listen → keep").font(.headline).foregroundStyle(PennyTheme.amber)
            }
            Button { model.tab = .library } label: { Label("Your library · \(model.archive.letters.count) saved", systemImage: "books.vertical") }
                .buttonStyle(PennyButtonStyle())
            PennyCard {
                Text("Start with a sample.").font(.title2.bold())
                Text("Try reading and saving a fictional library letter. No personal post needed.").foregroundStyle(PennyTheme.muted)
                Button("Try a sample letter") { model.sample() }.buttonStyle(PennyButtonStyle())
            }
            NavigationLink(value: PennyRoute.practice) { Label("Explore the banking sandbox", systemImage: "waveform.path") }
                .buttonStyle(PennyButtonStyle())
            Text("English printed letters · iPhone and iPad\nBanking examples are simulations.").font(.footnote).foregroundStyle(PennyTheme.muted)
        }
        .navigationTitle("")
        .navigationBarTitleDisplayMode(.inline)
    }
}
