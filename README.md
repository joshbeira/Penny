<div align="center">
  <img src="public/icon.svg" width="76" height="76" alt="Penny" />
  <h1>Penny</h1>
  <p><strong>Every letter. A little clearer.</strong></p>
  <p>A private, accessible reading companion for Android, iOS and the web.<br />Turn printed letters into words you can read, hear, correct and keep.</p>
  <p>
    <a href="https://joshbeira.github.io/Penny/">Open the web app</a> ·
    <a href="https://github.com/joshbeira/Penny/releases/tag/v2.0.0">Download Android</a> ·
    <a href="docs/IOS.md">iOS developer preview</a> ·
    <a href="docs/USER_GUIDE.md">User guide</a> ·
    <a href="https://github.com/joshbeira/Penny/issues/new?template=feedback.yml">Give feedback</a>
  </p>
  <p>
    <a href="https://github.com/joshbeira/Penny/actions/workflows/ci.yml"><img src="https://github.com/joshbeira/Penny/actions/workflows/ci.yml/badge.svg" alt="Web checks" /></a>
    <a href="https://github.com/joshbeira/Penny/actions/workflows/android.yml"><img src="https://github.com/joshbeira/Penny/actions/workflows/android.yml/badge.svg" alt="Android checks" /></a>
    <a href="https://github.com/joshbeira/Penny/actions/workflows/ios.yml"><img src="https://github.com/joshbeira/Penny/actions/workflows/ios.yml/badge.svg" alt="iOS checks" /></a>
    <img src="https://img.shields.io/badge/Kotlin-Jetpack%20Compose-7F52FF?labelColor=101418" alt="Kotlin and Jetpack Compose" />
    <img src="https://img.shields.io/badge/Swift-SwiftUI-F05138?labelColor=101418" alt="Swift and SwiftUI" />
    <img src="https://img.shields.io/badge/status-public%20beta-FFB703?labelColor=101418" alt="Public beta" />
  </p>
</div>

![Penny web home and letter reader](docs/assets/product.png)

## Small print should not get the final word

A collection notice, an appointment letter, an unfamiliar bill. Everyday post should be something you can handle at your own pace. Penny makes printed English letters readable and listenable without an account or photo uploads.

The reader is a working utility. The accompanying banking sandbox explores speech, touch, sound and explicit confirmation using synthetic accounts. **Penny is an independent public beta, not a banking service.** It does not connect to banks, move money or order real cards.

## The same private reading workflow, across platforms

The web app and Android APK are available now. The native SwiftUI iPhone/iPad app is a **developer preview** with source and simulator verification; public TestFlight and App Store distribution have not been configured.

|                                | Web / installable PWA                                                          | Native Android                                                               |
| ------------------------------ | ------------------------------------------------------------------------------ | ---------------------------------------------------------------------------- |
| **Photograph → readable text** | Bundled Tesseract worker and English model                                     | Bundled ML Kit Latin model; Kotlin + Jetpack Compose                         |
| **Read without a connection**  | After the first completed online load                                          | From first launch; no internet permission                                    |
| **Correct and keep**           | Edit OCR or paste text; explicitly save up to 100 letters                      | Edit or paste text; explicitly save up to 100 letters                        |
| **Find it again**              | Search, favourites, delete and export a browser-local library                  | Search, favourites, delete and export an app-private SQLite library          |
| **Read at your pace**          | Four text sizes, speech speed, local device voices, stop and Quiet Mode        | Adjustable text and speech speed, offline device voices, stop and Quiet Mode |
| **Accessible practice**        | Sonification, voice navigation, haptics, confirmation and receipt verification | Spoken overview, sound cues, haptics, confirmation and receipt verification  |
| **Voice navigation**           | Browser-dependent recognition; may use an online service                       | On-device recognition on supported Android 12+ devices; tap to listen        |
| **AI summaries**               | Optional on configured server deployments, with per-letter consent             | Not included; Android reading stays entirely on-device                       |

Libraries stay on their own device/browser. There is no sync, automatic document upload or application analytics. Exports give you a portable copy. [Read the privacy model](docs/PRIVACY.md).

![Penny Android home, letter reader and saved-letter library in airplane mode](docs/assets/android.png)

### Native iPhone and iPad

The iOS 17+ client uses **SwiftUI, Apple Vision, AVFoundation and Swift actors**. It includes camera/photo import, on-device English OCR, correction and paste, system read-aloud, Dynamic Type, reading preferences, search, favourites, export and deletion. A protected, atomic local archive preserves saved letters and blocks writes when damaged data needs recovery.

The banking sandbox includes spoken overviews, sound cues, haptics, explicit confirmation and SHA-256-linked receipts. Optional voice navigation requires on-device recognition support and never falls back to an online recognizer. App backgrounding stops audio and covers private content.

[Build and use the iOS preview](docs/IOS.md) · [Signing and TestFlight handoff](docs/IOS_RELEASE.md)

## Try Penny in a minute

