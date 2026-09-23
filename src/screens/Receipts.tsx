import { downloadText } from "../lib/download";
import { useState } from "react";
import { speak } from "../lib/audio";
import { useReceipts } from "../state/receipts";
import type { ChainResult } from "../state/receipts";
const DATE = new Intl.DateTimeFormat("en-GB", {
  weekday: "short",
  day: "numeric",
  month: "short",
});
const TIME = new Intl.DateTimeFormat("en-GB", {
  hour: "2-digit",
  minute: "2-digit",
});
const WEEKDAY = new Intl.DateTimeFormat("en-GB", { weekday: "long" });
function methodLabel(method: string): string {
  return method.charAt(0).toUpperCase() + method.slice(1);
}
export async function readReceiptsAloud(): Promise<void> {
  const { receipts } = useReceipts.getState();
  await speak({ text: `You have ${receipts.length} receipts.` });
  for (const receipt of receipts.slice(-5).reverse()) {
    const how =
      receipt.method === "auto"
        ? "filed automatically"
        : `confirmed by ${receipt.method}`;

    await speak({
      text: `${WEEKDAY.format(new Date(receipt.ts))}: ${receipt.action}, ${how}.`,
    });
  }
}
export async function verifyChainAloud(): Promise<ChainResult> {
  const result = await useReceipts.getState().verifyChain();

  if (result.ok)
    void speak({ text: "The stored receipt chain is internally consistent." });
  else void speak({ text: `Broken at entry ${result.brokenAt}.` });

  return result;
}
export default function Receipts() {
  const receipts = useReceipts((state) => state.receipts);
  const [chain, setChain] = useState<ChainResult | null>(null);

  async function verify() {
    setChain(await verifyChainAloud());
  }

  return (
    <>
      <p className="mb-4 text-caption text-text-dim">
        Practice receipts stored in this browser. Chain verification detects
        inconsistent edits, but cannot prove the history was never rewritten.
      </p>
      <button
        type="button"
        onClick={() => void readReceiptsAloud()}
        className="flex min-h-[48px] w-full items-center justify-center rounded-full border border-amber px-6 text-body text-amber"
      >
        Read my receipts
      </button>

      <button
        type="button"
        onClick={() => void verify()}
        className="mt-3 flex min-h-[48px] w-full items-center justify-center rounded-full border border-amber px-6 text-body text-amber"
      >
        Verify chain
      </button>

      {chain !== null && (
        <p
          className={`mt-4 text-body ${chain.ok ? "text-amber" : "text-danger"}`}
        >
          <span aria-hidden="true">{chain.ok ? "✓" : "✗"}</span>{" "}
          {chain.ok ? "Chain intact" : `Broken at entry ${chain.brokenAt}`}
        </p>
      )}

      <div className="mt-4 flex flex-wrap gap-3">
        <button
          className="feedback-link"
          disabled={!receipts.length}
          onClick={() =>
            downloadText(
              "penny-receipts.json",
              JSON.stringify(receipts, null, 2),
              "application/json",
            )
          }
        >
          Export receipts
        </button>
        <button
          className="feedback-link"
          disabled={!receipts.length}
          onClick={() => {
            if (
              window.confirm(
                "Delete all receipts from this browser? This cannot be undone.",
              )
            ) {
              useReceipts.getState().reset();
              setChain(null);
            }
          }}
        >
          Delete receipts
        </button>
      </div>
      {receipts.length === 0 ? (
        <p className="mt-6 text-body text-text-dim">
          No receipts yet. Receipts are written every time Penny acts.
        </p>
      ) : (
        <ul className="mt-6">
          {receipts
            .slice()
            .reverse()
            .map((receipt) => (
              <li key={receipt.id} className="border-b border-hairline py-3">
                <p className="text-card">{receipt.action}</p>
                <p className="mt-1">{receipt.details}</p>
                <p className="mt-1 text-caption text-text-dim">
                  {DATE.format(new Date(receipt.ts))},{" "}
                  {TIME.format(new Date(receipt.ts))} ·{" "}
                  {methodLabel(receipt.method)} ·{" "}
                  <span aria-hidden="true">
                    #{receipt.hash.slice(0, 4)}…{receipt.hash.slice(-4)}
                  </span>
                </p>
              </li>
            ))}
        </ul>
      )}
    </>
  );
}
