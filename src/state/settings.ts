import { create } from "zustand";
import { persist } from "zustand/middleware";

// SPEC 10 (as amended by SPEC 11.7): the toggle list is Quiet Mode, Voice input,
// Always listening, Demo mode and nothing else. The persist key follows the
// penny.{store}.v1 pattern SPEC 9.2 and 12.2 set for the other stores.
//
// `alwaysListening` is the one setting SPEC 19's "no additional settings" gives
// way to, and SPEC 11.7 records why. It stays on the v1 key rather than
// bumping to v2: zustand's persist merges the stored object over the initial
// state, so an install written before this field simply takes the default.
//
// P1 only flips state. Toggling Quiet Mode ON also speaks `quiet_on` as the
// final spoken line (SPEC 11.3) — that arrives with audio.ts in P2.
type SettingsState = {
  quietMode: boolean;
  voiceInput: boolean;
  alwaysListening: boolean;
  demoMode: boolean;
  setQuietMode: (value: boolean) => void;
  setVoiceInput: (value: boolean) => void;
  setAlwaysListening: (value: boolean) => void;
  setDemoMode: (value: boolean) => void;
};

export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      quietMode: false,
      voiceInput: true,
      // SPEC 11.7: "default OFF ... so filming and demos stay deterministic".
      alwaysListening: false,
      demoMode: false,
      setQuietMode: (value) => set({ quietMode: value }),
      setVoiceInput: (value) => set({ voiceInput: value }),
      setAlwaysListening: (value) => set({ alwaysListening: value }),
      setDemoMode: (value) => set({ demoMode: value }),
    }),
    { name: "penny.settings.v1" },
  ),
);
