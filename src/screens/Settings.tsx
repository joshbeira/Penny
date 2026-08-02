import { Link } from "react-router-dom";
import { enterQuietMode } from "../lib/audio";
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

// P3's temporary director stand-in — five armed-letter radios and P5's two push
// buttons — was deleted here in P6. SPEC 12.2's real panel now owns all seven
// controls (components/DirectorPanel.tsx), reached by SPEC 12.1's triple-tap or
// /director. This screen is once again exactly SPEC 10's list, which is what
// P7's Layout Lock baseline must enshrine.

// SPEC 10 order, as amended by SPEC 11.7: Quiet Mode · Voice input · Always
// listening · Demo mode · Journey link · About Penny. That order is the Layout
// Lock baseline (SPEC 16) — never reorder. The fourth toggle is the one addition
// SPEC 19 gives way to, and it is why P8 migrates the baseline deliberately.
export default function Settings() {
  const {
    quietMode,
    voiceInput,
    alwaysListening,
    demoMode,
    setQuietMode,
    setVoiceInput,
    setAlwaysListening,
    setDemoMode,
  } = useSettings();

  return (
    <>
      <ul>
        {/* Turning Quiet Mode ON goes through enterQuietMode() here for the
            same reason the Header does: SPEC 11.3's `quiet_on` has to be spoken
            before the flag rises, and this is the same setting. */}
        <Toggle
          label="Quiet Mode"
          checked={quietMode}
          onChange={(value) => {
            if (value) void enterQuietMode();
            else setQuietMode(false);
          }}
        />
        <Toggle label="Voice input" checked={voiceInput} onChange={setVoiceInput} />
        {/* SPEC 11.7: "When on, recognition auto-restarts on `onend` so no
            button press is needed." Default off — a demo that starts listening
            by itself is not a deterministic take. */}
        <Toggle
          label="Always listening"
          checked={alwaysListening}
          onChange={setAlwaysListening}
        />
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
