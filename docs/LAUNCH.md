# A launch that leads to repeat use

Downloads, visits, completed readings and returning people are different measures. Penny currently collects no app analytics, and no adoption numbers are claimed.

## First audience and promise

People who prefer listening to everyday English post, find small print difficult, or want a private way to make letters easier to read. The promise is specific: photograph, review, listen, and optionally keep the text on your device. Offer the banking sandbox as a separate exploration.

## Invitation ready to share

> I’m building Penny, a free reading companion for everyday letters. It turns a photograph into text you can enlarge, correct, hear aloud and save privately on your device. There’s a web app and an Android beta; no account is needed.
>
> I’m looking for a few people to try a sample letter and tell me where the experience gets difficult. You can start without sharing any personal documents. Try https://joshbeira.github.io/Penny/ or find Android at https://github.com/joshbeira/Penny/releases/tag/v2.0.0.
>
> Could you finish your task? Would you use it for another letter? Those two answers will help me decide what to improve next.

This is draft outreach, not a record of messages sent. Ask moderators before posting in a community. Contact people through an appropriate invitation or introduction. [The beta plan](BETA.md) covers consent and study conduct.

The native iOS app is currently a developer preview. Invite Mac/Xcode testers through [the iOS guide](IOS.md); invite ordinary iPhone users to the web app until a signed TestFlight build is available. Do not describe a simulator ZIP as an iPhone download.

## Five tasks, fifteen minutes

1. Open a sample letter without help.
2. Start and stop speech, then choose a comfortable text size.
3. Correct a word and save it to the library.
4. Reopen the app, find the saved letter, then export or delete it.
5. Read a synthetic paper letter with the camera and explain what was saved or shared.

Ask an optional follow-up after seven days only if the participant opted in: “Did you use Penny for another letter? What made you return, or what stopped you?” People can decline or stop without explanation.

## Private evidence log template

| Participant code                      | App / version | Device | Task completed independently? | Main blocker | Follow-up consent? | Used again after 7 days? | Improvement shipped |
| ------------------------------------- | ------------- | ------ | ----------------------------- | ------------ | ------------------ | ------------------------ | ------------------- |
| _Leave blank until a session happens_ |               |        |                               |              |                    |                          |                     |

Keep contact details separately. Do not record personal letter text, diagnoses, audio or screenshots by default. Publish only consented aggregate findings with sample size and limitations. Link fixes to reproducible issues using synthetic examples.

## Portfolio wording grounded in the implementation

“Built and released Penny, a privacy-first letter-reading companion for Android and the web. Implemented Kotlin/Jetpack Compose and React/TypeScript clients with on-device OCR, offline speech, explicit local persistence, accessible controls and SHA-256-linked practice receipts. Added browser and Android emulator CI covering recognition, persistence, offline use and failure recovery.”

Add adoption and usability outcomes only after measuring them. Separate shipped software, automated verification and human research evidence.

For the iOS work: “Implemented a native SwiftUI iPhone/iPad client with Apple Vision OCR, system speech, actor-isolated atomic persistence and explicit data recovery; added macOS CI for real-image recognition, storage failures and simulator user journeys.” Public TestFlight distribution remains a separate milestone.
