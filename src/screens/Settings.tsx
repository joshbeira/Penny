import { Link } from "react-router-dom";
import { useSettings } from "../state/settings";
import { useDirector } from "../state/director";
import type { ArmedLetter } from "../state/director";

// SPEC 10 specifies aria-pressed for the Header's Quiet Mode toggle, so the
// three Settings toggles use the same pattern. The track is aria-hidden, which
// keeps each button's accessible name exactly its label — aria-pressed already
// carries the state.
function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <li>
      <button
        type="button"
        aria-pressed={checked}
        onClick={() => onChange(!checked)}
        className="flex min-h-[48px] w-full items-center justify-between gap-3 border-b border-hairline py-2 text-body"
      >
        {label}
        <span
          aria-hidden="true"
          className={`flex h-[28px] w-[52px] shrink-0 items-center rounded-full border p-[2px] ${
            checked ? "justify-end border-amber bg-amber" : "justify-start border-hairline bg-surface"
          }`}
        >
          <span
            className={`block h-[20px] w-[20px] rounded-full ${checked ? "bg-bg" : "bg-text-dim"}`}
          />
        </span>
      </button>
    </li>
  );
}

// TEMPORARY — REMOVE IN P6.
//
// SPEC 11.1 step 3 reads director.armedLetter, but SPEC 12.2's panel is P6, so
// P3 has no way to arm a letter and neither filmed scenario (SPEC 12.3 A and D)
// could be reached. This is the smallest stand-in: SPEC 12.2's own five radio
// labels and nothing else.
//
// It sits AFTER "About Penny" so it reorders none of SPEC 10's Settings
// elements. It must be deleted when DirectorPanel.tsx lands, BEFORE P7 writes
// any Layout Lock baseline — otherwise SPEC 16 enshrines a debug control in the
// shipped accessibility tree.
const ARMED: { value: ArmedLetter; label: string }[] = [
  { value: "live", label: "Live API" },
  { value: "card", label: "Card" },
  { value: "nhs", label: "NHS" },
  { value: "scam", label: "Scam" },
  { value: "pin", label: "PIN" },
];

function ArmedLetterControl() {
  const armedLetter = useDirector((state) => state.armedLetter);
  const setArmedLetter = useDirector((state) => state.setArmedLetter);

  return (
    <fieldset className="mt-6 border-t border-hairline pt-2">
      <legend className="text-caption text-text-dim">Armed letter (temporary — P6)</legend>
      {ARMED.map((option) => (
        <label
          key={option.value}
          className="flex min-h-[48px] items-center gap-3 text-body"
        >
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
  );
}

// SPEC 10 order: Quiet Mode · Voice input · Demo mode · Journey link · About
// Penny. That order is the Layout Lock baseline (SPEC 16) — never reorder.
export default function Settings() {
  const { quietMode, voiceInput, demoMode, setQuietMode, setVoiceInput, setDemoMode } =
    useSettings();

  return (
    <>
      <ul>
        <Toggle label="Quiet Mode" checked={quietMode} onChange={setQuietMode} />
        <Toggle label="Voice input" checked={voiceInput} onChange={setVoiceInput} />
        <Toggle label="Demo mode" checked={demoMode} onChange={setDemoMode} />
      </ul>

      <Link
        to="/journey"
        className="mt-6 flex min-h-[48px] items-center text-body text-amber"
      >
        Sight-loss journey demo <span aria-hidden="true">→</span>
      </Link>

      <h2 className="mt-6 text-card">About Penny</h2>
      <p className="mt-2">
        Nothing happens until Penny reads it back and you confirm. Every action leaves a receipt.
      </p>
      <p className="mt-2 text-caption text-text-dim">Prototype v1.0</p>

      <ArmedLetterControl />
    </>
  );
}
