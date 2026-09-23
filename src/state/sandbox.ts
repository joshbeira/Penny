import { create } from "zustand";
export type TapPush = "coffee" | "ticketpoint";
type SandboxState = {
  pendingTap: TapPush | null;
  pushTap: (push: TapPush) => void;
  clearTap: () => void;
};
export const useSandbox = create<SandboxState>((set) => ({
  pendingTap: null,
  pushTap: (push) => set({ pendingTap: push }),
  clearTap: () => set({ pendingTap: null }),
}));
