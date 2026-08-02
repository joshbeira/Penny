import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import AxeBuilder from "@axe-core/playwright";

// SPEC 16 — the Layout Lock gate. It fails the build if the ACCESSIBILITY TREE of
// any route changes without a migration flag, which is what makes SPEC 10's
// element order a contract rather than a comment.
//
// SPEC 2 lists playwright and @axe-core/playwright as dev-only dependencies, and
// they are used exactly here. Everything else in this file is standard library:
// SPEC 19 bans added dependencies, so the unified diff below is hand-rolled
// rather than pulled from npm.

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..", "..");
const BASELINE_DIR = join(HERE, "baseline");
const VITE = join(ROOT, "node_modules", "vite", "bin", "vite.js");

const PORT = 4173;
const ORIGIN = `http://localhost:${PORT}`;

// SPEC 16 step 2's route list. /director is SPEC 12.1's backup route and is
// deliberately excluded, as is the TabBar-less Journey's absence from SPEC 10's
// nav. The file names are SPEC 16 step 4's.
const ROUTES = [
  { path: "/", name: "home" },
  { path: "/postbox", name: "postbox" },
  { path: "/receipts", name: "receipts" },
  { path: "/settings", name: "settings" },
  { path: "/journey", name: "journey" },
];

const VIEWPORT = { width: 390, height: 844 };

// ---------------------------------------------------------------------------
// The strings SPEC 16 fixes
// ---------------------------------------------------------------------------

// These four are quoted verbatim from SPEC 16 and are shown to judges — the
// refusal when someone reaches for --baseline, and `lock:demo-break`'s failure,
// which SPEC 16 says "is demonstrated live in Q&A, so the output wording
// matters". Do not reword them.
const REFUSAL =
  "Refusing to move the baseline without LOCK_MIGRATION=1 — Layout Lock exists so this is deliberate.";

const regression = (route) =>
  `BUILD FAILED — accessibility regression on ${route}: structure changed without a migration flag`;

const violation = (impact, route, id, help) =>
  `BUILD FAILED — ${impact} accessibility violation on ${route}: ${id} (${help})`;

const verified = (count) => `Layout Lock ✓ ${count} routes verified, 0 violations`;

// Everything this script prints goes to stdout, failures included. stdout is
// block-buffered when piped while stderr is not, so splitting them would let a
// BUILD FAILED line overtake the diff that explains it — and this output is read
// off a terminal in front of an audience. The exit code carries the verdict.
const say = (line = "") => console.log(line);

// ---------------------------------------------------------------------------
// Child processes: vite build, then vite preview
// ---------------------------------------------------------------------------

// Spawned as `node node_modules/vite/bin/vite.js …` rather than through npm or a
// shell: the preview server has to be killable, and an npm wrapper leaves the
// real server orphaned holding port 4173.
function viteRun(args) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [VITE, ...args], {
      cwd: ROOT,
      stdio: "inherit",
      // SPEC 16 step 1: the build inherits VITE_BREAK_LAYOUT if set, which is
      // the whole mechanism behind `lock:demo-break`.
      env: process.env,
    });
    child.on("error", reject);
    child.on("exit", (code) =>
      code === 0 ? resolve() : reject(new Error(`vite ${args[0]} exited ${code}`)),
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
    } catch {
      // Not listening yet.
    }
    await new Promise((resolve) => setTimeout(resolve, 150));
  }
  throw new Error(`vite preview did not answer on ${ORIGIN} within ${timeoutMs}ms`);
}

// ---------------------------------------------------------------------------
// The walk
// ---------------------------------------------------------------------------

// SPEC 16 step 2's normalisation: "trim trailing whitespace per line".
function normalise(snapshot) {
  return snapshot
    .split("\n")
    .map((line) => line.replace(/\s+$/, ""))
    .join("\n")
    .replace(/\n+$/, "");
}

// SPEC 15's drain signal, and SPEC 16's wait condition. `data-live-busy` is
// `draining || activity > 0`, so it stays "true" while any audio is still in
// flight — which is what a fixed sleep could never get right: SPEC 7.1 posts the
// Glance's completion line on a timer AFTER the earcon (P5 measured it at 1043ms
// after the splash tap), so a snapshot taken at networkidle is a race, not a
// baseline. P2, P3, P4 and P5 each recorded that this gate needed a
// deterministic answer; this is it.
function waitForLive(page, expected) {
  return page.waitForFunction(
    (value) => document.querySelector("[data-live-busy]")?.getAttribute("data-live-busy") === value,
    expected,
    { timeout: 60_000 },
  );
}

