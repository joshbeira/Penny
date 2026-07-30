import assert from "node:assert/strict";
import test from "node:test";
import { sha256Hex } from "../lib/hash.ts";
import type { Receipt } from "./receipts.ts";

// SPEC 9.2's chain, locked. SPEC 17 P4's acceptance criterion is that a
// hand-edited receipt makes verifyChain report the exact broken index, and
// SPEC 1 sells the receipts as tamper-evident — so the link rule, the preimage
// and the reported index are all asserted here rather than by eye.
//
// Runs on `node --test` with native type stripping: no test framework, and so
// no dependency beyond SPEC 2's table.

// zustand's persist resolves its storage when the store module is evaluated, so
// a minimal in-memory stand-in goes in BEFORE that evaluation — which is what
// the dynamic import below is for. Without it persist warns on every write.
//
// It has to hang off `window`, not globalThis: zustand v5 defaults to
// createJSONStorage(() => window.localStorage) (middleware.mjs:332), and Node
// has no `window` at all, so the getter throws and persist silently drops to no
// storage. Node's own localStorage global needs --experimental-webstorage and
// is not what zustand reads anyway.
const memory = new Map<string, string>();

Object.defineProperty(globalThis, "window", {
  configurable: true,
  value: {
    localStorage: {
      getItem: (key: string) => memory.get(key) ?? null,
      setItem: (key: string, value: string) => {
        memory.set(key, value);
      },
      removeItem: (key: string) => {
        memory.delete(key);
      },
    },
  },
});

const { useReceipts } = await import("./receipts.ts");

const GENESIS = "0".repeat(64);

// Real SPEC 11 payloads, so the fixture is the shape the app actually writes.
async function chainOfThree(): Promise<Receipt[]> {
  const { reset, addReceipt } = useReceipts.getState();
  reset();
  await addReceipt({
    action: "Replacement card ordered",
    details: "Arriving in 5 working days to home address",
    method: "double-tap",
  });
  await addReceipt({
    action: "Scam letter filed",
    details: "Prize-draw pattern · 214 reports this month",
    method: "auto",
  });
  await addReceipt({
    action: "Card payment approved",
    details: "The Coffee House · £4.85",
    method: "double-tap",
  });
  return useReceipts.getState().receipts;
}

// Stands in for SPEC 17 P4's "manually editing a receipt in localStorage".
function tamper(index: number, patch: Partial<Receipt>): void {
  useReceipts.setState((state) => ({
    receipts: state.receipts.map((entry, i) => (i === index ? { ...entry, ...patch } : entry)),
  }));
}

test("the first receipt's prevHash is SPEC 9.2's 64 zeros", async () => {
  const { reset, addReceipt } = useReceipts.getState();
  reset();
  const first = await addReceipt({
    action: "Replacement card ordered",
    details: "Arriving in 5 working days to home address",
    method: "double-tap",
  });

  assert.equal(first.prevHash, GENESIS);
  assert.equal(first.prevHash.length, 64);
  assert.deepEqual(await useReceipts.getState().verifyChain(), { ok: true });
});

test("a chain of three links and verifies", async () => {
  const receipts = await chainOfThree();

  assert.equal(receipts.length, 3);
  assert.equal(receipts[0].prevHash, GENESIS);
  assert.equal(receipts[1].prevHash, receipts[0].hash);
  assert.equal(receipts[2].prevHash, receipts[1].hash);
  for (const entry of receipts) assert.match(entry.hash, /^[0-9a-f]{64}$/);

  assert.deepEqual(await useReceipts.getState().verifyChain(), { ok: true });
});

// SPEC 9.2 pins the preimage exactly: prevHash|ts|action|details|method. Asserted
// from outside the module, so reordering or re-separating those five fields is a
// test failure and not a silent rewrite of every hash.
test("each hash is SPEC 9.2's pipe-joined preimage", async () => {
  for (const entry of await chainOfThree()) {
    assert.equal(
      entry.hash,
      await sha256Hex(
        `${entry.prevHash}|${entry.ts}|${entry.action}|${entry.details}|${entry.method}`,
      ),
    );
  }
});

test("a tampered field reports its own index", async () => {
  await chainOfThree();
  tamper(1, { details: "Prize-draw pattern · 3 reports this month" });
  assert.deepEqual(await useReceipts.getState().verifyChain(), { ok: false, brokenAt: 1 });

  await chainOfThree();
  tamper(2, { action: "Card payment approved for £4,850" });
  assert.deepEqual(await useReceipts.getState().verifyChain(), { ok: false, brokenAt: 2 });

  await chainOfThree();
  tamper(2, { hash: "f".repeat(64) });
  assert.deepEqual(await useReceipts.getState().verifyChain(), { ok: false, brokenAt: 2 });
});

// The point of the index: editing entry 0 also snaps entry 1's link, and
// verifyChain has to name the first break, not the last.
test("verifyChain reports the first broken entry", async () => {
  await chainOfThree();
  tamper(0, { details: "Arriving tomorrow" });
  assert.deepEqual(await useReceipts.getState().verifyChain(), { ok: false, brokenAt: 0 });
});

// The case that makes this a chain rather than a checksum. Editing a field and
// recomputing that entry's own digest defeats the per-entry check completely —
// only the prevHash link catches it, one entry later.
test("a re-hashed tamper is caught by the next entry's link", async () => {
  const receipts = await chainOfThree();
  const forged = { ...receipts[1], details: "Prize-draw pattern · 3 reports this month" };
  tamper(1, {
    details: forged.details,
    hash: await sha256Hex(
      `${forged.prevHash}|${forged.ts}|${forged.action}|${forged.details}|${forged.method}`,
    ),
  });

  // Entry 1 now verifies against itself, and entry 0 is untouched, so the first
  // break is entry 2's prevHash.
  const patched = useReceipts.getState().receipts;
  assert.equal(
    patched[1].hash,
    await sha256Hex(
      `${patched[1].prevHash}|${patched[1].ts}|${patched[1].action}|${patched[1].details}|${patched[1].method}`,
    ),
  );
  assert.deepEqual(await useReceipts.getState().verifyChain(), { ok: false, brokenAt: 2 });
});

test("rewriting the genesis prevHash breaks entry 0", async () => {
  await chainOfThree();
  tamper(0, { prevHash: "a".repeat(64) });
  assert.deepEqual(await useReceipts.getState().verifyChain(), { ok: false, brokenAt: 0 });
});
