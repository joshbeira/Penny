import { useEffect, useRef } from "react";
import { registerSheet, useDialogSheet } from "./ConfirmSheet";
import type { ConfirmMethod } from "./ConfirmSheet";
import { lineText } from "../data/voiceLines";
import type { FixedLineId } from "../data/voiceLines";
import { announce, speak } from "../lib/audio";
import { haptic } from "../lib/haptics";
import { useDirector } from "../state/director";
import type { TapPush } from "../state/director";
import { useReceipts } from "../state/receipts";
import { useSettings } from "../state/settings";

// SPEC 11.2's Tap & Tell: a simulated card-terminal push that states the exact
// amount before it is approved. It is the Read-Back Rule (SPEC 1) applied to a
// payment — nothing is approved until Penny has said what it costs.

// SPEC 9.1's threshold, reused: SPEC 11.2 says "same dialog rules".
const DOUBLE_TAP_MS = 300;

// The two pushes SPEC 12.2 names. The receipt details are SPEC 11.2 verbatim,
// including the U+00B7 separator; `line` is the SPEC 6.2 recording for each.
const PUSHES: Record<
  TapPush,
  { merchant: string; amount: string; line: FixedLineId; details: string }
> = {
  coffee: {
    merchant: "The Coffee House",
    amount: "£4.85",
    line: "tap_coffee",
    details: "The Coffee House · £4.85",
  },
  ticketpoint: {
    merchant: "TicketPoint Ltd",
    amount: "£68.20",
    line: "tap_unknown",
    details: "TicketPoint Ltd · £68.20",
  },
};

export default function TapTellSheet({ push }: { push: TapPush }) {
  const { merchant, amount, line, details } = PUSHES[push];
  const quietMode = useSettings((state) => state.quietMode);

  const lastTap = useRef(0);
  // One decision per sheet, as SPEC 9.1's ConfirmSheet has: a stray third tap
  // must not write a second receipt.
  const settled = useRef(false);

  // SPEC 11.2: "Approve → haptic("confirm") → speak({id:"payment_done"}) →
  // addReceipt(...)". The sheet is dismissed between the haptic and the line so
  // that in Quiet Mode the "Approved. Receipt saved." card — which is what
  // SPEC 12.3 scenario B films — is not raised behind the sheet that spawned it.
  //
  // SPEC 11.2 hard-codes the receipt's method as "double-tap" because a
  // double-tap was the only way to approve — its contents list gives this sheet
  // no Confirm button. SPEC 11.6's voice intent adds a second way, so the method
  // is now whatever was actually used. Recording "double-tap" for a spoken
  // approval would put a false statement in a tamper-evident log (SPEC 1's
  // Action Receipts), and voice is the only route by which this sheet can be
  // approved without sight or touch — P5 recorded that gap deliberately.
  async function approve(method: ConfirmMethod) {
    if (settled.current) return;
    settled.current = true;

    haptic("confirm");
    useDirector.getState().clearTap();
    void speak({ id: "payment_done" });

    await useReceipts.getState().addReceipt({
      action: "Card payment approved",
      details,
      method,
    });
  }

  // SPEC 11.2: "Cancel → cancel_ok, no receipt."
  function cancel() {
    if (settled.current) return;
    settled.current = true;
    void speak({ id: "cancel_ok" });
    useDirector.getState().clearTap();
  }

  // SPEC 11.2: "same dialog rules as ConfirmSheet" — focus trapped, Escape
  // cancels, focus restored to the invoking button on close.
  const { sheet, onKeyDown } = useDialogSheet(cancel);

  // SPEC 11.6: voice acts on "the open sheet if any", and this is one.
  useEffect(() => registerSheet({ confirm: (method) => void approve(method), cancel }));

  useEffect(() => {
    // SPEC 11.2: "Director push → haptic("attention") → TapTellSheet". Fired
    // here rather than by the pushing control so that P6's DirectorPanel
    // inherits it, exactly as ConfirmSheet owns its own on-open read-back.
    haptic("attention");

    if (useSettings.getState().quietMode) {
      // SPEC 11.2: "Quiet: no speech; the sheet is the text card". So the line
      // is mirrored straight to the live region (SPEC 11.3 keeps that row
      // "always") instead of going through speak(), which would stack a second,
      // redundant card on top of the sheet already showing the same thing.
      announce(lineText(line));
    } else {
      void speak({ id: line });
    }
    // Once per mount: the announcement must not repeat on re-render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // SPEC 9.1's gesture: "two taps < 300ms apart anywhere on the sheet".
  const onPointerDown = () => {
    const now = Date.now();
    if (now - lastTap.current < DOUBLE_TAP_MS) {
      lastTap.current = 0;
      void approve("double-tap");
      return;
    }
    lastTap.current = now;
  };

  // SPEC 11.2's contents, in order: merchant 28px · amount 40px · the
  // "Double-tap to approve" region · Cancel. The Quiet caption row is appended
  // last so it displaces none of them.
  //
  // SPEC 11.2 names no accessible name for the dialog; "Approve card payment"
  // names the outcome (SPEC 4) and keeps the action name of the receipt it
  // writes.
  return (
    <div
      ref={sheet}
      role="dialog"
      aria-modal="true"
      aria-label="Approve card payment"
      onKeyDown={onKeyDown}
      onPointerDown={onPointerDown}
      className="fixed inset-x-0 bottom-0 z-30 rounded-t-2xl bg-surface-raised p-4"
    >
      <p className="text-screen">{merchant}</p>
      <p className="mt-1 text-amount">{amount}</p>

      <div className="mt-4 flex h-[120px] items-center justify-center rounded-2xl border border-hairline text-body text-text-dim">
        Double-tap to approve
      </div>

      <button
        type="button"
        onClick={cancel}
        className="mt-2 flex min-h-[48px] w-full items-center justify-center text-body text-text-dim"
      >
        Cancel
      </button>

      {quietMode && <p className="mt-2 text-caption text-text-dim">Quiet Mode</p>}
    </div>
  );
}
