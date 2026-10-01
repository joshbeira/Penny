# Penny for Android

A native Kotlin and Jetpack Compose app for **Android 8.0 (API 26) or later**. Penny reads printed English letters using a bundled ML Kit model. No account, API key or internet connection is needed to read a letter.

## Install the public beta

1. Open the [v2.0.0 release](https://github.com/joshbeira/Penny/releases/tag/v2.0.0) on your Android phone.
2. Download `penny-2.0.0.apk` from the release assets.
3. Open the file. If Android asks, allow this browser or file manager to install this app, then complete installation. You can turn that permission off again afterwards.
4. Open Penny → **Read a letter** → **Try a sample letter**.

This is a directly distributed beta APK, not a Google Play listing. Updates are manual: install a newer signed APK from the same repository over the existing app. Keep your existing installation to preserve local letters. Release assets include a SHA-256 checksum and signing-certificate fingerprint.

## Everyday use

- **Photograph a letter** opens your camera app. **Choose a photo** uses Android’s photo picker or system document picker. Penny does not request access to your whole photo library.
- Correct the reading by tapping the text field. You can paste or type text without a photo.
- Adjust **Text size** and **Reading speed**, then choose **Read aloud**. Install English offline speech data through Android’s text-to-speech settings. Text remains available without speech.
- **Save to library** keeps reviewed text. Search by title or content, mark favourites, reopen, export or delete. Changes to reopened readings are saved as a new copy.
- **Export text** writes a file to a chosen location. **Share text** opens Android’s sharing sheet; the selected app controls what happens next.
- **Settings** contains Quiet Mode, number masking, speech settings, privacy, updates and library deletion.
- The **banking sandbox** includes a spoken overview, a sample week as speech or sound cues, card-order and payment-review practice, confirmation, and verifiable receipts. No real financial action occurs.
- **Talk to Penny** appears on supported Android 12+ devices with an on-device recognition service. Microphone access is optional. Each tap listens once and never falls back to online recognition. Say “home”, “read a letter”, “read aloud”, “library”, “settings”, “banking”, “receipts” or “stop”.

## Data handling

The application has **no internet permission**. Its OCR model is bundled. Speech selects an offline English voice. Voice navigation uses Android’s on-device recognizer where available.

Camera photos use temporary app cache files, removed after recognition or cancellation. Stale files from interrupted sessions are removed after 24 hours on a subsequent launch. Existing selected photos remain in their original location. The library stores text in app-private SQLite, excluded from Android backup and device transfer. Penny does not add its own encryption layer. Anyone who can unlock the phone and open Penny can read saved letters. Uninstalling or clearing app data removes them. Exports and shared copies need separate deletion.

Unsaved readings survive ordinary rotation through the ViewModel but are deliberately excluded from saved-instance-state bundles. Save a letter to preserve it through process termination. No sync is provided. AI summaries remain an optional web-server feature.

## Build from source

Use JDK 17, Android SDK Platform 36 and Build Tools 35.0.0. Set `ANDROID_HOME` or let Android Studio create an ignored `local.properties`. The wrapper pins Gradle 8.13 and its checksum.

```sh
cd android
./gradlew :app:assembleDebug
./gradlew :app:testDebugUnitTest :app:lintDebug
./gradlew :app:connectedDebugAndroidTest
```

Debug APKs are in `app/build/outputs/apk/debug/`. Device tests require a connected emulator or phone; GitHub CI provisions an emulator and runs them in airplane mode.

## Signed releases

Release builds never silently use a debug key. To sign with your own identity, set:

```text
PENNY_KEYSTORE_PATH       Absolute path to the private .jks file
PENNY_KEYSTORE_PASSWORD   Keystore password
PENNY_KEY_PASSWORD        Private-key password (alias: penny)
```

Run `./gradlew :app:assembleRelease :app:bundleRelease`. Without signing variables, Gradle produces an unsigned release for inspection. The release workflow uses encrypted GitHub secrets, checks the signature, creates checksums, and attaches assets to a draft release. Never commit keystores, passwords, build outputs or SDK paths.

Keep a secure backup of the key and passwords: losing the identity prevents in-place updates. Publishing on Google Play requires a separate developer-account and listing process.
