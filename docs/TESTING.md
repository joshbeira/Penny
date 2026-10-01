# Verification and device coverage

Automated evidence is not a claim of universal compatibility or accessibility certification.

| Layer             | Evidence                                                                                                                                          |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| Web contracts     | Node tests for library validation, redaction, intent matching, consent and receipt integrity                                                      |
| Browser journeys  | Playwright: actual synthetic-image OCR, offline reading, correction, library persistence/search/delete, quota failure, download and cloud failure |
| Web accessibility | Axe serious/critical checks and reviewed accessibility trees across six routes                                                                    |
| Android contracts | JUnit: masking, input bounds, speech chunking and tamper detection                                                                                |
| Android app       | Debug/release builds and Android lint                                                                                                             |
| Android device    | Instrumentation: actual OCR, absent internet permission, saved-library lifecycle, SQLite persistence, and confirmation before receipt creation    |

The Android workflow runs an API 35 emulator in airplane mode and retains screenshots and test output. It does not establish camera quality, physical haptics, installed TTS availability or TalkBack usability.

## Before widening distribution

- [ ] Physical Android 8–10: install, picker fallback, camera, OCR and export
- [ ] Physical Android 12+: offline voice commands, microphone denial, speech and backgrounding
- [ ] Large system font and TalkBack: sample → edit → save → reopen → delete
- [ ] iPhone Safari + VoiceOver: camera → reading → export and installation
- [ ] Android Chrome + TalkBack: reading and offline reopening
- [ ] Desktop keyboard and NVDA: focus, editing, confirmation and deletion
- [ ] Poor light, skewed photograph, long letter, unavailable camera and low storage
- [ ] New signed APK installed over a previous release with saved letters

Use synthetic letters. Record version, device, OS, assistive technology, task, result and evidence. Do not turn an unchecked item into a passed claim. [Report a reproducible issue](https://github.com/joshbeira/Penny/issues).
