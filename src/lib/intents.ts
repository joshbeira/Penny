import { cancelOpenSheet, confirmOpenSheet } from "../components/ConfirmSheet";
import { readReceiptsAloud } from "../screens/Receipts";
import { WEEK } from "../data/transactions";
import { speak } from "./audio";
import { glance, playWeek } from "./earcons";

// SPEC 11.6's intent table. "Intent match on lowercase transcript, first hit
// wins" — so the order of these entries is the specification, not a detail.
// A transcript like "cancel my post" must reach "post" before "cancel", because
// that is the order SPEC 11.6 lists them in.

export type IntentContext = {
  // Navigation arrives as a callback rather than a router hook: this module is
  // called from an event handler, not rendered, and SPEC 3 puts it in lib/.
  navigate: (to: string) => void;
};

const INTENTS: { match: string[]; run: (context: IntentContext) => void }[] = [
  {
    match: ["receipt"],
    run: ({ navigate }) => {
      navigate("/receipts");
      // P4 exported this from screens/Receipts.tsx for exactly this caller, so
      // SPEC 11.5's composition has one implementation rather than two.
      void readReceiptsAloud();
    },
  },
  {
    // SPEC 11.6 assigns navigation to "receipt" and "post" only, so this plays
    // from wherever the user is. Off Home the row flashes have nothing to
    // flash, which is why onNote is optional in SPEC 7.2's signature.
    match: ["week"],
    run: () => void playWeek(WEEK),
  },
  { match: ["glance"], run: () => void glance() },
  { match: ["post"], run: ({ navigate }) => navigate("/postbox") },
  { match: ["confirm", "yes"], run: () => confirmOpenSheet() },
  { match: ["cancel", "no"], run: () => cancelOpenSheet() },
];

export function runIntent(transcript: string, context: IntentContext): void {
  const heard = transcript.toLowerCase();

  for (const intent of INTENTS) {
    if (intent.match.some((word) => heard.includes(word))) {
      intent.run(context);
      return;
    }
  }

  // SPEC 11.6's no-match line, verbatim. The transcript is echoed so the user
  // can hear what was misheard rather than guess.
  void speak({
    text: `I heard: ${transcript}. Try: glance, play my week, or read my receipts.`,
  });
}
