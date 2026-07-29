import { useNavigate } from "react-router-dom";
import SoundDot from "./SoundDot";
import { useSession } from "../state/session";

// SPEC 6.1. The whole screen is one button; contents in the spec's order —
// wordmark (28px), sound-dot, caption.
//
// P1 sets state and navigates, and touches no audio API at all: SPEC 6.1 bars
// any audio call before session.unlocked, and SPEC 3 puts unlock() in
// lib/audio.ts, which arrives in P2. The unlock primitives (Tone.start(), a
// 30ms silent buffer, speechSynthesis.cancel() then resume()) land there,
// alongside the `greet` line and glance().
export default function Splash() {
  const navigate = useNavigate();
  const setUnlocked = useSession((state) => state.setUnlocked);

  const open = () => {
    // P2 (SPEC 6.1): await unlock() from lib/audio.ts.
    setUnlocked(true);
    // P2 (SPEC 6.1): speak({ id: "greet" }), skipped in Quiet Mode.
    navigate("/", { replace: true });
    // P2 (SPEC 6.1): glance(); setGlancePlayedThisSession(true).
  };

  // Full-screen in normal flow rather than `fixed`: the splash is the only
  // thing App renders while locked, and a fixed child would leave <body> zero
  // height — which SPEC 16's "click body once (dismisses Splash)" step cannot
  // click. Verified against that exact procedure.
  return (
    <button
      type="button"
      aria-label="Open Penny"
      onClick={open}
      className="flex min-h-dvh w-full flex-col items-center justify-center gap-4 bg-bg"
    >
      <span className="text-screen">Penny</span>
      <SoundDot />
      <span className="text-caption text-text-dim">Tap anywhere to open</span>
    </button>
  );
}
