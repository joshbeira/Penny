import { useEffect, useRef, useState } from "react";
import Home from "./Home";
import type { Era } from "./Home";

const ERAS: Era[] = ["2019", "2026", "2030"];
let setEra: ((era: Era) => void) | null = null;

export function setJourneyEra(era: Era): boolean {
  if (!setEra) return false;
  setEra(era);
  return true;
}

export default function Journey() {
  const [index, setIndex] = useState(1);
  const era = ERAS[index];

  const frame = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (frame.current) frame.current.inert = era !== "2030";
  }, [era]);

  useEffect(() => {
    setEra = (next) => setIndex(ERAS.indexOf(next));
    return () => {
      setEra = null;
    };
  }, []);

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
        className="h-[48px] w-full accent-amber"
      />

      <div
        aria-hidden="true"
        className="flex justify-between text-caption text-text-dim"
      >
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
