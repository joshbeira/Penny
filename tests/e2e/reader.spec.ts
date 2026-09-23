import { test, expect } from "playwright/test";
import AxeBuilder from "@axe-core/playwright";
import sharp from "sharp";

test.beforeEach(async ({ page }) => {
  await page.goto("/postbox");
  await page.getByRole("button", { name: "Open Penny" }).click();
  await expect(
    page.getByRole("heading", { name: "Post Box", exact: true }),
  ).toBeVisible();
});

test("sample reading, consent, graceful cloud failure and deletion", async ({
  page,
}) => {
  const apiRequests: string[] = [];
  page.on("request", (req) => {
    if (req.url().includes("/api/")) apiRequests.push(req.url());
  });
  await page.getByRole("button", { name: "Try a sample letter" }).click();
  await expect(page.locator(".letter-text")).toContainText(
    "Oak Street Library",
  );
  expect(apiRequests).toEqual([]);
  await page.getByText("Optional AI summary", { exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Create AI summary" }),
  ).toBeDisabled();
  await page.route("**/api/read-letter", (route) =>
    route.fulfill({ status: 503, json: { ok: false } }),
  );
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Create AI summary" }).click();
  await expect(
    page.getByRole("status", { name: "Reading status" }),
  ).toContainText("Your on-device reading is still here");
  await expect(page.locator(".letter-text")).toContainText(
    "Oak Street Library",
  );
  await page.getByRole("button", { name: "Clear letter" }).click();
  await expect(
    page.getByRole("region", { name: "Letter reading" }),
  ).toHaveCount(0);
});

test("recognises an actual image locally and supports text download", async ({
  page,
}) => {
  const apiRequests: string[] = [];
  page.on("request", (req) => {
    if (req.url().includes("/api/")) apiRequests.push(req.url());
  });
  const image = await sharp(
    Buffer.from(
      '<svg width="1200" height="500" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="white"/><g font-family="Arial" font-size="40" fill="black"><text x="60" y="100">Oak Street Library</text><text x="60" y="190">Your books are ready to collect.</text><text x="60" y="280">Please visit by Friday.</text><text x="60" y="370">Reference 12345678</text></g></svg>',
    ),
  )
    .png()
    .toBuffer();
  await page.getByLabel("Photograph a letter", { exact: true }).setInputFiles({
    name: "library.png",
    mimeType: "image/png",
    buffer: image,
  });
  await expect(page.locator(".letter-text")).toContainText(
    "Oak Street Library",
    { timeout: 60000 },
  );
  await expect(page.locator(".letter-text")).not.toContainText("12345678");
  expect(apiRequests).toEqual([]);
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download text" }).click();
  expect((await download).suggestedFilename()).toBe("penny-letter.txt");
});

test("invalid photos recover without a substitute letter", async ({ page }) => {
  await page.getByLabel("Photograph a letter", { exact: true }).setInputFiles({
    name: "broken.png",
    mimeType: "image/png",
    buffer: Buffer.from("not an image"),
  });
  await expect(
    page.getByRole("status", { name: "Reading status" }),
  ).toContainText("could not be decoded");
  await expect(
    page.getByRole("region", { name: "Letter reading" }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Try a sample letter" }),
  ).toBeEnabled();
});

test("main routes have no serious accessibility violations or horizontal overflow", async ({
  page,
}) => {
  for (const route of ["/", "/postbox", "/receipts", "/settings", "/journey"]) {
    await page.goto(route);
    await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
    const result = await new AxeBuilder({ page }).analyze();
    expect(
      result.violations.filter(
        (v) => v.impact === "serious" || v.impact === "critical",
      ),
    ).toEqual([]);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
  }
});

test("installed app can open its reader offline", async ({ page, context }) => {
  await page.evaluate(async () => {
    const registration = await navigator.serviceWorker.ready;
    if (!registration.active) throw new Error("Service worker is not active");
  });
  await page.reload();
  await context.setOffline(true);
  await page.reload();
  await page.getByRole("button", { name: "Try a sample letter" }).click();
  await expect(page.locator(".letter-text")).toContainText(
    "Oak Street Library",
  );
  const offlineImage = await sharp(
    Buffer.from(
      '<svg width="1000" height="300" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="white"/><text x="40" y="100" font-family="Arial" font-size="40">Offline reading works on this device.</text></svg>',
    ),
  )
    .png()
    .toBuffer();
  await page.getByLabel("Photograph a letter", { exact: true }).setInputFiles({
    name: "offline.png",
    mimeType: "image/png",
    buffer: offlineImage,
  });
  await expect(page.locator(".letter-text")).toContainText(
    "Offline reading works",
    { timeout: 60000 },
  );
  await context.setOffline(false);
});
