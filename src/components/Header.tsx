import SoundDot from "./SoundDot";
import { useSettings } from "../state/settings";

// SPEC 10, shared header, in this order: SoundDot · h1 screen title · Quiet
// Mode toggle. That order is the Layout Lock baseline (SPEC 16) — never
// reorder. SPEC 4: amber-backed buttons take #101418 text.
//
// P1 only flips the setting; SPEC 11.3's `quiet_on` line needs P2's audio.ts.
export default function Header({ title }: { title: string }) {
  const quietMode = useSettings((state) => state.quietMode);
  const setQuietMode = useSettings((state) => state.setQuietMode);

  return (
    <header className="flex items-center gap-3 border-b border-hairline px-4 py-3">
      <SoundDot />
      <h1 className="min-w-0 flex-1 text-screen">{title}</h1>
      <button
        type="button"
        aria-pressed={quietMode}
        onClick={() => setQuietMode(!quietMode)}
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
