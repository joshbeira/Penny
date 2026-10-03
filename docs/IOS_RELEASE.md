# iOS release preparation

These are draft materials for an eventual App Store Connect submission, not an approved listing or proof of distribution. Confirm all answers against the final signed build and Apple's current questions.

## Listing draft

**Name:** Penny: Private Letter Reader

**Subtitle:** Read your post at your pace

**Description:**

Everyday post should be something you can handle at your own pace. Penny turns a photograph of an English printed letter into text you can enlarge, correct, hear aloud and keep on your device.

Start with a sample letter, photograph a page, choose a photo, or paste text. Check the result, choose a comfortable text size and reading speed, then save only the letters you want to keep. Search your library, mark favourites and export a copy when you need it.

Recognition runs on your device. There is no account, document upload, advertising or application analytics. Saved letters stay in the app's private storage. Exporting or sharing puts a separate copy in your chosen destination.

An optional banking sandbox lets you explore spoken overviews, sound cues and clear action confirmations using fictional accounts. It never connects to a bank, moves money or orders a real card.

Penny reads English printed text. Recognition may make mistakes: always check names, dates and amounts against the original. Read-aloud needs an installed English system voice. Offline voice commands depend on device and language support.

**Support URL:** https://github.com/joshbeira/Penny/issues

**Privacy URL:** https://github.com/joshbeira/Penny/blob/main/docs/PRIVACY.md

## Beta review notes draft

No account or login is required. Open Read → Try a sample letter to explore without personal information. Use Save to library to create a local text record, then Library to reopen, favourite, export or delete it. The sample is fictional.

Camera permission is requested only by Photograph a letter. The system photo picker works without broad library access. Microphone and Speech permissions are optional and requested only by Talk to Penny on supported devices. All features remain reachable by visible controls.

Banking sandbox actions only create local practice records. Their review sheet states that no real financial action occurs. There are no payments, subscriptions, user accounts, advertisements or external AI services in the iOS app.

## Before submitting

- [ ] Set the correct signing team and confirm ownership of the bundle identifier
- [ ] Validate a signed device archive and perform the physical-device checks in TESTING.md
- [ ] Capture current iPhone and iPad screenshots using fictional content only
- [ ] Complete privacy, age-rating and export-compliance responses for the submitted build
- [ ] Provide current support and beta-review contact details in App Store Connect
- [ ] Confirm installed-voice guidance against the iOS versions being supported
- [ ] Run internal TestFlight testing and record actual findings
- [ ] Obtain external beta approval before publishing a TestFlight invitation

No adoption numbers, testimonials or accessibility certification should be added without supporting evidence.
