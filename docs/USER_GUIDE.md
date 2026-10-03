# Using Penny

This guide covers the web app. See [Android installation and usage](ANDROID.md) or [iPhone and iPad build and usage](IOS.md) for the native clients. iOS is currently a developer preview, without a public TestFlight listing.

## Read a letter

Open Penny and tap the start screen. Select **Read a letter**, then **Photograph a letter**. Use a sharp, well-lit photo of a printed English page, held flat with the whole page visible. JPEG and PNG are the most reliable formats. Images must be smaller than 15 MB.

The first reading may take longer while the OCR engine loads. Penny displays the recognised text and a preview with detected number regions hidden. Check the result against the original: OCR can misread words, dates and amounts, and number masking can remove useful information.

Use **Read aloud**, **Stop reading**, **Download text** or **Clear letter**. Practise with **Try a sample letter** before choosing an image. **Correct text** fixes recognition errors; applying corrections removes any AI summary. **Paste or type a letter** works without a photo. Pasted and corrected text preserves entered numbers, so review it before sharing.

## Save and return

Choose **Save to library**, name the letter, then confirm saving on this device. Only reviewed text is stored, not the photo or AI summary. Library supports search, favourites, reopening, export and deletion. Save before changing screens to keep a reading. Editing a reopened letter creates a new copy when saved.

The library belongs to this browser profile. Anyone using the profile can read it. Clearing browser data can remove it; **Export library** keeps a separate copy. **Clear letter** does not remove exports or saved copies. There is no sync, and simultaneous edits from multiple tabs can overwrite one another.

## Optional summaries

The public GitHub Pages beta uses local processing only and does not show this option. The following applies to a server deployment with AI enabled.

Expand **Optional AI summary** after reading a letter. Review the text and the sharing notice. Select the consent checkbox and choose **Create AI summary**. If the host has enabled AI, you can switch between Text, Summary and Explain. Your photograph is never sent to the AI service. Personal information can remain in the text.

An unavailable service leaves your original reading in place. A summary may be inaccurate; it is not an authoritative interpretation of financial, legal or medical correspondence.

## Speech and accessibility

- Text and keyboard navigation work without microphone permission.
- **Text size** and **Reading speed** are available in the reader and Settings and persist for your next visit.
- Read-aloud uses an English voice installed on your device. If none is available, install an English voice through your device's speech settings; the text and download controls remain usable.
- The microphone appears only where the browser supports speech recognition. It may send audio to the browser provider. Commands include “post box”, “home”, “settings”, “stop” and “repeat”.
- Quiet Mode suppresses Penny's speech and displays text cards. Earcons and haptics may still play.
- Always listening is off by default. You can turn voice input off in Settings.
- Keyboard focus is visible. Use Tab to move, Enter or Space to activate, and Escape to close dialogs.

## Install and use offline

Open Penny online and allow the first load to complete. In a compatible browser, use its install or add-to-home-screen option. The app shell and OCR engine are then available offline while the browser retains the cache. AI summaries and browser speech recognition may not work offline.

## Banking playground and receipts

Home's account and transactions are synthetic. Card ordering and payment confirmation save practice receipts only; no money moves and no card is ordered. Settings links to an accessibility preview. The sandbox controls are available at `/sandbox` for exploring payment flows.

Receipts are stored in this browser. Export them as JSON, verify internal hash consistency, or delete them. A successful check does not prove that nobody rewrote the entire history.

## Report a problem

[Share feedback](https://github.com/joshbeira/Penny/issues/new?template=feedback.yml) with your device, browser, what you tried and what happened. GitHub feedback requires a GitHub account and is public. Do not attach personal letters, financial details, PINs or identifying information. Use a made-up example if needed.
