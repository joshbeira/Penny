import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

// SPEC 6.1 renders the splash on "first load of a session", so this store holds
// the browser session — sessionStorage, not localStorage. That is also what
// keeps SPEC 16's Layout Lock walk honest in P7: it reaches each route with a
// full page load, and only a surviving `unlocked` stops the splash's
// navigate-to-Home from turning four route baselines into copies of Home.
//
// `glancePlayedThisSession` is defined here but only written in P2, when
// earcons.ts brings glance().
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
      setGlancePlayedThisSession: (value) => set({ glancePlayedThisSession: value }),
    }),
    {
      name: "penny.session.v1",
      storage: createJSONStorage(() => sessionStorage),
    },
  ),
);
