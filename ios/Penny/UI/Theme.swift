import SwiftUI

enum PennyTheme {
    static let background = Color(red: 0.04, green: 0.06, blue: 0.07)
    static let surface = Color(red: 0.10, green: 0.13, blue: 0.15)
    static let amber = Color(red: 1, green: 0.72, blue: 0.01)
    static let muted = Color(red: 0.75, green: 0.79, blue: 0.82)
}

struct PennyPage<Content: View>: View {
    @EnvironmentObject private var model: PennyModel
    @ViewBuilder let content: Content
    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 24) { content }
                .frame(maxWidth: 660, alignment: .leading)
                .padding(20)
                .frame(maxWidth: .infinity)
        }
        .accessibilityIdentifier("page-scroll")
        .background(PennyTheme.background)
        .scrollDismissesKeyboard(.interactively)
        .safeAreaInset(edge: .top, spacing: 0) {
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
}

struct PennyCard<Content: View>: View {
    @ViewBuilder let content: Content
    var body: some View {
        VStack(alignment: .leading, spacing: 14) { content }
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(20)
            .background(PennyTheme.surface, in: RoundedRectangle(cornerRadius: 22))
    }
}

struct PennyButtonStyle: ButtonStyle {
    var primary = false
    @Environment(\.isEnabled) private var enabled
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.headline)
            .multilineTextAlignment(.center)
            .padding(.horizontal, 16).padding(.vertical, 15)
            .frame(maxWidth: .infinity, minHeight: 50)
            .foregroundStyle(primary ? Color.black : PennyTheme.amber)
            .background(primary ? PennyTheme.amber : PennyTheme.surface, in: RoundedRectangle(cornerRadius: 18))
            .opacity(enabled ? (configuration.isPressed ? 0.75 : 1) : 0.45)
    }
}

struct Eyebrow: View {
    let text: String
    var body: some View {
        Text(text.uppercased()).font(.caption.weight(.semibold)).tracking(1.2).foregroundStyle(PennyTheme.amber)
    }
}

struct PrivacyShield: ViewModifier {
    @Environment(\.scenePhase) private var phase
    func body(content: Content) -> some View {
        content.overlay {
            if phase != .active {
                ZStack {
                    PennyTheme.background.ignoresSafeArea()
                    Label("Penny · Private on your device", systemImage: "lock.fill")
                        .font(.title3.bold()).foregroundStyle(PennyTheme.amber)
                }.accessibilityHidden(true)
            }
        }
    }
}

struct ReadingControls: View {
    @EnvironmentObject private var model: PennyModel
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Letter text size").font(.headline)
            Picker("Letter text size", selection: Binding(get: { model.preferences.textSize }, set: { value in
                var preferences = model.preferences; preferences.textSize = value
                Task { await model.setPreferences(preferences) }
            })) {
                Text("Comfortable").tag(18.0)
                Text("Large").tag(22.0)
                Text("Larger").tag(28.0)
                Text("Largest").tag(34.0)
            }
            .accessibilityIdentifier("text-size")
            Text("Reading speed").font(.headline)
            Picker("Reading speed", selection: Binding(get: { model.preferences.speechRate }, set: { value in
                var preferences = model.preferences; preferences.speechRate = value
                Task { await model.setPreferences(preferences) }
            })) {
                Text("Slower").tag(0.3)
                Text("Gentle").tag(0.4)
                Text("Normal").tag(0.5)
                Text("Faster").tag(0.6)
            }
        }
        .pickerStyle(.menu)
        .disabled(model.busy || model.storageUnavailable || !model.loaded)
    }
}
