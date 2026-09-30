import { Link } from "react-router-dom";
import { enterQuietMode } from "../lib/audio";
import { useSettings } from "../state/settings";
import ReadingPreferences from "../components/ReadingPreferences";
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
            checked
              ? "justify-end border-amber bg-amber"
              : "justify-start border-hairline bg-surface"
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
      <ReadingPreferences />
      <ul>
        <Toggle
          label="Quiet Mode"
          checked={quietMode}
          onChange={(value) => {
            if (value) void enterQuietMode();
            else setQuietMode(false);
          }}
        />
        <Toggle
          label="Voice input"
          checked={voiceInput}
          onChange={setVoiceInput}
        />

        <Toggle
          label="Always listening"
          checked={alwaysListening}
          onChange={setAlwaysListening}
        />
        <Toggle label="Demo mode" checked={demoMode} onChange={setDemoMode} />
      </ul>

      <Link className="feedback-link mt-4" to="/sandbox">
        Explore the banking sandbox
      </Link>
      <Link className="feedback-link mt-4" to="/receipts">
        Inspect practice receipts
      </Link>
      <Link
        to="/journey"
        className="mt-6 flex min-h-[48px] items-center text-body text-amber"
      >
        Sight-loss journey demo <span aria-hidden="true">→</span>
      </Link>

      <h2 className="mt-6 text-card">About Penny</h2>
      <p className="mt-2">
        Penny reads printed English letters on your device. Banking interactions
        use sample data and do not connect to a bank.
      </p>
      <p className="mt-3 text-caption text-text-dim">
        Voice input uses your browser’s speech recognition service and may send
        audio to its provider. Always listening is optional and off by default.
        Speech output uses an installed on-device voice when available.
      </p>
      <div className="mt-4 flex flex-col gap-3">
        <a
          className="feedback-link"
          href="https://github.com/joshbeira/Penny/issues/new?template=feedback.yml"
        >
          Share feedback
        </a>
        <a
          className="feedback-link"
          href="https://github.com/joshbeira/Penny/blob/main/docs/PRIVACY.md"
        >
          Privacy and data
        </a>
        <a className="feedback-link" href="https://github.com/joshbeira/Penny">
          Source code and user guide
        </a>
      </div>
      <a
        className="feedback-link mt-4"
        href="https://github.com/joshbeira/Penny/releases/latest"
      >
        Get Penny for Android
      </a>
      <p className="mt-2 text-caption text-text-dim">Public beta · v2.0.0</p>
    </>
  );
}
