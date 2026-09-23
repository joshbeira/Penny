# Architecture

Penny is a React and TypeScript PWA built with Vite. It has no authentication system, document database or bank integration. Zustand holds session state and persists only settings and practice receipts.

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

Node's test runner exercises contracts, intent matching and hash-chain behaviour. Playwright covers the reader with an actual generated letter image, consent and failure paths, downloads and offline startup. Axe examines core routes. Layout Lock compares five reviewed accessibility snapshots and requires an explicit baseline migration.

## Deliberate trade-offs

- Local OCR avoids photo uploads but can be slow or inaccurate on older devices.
- Numeric redaction is conservative and incomplete, so it is not anonymisation.
- A static app keeps infrastructure simple; it also means no cross-device sync.
- Cloud AI is optional and off by default. Public operators must add platform rate limits and provider budgets before enabling it.
- Automated accessibility checks catch regressions; assistive-technology usability requires human testing.
