import { create } from "zustand";
import { persist } from "zustand/middleware";
import { sha256Hex } from "../lib/hash";

// SPEC 9.2, complete. P3 needs addReceipt for SPEC 11.1 step 8; verifyChain is
// the other half of the same spec block and is left whole rather than split
// across phases. P4 adds the list UI, the verify banner, `chain_ok`, the
// read-aloud composition and the director's seed/reset.

export type Receipt = {
  id: string;
  ts: string;
  action: string;
  details: string;
  method: "double-tap" | "button" | "voice" | "auto";
  prevHash: string;
  hash: string;
};

// SPEC 9.2: the genesis prevHash.
const GENESIS = "0".repeat(64);

// SPEC 9.2's exact preimage.
function preimage(entry: Omit<Receipt, "id" | "hash">): string {
  return `${entry.prevHash}|${entry.ts}|${entry.action}|${entry.details}|${entry.method}`;
}

export type ChainResult = { ok: true } | { ok: false; brokenAt: number };

type ReceiptsState = {
  receipts: Receipt[];
  addReceipt: (entry: Pick<Receipt, "action" | "details" | "method">) => Promise<Receipt>;
  verifyChain: () => Promise<ChainResult>;
  reset: () => void;
};

export const useReceipts = create<ReceiptsState>()(
  persist(
    (set, get) => ({
      receipts: [],

      addReceipt: async ({ action, details, method }) => {
        const { receipts } = get();
        const ts = new Date().toISOString();
        const prevHash = receipts[receipts.length - 1]?.hash ?? GENESIS;
        const hash = await sha256Hex(preimage({ ts, action, details, method, prevHash }));

        // SPEC 9.2 types `id` but never says where it comes from; randomUUID is
        // available in the same secure context sha256Hex already requires.
        const receipt: Receipt = { id: crypto.randomUUID(), ts, action, details, method, prevHash, hash };

        // Re-read rather than closing over `receipts`: SPEC 11.4's silent
        // scam receipt can land while another write is mid-digest, and the
        // chain would fork if both used the same prevHash snapshot.
        set((state) => ({ receipts: [...state.receipts, receipt] }));
        return receipt;
      },

      // SPEC 9.2: "recomputes every hash → { ok: true } | { ok: false,
      // brokenAt: index }". Both the entry's own digest and its link to the
      // previous entry are checked, so a hand-edited field in localStorage
      // reports the index of the entry that was edited.
      verifyChain: async () => {
        const { receipts } = get();
        for (let index = 0; index < receipts.length; index += 1) {
          const entry = receipts[index];
          const expectedPrev = index === 0 ? GENESIS : receipts[index - 1].hash;
          if (entry.prevHash !== expectedPrev) return { ok: false, brokenAt: index };
          if ((await sha256Hex(preimage(entry))) !== entry.hash) {
            return { ok: false, brokenAt: index };
          }
        }
        return { ok: true };
      },

      reset: () => set({ receipts: [] }),
    }),
    {
      name: "penny.receipts.v1",
      // Only the entries persist — the actions are rebuilt on load.
      partialize: (state) => ({ receipts: state.receipts }),
    },
  ),
);
