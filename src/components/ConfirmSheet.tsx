import { useEffect, useRef, useState } from "react";
import type { FixedLineId } from "../data/voiceLines";
import { speak } from "../lib/audio";
import { haptic } from "../lib/haptics";
import { useReceipts } from "../state/receipts";

// SPEC 9.1. The Read-Back Rule is SPEC 1's first system behaviour — nothing
// executes until Penny states exactly what will happen and is confirmed — so
// this component is the gate every action passes through.

export type ConfirmMethod = "double-tap" | "button" | "voice";

type Props = {
  readback: { id?: FixedLineId; text: string };
  actionLabel: string;
  onConfirm: (method: ConfirmMethod) => void;
  onCancel: () => void;
};

// SPEC 9.1: "two taps < 300ms apart anywhere on the sheet".
const DOUBLE_TAP_MS = 300;

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])';

// SPEC 9.1's dialog rules: "focus-trapped … Escape = cancel, focus returns to
// the invoking button on close".
//
// Exported because SPEC 11.2's TapTellSheet follows the same rules. Sharing the
// implementation makes that true by construction rather than by copy, and adds
// no module outside SPEC 3's tree — the precedent P4 set by exporting
// readReceiptsAloud from screens/Receipts.tsx for P6 to reuse.
export function useDialogSheet(onEscape: () => void) {
  const sheet = useRef<HTMLDivElement>(null);

  // The invoker is captured here rather than passed in, so no caller can
  // forget to restore focus.
  useEffect(() => {
    const invoker = document.activeElement as HTMLElement | null;
    sheet.current?.querySelector<HTMLElement>(FOCUSABLE)?.focus();
    return () => invoker?.focus();
  }, []);

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "Escape") {
      event.preventDefault();
      onEscape();
      return;
    }
    if (event.key !== "Tab") return;

    const targets = Array.from(sheet.current?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? []);
    if (targets.length === 0) return;

    const first = targets[0];
    const last = targets[targets.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  return { sheet, onKeyDown };
}

// SPEC 11.6's "confirm"/"yes" and "cancel"/"no" intents act on "the open sheet
// if any", so voice needs a handle on whichever sheet is up. A module-level slot
// beside useDialogSheet() rather than a new store: SPEC 3's tree has no module
// for it, only one sheet can be open at a time (both are modal), and this is the
// precedent P4 set with readReceiptsAloud and P5 with useDialogSheet.
type SheetHandlers = { confirm: (method: ConfirmMethod) => void; cancel: () => void };

let openSheet: SheetHandlers | null = null;

export function registerSheet(handlers: SheetHandlers): () => void {
  openSheet = handlers;
  return () => {
    if (openSheet === handlers) openSheet = null;
  };
}

// Both return whether a sheet was there, so intents.ts can tell "confirmed" from
// "nothing to confirm" and fall through to SPEC 11.6's no-match line.
export function confirmOpenSheet(): boolean {
  if (!openSheet) return false;
  openSheet.confirm("voice");
  return true;
}

export function cancelOpenSheet(): boolean {
  if (!openSheet) return false;
  openSheet.cancel();
  return true;
}

// SPEC 11.7's priority rule turns on this: sheet-scoped intents "override
// everything" while a dialog is open, and are not eligible at all when none is.
export function isSheetOpen(): boolean {
  return openSheet !== null;
}

