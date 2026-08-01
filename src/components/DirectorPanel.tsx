import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { useDialogSheet } from "./ConfirmSheet";
import { glance } from "../lib/earcons";
import { useDirector } from "../state/director";
import type { ArmedLetter, TapPush } from "../state/director";
import { useReceipts } from "../state/receipts";
import { useSettings } from "../state/settings";

// SPEC 12. The panel that drives the four filmed scenarios. Everything it
// touches already exists — SPEC 12.2's store landed in P3 (armedLetter) and P5
// (the two pushes), and P4 built seedDemo/reset with no caller precisely for
// this. P6 supplies the only UI they will ever have, and deletes the temporary
// Settings stand-in that has been standing for them since P3.

// SPEC 12.1: "3 taps within 900ms".
const TRIPLE_TAP_MS = 900;

// SPEC 12.2's radio group, its labels verbatim. "live" is the default and the
// only value that reaches the network (SPEC 11.1 step 3).
const ARMED: { value: ArmedLetter; label: string }[] = [
  { value: "live", label: "Live API" },
  { value: "card", label: "Card" },
  { value: "nhs", label: "NHS" },
  { value: "scam", label: "Scam" },
  { value: "pin", label: "PIN" },
];

// SPEC 12.2's two push buttons, labels verbatim.
const PUSHES: { value: TapPush; label: string }[] = [
  { value: "coffee", label: "Push: Coffee £4.85" },
  { value: "ticketpoint", label: "Push: TicketPoint £68.20" },
];

const ROW = "flex min-h-[48px] w-full items-center rounded-full border border-hairline px-4 text-body";

function Panel({ onClose }: { onClose: () => void }) {
  const { sheet, onKeyDown } = useDialogSheet(onClose);

  const armedLetter = useDirector((state) => state.armedLetter);
  const setArmedLetter = useDirector((state) => state.setArmedLetter);
  const pushTap = useDirector((state) => state.pushTap);

  const demoMode = useSettings((state) => state.demoMode);
  const setDemoMode = useSettings((state) => state.setDemoMode);

  const seedDemo = useReceipts((state) => state.seedDemo);
  const reset = useReceipts((state) => state.reset);

  // SPEC 12.2's order, exactly: armed letter radios · Coffee · TicketPoint ·
  // Demo mode mirror · Replay Glance · Seed demo receipts · Reset receipts ·
  // Close.
  return (
    <div
      ref={sheet}
      role="dialog"
      aria-modal="true"
      aria-label="Director"
      onKeyDown={onKeyDown}
      className="fixed inset-x-0 bottom-0 z-30 max-h-dvh overflow-y-auto rounded-t-2xl bg-surface-raised p-4"
    >
      <fieldset>
        <legend className="text-caption text-text-dim">Armed letter</legend>
        {/* Full-width 48px rows, so the whole row is the hit target rather than
            the 20x20 input. P4 flagged the stand-in's bare radios as the only
            sub-48px controls in the app (SPEC 4); they go with it. */}
        {ARMED.map((option) => (
          <label key={option.value} className={`${ROW} mt-2 gap-3`}>
            <input
              type="radio"
              name="armed-letter"
              value={option.value}
              checked={armedLetter === option.value}
              onChange={() => setArmedLetter(option.value)}
              className="h-[20px] w-[20px] accent-amber"
            />
            {option.label}
          </label>
        ))}
      </fieldset>

      {PUSHES.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => {
            pushTap(option.value);
            // The sheet must not open behind this panel: SPEC 11.2's push is the
            // scenario, and the panel has done its job once it fires.
            onClose();
          }}
          className={`${ROW} mt-2 justify-center border-amber text-amber`}
        >
          {option.label}
        </button>
      ))}

      {/* SPEC 12.2: "toggle mirror of Demo mode" — the same setting SPEC 10's
          Settings row owns, using the aria-pressed pattern the rest of the app
          fixes for toggles. */}
      <button
        type="button"
        aria-pressed={demoMode}
        onClick={() => setDemoMode(!demoMode)}
        className={`${ROW} mt-2 justify-between`}
      >
        Demo mode
        <span aria-hidden="true">{demoMode ? "On" : "Off"}</span>
      </button>

      <button type="button" onClick={() => void glance()} className={`${ROW} mt-2 justify-center`}>
        Replay Glance
      </button>

      <button type="button" onClick={() => seedDemo()} className={`${ROW} mt-2 justify-center`}>
        Seed demo receipts
      </button>

      <button type="button" onClick={() => reset()} className={`${ROW} mt-2 justify-center`}>
        Reset receipts
      </button>

      <button type="button" onClick={onClose} className={`${ROW} mt-2 justify-center`}>
        Close
      </button>
    </div>
  );
}

export default function DirectorPanel() {
  const [open, setOpen] = useState(false);
  const taps = useRef<number[]>([]);
  const { pathname } = useLocation();

  // SPEC 12.1's backup route. It is excluded from SPEC 16's route list and from
  // the TabBar, and exists so the panel is reachable when a triple-tap will not
  // land — on a phone held by someone else, mid-take.
  const viaRoute = pathname === "/director";
  useEffect(() => {
    if (viaRoute) setOpen(true);
  }, [viaRoute]);

  // SPEC 12.1: "A fixed 48x48px invisible div at the top-left corner
  // (aria-hidden="true", not focusable): 3 taps within 900ms opens the panel."
  //
  // Mounted only once the app is unlocked (App.tsx): over the Splash this would
  // sit on top of SPEC 6.1's unlock tap and swallow it.
  const onPointerDown = () => {
    const now = Date.now();
    taps.current = [...taps.current, now].filter((t) => now - t < TRIPLE_TAP_MS);
    if (taps.current.length >= 3) {
      taps.current = [];
      setOpen(true);
    }
  };

  return (
    <>
      <div
        aria-hidden="true"
        onPointerDown={onPointerDown}
        className="fixed left-0 top-0 z-40 h-[48px] w-[48px]"
      />
      {open && <Panel onClose={() => setOpen(false)} />}
    </>
  );
}
