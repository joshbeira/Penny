import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import sharp from "sharp";

// Compose a documentation image from real emulator captures, using synthetic letters only.
const directory = process.argv[2];
if (!directory)
  throw new Error("Pass the downloaded Android screenshot directory.");
const names = ["android-home.png", "android-reader.png", "android-library.png"];
const screenshots = await Promise.all(
  names.map((name) =>
    sharp(join(directory, name)).resize({ width: 420 }).png().toBuffer(),
  ),
);
const background = Buffer.from(
  '<svg xmlns="http://www.w3.org/2000/svg" width="1420" height="1140"><rect width="1420" height="1140" rx="28" fill="#0b0f12"/><g font-family="Arial"><text x="48" y="58" fill="#f5f7fa" font-size="28" font-weight="bold">Penny for Android</text><text x="48" y="96" fill="#9aa7b4" font-size="18">Native Kotlin · Offline recognition · Your private letter library</text><text x="48" y="1100" fill="#9aa7b4" font-size="16">Actual Android emulator screens · sample content · airplane mode</text></g></svg>',
);
await mkdir("docs/assets", { recursive: true });
await sharp(background)
  .composite(
    screenshots.map((input, index) => ({
      input,
      left: 48 + index * 452,
      top: 130,
    })),
  )
  .png()
  .toFile("docs/assets/android.png");
console.log("Saved actual Android product screenshots.");
