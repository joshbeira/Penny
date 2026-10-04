# Contributing to Penny

Start with the README to run the app. Small, focused changes are easiest to review. Open an issue before a large feature so the user problem and accessibility implications are clear.

## Before submitting

Run `npm run typecheck`, `npm test`, `npm run build`, `npm run test:e2e` and `npm run lock:check`. Install Chromium with `npx playwright install chromium` first. Test visible keyboard focus and the user-facing failure path for changed interactions. Use made-up letters in tests and reports.

Preserve these boundaries: local OCR must never silently upload a photo; a failed reading must not become sample content; cloud text sharing must be an explicit user action; banking samples must remain clearly labelled. Do not add usage metrics or accessibility claims without evidence.

## Accessibility-tree changes

Layout Lock compares the accessibility trees on six routes. Review a failure before changing baselines. For an intentional change, run:

```sh
LOCK_MIGRATION=1 npm run lock:baseline
```

PowerShell:

```powershell
$env:LOCK_MIGRATION = "1"
npm run lock:baseline
Remove-Item Env:LOCK_MIGRATION
```

Review the resulting diff and run `npm run lock:check`. A new baseline is not evidence that an accessibility regression is acceptable. Include the reasoning in your pull request.

## Reports

For Android, use JDK 17 and run `./gradlew :app:testDebugUnitTest :app:lintDebug :app:assembleDebug` from `android/`. Run `:app:connectedDebugAndroidTest` on an emulator or phone. Keep the bundled OCR/no-internet boundary, microphone consent, explicit saving and backup exclusions intact. See [TESTING.md](docs/TESTING.md) for device coverage.

Include steps, expected behaviour, actual behaviour, browser and assistive technology where relevant. Never upload personal correspondence. Use [private security reporting](SECURITY.md) for vulnerabilities.

For iOS, generate the project with `xcodegen generate --spec ios/project.yml` and run `bash scripts/ios-check.sh` on a Mac with Xcode. Format Swift sources with `swiftformat ios/Penny ios/PennyTests ios/PennyUITests --swiftversion 5.9`; CI checks this with `--lint`. Keep Vision processing local, require on-device voice recognition, preserve corrupt archives, and keep saving explicit. Use synthetic content in tests and screenshots. Never commit signing certificates, provisioning profiles or Apple credentials. See [IOS.md](docs/IOS.md).

Be respectful of contributors and testers. Accessibility needs vary; describe observed barriers rather than making assumptions about people.
