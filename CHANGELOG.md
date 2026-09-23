# Changelog

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
