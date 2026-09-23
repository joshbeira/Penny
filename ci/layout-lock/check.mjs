import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import AxeBuilder from "@axe-core/playwright";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..", "..");
const BASELINE_DIR = join(HERE, "baseline");
const VITE = join(ROOT, "node_modules", "vite", "bin", "vite.js");

const PORT = 4173;
const ORIGIN = `http://localhost:${PORT}`;
const ROUTES = [
  { path: "/", name: "home" },
  { path: "/postbox", name: "postbox" },
  { path: "/receipts", name: "receipts" },
  { path: "/settings", name: "settings" },
  { path: "/journey", name: "journey" },
];

const VIEWPORT = { width: 390, height: 844 };
const REFUSAL =
  "Refusing to move the baseline without LOCK_MIGRATION=1 — Layout Lock exists so this is deliberate.";

const regression = (route) =>
  `BUILD FAILED — accessibility regression on ${route}: structure changed without a migration flag`;

const violation = (impact, route, id, help) =>
  `BUILD FAILED — ${impact} accessibility violation on ${route}: ${id} (${help})`;

const verified = (count) =>
  `Layout Lock ✓ ${count} routes verified, 0 violations`;
const say = (line = "") => console.log(line);
function viteRun(args) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [VITE, ...args], {
      cwd: ROOT,
      stdio: "inherit",
      env: process.env,
    });
    child.on("error", reject);
    child.on("exit", (code) =>
      code === 0
        ? resolve()
        : reject(new Error(`vite ${args[0]} exited ${code}`)),
    );
  });
}

function viteSpawn(args) {
  return spawn(process.execPath, [VITE, ...args], {
    cwd: ROOT,
    stdio: ["ignore", "pipe", "pipe"],
    env: process.env,
  });
}

async function waitForServer(timeoutMs = 30_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(ORIGIN, { redirect: "manual" });
      if (response.status < 500) return;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 150));
  }
  throw new Error(
    `vite preview did not answer on ${ORIGIN} within ${timeoutMs}ms`,
  );
}
function normalise(snapshot) {
  return snapshot
    .split("\n")
    .map((line) => line.replace(/\s+$/, ""))
    .join("\n")
    .replace(/\n+$/, "");
}
function waitForLive(page, expected) {
  return page.waitForFunction(
    (value) =>
      document
        .querySelector("[data-live-busy]")
        ?.getAttribute("data-live-busy") === value,
    expected,
    { timeout: 60_000 },
  );
}

async function collect() {
  const browser = await chromium.launch();
  try {
    const context = await browser.newContext({ viewport: VIEWPORT });
    const page = await context.newPage();
    const results = [];

    for (const route of ROUTES) {
      await page.goto(ORIGIN + route.path);
      await page.locator("[data-live-busy]").waitFor({ state: "attached" });
      const onSplash =
        (await page.getByRole("button", { name: "Open Penny" }).count()) > 0;
      if (onSplash) {
        await page.locator("body").click();
        await waitForLive(page, "true");
      }

      await page.waitForLoadState("networkidle");
      await waitForLive(page, "false");

      const snapshot = normalise(await page.locator("body").ariaSnapshot());
      const axe = await new AxeBuilder({ page }).analyze();
      const violations = axe.violations.filter(
        (entry) => entry.impact === "serious" || entry.impact === "critical",
      );

      results.push({ route, snapshot, violations });
    }

    return results;
  } finally {
    await browser.close();
  }
}
function editScript(before, after) {
  const rows = before.length;
  const columns = after.length;
  const table = Array.from(
    { length: rows + 1 },
    () => new Uint32Array(columns + 1),
  );

  for (let i = rows - 1; i >= 0; i -= 1) {
    for (let j = columns - 1; j >= 0; j -= 1) {
      table[i][j] =
        before[i] === after[j]
          ? table[i + 1][j + 1] + 1
          : Math.max(table[i + 1][j], table[i][j + 1]);
    }
  }

  const ops = [];
  let i = 0;
  let j = 0;
  while (i < rows && j < columns) {
    if (before[i] === after[j]) {
      ops.push({ sign: " ", text: before[i] });
      i += 1;
      j += 1;
    } else if (table[i + 1][j] >= table[i][j + 1]) {
      ops.push({ sign: "-", text: before[i] });
      i += 1;
    } else {
      ops.push({ sign: "+", text: after[j] });
      j += 1;
    }
  }
  while (i < rows) ops.push({ sign: "-", text: before[i++] });
  while (j < columns) ops.push({ sign: "+", text: after[j++] });
  return ops;
}