async function collect() {
  const browser = await chromium.launch();
  try {
    const context = await browser.newContext({ viewport: VIEWPORT });
    // ONE page for all five routes. This is not a tidiness choice: P1 persists
    // session.unlocked to sessionStorage, which is per-tab, so a fresh tab per
    // route re-arms the Splash — and SPEC 6.1 ends by navigating to Home, which
    // would turn four of the five baselines into copies of Home (P3's finding).
    const page = await context.newPage();
    const results = [];

    for (const route of ROUTES) {
      await page.goto(ORIGIN + route.path);

      // App.tsx renders the live region outside the Splash gate, so its presence
      // means React has mounted and the Splash question can be asked.
      await page.locator("[data-live-busy]").waitFor({ state: "attached" });

      // SPEC 16 step 2: "click body once (dismisses Splash)". P1 reshaped the
      // Splash out of `fixed` precisely so a body click lands on it.
      //
      // Guarded on the Splash actually being there. With one tab it exists only
      // on the first route; on the other four the same click lands on whatever
      // sits at the centre of <body> — Settings' Quiet Mode toggle or its
      // /journey link, Post Box's <label> around the file input, Home's two pill
      // buttons — and rewrites the very tree being baselined. SPEC 16's own
      // parenthetical states the click's purpose, and where there is no Splash
      // there is nothing to dismiss.
      const onSplash = (await page.getByRole("button", { name: "Open Penny" }).count()) > 0;
      if (onSplash) {
        await page.locator("body").click();

        // SPEC 6.3 step 1 announces before it plays, so the flag rises the
        // instant `greet` starts. Without this the "false" wait below could be
        // satisfied at once by the pre-tap idle state and snapshot an empty
        // region — the race in its other direction.
        await waitForLive(page, "true");
      }

      await page.waitForLoadState("networkidle");
      await waitForLive(page, "false");

      const snapshot = normalise(await page.locator("body").ariaSnapshot());

      // SPEC 16 step 3.
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

// ---------------------------------------------------------------------------
// Unified diff (SPEC 16 step 5: "print a unified diff (first 40 lines)")
// ---------------------------------------------------------------------------

// Standard LCS backtrack. Snapshots are ~100 lines, so the O(n·m) table costs
// nothing and the result is the minimal edit script a reader expects.
function editScript(before, after) {
  const rows = before.length;
  const columns = after.length;
  const table = Array.from({ length: rows + 1 }, () => new Uint32Array(columns + 1));

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

  // Keep every changed line plus CONTEXT unchanged lines either side.
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

    lines.push(`@@ -${hunkBefore},${beforeCount} +${hunkAfter},${afterCount} @@`, ...body);
  }

  return lines;
}

// ---------------------------------------------------------------------------
// Modes
// ---------------------------------------------------------------------------

const baselineFile = (name) => join(BASELINE_DIR, `${name}.snap.yml`);

async function writeBaselines(results) {
  await mkdir(BASELINE_DIR, { recursive: true });
  for (const { route, snapshot } of results) {
    await writeFile(baselineFile(route.name), `${snapshot}\n`, "utf8");
    say(`  wrote baseline/${route.name}.snap.yml (${snapshot.split("\n").length} lines)`);
  }

  // Axe still runs in baseline mode (SPEC 16 step 3 is not scoped to check
  // mode). It cannot fail the migration — SPEC 16 step 4 says exit 0 — but a
  // migration that silently enshrined a serious violation would defeat the point
  // of the gate, so it is printed.
  const flagged = results.filter((entry) => entry.violations.length > 0);
  for (const { route, violations } of flagged) {
    for (const entry of violations) {
      say(`  warning: ${entry.impact} accessibility violation on ${route.path}: ${entry.id}`);
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
      // SPEC 16 names no message for this; it is not a regression, it is an
      // absent contract, and saying so is more useful than a diff against "".
      say(`Layout Lock: no baseline for ${route.path} — run LOCK_MIGRATION=1 npm run lock:baseline`);
      failed = true;
      continue;
    }

    const expected = normalise(await readFile(file, "utf8"));
    if (expected !== snapshot) {
      // SPEC 16 step 5: the diff first, then the line that names the failure.
      for (const line of unifiedDiff(expected, snapshot).slice(0, 40)) say(line);
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

// ---------------------------------------------------------------------------

async function main() {
  const isBaseline = process.argv.includes("--baseline");

  // SPEC 16 step 4, and it is checked before anything is built: refusing after a
  // ten-second build would bury the one line that explains the refusal.
  if (isBaseline && process.env.LOCK_MIGRATION !== "1") {
    say(REFUSAL);
    process.exit(1);
  }

  await viteRun(["build"]);

  const preview = viteSpawn(["preview", "--port", String(PORT), "--strictPort"]);
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
