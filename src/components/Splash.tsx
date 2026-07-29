import { useNavigate } from "react-router-dom";
import SoundDot from "./SoundDot";
import { speak, unlock } from "../lib/audio";
import { glance } from "../lib/earcons";
import { useSession } from "../state/session";
import { useSettings } from "../state/settings";

// SPEC 6.1. The whole screen is one button; contents in the spec's order —
// wordmark (28px), sound-dot, caption.
export default function Splash() {
  const navigate = useNavigate();
  const setUnlocked = useSession((state) => state.setUnlocked);

  const open = async () => {
    // SPEC 6.1's first four steps: Tone.start(), the 30ms silent buffer, then
    // speechSynthesis.cancel()/resume().
    await unlock();
    setUnlocked(true);

    // "play fixed line greet (skipped in Quiet Mode)" — skipped outright, not
    // routed through speak(): SPEC 6.3 step 2 would otherwise surface it as a
    // text card, and SPEC 6.1 says the line is not played at all.
    //
    // Awaited so the Glance is heard on its own. SPEC 6.3's queue orders spoken
    // lines against each other; earcons are a separate channel and would
    // otherwise start over the greeting.
    if (!useSettings.getState().quietMode) await speak({ id: "greet" });

    navigate("/", { replace: true });

    // "run glance() once (session.glancePlayedThisSession = true)". Home's
    // button and the director's Replay Glance (P6) re-run it deliberately; this
    // flag only guards the automatic one.
    const session = useSession.getState();
    if (!session.glancePlayedThisSession) {
      session.setGlancePlayedThisSession(true);
      void glance();
    }
  };

  // Full-screen in normal flow rather than `fixed`: the splash is the only
  // thing App renders while locked, and a fixed child would leave <body> zero
  // height — which SPEC 16's "click body once (dismisses Splash)" step cannot
  // click. Verified against that exact procedure.
  return (
    <button
      type="button"
      aria-label="Open Penny"
      onClick={() => void open()}
      className="flex min-h-dvh w-full flex-col items-center justify-center gap-4 bg-bg"
    >
      <span className="text-screen">Penny</span>
      <SoundDot />
      <span className="text-caption text-text-dim">Tap anywhere to open</span>
    </button>
  );
}
