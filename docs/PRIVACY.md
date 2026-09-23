# Privacy and data

Last updated: 23 September 2026.

Penny has no application analytics, sign-in, advertising or document database.

| Data                           | Where it goes                                               | How long Penny keeps it                                               |
| ------------------------------ | ----------------------------------------------------------- | --------------------------------------------------------------------- |
| Photo                          | Browser memory and a local OCR worker; never Penny's API    | Until the reader is cleared or unmounted                              |
| Recognised letter              | Browser memory                                              | Until the reader is cleared or unmounted                              |
| Optional AI text               | Penny's API and Google Gemini, after explicit consent       | No application storage; provider handling is subject to its own terms |
| Speech output                  | Bundled interface audio or an installed local English voice | Speech state can remain in memory for repeat until the page is closed |
| Microphone audio               | Browser speech recognition, when activated                  | Controlled by the browser/provider; Penny does not record it          |
| Settings and practice receipts | Browser local storage                                       | Until deleted or site data is cleared                                 |
| App/OCR assets                 | Browser cache and service worker                            | Until evicted or site data is cleared                                 |
| Feedback                       | GitHub, if the user submits it                              | Public under GitHub's retention and account controls                  |

Letter text is not sent for speech generation. AI sharing sends text, never a photograph. The server does not intentionally log document contents; hosting services may retain technical request metadata. Provider terms and data handling must be reviewed by the operator before enabling AI for public use.

Number masking is heuristic, not guaranteed redaction. It can miss numbers and does not reliably remove names, addresses, health information or other sensitive content. Review text before sharing it. Penny is not intended for secrets such as PINs or passwords.

**Clear letter** removes the displayed letter and preview. **Delete receipts** removes the receipt store. Clearing browser site data removes persistent settings, receipts and cached app assets. Exports are ordinary downloaded files and must be deleted separately. Closing the page clears remaining in-memory speech state.

To report a privacy problem, follow [SECURITY.md](../SECURITY.md) and avoid posting personal information in public issues.
