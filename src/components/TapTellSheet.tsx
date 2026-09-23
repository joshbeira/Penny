import { useEffect, useRef } from "react";
import { registerSheet, useDialogSheet } from "./ConfirmSheet";
import type { ConfirmMethod } from "./ConfirmSheet";
import { lineText } from "../data/voiceLines";
import type { FixedLineId } from "../data/voiceLines";
import { announce, speak } from "../lib/audio";
import { haptic } from "../lib/haptics";
import { useSandbox } from "../state/sandbox";
import type { TapPush } from "../state/sandbox";
import { useReceipts } from "../state/receipts";
import { useSettings } from "../state/settings";
const DOUBLE_TAP_MS = 300;
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
  const settled = useRef(false);
  async function approve(method: ConfirmMethod) {
    if (settled.current) return;
    settled.current = true;

    haptic("confirm");
    useSandbox.getState().clearTap();
    void speak({ id: "payment_done" });

    await useReceipts.getState().addReceipt({
      action: "Sample card payment approved",
      details,
      method,
    });
  }
  function cancel() {
    if (settled.current) return;
    settled.current = true;
    void speak({ id: "cancel_ok" });
    useSandbox.getState().clearTap();
  }
  const { sheet, onKeyDown } = useDialogSheet(cancel);
  useEffect(() =>
    registerSheet({ confirm: (method) => void approve(method), cancel }),
  );

  useEffect(() => {
    haptic("attention");

    if (useSettings.getState().quietMode) {
      announce(lineText(line));
    } else {
      void speak({ id: line });
    }
  }, []);
  const onPointerDown = () => {
    const now = Date.now();
    if (now - lastTap.current < DOUBLE_TAP_MS) {
      lastTap.current = 0;
      void approve("double-tap");
      return;
    }
    lastTap.current = now;
  };
  return (
    <div
      ref={sheet}
      role="dialog"
      aria-modal="true"
      aria-label="Approve card payment"
      onKeyDown={onKeyDown}
      className="fixed inset-x-0 bottom-0 z-30 rounded-t-2xl bg-surface-raised p-4"
    >
      <p className="text-caption text-amber">
        Sandbox payment · no money will move
      </p>
      <p className="text-screen">{merchant}</p>
      <p className="mt-1 text-amount">{amount}</p>

      <div
        onPointerDown={onPointerDown}
        className="mt-4 flex h-[120px] items-center justify-center rounded-2xl border border-hairline text-body text-text-dim"
      >
        Double-tap to approve
      </div>

      <button
        type="button"
        className="primary-link mt-4 w-full"
        onClick={() => void approve("button")}
      >
        Approve sample payment
      </button>
      <button
        type="button"
        onClick={cancel}
        className="mt-2 flex min-h-[48px] w-full items-center justify-center text-body text-text-dim"
      >
        Cancel
      </button>

      {quietMode && (
        <p className="mt-2 text-caption text-text-dim">Quiet Mode</p>
      )}
    </div>
  );
}
