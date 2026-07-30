import { useState } from "react";
import { announce, speak } from "../lib/audio";
import { useReceipts } from "../state/receipts";
import type { ChainResult } from "../state/receipts";

// SPEC 10's Receipts screen and SPEC 11.5's read-aloud. Element order is the
// Layout Lock baseline (SPEC 16) — never reorder.

// SPEC 10 renders the timestamp as "Mon 6 Jul, 14:32"; en-GB gives both halves
// exactly, and it is 24-hour, so no format string is hand-rolled.
const DATE = new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "short" });
const TIME = new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit" });

// SPEC 11.5's "{Weekday}" is spoken, so it is the full name — matching SPEC
// 7.2's own composed line, "One unusual payment on Saturday."
const WEEKDAY = new Intl.DateTimeFormat("en-GB", { weekday: "long" });

// SPEC 4: sentence case everywhere. Same treatment Home.tsx gives its category
// tags — the stored value is a token, the tag is copy.
function methodLabel(method: string): string {
  return method.charAt(0).toUpperCase() + method.slice(1);
}

// SPEC 11.5, composed at runtime and spoken through speak({ text }) — never a
// fixed line, so it goes to /api/tts and falls through to speechSynthesis
// whenever that is unavailable.
//
// SEAM: P6. SPEC 11.6's "receipt" intent is "navigate /receipts + read
// receipts", so the voice path calls this same implementation rather than
// composing its own.
export async function readReceiptsAloud(): Promise<void> {
  const { receipts } = useReceipts.getState();

  // SPEC 11.5 pins the template, so the count is a digit here even though SPEC
  // 7.1/7.2's composed lines spell theirs as words — each follows its own
  // section's literal. A count of 1 reads "1 receipts" for the same reason SPEC
  // 10's chip reads "1 items hidden on device": pluralising invents a decision.
  await speak({ text: `You have ${receipts.length} receipts.` });

  // "for the latest ≤5", newest-first, matching SPEC 10's list order.
  for (const receipt of receipts.slice(-5).reverse()) {
    // SPEC 11.5's parenthetical maps method "auto" to "filed automatically".
    // Substituted for the whole clause, not for the {method} token alone —
    // "confirmed by filed automatically" is not English, and this line is
    // spoken (Appendix A beat 6).
    const how =
      receipt.method === "auto" ? "filed automatically" : `confirmed by ${receipt.method}`;

    await speak({
      text: `${WEEKDAY.format(new Date(receipt.ts))}: ${receipt.action}, ${how}.`,
    });
  }
}

// SPEC 10 order: Read my receipts · Verify chain · verify banner · the list.
export default function Receipts() {
  const receipts = useReceipts((state) => state.receipts);

  // SPEC 10: "hidden until run". null is that state — the banner is not in the
  // tree at all, which is also what SPEC 16 baselines on a fresh profile.
  const [chain, setChain] = useState<ChainResult | null>(null);

  async function verify() {
    const result = await useReceipts.getState().verifyChain();
    setChain(result);

    if (result.ok) {
      // SPEC 10 gives speech to the intact case only; speak() mirrors itself
      // into the live region.
      void speak({ id: "chain_ok" });
    } else {
      // The broken case would otherwise be silent to a screen reader. Posted
      // straight to aria-live rather than through speak(), exactly as SPEC
      // 7.1/7.2's completion lines are — routing it through speak() would
      // speak a line SPEC 10 does not give one to.
      announce(`Broken at entry ${result.brokenAt}`);
    }
  }

  return (
    <>
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

      {/* SPEC 10's wording verbatim. The glyphs are decoration — the words
          carry the meaning, and SPEC 15 wants no stray symbols announced.
          SPEC 9.2 returns `brokenAt: index`, and SPEC 17 P4 asks for "the exact
          broken index", so {n} is that array index unchanged. */}
      {chain !== null && (
        <p className={`mt-4 text-body ${chain.ok ? "text-amber" : "text-danger"}`}>
          <span aria-hidden="true">{chain.ok ? "✓" : "✗"}</span>{" "}
          {chain.ok ? "Chain intact" : `Broken at entry ${chain.brokenAt}`}
        </p>
      )}

      {receipts.length === 0 ? (
        <p className="mt-6 text-body text-text-dim">
          No receipts yet. Receipts are written every time Penny acts.
        </p>
      ) : (
        // SPEC 10: newest-first. The store appends, so the view reverses a copy
        // — reverse() mutates, and that array is zustand's state.
        <ul className="mt-6">
          {receipts
            .slice()
            .reverse()
            .map((receipt) => (
              <li key={receipt.id} className="border-b border-hairline py-3">
                <p className="text-card">{receipt.action}</p>
                <p className="mt-1">{receipt.details}</p>
                <p className="mt-1 text-caption text-text-dim">
                  {DATE.format(new Date(receipt.ts))}, {TIME.format(new Date(receipt.ts))} ·{" "}
                  {methodLabel(receipt.method)} ·{" "}
                  {/* SPEC 10's "#a3f9…" — first 4 and last 4 of the hash. It is
                      a visual affordance for the tamper-evidence story, so it
                      stays out of the accessibility tree: SPEC 15's TalkBack
                      item 9 wants receipts to read as full sentences, and a hex
                      fragment is not one. */}
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
