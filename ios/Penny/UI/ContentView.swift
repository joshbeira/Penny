import AVFoundation
import SwiftUI

struct ContentView: View {
    @EnvironmentObject private var model: PennyModel
    @Environment(\.scenePhase) private var phase
    var body: some View {
        NavigationStack(path: $model.path) {
            TabView(selection: $model.tab) {
                HomeView().tabItem { Label("Home", systemImage: "house") }.tag(PennyTab.home)
                ReaderView().tabItem { Label("Read", systemImage: "doc.text.viewfinder") }.tag(PennyTab.read)
                LibraryView().tabItem { Label("Library", systemImage: "books.vertical") }.tag(PennyTab.library)
                SettingsView().tabItem { Label("Settings", systemImage: "gearshape") }.tag(PennyTab.settings)
            }
            .toolbarBackground(PennyTheme.surface, for: .tabBar)
            .toolbarBackground(.visible, for: .tabBar)
            .navigationDestination(for: PennyRoute.self) { route in
                switch route { case .practice: PracticeView(); case .receipts: ReceiptsView() }
            }
            .toolbar {
                ToolbarItemGroup(placement: .topBarTrailing) {
                    VoiceControl(voice: model.voice)
                    Button { model.stopAudio(); model.message = "Stopped." } label: { Image(systemName: "stop.circle") }
                        .accessibilityLabel("Stop all audio")
                }
            }
            .safeAreaInset(edge: .bottom, spacing: 0) {
                if !model.message.isEmpty {
                    HStack(alignment: .top, spacing: 12) {
                        Text(model.message).font(.callout).accessibilityIdentifier("status-message")
                        Spacer(minLength: 0)
                        Button { model.message = "" } label: { Image(systemName: "xmark").frame(minWidth: 44, minHeight: 44) }
                            .accessibilityLabel("Dismiss message")
                    }
                    .padding(.leading, 16).padding(.vertical, 8)
                    .background(PennyTheme.surface)
                }
            }
        }
        .sheet(item: $model.export) { ExportView(file: $0) }
        .task { await model.load() }
        .onChange(of: model.tab) { _, _ in model.stopAudio() }
        .onChange(of: phase) { _, phase in
            if phase == .background { model.stopAudio(); model.cancelReading() }
        }
        .onReceive(NotificationCenter.default.publisher(for: AVAudioSession.interruptionNotification)) { _ in model.stopAudio() }
        .overlay {
            if phase != .active {
                ZStack {
                    PennyTheme.background.ignoresSafeArea()
                    Label("Penny · Private on your device", systemImage: "lock.fill").font(.title3.bold()).foregroundStyle(PennyTheme.amber)
                }
                .accessibilityHidden(true)
            }
        }
    }
}

private struct VoiceControl: View {
    @EnvironmentObject private var model: PennyModel
    @ObservedObject var voice: VoiceCommands
    var body: some View {
        if voice.available {
            Button {
                if voice.listening { voice.stop() } else { Task { await model.talk() } }
            } label: { Image(systemName: voice.listening ? "mic.slash" : "mic") }
                .accessibilityLabel(voice.listening ? "Stop listening" : "Talk to Penny")
                .accessibilityHint("Listens for one command using on-device speech recognition")
        }
    }
}
