import { ensureUnlocked } from "./audio";

// SPEC 8's haptic grammar.
export type HapticKind = "confirm" | "alert" | "attention";

const VIBRATION: Record<HapticKind, number[]> = {
  confirm: [80, 60, 80],
  alert: [40, 40, 40, 40, 40],
  attention: [400],
};

// SPEC 8's fallback column. "60ms apart" / "40ms apart" is the silent gap, not
// the onset spacing: it mirrors the pause inside each vibration pattern —
// confirm is 80 on, 60 off, 80 on, so its blips are 40 on, 60 off, 40 on.
type Blips = { count: number; frequency: number; duration: number; gap: number };

const BLIPS: Record<HapticKind, Blips> = {
  confirm: { count: 2, frequency: 1200, duration: 0.04, gap: 0.06 },
  alert: { count: 3, frequency: 1600, duration: 0.03, gap: 0.04 },
  attention: { count: 1, frequency: 800, duration: 0.25, gap: 0 },
};

// SPEC 8: if navigator.vibrate exists, use it AND stay silent; otherwise play
// the blips. Never both.
//
// Note desktop Chrome *defines* navigator.vibrate — it is simply a no-op
// without hardware — so this correctly produces silence on the dev machine.
// The blip branch is exercised by removing navigator.vibrate in the harness.
export function haptic(kind: HapticKind): void {
  if (typeof navigator.vibrate === "function") {
    navigator.vibrate(VIBRATION[kind]);
    return;
  }
  void blip(kind);
}

// SPEC 8: "Fallback blips also require session.unlocked" — ensureUnlocked()
// returns null until then.
//
// The dot does not pulse for these: SPEC 4 pulses it for speech and earcons,
// and a blip is neither — it is standing in for a vibration.
async function blip(kind: HapticKind): Promise<void> {
  const tone = await ensureUnlocked();
  if (!tone) return;

  const { count, frequency, duration, gap } = BLIPS[kind];
  const t0 = tone.now();
  const voices: { dispose: () => void }[] = [];

  for (let i = 0; i < count; i += 1) {
    const at = t0 + i * (duration + gap);
    const voice = new tone.Oscillator({ frequency, type: "sine" }).toDestination();
    voice.volume.value = -18;
    voice.start(at).stop(at + duration);
    voices.push(voice);
  }

  // Dispose once the last blip has stopped, so repeated haptics do not pile up
  // oscillator nodes.
  const end = count * duration + (count - 1) * gap;
  window.setTimeout(() => voices.forEach((voice) => voice.dispose()), (end + 0.1) * 1000);
}
