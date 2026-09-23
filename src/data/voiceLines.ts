import lines from "../../scripts/voice-lines.json";
export type FixedLineId =
  | "greet"
  | "done_receipt"
  | "cancel_ok"
  | "tap_coffee"
  | "tap_unknown"
  | "payment_done"
  | "quiet_on";

export type FixedLine = { id: FixedLineId; text: string };

export const FIXED_LINES = lines as FixedLine[];

const BY_ID = new Map(FIXED_LINES.map((line) => [line.id, line.text]));
export function lineText(id: FixedLineId): string {
  const text = BY_ID.get(id);
  if (text === undefined) throw new Error(`Unknown fixed line: ${id}`);
  return text;
}
