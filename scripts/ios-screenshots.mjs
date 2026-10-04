import { mkdir } from "node:fs/promises";
import sharp from "sharp";

// Only compose real simulator captures; do not substitute mockups for app evidence.
const paths = process.argv.slice(2);
if (paths.length !== 3)
  throw new Error(
    "Pass the actual iOS home, reader and library screenshot paths.",
  );
const screens = await Promise.all(
  paths.map((path) =>
    sharp(path)
      .resize({ width: 420, height: 930, fit: "inside" })
      .png()
      .toBuffer(),
  ),
);
const background = Buffer.from(
  '<svg xmlns="http://www.w3.org/2000/svg" width="1420" height="1140"><rect width="1420" height="1140" rx="28" fill="#0b0f12"/><g font-family="Arial"><text x="48" y="58" fill="#f5f7fa" font-size="28" font-weight="bold">Penny for iPhone</text><text x="48" y="96" fill="#9aa7b4" font-size="18">Native SwiftUI · Apple Vision recognition · Your private letter library</text><text x="48" y="1100" fill="#9aa7b4" font-size="16">Actual iOS Simulator screens · fictional sample content · developer preview</text></g></svg>',
);
await mkdir("docs/assets", { recursive: true });
await sharp(background)
  .composite(
    screens.map((input, index) => ({
      input,
      left: 48 + index * 452,
      top: 130,
    })),
  )
  .png()
  .toFile("docs/assets/ios.png");
console.log("Saved actual iOS product screenshots.");
