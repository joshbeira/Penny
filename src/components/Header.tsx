import SoundDot from "./SoundDot";
import { enterQuietMode } from "../lib/audio";
import { useSettings } from "../state/settings";

// SPEC 10, shared header, in this order: SoundDot · h1 screen title · Quiet
// Mode toggle. That order is the Layout Lock baseline (SPEC 16) — never
// reorder. SPEC 4: amber-backed buttons take #101418 text.
//
// Turning Quiet Mode ON goes through enterQuietMode(), which speaks SPEC 11.3's
// `quiet_on` BEFORE raising the flag — the only ordering that leaves it audible,
// since SPEC 6.3 step 2 suppresses without exception. The button's pressed
// state therefore flips when the line ends, not when it is tapped.
export default function Header({ title }: { title: string }) {
  const quietMode = useSettings((state) => state.quietMode);
  const setQuietMode = useSettings((state) => state.setQuietMode);

  const toggle = () => {
    if (quietMode) setQuietMode(false);
    else void enterQuietMode();
  };

  return (
    <header className="flex items-center gap-3 border-b border-hairline px-4 py-3">
      <SoundDot />
      <h1 className="min-w-0 flex-1 text-screen">{title}</h1>
      <button
        type="button"
        aria-pressed={quietMode}
        onClick={toggle}
        className={`min-h-[48px] shrink-0 rounded-full border px-4 text-caption ${
          quietMode
            ? "border-amber bg-amber text-bg"
            : "border-hairline bg-surface text-text"
        }`}
      >
        Quiet Mode
      </button>
    </header>
  );
}
