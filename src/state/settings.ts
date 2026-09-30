import { create } from "zustand";
import { persist } from "zustand/middleware";
type SettingsState = {
  quietMode: boolean;
  voiceInput: boolean;
  alwaysListening: boolean;
  demoMode: boolean;
  textSize: number;
  speechRate: number;
  setTextSize: (value: number) => void;
  setSpeechRate: (value: number) => void;
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
      textSize: 22,
      speechRate: 1,
      setTextSize: (value) =>
        set({ textSize: Math.max(18, Math.min(34, value)) }),
      setSpeechRate: (value) =>
        set({ speechRate: Math.max(0.5, Math.min(1.5, value)) }),
      setQuietMode: (value) => set({ quietMode: value }),
      setVoiceInput: (value) => set({ voiceInput: value }),
      setAlwaysListening: (value) => set({ alwaysListening: value }),
      setDemoMode: (value) => set({ demoMode: value }),
    }),
    { name: "penny.settings.v1" },
  ),
);
