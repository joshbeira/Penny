import { useEffect, useRef, useState } from "react";
import type { FixedLineId } from "../data/voiceLines";
import { speak } from "../lib/audio";
import { haptic } from "../lib/haptics";
import { useReceipts } from "../state/receipts";

export type ConfirmMethod = "double-tap" | "button" | "voice";

type Props = {
  readback: { id?: FixedLineId; text: string };
  actionLabel: string;
  onConfirm: (method: ConfirmMethod) => void;
  onCancel: () => void;
};
const DOUBLE_TAP_MS = 300;

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])';
export function useDialogSheet(onEscape: () => void) {
  const sheet = useRef<HTMLDivElement>(null);
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

    const targets = Array.from(
      sheet.current?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? [],
    );
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
type SheetHandlers = {
  confirm: (method: ConfirmMethod) => void;
  cancel: () => void;
};

let openSheet: SheetHandlers | null = null;

export function registerSheet(handlers: SheetHandlers): () => void {
  openSheet = handlers;
  return () => {
    if (openSheet === handlers) openSheet = null;
  };
}
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
export function isSheetOpen(): boolean {
  return openSheet !== null;
}

export default function ConfirmSheet({
  readback,
  actionLabel,
  onConfirm,
  onCancel,
}: Props) {
  const lastTap = useRef(0);
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
  useEffect(() => registerSheet({ confirm, cancel }));
  useEffect(() => {
    void speak(readback);
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
  return (
    <div
      ref={sheet}
      role="dialog"
      aria-modal="true"
      aria-label={actionLabel}
      onKeyDown={onKeyDown}
      className="fixed inset-x-0 bottom-0 z-30 rounded-t-2xl bg-surface-raised p-4"
    >
      <p className="text-card">{readback.text}</p>

      <div
        onPointerDown={onPointerDown}
        className="mt-4 flex h-[120px] items-center justify-center rounded-2xl border border-hairline text-body text-text-dim"
      >
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
  async function confirm(method: ConfirmMethod) {
    setOpen(false);
    await useReceipts.getState().addReceipt({
      action: "Sample replacement card ordered",
      details: "Sandbox only · no card has been ordered",
      method,
    });
    void speak({ id: "done_receipt" });
  }

  return (
    <ConfirmSheet
      readback={{
        text: "Sample card order. This saves a practice receipt only. No card will be ordered. Confirm to try the flow.",
      }}
      actionLabel="Order replacement card"
      onConfirm={(method) => void confirm(method)}
      onCancel={() => setOpen(false)}
    />
  );
}