export default function ConfirmSheet({ readback, actionLabel, onConfirm, onCancel }: Props) {
  const lastTap = useRef(0);
  // One decision per sheet. Without this a fast double-tap *on* the Confirm
  // button would fire the button's onClick and then the sheet's double-tap
  // detector — two confirms, two receipts.
  const settled = useRef(false);

  const confirm = (method: ConfirmMethod) => {
    if (settled.current) return;
    settled.current = true;
    haptic("confirm");
    onConfirm(method);
  };

  const cancel = () => {
    if (settled.current) return;
    settled.current = true;
    void speak({ id: "cancel_ok" });
    onCancel();
  };

  const { sheet, onKeyDown } = useDialogSheet(cancel);

  // SPEC 11.6: voice confirms "the open sheet if any". SPEC 9.1's own method
  // union already carries "voice", so this sheet was built for it.
  useEffect(() => registerSheet({ confirm, cancel }));

  // SPEC 9.1: "On open, speak(readback)." Both id and text are passed by
  // SPEC 11.1 step 8 — audio.ts plays the recording and mirrors the text.
  useEffect(() => {
    void speak(readback);
    // Deliberately once per mount: the read-back must not repeat on re-render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onPointerDown = () => {
    const now = Date.now();
    if (now - lastTap.current < DOUBLE_TAP_MS) {
      lastTap.current = 0;
      confirm("double-tap");
      return;
    }
    lastTap.current = now;
  };

  // SPEC 9.1 contents, in order: read-back text (22px) · the 120px
  // "Double-tap to confirm" region · a 56px Confirm button · a Cancel text
  // button. `actionLabel` names the dialog — SPEC 9.1 gives the button itself
  // the literal label "Confirm", and SPEC 4 wants one name per action all the
  // way through, so the name belongs on the dialog.
  //
  // z-30 keeps the sheet above SPEC 11.3's text cards (z-20): in Quiet Mode the
  // read-back itself becomes a card, and a modal must never end up underneath
  // one.
  return (
    <div
      ref={sheet}
      role="dialog"
      aria-modal="true"
      aria-label={actionLabel}
      onKeyDown={onKeyDown}
      onPointerDown={onPointerDown}
      className="fixed inset-x-0 bottom-0 z-30 rounded-t-2xl bg-surface-raised p-4"
    >
      <p className="text-card">{readback.text}</p>

      <div className="mt-4 flex h-[120px] items-center justify-center rounded-2xl border border-hairline text-body text-text-dim">
        Double-tap to confirm
      </div>

      <button
        type="button"
        onClick={() => confirm("button")}
        className="mt-4 flex min-h-[56px] w-full items-center justify-center rounded-full bg-amber px-6 text-body text-bg"
      >
        Confirm
      </button>

      <button
        type="button"
        onClick={cancel}
        className="mt-2 flex min-h-[48px] w-full items-center justify-center text-body text-text-dim"
      >
        Cancel
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// The order-card flow (SPEC 11.1 step 8, reachable from SPEC 11.7's `order_card`)
// ---------------------------------------------------------------------------

// SPEC 11.7 makes `order_card` a GLOBAL intent — "order my card" has to work
// from any screen — while SPEC 10 keeps the button on Post Box. The flow
// therefore moved up here out of screens/PostBox.tsx, where it used to live as
// local state: a global intent could otherwise only reach it by duplicating the
// read-back and the receipt write, and two copies of an account consequence is
// exactly the thing SPEC 1's Read-Back Rule exists to prevent drifting.
//
// So there is now ONE implementation with two ways in. The button calls
// requestOrderCard(); so does voice. The receipt records which.
//
// It lives in this file rather than a new one for the reason P5 put
// useDialogSheet() here and P6 put the sheet registry here: SPEC 3's tree names
// no module for it, and this is the module that owns the sheet.
let openOrderCard: (() => void) | null = null;

export function requestOrderCard(): void {
  openOrderCard?.();
}

export function OrderCardSheet() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    openOrderCard = () => setOpen(true);
    return () => {
      openOrderCard = null;
    };
  }, []);

  if (!open) return null;

  // SPEC 11.1 step 8's exact payload, moved verbatim.
  async function confirm(method: ConfirmMethod) {
    setOpen(false);
    await useReceipts.getState().addReceipt({
      action: "Replacement card ordered",
      details: "Arriving in 5 working days to home address",
      method,
    });
    void speak({ id: "done_receipt" });
  }

  return (
    <ConfirmSheet
      // SPEC 11.1 step 8, verbatim. `text` spells the number and `id` names the
      // recording of it, so the live region reads "42 Lavender Grove" while the
      // audio says "forty two".
      readback={{
        id: "readback_card",
        text: "Ordering a replacement debit card to your home address at 42 Lavender Grove. It will arrive in five working days. Double-tap to confirm.",
      }}
      // SPEC 4: one name for the action the whole way through.
      actionLabel="Order replacement card"
      onConfirm={(method) => void confirm(method)}
      onCancel={() => setOpen(false)}
    />
  );
}
