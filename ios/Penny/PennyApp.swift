import SwiftUI

@main
struct PennyApp: App {
    @StateObject private var model: PennyModel

    init() {
        #if DEBUG
        if ProcessInfo.processInfo.arguments.contains("--uitesting") {
            let directory = LibraryStore.applicationDirectory().appendingPathComponent("UITests")
            if ProcessInfo.processInfo.arguments.contains("--reset-test-data") {
                // Only the dedicated debug UI-test container is ever removed here.
                try? FileManager.default.removeItem(at: directory)
            }
            _model = StateObject(wrappedValue: PennyModel(store: LibraryStore(directory: directory)))
            return
        }
        #endif
        _model = StateObject(wrappedValue: PennyModel())
    }

    var body: some Scene {
        WindowGroup { ContentView().environmentObject(model).preferredColorScheme(.dark).tint(PennyTheme.amber) }
    }
}
