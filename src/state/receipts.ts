import { create } from "zustand";
import { persist } from "zustand/middleware";
import { sha256Hex } from "../lib/hash.ts";

export type Receipt = {
  id: string;
  ts: string;
  action: string;
  details: string;
  method: "double-tap" | "button" | "voice" | "auto";
  prevHash: string;
  hash: string;
};
let writes: Promise<unknown> = Promise.resolve();
let revision = 0;
const GENESIS = "0".repeat(64);
function preimage(entry: Omit<Receipt, "id" | "hash">): string {
  return `${entry.prevHash}|${entry.ts}|${entry.action}|${entry.details}|${entry.method}`;
}

export type ChainResult = { ok: true } | { ok: false; brokenAt: number };

type ReceiptsState = {
  receipts: Receipt[];
  addReceipt: (
    entry: Pick<Receipt, "action" | "details" | "method">,
  ) => Promise<Receipt>;
  verifyChain: () => Promise<ChainResult>;
  seedDemo: () => Promise<void>;
  reset: () => void;
};

export const useReceipts = create<ReceiptsState>()(
  persist(
    (set, get) => ({
      receipts: [],

      addReceipt: ({ action, details, method }) => {
        const requestedRevision = revision;
        const next = writes.then(async () => {
          if (requestedRevision !== revision)
            throw new Error("Receipt history was cleared");
          const { receipts } = get();
          const ts = new Date().toISOString();
          const prevHash = receipts[receipts.length - 1]?.hash ?? GENESIS;
          const hash = await sha256Hex(
            preimage({ ts, action, details, method, prevHash }),
          );
          const receipt: Receipt = {
            id: crypto.randomUUID(),
            ts,
            action,
            details,
            method,
            prevHash,
            hash,
          };
          if (requestedRevision !== revision)
            throw new Error("Receipt history was cleared");
          set((state) => ({ receipts: [...state.receipts, receipt] }));
          return receipt;
        });
        writes = next.catch(() => undefined);
        return next;
      },
      verifyChain: async () => {
        const { receipts } = get();
        for (let index = 0; index < receipts.length; index += 1) {
          const entry = receipts[index];
          const expectedPrev = index === 0 ? GENESIS : receipts[index - 1].hash;
          if (entry.prevHash !== expectedPrev)
            return { ok: false, brokenAt: index };
          if ((await sha256Hex(preimage(entry))) !== entry.hash) {
            return { ok: false, brokenAt: index };
          }
        }
        return { ok: true };
      },
      seedDemo: async () => {
        await get().addReceipt({
          action: "Sample replacement card ordered",
          details: "Arriving in 5 working days to home address",
          method: "double-tap",
        });
        await get().addReceipt({
          action: "Sample scam letter flagged",
          details: "Sample only · no report sent",
          method: "auto",
        });
      },

      reset: () => {
        revision += 1;
        set({ receipts: [] });
      },
    }),
    {
      name: "penny.receipts.v1",
      partialize: (state) => ({ receipts: state.receipts }),
    },
  ),
);
