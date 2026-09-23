import assert from "node:assert/strict";
import test from "node:test";
import { sha256Hex } from "../lib/hash.ts";
import type { Receipt } from "./receipts.ts";
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

test("concurrent writes form one unbroken chain", async () => {
  useReceipts.getState().reset();
  await Promise.all(
    Array.from({ length: 25 }, (_, n) =>
      useReceipts.getState().addReceipt({
        action: `Action ${n}`,
        details: "Concurrent write",
        method: "button",
      }),
    ),
  );
  assert.equal(useReceipts.getState().receipts.length, 25);
  assert.deepEqual(await useReceipts.getState().verifyChain(), { ok: true });
});

test("clearing receipts cancels queued writes instead of restoring deleted history", async () => {
  useReceipts.getState().reset();
  const pending = useReceipts
    .getState()
    .addReceipt({ action: "Queued", details: "Test", method: "button" });
  useReceipts.getState().reset();
  await assert.rejects(pending, /cleared/);
  assert.equal(useReceipts.getState().receipts.length, 0);
  await useReceipts
    .getState()
    .addReceipt({ action: "After reset", details: "Test", method: "button" });
  assert.deepEqual(await useReceipts.getState().verifyChain(), { ok: true });
});

const GENESIS = "0".repeat(64);
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
    details: "Sample scam indicators",
    method: "auto",
  });
  await addReceipt({
    action: "Card payment approved",
    details: "The Coffee House · £4.85",
    method: "double-tap",
  });
  return useReceipts.getState().receipts;
}
function tamper(index: number, patch: Partial<Receipt>): void {
  useReceipts.setState((state) => ({
    receipts: state.receipts.map((entry, i) =>
      i === index ? { ...entry, ...patch } : entry,
    ),
  }));
}

test("the first receipt's prevHash is the receipt format’s 64 zeros", async () => {
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
test("each hash is the receipt format’s pipe-joined preimage", async () => {
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
  tamper(1, { details: "Changed sample description" });
  assert.deepEqual(await useReceipts.getState().verifyChain(), {
    ok: false,
    brokenAt: 1,
  });

  await chainOfThree();
  tamper(2, { action: "Card payment approved for £4,850" });
  assert.deepEqual(await useReceipts.getState().verifyChain(), {
    ok: false,
    brokenAt: 2,
  });

  await chainOfThree();
  tamper(2, { hash: "f".repeat(64) });
  assert.deepEqual(await useReceipts.getState().verifyChain(), {
    ok: false,
    brokenAt: 2,
  });
});
test("verifyChain reports the first broken entry", async () => {
  await chainOfThree();
  tamper(0, { details: "Arriving tomorrow" });
  assert.deepEqual(await useReceipts.getState().verifyChain(), {
    ok: false,
    brokenAt: 0,
  });
});
test("a re-hashed tamper is caught by the next entry's link", async () => {
  const receipts = await chainOfThree();
  const forged = { ...receipts[1], details: "Changed sample description" };
  tamper(1, {
    details: forged.details,
    hash: await sha256Hex(
      `${forged.prevHash}|${forged.ts}|${forged.action}|${forged.details}|${forged.method}`,
    ),
  });
  const patched = useReceipts.getState().receipts;
  assert.equal(
    patched[1].hash,
    await sha256Hex(
      `${patched[1].prevHash}|${patched[1].ts}|${patched[1].action}|${patched[1].details}|${patched[1].method}`,
    ),
  );
  assert.deepEqual(await useReceipts.getState().verifyChain(), {
    ok: false,
    brokenAt: 2,
  });
});

test("rewriting the genesis prevHash breaks entry 0", async () => {
  await chainOfThree();
  tamper(0, { prevHash: "a".repeat(64) });
  assert.deepEqual(await useReceipts.getState().verifyChain(), {
    ok: false,
    brokenAt: 0,
  });
});
