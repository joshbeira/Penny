import SoundDot from "./SoundDot";
import { speak, unlock } from "../lib/audio";

import { useSession } from "../state/session";
import { useSettings } from "../state/settings";
export default function Splash() {
  const setUnlocked = useSession((state) => state.setUnlocked);

  const open = async () => {
    // Reading must remain available when a device cannot initialise audio.
    await unlock().catch(() => undefined);
    setUnlocked(true);
    if (!useSettings.getState().quietMode) await speak({ id: "greet" });
  };
  return (
    <button
      type="button"
      aria-label="Open Penny"
      onClick={() => void open()}
      className="flex min-h-dvh w-full flex-col items-center justify-center gap-4 bg-bg"
    >
      <span className="eyebrow">Penny · Public beta</span>
      <span className="reader-title">Every letter. A little clearer.</span>
      <SoundDot />
      <span className="text-caption text-text-dim">Tap anywhere to start</span>
    </button>
  );
}
