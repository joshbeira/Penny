import lines from "../../scripts/voice-lines.json";

// SPEC 6.2's inventory. SPEC 14 settles where it lives: "duplicate the table as
// JSON at scripts/voice-lines.json and make voiceLines.ts import that JSON —
// choose the JSON file as the single source of truth", so scripts/
// generate-voice.mjs (P7) and the app read the same fifteen strings.
//
// The ids are restated here as a union because a JSON import widens every
// string to `string`, and speak({ id }) has to be checked at compile time. The
// texts are not restated — those stay single-source in the JSON.
export type FixedLineId =
  | "greet"
  | "summary_card"
  | "offer_card"
  | "readback_card"
  | "done_receipt"
  | "cancel_ok"
  | "summary_nhs"
  | "pin_privacy"
  | "scam_filed"
  | "tap_coffee"
  | "tap_unknown"
  | "payment_done"
  | "quiet_on"
  | "chain_ok"
  | "read_fallback";

export type FixedLine = { id: FixedLineId; text: string };

export const FIXED_LINES = lines as FixedLine[];

const BY_ID = new Map(FIXED_LINES.map((line) => [line.id, line.text]));

// SPEC 6.3 step 1 mirrors the exact text of every line into the live region,
// and step 5's speechSynthesis fallback speaks it, so an id always has to
// resolve to its text. Throwing beats silently announcing nothing.
export function lineText(id: FixedLineId): string {
  const text = BY_ID.get(id);
  if (text === undefined) throw new Error(`Unknown fixed line: ${id}`);
  return text;
}
