# Third-party assets

Penny uses third-party libraries under their respective licences. Installed package notices are included in their npm distributions and dependency versions are recorded in `package-lock.json`.

- `public/tesseract/worker.min.js` comes from [Tesseract.js](https://github.com/naptha/tesseract.js), Apache-2.0.
- `public/tesseract/tesseract-core-*.wasm.js` comes from [tesseract.js-core](https://github.com/naptha/tesseract.js-core), Apache-2.0. Its build includes upstream OCR dependencies and their notices.
- English recognition data comes from the [Tesseract language-data project](https://github.com/tesseract-ocr/tessdata), Apache-2.0.
- Static interface voice clips in `public/audio` are generated assets. `scripts/voice-lines.json` records the spoken text; `scripts/generate-voice.mjs` provides the optional ElevenLabs generation workflow. Provider terms apply when regenerating or redistributing generated audio.

The project does not grant rights in third-party trademarks or imply affiliation with a bank, browser vendor, hosting provider or AI provider.
