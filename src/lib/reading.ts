export type Reading = {
  sender: string;
  letter_type: string;
  summary_spoken: string;
  explain_spoken: string;
  required_action: "none" | "order_card" | "scam_alert";
  sensitive_content: boolean;
  exact_text: string;
};

/** Heuristic redaction is a convenience, never a guarantee of anonymity. */
export function redactText(text: string): string {
  return text
    .replace(/\b\d{2}[- ]\d{2}[- ]\d{2}\b/g, "[hidden]")
    .replace(/\b(?:\d[ -]?){4,}\b/g, "[hidden]");
}

export function localReading(text: string): Reading {
  const clean = redactText(text).trim();
  if (!clean)
    throw new Error(
      "No readable text found. Try a brighter, sharper photograph.",
    );
  return {
    sender: "Your letter",
    letter_type: "On-device reading",
    summary_spoken: clean,
    explain_spoken:
      "This is the text recognised on your device. An AI explanation is available only after you choose to share the text.",
    required_action: "none",
    sensitive_content: clean !== text.trim(),
    exact_text: clean,
  };
}

export function parseReading(value: unknown): Reading {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error("Invalid reading");
  const data = value as Record<string, unknown>;
  for (const key of [
    "sender",
    "letter_type",
    "summary_spoken",
    "explain_spoken",
    "exact_text",
  ]) {
    if (
      typeof data[key] !== "string" ||
      !(data[key] as string).trim() ||
      (data[key] as string).length > 16000
    )
      throw new Error(`Invalid reading field: ${key}`);
  }
  if (
    typeof data.sensitive_content !== "boolean" ||
    !["none", "order_card", "scam_alert"].includes(String(data.required_action))
  )
    throw new Error("Invalid reading metadata");
  return {
    sender: redactText(data.sender as string),
    letter_type: redactText(data.letter_type as string),
    summary_spoken: redactText(data.summary_spoken as string),
    explain_spoken: redactText(data.explain_spoken as string),
    exact_text: redactText(data.exact_text as string),
    required_action: data.required_action as Reading["required_action"],
    sensitive_content: data.sensitive_content,
  };
}
