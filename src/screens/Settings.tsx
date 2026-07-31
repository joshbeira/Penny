import { Link } from "react-router-dom";
import { enterQuietMode } from "../lib/audio";
import { useSettings } from "../state/settings";
import { useDirector } from "../state/director";
import type { ArmedLetter, TapPush } from "../state/director";

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
// SPEC 12.2's director panel is P6, but two of its controls are needed earlier:
// SPEC 11.1 step 3 reads director.armedLetter (P3, scenarios A and D) and
// SPEC 11.2's sheet is raised only by a push (P5, scenario B). Without them
// three of the four filmed scenarios are unreachable. This is the smallest
// stand-in: SPEC 12.2's own five radio labels and two push labels, nothing else.
//
// It sits AFTER "About Penny" so it reorders none of SPEC 10's Settings
// elements. ALL OF IT must be deleted when DirectorPanel.tsx lands — the radios
// and both push buttons — BEFORE P7 writes any Layout Lock baseline, otherwise
// SPEC 16 enshrines a debug control in the shipped accessibility tree.
const ARMED: { value: ArmedLetter; label: string }[] = [
  { value: "live", label: "Live API" },
  { value: "card", label: "Card" },
  { value: "nhs", label: "NHS" },
  { value: "scam", label: "Scam" },
  { value: "pin", label: "PIN" },
];

// SPEC 12.2's labels verbatim, so P6's panel inherits them unchanged.
const PUSHES: { value: TapPush; label: string }[] = [
  { value: "coffee", label: "Push: Coffee £4.85" },
  { value: "ticketpoint", label: "Push: TicketPoint £68.20" },
];

function DirectorStandIn() {
  const armedLetter = useDirector((state) => state.armedLetter);
  const setArmedLetter = useDirector((state) => state.setArmedLetter);
  const pushTap = useDirector((state) => state.pushTap);

  return (
    <fieldset className="mt-6 border-t border-hairline pt-2">
      <legend className="text-caption text-text-dim">Director (temporary — P6)</legend>
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

      {/* 48px pills, not the radios' 20×20: P4 flagged those as the only
          sub-48px controls in the app (SPEC 4), and this must not add to it. */}
      {PUSHES.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => pushTap(option.value)}
          className="mt-3 flex min-h-[48px] w-full items-center justify-center rounded-full border border-amber px-6 text-body text-amber"
        >
          {option.label}
        </button>
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

      <DirectorStandIn />
    </>
  );
}
