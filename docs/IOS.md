# Penny for iPhone and iPad

A native **SwiftUI app for iOS 17 or later**, using Apple Vision for on-device English text recognition. No account, API key or Penny server is needed.

The iOS client is a developer preview. Source, simulator checks and build instructions are available in this repository. **There is no public TestFlight or App Store download yet.** The Android APK cannot be installed on an iPhone. You can use the [web app](https://joshbeira.github.io/Penny/) on iPhone today.

## Use Penny

1. Open **Read a letter**, then try the fictional sample or photograph your own printed page.
2. **Choose a photo** uses the system picker; it does not grant Penny access to your whole photo library. Camera permission is requested when you choose to photograph a letter.
3. Check the recognised names, dates and amounts. Tap **Letter text** to correct, type or paste. Recognition errors never substitute a sample.
4. Choose **Read aloud**, **Stop reading**, a text size and a reading speed. Speech needs an installed English system voice. Manage voices in iOS Settings → Accessibility → Spoken Content (or Read & Speak).
5. **Save to library** asks for a title and explicit confirmation. Search, favourite, reopen, export or delete saved text. Saving edits to an existing letter creates a new copy.
6. **Export or share text** lets you save through Files or use the system share sheet. A cloud drive or receiving app handles any copy you send there.

Quiet Mode, number masking and recovery controls are in Settings. The banking sandbox includes a spoken account overview, a sample week as speech or tones, haptics, alternative presentations, action confirmation and verifiable practice receipts. All banking data and actions are simulations.

**Talk to Penny** appears only when the device supports on-device English recognition. Microphone and Speech permissions are requested on tap. Each session is bounded to 12 seconds and does not fall back to online recognition. Say “home”, “read a letter”, “read aloud”, “library”, “settings”, “banking”, “receipts” or “stop”. Commands never confirm a practice financial action.

## Privacy and persistence

- Apple Vision recognises the photo locally. Penny contains no networking client, analytics or cloud AI integration. Unlike Android, iOS has no equivalent internet-permission switch; this is an implementation boundary.
- Camera images remain transient in memory and are not added to Photos. The system picker may fetch an iCloud-only original under the user's Photos settings; Penny does not upload it. Existing selected photos are unchanged.
- Recognition downsamples images, applies orientation metadata and has a 45-second deadline. Replacing, clearing or cancelling a reading invalidates late results.
- Up to 100 letters of 16,000 characters each are stored in the app container. Storage uses a versioned JSON archive, serialised through a Swift actor and written atomically with iOS complete file protection. Its directory is excluded from backups.
- Saved text remains visible to anyone who can unlock the device and open Penny. There is no separate Penny password or biometric lock. Exported copies have the destination's protection and retention rules.
- Navigation and rotation preserve the current reading in memory. Process termination does not. Save explicitly to keep it. Deleting the app removes its local library. No sync is provided.
- When the archive cannot be read, it is preserved and new writes are blocked. Settings provides retry, recovery export and an explicitly confirmed reset.
- Speech and microphone sessions stop when Penny enters the background. The app switcher is covered with a privacy screen.

The included privacy manifest declares no tracking or collected data. Its required-reason declaration covers metadata checks on Penny's own library file. Reassess the manifest and App Store privacy answers before adding SDKs or network features.

## Run on a Mac

Use Xcode 26.3 (the CI version), its iOS SDK and [XcodeGen](https://github.com/yonaskolb/XcodeGen). The deployment target remains iOS 17. No external runtime package is needed.

```sh
git clone https://github.com/joshbeira/Penny.git
cd Penny
brew install xcodegen
xcodegen generate --spec ios/project.yml
open ios/Penny.xcodeproj
```

Choose the **Penny** scheme and an iPhone or iPad simulator, then Run. `ios/project.yml` is the source of truth; the generated Xcode project is ignored. The app identifier is `io.github.joshbeira.penny`.

For a personal iPhone, select your signing team in Xcode and choose the connected device. You may need a unique bundle identifier for your own team. Apple permits personal-device testing through a Personal Team, with provisioning limitations. See [Apple's membership comparison](https://developer.apple.com/support/compare-memberships/).

## Build and verify

```sh
xcodegen generate --spec ios/project.yml
bash scripts/ios-check.sh
```

The script selects an available iPhone simulator, runs unit/integration/UI tests, captures evidence, and creates an **unsigned device archive**. CI retains screenshots and logs as `ios-verification`, the Xcode result bundle as `ios-test-results`, and the generated project and simulator app ZIP as `ios-simulator-build`. A simulator app runs only in the matching Mac simulator environment; neither it nor an unsigned archive is an installable iPhone release.

Tests cover actual Vision recognition on a synthetic image, invalid images, archive limits, concurrent saves, persistence, failed writes, corrupt-data recovery, stale OCR results, receipt tampering, sample/library journeys, confirmation and orientation changes. See [TESTING.md](TESTING.md) for physical-device and accessibility work that still needs human verification.

## TestFlight and App Store handoff

Distribution needs an Apple Developer Program team, an App Store Connect app record and appropriate signing. This repository does not contain Apple credentials or claim a live listing. Follow [Apple's distribution guidance](https://developer.apple.com/documentation/xcode/distributing-your-app-for-beta-testing-and-releases).

1. Open the generated project and select your team. Register the bundle identifier and create the matching App Store Connect record.
2. Complete the physical-device and VoiceOver checklist, including denied camera/microphone permissions and iCloud-only photo selection.
3. Select a generic iOS device and use **Product → Archive**. Validate and distribute the signed archive through Xcode Organizer to App Store Connect.
4. Complete export-compliance, privacy, age-rating, support and beta-review information based on the actual app and current Apple requirements.
5. Start with internal TestFlight testing, then submit for external beta review before inviting external testers. Publish an invite link only after Apple makes the build available.

[IOS_RELEASE.md](IOS_RELEASE.md) contains draft listing copy and review notes. Signing, review and public distribution remain separate from the source and simulator build.
