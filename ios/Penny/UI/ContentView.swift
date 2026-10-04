import AVFoundation
import SwiftUI
import UIKit

struct ContentView: View {
    @EnvironmentObject private var model: PennyModel
    @Environment(\.scenePhase) private var phase
    var body: some View {
        TabView(selection: Binding(get: { model.tab }, set: { model.stopAudio(); model.tab = $0 })) {
            PennyNavigation(path: $model.path) { HomeView() }
                .tabItem { Label("Home", systemImage: "house") }.tag(PennyTab.home)
            PennyNavigation { ReaderView() }
                .tabItem { Label("Read", systemImage: "doc.text.viewfinder") }.tag(PennyTab.read)
            PennyNavigation { LibraryView() }
                .tabItem { Label("Library", systemImage: "books.vertical") }.tag(PennyTab.library)
            PennyNavigation { SettingsView() }
                .tabItem { Label("Settings", systemImage: "gearshape") }.tag(PennyTab.settings)
        }
        .toolbarBackground(PennyTheme.surface, for: .tabBar)
        .toolbarBackground(.visible, for: .tabBar)
        .sheet(item: $model.export) { ExportView(file: $0) }
        .task { await model.load() }
        .onChange(of: model.message) { _, message in
            if !message.isEmpty, UIAccessibility.isVoiceOverRunning {
                UIAccessibility.post(notification: .announcement, argument: message)
            }
        }
        .onChange(of: phase) { _, phase in
            if phase == .background {
                model.stopAudio(); model.cancelReading()
            }
        }
        .onReceive(NotificationCenter.default.publisher(for: AVAudioSession.interruptionNotification)) { _ in model.stopAudio() }
        .modifier(PrivacyShield())
    }
}

private struct PennyNavigation<Content: View>: View {
    @EnvironmentObject private var model: PennyModel
    @State private var localPath: [PennyRoute] = []
    var path: Binding<[PennyRoute]>?
    @ViewBuilder let content: Content

    var body: some View {
        NavigationStack(path: path ?? $localPath) {
            content
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
        }
    }
}

private struct VoiceControl: View {
    @EnvironmentObject private var model: PennyModel
    @ObservedObject var voice: VoiceCommands
    var body: some View {
        if voice.available {
            Button {
                if voice.listening {
                    voice.stop()
                } else {
                    Task { await model.talk() }
                }
            } label: { Image(systemName: voice.listening ? "mic.slash" : "mic") }
                .accessibilityLabel(voice.listening ? "Stop listening" : "Talk to Penny")
                .accessibilityHint("Listens for one command using on-device speech recognition")
        }
    }
}
