# Changelog

## iOS developer preview 2.1.0 — 2026-10-04

### Added

- Native SwiftUI client for iPhone and iPad on iOS 17+, with Apple Vision recognition, camera/photo import and editable or pasted text.
- System speech, on-device voice commands where supported, reading preferences and Quiet Mode.
- Explicit letter saving, search, favourites, export, deletion and protected local persistence with corrupt-data recovery.
- Banking practice with spoken and sound feedback, haptics, confirmation and verifiable receipts.
- macOS CI for actual OCR, storage and simulator journeys, screenshots and an unsigned device archive.
- iOS setup, privacy, physical-device validation and TestFlight handoff documentation. Public iOS distribution is not yet configured.

Web and Android remain at their published 2.0.0 versions.

## 2.0.0 — 2026-10-03

### Added

- Native Kotlin/Jetpack Compose Android app with bundled offline ML Kit OCR, photo picker and camera capture.
- Android device speech, offline voice commands where supported, Quiet Mode, text size and speed preferences.
- Explicit local letter libraries on web and Android, with search, favourites, reopening, export and deletion.
- Editable OCR text and paste input, preserving reviewed numbers and invalidating stale AI summaries.
- Native banking practice, confirmation/read-back, sound cues, haptics and transactional SHA-256 receipt chains.
- Android build/lint/unit/device CI, signed release packaging, installation guide and tester launch kit.
- Web home-screen installation guidance and Android download entry points.

### Improved

- Web speech waits briefly for device voices, reads long text in chunks and handles interrupted playback.
- Storage failures preserve the current web reading; malformed libraries can be exported for recovery.
- Browser coverage now exercises saved letters offline and all six primary accessibility routes.
- Privacy, architecture and contribution guides cover both clients and their distinct data lifecycles.

## 1.1.0 — 2026-09-23

### Added

- On-device letter reading with displayed text, downloads, clear controls and an explicit sample.
- Optional AI summaries with text-only consent, response validation and preserved OCR transcription.
- Public-beta onboarding, feedback links, privacy and deployment documentation.
- Receipt export and deletion, concurrency regression coverage and browser workflow tests.
- Continuous integration and accessibility regression checks.

### Fixed

- Failed letter recognition no longer substitutes an unrelated example.
- Photos cannot be uploaded after an OCR or masking failure.
- Simultaneous receipt writes no longer fork the local hash chain.
- Deleting receipts invalidates queued writes.
- Banking examples are identified as simulations.
