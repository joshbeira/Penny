import { useSyncExternalStore } from "react";
import { isSpeaking, subscribeSpeaking } from "../lib/audio";

// SPEC 4: the product's single visual signature — a 10px amber dot that pulses
// whenever Penny is speaking or playing an earcon. aria-hidden per SPEC 10.
// A <span> rather than a <div> so it stays valid phrasing content inside
// Splash's full-screen <button>.
//
// The pulse itself lives in styles.css, inside prefers-reduced-motion:
// no-preference (SPEC 4, SPEC 15).
export default function SoundDot() {
  const speaking = useSyncExternalStore(subscribeSpeaking, isSpeaking, () => false);

  return (
    <span
      aria-hidden="true"
      className={`block h-[10px] w-[10px] shrink-0 rounded-full bg-amber${
        speaking ? " sound-dot--speaking" : ""
      }`}
    />
  );
}
