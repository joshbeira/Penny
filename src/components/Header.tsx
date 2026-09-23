import SoundDot from "./SoundDot";
import { enterQuietMode } from "../lib/audio";
import { useSettings } from "../state/settings";
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
