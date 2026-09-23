import { ensureUnlocked } from "./audio";
export type HapticKind = "confirm" | "alert" | "attention";

const VIBRATION: Record<HapticKind, number[]> = {
  confirm: [80, 60, 80],
  alert: [40, 40, 40, 40, 40],
  attention: [400],
};
type Blips = {
  count: number;
  frequency: number;
  duration: number;
  gap: number;
};

const BLIPS: Record<HapticKind, Blips> = {
  confirm: { count: 2, frequency: 1200, duration: 0.04, gap: 0.06 },
  alert: { count: 3, frequency: 1600, duration: 0.03, gap: 0.04 },
  attention: { count: 1, frequency: 800, duration: 0.25, gap: 0 },
};
export function haptic(kind: HapticKind): void {
  if (typeof navigator.vibrate === "function") {
    navigator.vibrate(VIBRATION[kind]);
    return;
  }
  void blip(kind);
}
async function blip(kind: HapticKind): Promise<void> {
  const tone = await ensureUnlocked();
  if (!tone) return;

  const { count, frequency, duration, gap } = BLIPS[kind];
  const t0 = tone.now();
  const voices: { dispose: () => void }[] = [];

  for (let i = 0; i < count; i += 1) {
    const at = t0 + i * (duration + gap);
    const voice = new tone.Oscillator({
      frequency,
      type: "sine",
    }).toDestination();
    voice.volume.value = -18;
    voice.start(at).stop(at + duration);
    voices.push(voice);
  }
  const end = count * duration + (count - 1) * gap;
  window.setTimeout(
    () => voices.forEach((voice) => voice.dispose()),
    (end + 0.1) * 1000,
  );
}
