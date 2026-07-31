import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Letter } from "../data/letters";

// SPEC 12.2's armed letter and its two Tap & Tell pushes. The panel itself —
// the Demo mode mirror, Replay Glance, seed/reset receipts — is P6 (SPEC 17).
// SPEC 11.1 step 3 reads director.armedLetter in P3 and SPEC 11.2's sheet reads
// pendingTap in P5, which is why the store exists ahead of its UI; the key
// follows SPEC 12.2's own penny.director.v1.
//
// "live" is SPEC 12.2's default (the radio group's Live API), and it is the only
// value that reaches the network.
export type ArmedLetter = Letter["key"] | "live";

// SPEC 12.2's two push buttons: "Push: Coffee £4.85" and
// "Push: TicketPoint £68.20". TapTellSheet.tsx owns what each one says and
// spends; this is only which of them is pending.
export type TapPush = "coffee" | "ticketpoint";

type DirectorState = {
  armedLetter: ArmedLetter;
  setArmedLetter: (value: ArmedLetter) => void;
  pendingTap: TapPush | null;
  pushTap: (push: TapPush) => void;
  clearTap: () => void;
};

export const useDirector = create<DirectorState>()(
  persist(
    (set) => ({
      armedLetter: "live",
      setArmedLetter: (value) => set({ armedLetter: value }),

      // SPEC 11.2: "Director push → haptic("attention") → TapTellSheet". The
      // haptic is fired by the sheet's own mount effect, so every caller —
      // P5's temporary Settings control and P6's DirectorPanel — gets it.
      pendingTap: null,
      pushTap: (push) => set({ pendingTap: push }),
      clearTap: () => set({ pendingTap: null }),
    }),
    {
      name: "penny.director.v1",
      // SPEC 12.2 persists the director, but a pending push must not survive a
      // reload — it would raise a payment sheet on load with nothing behind it.
      // Only the arming is durable, the same shape receipts.ts uses.
      partialize: (state) => ({ armedLetter: state.armedLetter }),
    },
  ),
);
