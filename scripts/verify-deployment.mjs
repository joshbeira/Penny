import assert from "node:assert/strict";
import { chromium } from "playwright";
import sharp from "sharp";

const base = process.argv[2];
if (!base || !/^https?:\/\//.test(base))
  throw new Error("Pass the full deployment URL, including a trailing slash.");
const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const response = await page.goto(base);
  assert.equal(response.status(), 200);
  await page.getByRole("button", { name: "Open Penny" }).click();
  await page.getByRole("link", { name: "Read a letter" }).click();
  await page.getByRole("button", { name: "Try a sample letter" }).click();
  assert.match(
    await page.locator(".letter-text").innerText(),
    /Oak Street Library/,
  );
  assert.equal(
    await page.getByText("Optional AI summary", { exact: true }).count(),
    0,
  );
  const bytes = await sharp(
    Buffer.from(
      '<svg width="1000" height="300" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="white"/><text x="40" y="100" font-family="Arial" font-size="40">Penny reads this letter on your device.</text></svg>',
    ),
  )
    .png()
    .toBuffer();
  await page.getByLabel("Photograph a letter", { exact: true }).setInputFiles({
    name: "release-check.png",
    mimeType: "image/png",
    buffer: bytes,
  });
  await page.locator(".letter-text").waitFor({ timeout: 60000 });
  assert.match(
    await page.locator(".letter-text").innerText(),
    /Penny reads this letter/,
  );
  await page.getByRole("button", { name: "Correct text", exact: true }).click();
  await page
    .getByLabel("Correct the recognised text")
    .fill("Release verification letter. Collect by 2026-10-05.");
  await page.getByRole("button", { name: "Apply corrections" }).click();
  await page
    .getByRole("button", { name: "Save to library", exact: true })
    .click();
  await page
    .getByLabel("Letter title", { exact: true })
    .fill("Release verification");
  await page
    .getByRole("button", { name: "Save letter on this device" })
    .click();
  await page.getByRole("link", { name: "Open your library" }).click();
  await page.getByRole("button", { name: "Open letter", exact: true }).click();
  assert.match(await page.locator(".letter-text").innerText(), /2026-10-05/);
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth,
    ),
    false,
  );
  assert.deepEqual(errors, []);
  console.log(
    "Deployment verified: HTTP 200, navigation, sample, actual OCR, corrections, saved-library reopening, static-only UI and mobile layout.",
  );
} finally {
  await browser.close();
}
