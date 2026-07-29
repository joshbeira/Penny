import { create } from "zustand";
import { persist } from "zustand/middleware";

// SPEC 10: the toggle list is Quiet Mode, Voice input, Demo mode and nothing
// else (SPEC 19 bans additional settings). The persist key follows the
// penny.{store}.v1 pattern SPEC 9.2 and 12.2 set for the other stores.
//
// P1 only flips state. Toggling Quiet Mode ON also speaks `quiet_on` as the
// final spoken line (SPEC 11.3) — that arrives with audio.ts in P2.
type SettingsState = {
  quietMode: boolean;
  voiceInput: boolean;
  demoMode: boolean;
  setQuietMode: (value: boolean) => void;
  setVoiceInput: (value: boolean) => void;
  setDemoMode: (value: boolean) => void;
};

export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      quietMode: false,
      voiceInput: true,
      demoMode: false,
      setQuietMode: (value) => set({ quietMode: value }),
      setVoiceInput: (value) => set({ voiceInput: value }),
      setDemoMode: (value) => set({ demoMode: value }),
    }),
    { name: "penny.settings.v1" },
  ),
);
