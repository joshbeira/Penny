import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
type SessionState = {
  unlocked: boolean;
  glancePlayedThisSession: boolean;
  setUnlocked: (value: boolean) => void;
  setGlancePlayedThisSession: (value: boolean) => void;
};

export const useSession = create<SessionState>()(
  persist(
    (set) => ({
      unlocked: false,
      glancePlayedThisSession: false,
      setUnlocked: (value) => set({ unlocked: value }),
      setGlancePlayedThisSession: (value) =>
        set({ glancePlayedThisSession: value }),
    }),
    {
      name: "penny.session.v1",
      storage: createJSONStorage(() => sessionStorage),
    },
  ),
);
