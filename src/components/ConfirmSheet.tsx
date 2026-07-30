import { useEffect, useRef } from "react";
import type { FixedLineId } from "../data/voiceLines";
import { speak } from "../lib/audio";
import { haptic } from "../lib/haptics";

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

export default function ConfirmSheet({ readback, actionLabel, onConfirm, onCancel }: Props) {
  const sheet = useRef<HTMLDivElement>(null);
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

  // SPEC 9.1: "On open, speak(readback)." Both id and text are passed by
  // SPEC 11.1 step 8 — audio.ts plays the recording and mirrors the text.
  useEffect(() => {
    void speak(readback);
    // Deliberately once per mount: the read-back must not repeat on re-render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // SPEC 9.1: "focus returns to the invoking button on close". Captured here
  // rather than passed in, so no caller can forget it.
  useEffect(() => {
    const invoker = document.activeElement as HTMLElement | null;
    sheet.current?.querySelector<HTMLElement>(FOCUSABLE)?.focus();
    return () => invoker?.focus();
  }, []);

  // SPEC 9.1: "focus-trapped … Escape = cancel".
  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "Escape") {
      event.preventDefault();
      cancel();
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
  return (
    <div
      ref={sheet}
      role="dialog"
      aria-modal="true"
      aria-label={actionLabel}
      onKeyDown={onKeyDown}
      onPointerDown={onPointerDown}
      className="fixed inset-x-0 bottom-0 z-10 rounded-t-2xl bg-surface-raised p-4"
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
