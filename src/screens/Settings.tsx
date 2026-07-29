import { Link } from "react-router-dom";
import { useSettings } from "../state/settings";

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
    </>
  );
}
