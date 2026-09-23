import { spawn } from "node:child_process";
import { mkdir } from "node:fs/promises";
import { chromium } from "playwright";
import sharp from "sharp";

const server = spawn(
  process.execPath,
  [
    "node_modules/vite/bin/vite.js",
    "preview",
    "--port",
    "4175",
    "--strictPort",
  ],
  { stdio: "ignore" },
);
let browser;
try {
  for (let attempt = 0; ; attempt++) {
    try {
      await fetch("http://localhost:4175");
      break;
    } catch {
      if (attempt > 100) throw new Error("Preview did not start");
      await new Promise((r) => setTimeout(r, 100));
    }
  }
  await mkdir("docs/assets", { recursive: true });
  browser = await chromium.launch();
  const page = await browser.newPage({
    viewport: { width: 430, height: 860 },
    deviceScaleFactor: 1,
    reducedMotion: "reduce",
  });
  await page.goto("http://localhost:4175");
  await page.getByRole("button", { name: "Open Penny" }).click();
  await page.getByRole("heading", { name: "Home", exact: true }).waitFor();
  await page.waitForFunction(
    () =>
      document
        .querySelector("[data-live-busy]")
        ?.getAttribute("data-live-busy") === "false",
  );
  const home = await page.screenshot();
  await page.getByRole("link", { name: "Read a letter" }).click();
  await page.getByRole("button", { name: "Try a sample letter" }).click();
  await page
    .getByRole("region", { name: "Letter reading" })
    .scrollIntoViewIfNeeded();
  const reader = await page.screenshot();
  const backdrop = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="1040" height="1090"><rect width="1040" height="1090" rx="28" fill="#0b0f12"/><g font-family="Arial" fill="#f5f7fa"><text x="48" y="58" font-size="28" font-weight="bold">Penny</text><text x="48" y="98" fill="#9aa7b4" font-size="18">Every letter. A little clearer.</text><text x="548" y="98" fill="#ffb703" font-size="16">READ · LISTEN · KEEP CONTROL</text><text x="48" y="1042" fill="#9aa7b4" font-size="16">Actual application screens · sample content</text></g></svg>`,
  );
  await sharp(backdrop)
    .composite([
      { input: home, left: 48, top: 136 },
      { input: reader, left: 550, top: 136 },
    ])
    .png()
    .toFile("docs/assets/product.png");
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("http://localhost:4175");
  await page.screenshot({ path: "docs/assets/desktop.png" });
  console.log("Saved mobile product overview and desktop screenshot.");
} finally {
  await browser?.close();
  server.kill();
}
