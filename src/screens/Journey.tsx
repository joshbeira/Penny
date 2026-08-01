import { useEffect, useRef, useState } from "react";
import Home from "./Home";
import type { Era } from "./Home";

// SPEC 10's Journey: h1 (the shared Header's, "One customer. Three years.") ·
// slider · labels under the track · a non-interactive framed preview rendering
// <Home era={…}/>. That order is the Layout Lock baseline (SPEC 16) — never
// reorder. Journey is routed but is NOT a tab.

const ERAS: Era[] = ["2019", "2026", "2030"];

export default function Journey() {
  // SPEC 10 fixes min 0 / max 2 / step 1 but not the resting position. 1 is both
  // the HTML midpoint default for that range and SPEC 10's own default era, so
  // the slider opens on 2026 — today — and the customer's sight loss is read in
  // either direction from there.
  const [index, setIndex] = useState(1);
  const era = ERAS[index];

  const frame = useRef<HTMLDivElement>(null);

  // SPEC 10: "a non-interactive framed preview". `inert` rather than
  // aria-hidden: it removes the subtree from the accessibility tree AND from the
  // tab order together, so the preview cannot produce the aria-hidden-focus axe
  // violation that hiding focusable children otherwise would (SPEC 15/16).
  //
  // 2030 is exempt — SPEC 10 calls its Glance button "the single interactive
  // element in the preview".
  useEffect(() => {
    if (frame.current) frame.current.inert = era !== "2030";
  }, [era]);

  return (
    <>
      <input
        type="range"
        min={0}
        max={2}
        step={1}
        value={index}
        aria-label="Year"
        aria-valuetext={era}
        onChange={(event) => setIndex(Number(event.target.value))}
        // h-[48px] is SPEC 4's minimum tap target, not decoration: a range
        // input's intrinsic box is ~16px tall, which is the one control in the
        // app that would have missed it.
        className="h-[48px] w-full accent-amber"
      />

      {/* SPEC 10: "labels under the track". aria-hidden because the slider
          already announces the year through aria-valuetext (SPEC 15 item 7) —
          reading all three again on every swipe would bury it. */}
      <div aria-hidden="true" className="flex justify-between text-caption text-text-dim">
        {ERAS.map((year) => (
          <span key={year}>{year}</span>
        ))}
      </div>

      <div
        ref={frame}
        className={`era-${era} mt-6 overflow-hidden rounded-2xl border border-hairline p-4`}
        style={{ background: "var(--bg)" }}
      >
        <Home era={era} />
      </div>
    </>
  );
}