1. [Open Penny](https://joshbeira.github.io/Penny/) or [install the Android APK](docs/ANDROID.md).
2. Choose **Read a letter**, then **Try a sample letter**. No personal document is needed.
3. Try reading aloud, change the text size, and correct a word.
4. Save the text to your library. Open it again, search for a phrase, or mark it as a favourite.
5. Try your own clear photograph of a printed English letter. Check names, dates and amounts against the original.

Use an installed English offline voice for speech. Number masking is heuristic: it can miss personal details and hide useful dates. Android lets you switch it off for new photographs. Web corrections and pasted text preserve what you type.

## Engineering with clear boundaries

- **Local image processing.** No client uploads photographs. Android bundles its recognition model and omits internet permission. iOS uses Apple Vision. The web self-hosts its worker, WebAssembly engine and language data.
- **Explicit persistence.** A reading stays transient until saved. Saved text is bounded, exportable and deletable. Browser storage failures preserve the current reading and show an error instead of claiming a successful save.
- **Lifecycle-aware Android.** A ViewModel exposes immutable state through StateFlow; blocking work runs off the main thread. Speech stops when the app backgrounds. Camera files are temporary, backups are excluded, and recognition handles image orientation and sizing.
- **Native iOS isolation.** A main-actor model drives SwiftUI; a storage actor serialises atomic writes. Vision processing runs on a worker queue, with cancellation and stale-result protection. The archive uses iOS file protection and is excluded from backups.
- **Accessible alternatives.** Speech has visible text equivalents. Large controls, readable contrast, keyboard focus, live announcements, scalable text and Quiet Mode support different ways to interact. Automated checks do not substitute for testing with people.
- **Inspectable practice actions.** Confirmed sandbox actions produce SHA-256 hash-linked receipts. Android writes in database transactions; the web serialises writes. Verification detects inconsistent edits, not a complete rewrite of local history.
- **Consent-bound AI.** An optional server validates request and response schemas, bounds input and request duration, and preserves the original transcription. Public GitHub Pages has cloud AI disabled.

```mermaid
flowchart LR
  A[Photo / pasted text] --> B{On-device recognition}
  B --> W[Web: Tesseract worker]
  B --> K[Android: bundled ML Kit]
  B --> I[iOS: Apple Vision]
  W --> R[Review and correct]
  K --> R
  I --> R
  R --> S[Device speech]
  R --> E[Export / share]
  R -->|Explicit save| L[Local letter library]
  R -->|Web only: explicit consent| C[Optional server AI summary]
```

## Development

**Web — Node.js 22.18+**

```sh
git clone https://github.com/joshbeira/Penny.git
cd Penny
npm ci
npm run dev
```

No keys are needed for local reading. Optional AI deployment is described in [DEPLOYMENT.md](docs/DEPLOYMENT.md).

**Android — JDK 17, Android SDK 36**

Open `android/` in Android Studio, let Gradle sync, and run on Android 8.0 or later. Or:

```sh
cd android
./gradlew :app:assembleDebug
./gradlew :app:testDebugUnitTest :app:lintDebug
./gradlew :app:connectedDebugAndroidTest
```

On Windows use `gradlew.bat`. The wrapper pins Gradle and verifies its distribution checksum. [Build, signing and installation details](docs/ANDROID.md).

**iOS — macOS, Xcode 26.3, iOS 17+**

```sh
brew install xcodegen
xcodegen generate --spec ios/project.yml
open ios/Penny.xcodeproj
# Unit, integration and simulator journeys, plus an unsigned device archive:
bash scripts/ios-check.sh
```

There are no third-party runtime packages in the iOS app. A simulator build needs no Apple signing credentials. Installing on a physical iPhone and distributing through TestFlight have separate signing requirements. [iOS setup and distribution](docs/IOS.md).

## Repository map

```text
android/                    Native Kotlin app and Gradle wrapper
  app/src/main/             Compose UI, ViewModel, OCR, speech and SQLite storage
  app/src/test/             Kotlin validation, speech and receipt tests
  app/src/androidTest/      Device journeys, actual OCR and persistence tests
ios/                        Native SwiftUI app and XcodeGen project specification
  Penny/                    Views, model, Vision, speech and protected archive
  PennyTests/               Real OCR, persistence, failure and integrity tests
  PennyUITests/             Simulator reading, library and practice journeys
src/                        React + TypeScript web app
  components/               Shared controls, installation and speech feedback
  screens/                  Reader, library, home, receipts and settings
  lib/                      OCR, audio, validation and intent matching
  state/                    Local settings, letter library and receipt stores
api/                        Optional consent-gated AI endpoint
public/                     PWA assets and bundled OCR resources
tests/                      Browser and server contract tests
ci/layout-lock/             Reviewed accessibility-tree baselines
docs/                       User guides, architecture, privacy and launch kit
.github/                    Web, Android and iOS CI, releases and feedback templates
```

## Quality gates

```sh
npm run typecheck
npm run format:check
npm test
npm run build
npx playwright install chromium
npm run test:e2e
npm run lock:check
```

Web tests cover actual image recognition, offline startup, saved-letter retrieval, correction, storage failure, AI consent, receipt integrity and accessibility. Android CI builds the app, runs Kotlin tests and lint, then exercises a device emulator with networking disabled. Screenshots and reports are retained as workflow artifacts. See [TESTING.md](docs/TESTING.md) for the human test matrix and practical limits.

iOS CI runs real Vision OCR and archive tests, SwiftUI simulator journeys and an unsigned Release archive on a Mac runner. Reports, screenshots and a simulator build are retained. Simulator evidence does not establish physical-camera quality, VoiceOver usability or availability of a signed iPhone download.

## Built to earn repeat use

Penny is available to try; adoption and retention have not yet been measured. The next milestone is five consenting usability sessions and a seven-day follow-up. The [beta plan](docs/BETA.md) defines what to measure; the [launch kit](docs/LAUNCH.md) contains an invitation, tester tasks and an evidence log template.

Feedback that helps most: what you were trying to do, whether you finished, what got in your way, and whether you returned. Use synthetic examples in public reports. [Share an experience](https://github.com/joshbeira/Penny/issues/new?template=feedback.yml), [report an accessibility barrier](https://github.com/joshbeira/Penny/issues), or [contribute a focused improvement](CONTRIBUTING.md).

Built and maintained by [Josh Beira](https://github.com/joshbeira).
