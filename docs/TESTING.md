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

## Native iOS verification

The iOS workflow generates the Xcode project, runs XCTest on an available iPhone simulator and builds an unsigned Release archive for physical iOS devices. Tests include actual Apple Vision recognition of a generated letter, invalid-image rejection, concurrent and failed saves, corrupt-file recovery, stale OCR cancellation, schema validation and receipt tampering. UI journeys exercise sample reading, editing, reading preferences, Quiet Mode, saving, favourites, search, relaunch/persistence, deletion, camera unavailability, rotation, practice confirmation and the export screen.

Screenshots and logs are retained in `ios-verification`, the `.xcresult` bundle in `ios-test-results`, and the generated project and simulator app in `ios-simulator-build`. The simulator is not isolated from the Mac's network, so these checks are not claimed as an airplane-mode iPhone test. Physical OCR, installed voices, permission prompts, haptics, background snapshots and VoiceOver still require device testing.

**Recorded verification — 4 October 2026:** [8 core tests and 4 UI journeys passed](https://github.com/joshbeira/Penny/actions/runs/37210424765) on iPhone 17 Pro / iOS 26.2 Simulator, using Xcode 26.3. The unsigned device Release archive also succeeded. The iOS screenshots in the README come from this run and use a fictional sample letter.

## Before widening distribution

- [ ] Physical Android 8–10: install, picker fallback, camera, OCR and export
- [ ] Physical Android 12+: offline voice commands, microphone denial, speech and backgrounding
- [ ] Large system font and TalkBack: sample → edit → save → reopen → delete
- [ ] iPhone Safari + VoiceOver: camera → reading → export and installation
- [ ] Native iOS 17+ on a physical iPhone: airplane-mode camera → OCR → speech → save → reopen
- [ ] Native iPad: portrait/landscape, split view, large Dynamic Type and VoiceOver
- [ ] Native iOS camera/microphone/Speech permission denial and later enabling in Settings
- [ ] Native iOS iCloud-only photo import, Files export, sharing, background privacy and interrupted audio
- [ ] Signed iOS update over an earlier build with saved letters; internal TestFlight validation
- [ ] Android Chrome + TalkBack: reading and offline reopening
- [ ] Desktop keyboard and NVDA: focus, editing, confirmation and deletion
- [ ] Poor light, skewed photograph, long letter, unavailable camera and low storage
- [ ] New signed APK installed over a previous release with saved letters

Use synthetic letters. Record version, device, OS, assistive technology, task, result and evidence. Do not turn an unchecked item into a passed claim. [Report a reproducible issue](https://github.com/joshbeira/Penny/issues).