const CONTEXT = 3;

function unifiedDiff(baselineText, currentText) {
  const before = baselineText.split("\n");
  const after = currentText.split("\n");
  const ops = editScript(before, after);
  const keep = new Set();
  ops.forEach((op, index) => {
    if (op.sign === " ") return;
    for (let k = index - CONTEXT; k <= index + CONTEXT; k += 1) {
      if (k >= 0 && k < ops.length) keep.add(k);
    }
  });

  const lines = ["--- baseline", "+++ current"];
  let beforeLine = 1;
  let afterLine = 1;
  let index = 0;

  while (index < ops.length) {
    if (!keep.has(index)) {
      if (ops[index].sign !== "+") beforeLine += 1;
      if (ops[index].sign !== "-") afterLine += 1;
      index += 1;
      continue;
    }

    const hunkBefore = beforeLine;
    const hunkAfter = afterLine;
    const body = [];
    let beforeCount = 0;
    let afterCount = 0;

    while (index < ops.length && keep.has(index)) {
      const op = ops[index];
      body.push(op.sign + op.text);
      if (op.sign !== "+") {
        beforeLine += 1;
        beforeCount += 1;
      }
      if (op.sign !== "-") {
        afterLine += 1;
        afterCount += 1;
      }
      index += 1;
    }

    lines.push(
      `@@ -${hunkBefore},${beforeCount} +${hunkAfter},${afterCount} @@`,
      ...body,
    );
  }

  return lines;
}

const baselineFile = (name) => join(BASELINE_DIR, `${name}.snap.yml`);

async function writeBaselines(results) {
  await mkdir(BASELINE_DIR, { recursive: true });
  for (const { route, snapshot } of results) {
    await writeFile(baselineFile(route.name), `${snapshot}\n`, "utf8");
    say(
      `  wrote baseline/${route.name}.snap.yml (${snapshot.split("\n").length} lines)`,
    );
  }
  const flagged = results.filter((entry) => entry.violations.length > 0);
  for (const { route, violations } of flagged) {
    for (const entry of violations) {
      say(
        `  warning: ${entry.impact} accessibility violation on ${route.path}: ${entry.id}`,
      );
    }
  }

  say();
  say(`Baseline moved: ${results.length} routes.`);
}

async function checkBaselines(results) {
  let failed = false;

  for (const { route, snapshot, violations } of results) {
    const file = baselineFile(route.name);

    if (!existsSync(file)) {
      say(
        `Layout Lock: no baseline for ${route.path} — run LOCK_MIGRATION=1 npm run lock:baseline`,
      );
      failed = true;
      continue;
    }

    const expected = normalise(await readFile(file, "utf8"));
    if (expected !== snapshot) {
      for (const line of unifiedDiff(expected, snapshot).slice(0, 40))
        say(line);
      say(regression(route.path));
      failed = true;
    }

    for (const entry of violations) {
      say(violation(entry.impact, route.path, entry.id, entry.help));
      failed = true;
    }
  }

  if (failed) return false;

  say(verified(results.length));
  return true;
}

async function main() {
  const isBaseline = process.argv.includes("--baseline");
  if (isBaseline && process.env.LOCK_MIGRATION !== "1") {
    say(REFUSAL);
    process.exit(1);
  }

  await viteRun(["build"]);

  const preview = viteSpawn([
    "preview",
    "--port",
    String(PORT),
    "--strictPort",
  ]);
  let previewOutput = "";
  preview.stdout.on("data", (chunk) => {
    previewOutput += chunk;
  });
  preview.stderr.on("data", (chunk) => {
    previewOutput += chunk;
  });

  const stop = () => {
    if (!preview.killed) preview.kill();
  };
  process.on("SIGINT", () => {
    stop();
    process.exit(130);
  });

  try {
    try {
      await waitForServer();
    } catch (error) {
      say(previewOutput.trim());
      throw error;
    }

    const results = await collect();

    if (isBaseline) {
      await writeBaselines(results);
      process.exitCode = 0;
      return;
    }

    process.exitCode = (await checkBaselines(results)) ? 0 : 1;
  } finally {
    stop();
  }
}

main().catch((error) => {
  say(`Layout Lock could not run: ${error.message}`);
  process.exit(1);
});
