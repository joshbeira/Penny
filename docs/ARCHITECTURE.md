# Architecture

Penny has a React/TypeScript PWA, a native Kotlin/Jetpack Compose Android app and a native SwiftUI iOS client. None has authentication, a hosted document database or bank integration. Each keeps its own explicitly saved letter library, settings and practice receipts on the device.

## Native iOS

`PennyModel` is a main-actor observable model shared by SwiftUI screens. `LibraryStore` is a separate actor that serialises archive mutations. It validates a versioned, bounded JSON archive before loading or writing and commits atomically with iOS complete file protection. The parent directory is excluded from backups. Failed writes do not update the visible archive; decoding errors preserve the original file and block ordinary writes until recovery or explicit reset.

`TextRecognition` uses Apple Vision on a serial worker queue, with image downsampling and orientation correction. A locked request object coordinates cancellation and exactly-once continuation completion. A 45-second deadline ends the UI operation; a reading generation prevents late results from replacing newer text. Photo-picker imports are bounded to 30 MB, and camera photos are not written to the library or Photos.

`SpeechReader` uses installed English system voices and bounded utterances. `VoiceCommands` checks device support and requires on-device recognition, with permission on tap, a 12-second session limit and no online fallback. Commands navigate or read; they never confirm practice actions. App backgrounding stops audio and recognition; a privacy overlay covers inactive app snapshots.

The iOS app has no third-party runtime SDKs or networking client. A privacy manifest documents app-container file metadata access. XcodeGen defines the project; macOS CI runs simulator tests and an unsigned device archive. Apple signing and public TestFlight distribution are separate release steps.

## Native Android

`PennyViewModel` exposes immutable `StateFlow` state. Compose subscribes with lifecycle awareness; storage and image work run on IO dispatchers. `LetterRecognizer` downsamples and corrects orientation before calling the bundled ML Kit Latin model. A 45-second deadline bounds the user-facing operation; resources are released on native task completion even if the caller stops waiting.

`PennyStore` uses app-private SQLite with a versioned schema. Letters require an explicit save, with limits of 100 entries and 16,000 characters per entry. Receipts are inserted in database transactions. A missing migration fails without dropping user data. Backup and device transfer are excluded. Delegated camera output uses a narrowly scoped FileProvider and temporary cache files; no broad storage or camera permission is requested.

`SpeechReader` selects offline English voices and chunks text below the speech limit. Lifecycle stop cancels speech, recognition and sound cues. `VoiceCommands` uses only Android’s on-device recognizer on supported API 31+ devices, with runtime microphone permission and single-tap sessions. It never falls back to cloud recognition. The merged manifest removes internet permission, including transitive declarations.

Banking features use synthetic data. Detailed, overview and listen modes demonstrate alternative presentations; they do not claim to reproduce anyone’s sight.

## Web letter library

`penny.library.v1` holds validated, bounded text records with title, timestamp and favourite flag. A save writes to storage before updating visible state, so quota failures cannot claim success. Corrupt data is preserved for recovery export. Storage events refresh other tabs, but simultaneous writes are not transactional. Photos and AI summaries never enter the library. Corrections and pasted text preserve entered numbers; OCR retains conservative masking.

## Letter processing

`PostBox.tsx` coordinates file selection, processing, display and optional AI calls. It validates file size and type, disables overlapping operations and ignores results after unmount. `capture.ts` downsizes images to a maximum edge of 1600 pixels. `ocrMask.ts` runs the bundled Tesseract worker with English language data, obtains recognised text and masks detected numeric regions in the preview. `reading.ts` applies text redaction and validates the shared reading contract.

OCR times out after 45 seconds. A failed worker is terminated and may be recreated on retry. Failure never uploads the original image or returns a canned letter. The sample button is an explicit, separate user action. A letter remains in component memory, and its preview URL is revoked on clear or unmount.

Optional AI processing starts only after the user reviews the text and selects the consent checkbox. The API accepts at most 12,000 characters and requires `ENABLE_CLOUD_AI=true` and a server-side key. It uses a 12-second upstream deadline, rejects invalid model responses, disallows bank actions, and uses the original OCR text for the transcription. Letter contents are treated as untrusted input. A failed AI request leaves the local reading visible.

## Audio and interaction

`audio.ts` is the speech gateway. It serialises speech, mirrors announcements into a live region and supports stop/repeat. Static interface clips are bundled; dynamic text uses a local English speech-synthesis voice. If none is available, text remains accessible and the app announces the limitation. Tone.js is loaded after user interaction for sonification. Browser speech recognition is optional and may send microphone audio to a browser provider.

Quiet Mode renders text feedback instead of spoken output. Earcons and haptics are separate signals and remain available. Sound, vibration and recognition depend on device capabilities; users can always navigate using the visible interface.

## Receipts

Practice actions append a receipt containing a timestamp, action, details, confirmation method, previous hash and SHA-256 digest. The v1 preimage is `prevHash|ts|action|details|method`. A promise queue makes writes serial within one tab. A generation counter invalidates pending writes after deletion.

Verification recomputes each digest and previous-link relationship. It detects inconsistent edits and interior removals, but not a complete rewrite with recomputed hashes, removal of the last entries, or coordinated edits across devices. The store is neither signed nor remotely anchored. It is for interaction transparency, not banking audit or non-repudiation. Concurrent edits across tabs are not coordinated.

## Offline behaviour

Workbox precaches the application, static voice clips, WebAssembly OCR engine and English data. The initial cache requires roughly 9 MB and an online first load; browser storage eviction can remove it. Optional AI and browser-provided speech recognition require connectivity. An installed local voice is needed for offline dynamic speech.

## Validation

Node tests exercise contracts, intent matching, library validation and hash chains. Playwright covers actual generated-image OCR, consent, failures, library persistence, downloads and offline startup. Axe examines core routes. Layout Lock compares six reviewed accessibility snapshots. Kotlin tests, Android lint and airplane-mode instrumentation cover native recognition, persistence and confirmation.

## Deliberate trade-offs

- Local OCR avoids photo uploads but can be slow or inaccurate on older devices.
- Numeric redaction is conservative and incomplete, so it is not anonymisation.
- A static app keeps infrastructure simple; it also means no cross-device sync.
- Cloud AI is optional and off by default. Public operators must add platform rate limits and provider budgets before enabling it.
- Automated accessibility checks catch regressions; assistive-technology usability requires human testing.
