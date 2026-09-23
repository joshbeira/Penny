import { useSyncExternalStore } from "react";
import { isSpeaking, subscribeSpeaking } from "../lib/audio";
export default function SoundDot() {
  const speaking = useSyncExternalStore(
    subscribeSpeaking,
    isSpeaking,
    () => false,
  );

  return (
    <span
      aria-hidden="true"
      className={`block h-[10px] w-[10px] shrink-0 rounded-full bg-amber${
        speaking ? " sound-dot--speaking" : ""
      }`}
    />
  );
}
