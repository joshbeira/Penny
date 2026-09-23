import { create } from "zustand";
import { persist } from "zustand/middleware";
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
