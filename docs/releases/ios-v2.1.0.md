Penny now has a native **SwiftUI iPhone and iPad client** for iOS 17 or later.

This is a **developer preview**, with source and a build for the Apple Silicon iOS Simulator. It is not a signed iPhone download. Public TestFlight and App Store distribution have not been configured. [Use the web app on your iPhone](https://joshbeira.github.io/Penny/) or follow the [native build guide](https://github.com/joshbeira/Penny/blob/main/docs/IOS.md).

### Included

- Camera and system photo-picker import, local Apple Vision OCR, correction and paste.
- Installed English system speech, text size and reading speed, Quiet Mode and optional on-device voice commands.
- An explicit private letter library with search, favourites, reopening, Files export, sharing and deletion.
- Atomic, actor-serialised local storage with iOS file protection, backup exclusion and recovery when the archive is damaged.
- Banking practice with spoken overviews, sound cues, haptics, confirmation and SHA-256-linked receipts. No real financial actions occur.
- Native OCR/storage tests, simulator user journeys, evidence screenshots and an unsigned device archive check in macOS CI.

### Run the preview

On a Mac with Xcode, clone the tagged source and run `xcodegen generate --spec ios/project.yml`, then open `ios/Penny.xcodeproj`. Select Penny and an iPhone or iPad simulator.

The attached simulator ZIP is for an **Apple Silicon Mac** with a compatible iOS Simulator runtime. Extract `Penny.app` and drag it into a booted simulator. It cannot be installed on a physical iPhone. Personal-device installation needs your Xcode signing team; TestFlight distribution needs an Apple Developer Program team and App Store Connect setup.

Read [the signing and distribution guide](https://github.com/joshbeira/Penny/blob/main/docs/IOS.md#testflight-and-app-store-handoff) before inviting iPhone testers. Physical-camera, VoiceOver, installed-voice and signed-update testing remain on the [device checklist](https://github.com/joshbeira/Penny/blob/main/docs/TESTING.md).

Web and Android stay at their published 2.0.0 releases. No user-adoption figures are claimed.
