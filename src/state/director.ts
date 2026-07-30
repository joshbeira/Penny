import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Letter } from "../data/letters";

// SPEC 12.2's armed letter, and only that. The panel itself — the pushes, the
// Demo mode mirror, Replay Glance, seed/reset receipts — is P6 (SPEC 17).
// SPEC 11.1 step 3 reads director.armedLetter in P3, which is why the store
// exists this early; the key follows SPEC 12.2's own penny.director.v1.
//
// "live" is SPEC 12.2's default (the radio group's Live API), and it is the only
// value that reaches the network.
export type ArmedLetter = Letter["key"] | "live";

type DirectorState = {
  armedLetter: ArmedLetter;
  setArmedLetter: (value: ArmedLetter) => void;
};

export const useDirector = create<DirectorState>()(
  persist(
    (set) => ({
      armedLetter: "live",
      setArmedLetter: (value) => set({ armedLetter: value }),
    }),
    { name: "penny.director.v1" },
  ),
);
