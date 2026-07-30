import { create } from "zustand";
import { persist } from "zustand/middleware";
// The `.ts` extension is required by Node's ESM loader, which does no extension
// search — hash.test.ts and receipts.test.ts run on `node --test` with native
// type stripping, and they import this module. tsconfig's
// allowImportingTsExtensions permits it; Vite and esbuild resolve it unchanged.
import { sha256Hex } from "../lib/hash.ts";

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
  seedDemo: () => Promise<void>;
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

      // SPEC 12.2's "Seed demo receipts": "writes exactly two: 'Replacement
      // card ordered' and 'Scam letter filed', with the SPEC 11 details/
      // methods". The payloads below are SPEC 11.1 step 8 and SPEC 11.4
      // verbatim. SPEC 11.1 step 8's method is whatever the user confirmed
      // with, so the seed takes "double-tap" — the method SPEC 11.2 hard-codes
      // for the analogous demo receipt, and the one SPEC 12.3 A films.
      //
      // Sequential awaits, so the second entry links to the first. It appends
      // rather than replacing: SPEC 12.2 lists "Reset receipts" separately.
      //
      // SEAM: P6. SPEC 12.2's panel is the only caller; there is no UI for this
      // in P4.
      seedDemo: async () => {
        await get().addReceipt({
          action: "Replacement card ordered",
          details: "Arriving in 5 working days to home address",
          method: "double-tap",
        });
        await get().addReceipt({
          action: "Scam letter filed",
          details: "Prize-draw pattern · 214 reports this month",
          method: "auto",
        });
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
