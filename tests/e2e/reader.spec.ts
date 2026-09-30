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
  for (const route of [
    "/",
    "/postbox",
    "/library",
    "/receipts",
    "/settings",
    "/journey",
  ]) {
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

test("reviewed text can be saved, found, reopened offline and deleted", async ({
  page,
  context,
}) => {
  await page.getByRole("button", { name: "Try a sample letter" }).click();
  await page.getByRole("button", { name: "Correct text", exact: true }).click();
  await page
    .getByLabel("Correct the recognised text")
    .fill("Oak Street Library\nCollect by 2026-10-05.");
  await page.getByRole("button", { name: "Apply corrections" }).click();
  await page.getByLabel("Text size", { exact: true }).selectOption("28");
  await expect(page.locator(".letter-text")).toHaveCSS("font-size", "28px");
  await page
    .getByRole("button", { name: "Save to library", exact: true })
    .click();
  await page
    .getByLabel("Letter title", { exact: true })
    .fill("Library collection");
  await page
    .getByRole("button", { name: "Save letter on this device" })
    .click();
  await expect(
    page.getByRole("status", { name: "Reading status" }),
  ).toContainText("Saved to your device");
  await page.getByRole("link", { name: "Open your library" }).click();
  await page.getByLabel("Search letters").fill("2026-10-05");
  await expect(
    page.getByRole("heading", { name: "Library collection" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Add favourite" }).click();
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.reload();
  await context.setOffline(true);
  await page.reload();
  await page.getByRole("button", { name: "Open letter", exact: true }).click();
  await expect(page.locator(".letter-text")).toContainText("2026-10-05");
  await page.getByRole("link", { name: "Open your library" }).click();
  await page
    .getByRole("button", { name: "Delete letter", exact: true })
    .click();
  await page.getByRole("button", { name: "Confirm deletion" }).click();
  await expect(
    page.getByRole("heading", { name: "Your next letter belongs here." }),
  ).toBeVisible();
  await context.setOffline(false);
});

test("storage failure leaves reviewed text available and does not claim a save", async ({
  page,
}) => {
  await page.getByRole("button", { name: "Try a sample letter" }).click();
  await page.evaluate(() => {
    Storage.prototype.setItem = () => {
      throw new DOMException("Full", "QuotaExceededError");
    };
  });
  await page
    .getByRole("button", { name: "Save to library", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Save letter on this device" })
    .click();
  await expect(
    page.getByRole("status", { name: "Reading status" }),
  ).toContainText("could not save");
  await expect(page.locator(".letter-text")).toContainText(
    "Oak Street Library",
  );
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
