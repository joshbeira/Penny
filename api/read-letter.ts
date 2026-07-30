// SPEC 13.1. Keys are server-side only (SPEC 18) and never reach the client.
//
// SPEC 17's phase table assigns this file to no phase — P3 owns its only caller
// (SPEC 11.1 step 3), so it lands here. With no ANTHROPIC_API_KEY present the
// function answers 502 immediately, which is SPEC 13.1's specified behaviour and
// the path SPEC 11.1 step 4's fixture fallback is built for.
//
// Typed locally rather than via @vercel/node so no dependency is added beyond
// SPEC 2, following api/tts.ts.
type Req = { method?: string; body?: unknown };

type Res = {
  status: (code: number) => Res;
  json: (body: unknown) => void;
};

// SPEC 13.1.
export const config = { api: { bodyParser: { sizeLimit: "6mb" } } };

// SPEC 13.1 — copied verbatim. Do not reword: it is what constrains the model
// to the seven keys validated below, and it carries the masking instruction
// that backs SPEC 12.3 scenario D's privacy claim on the server side too.
const SYSTEM_PROMPT =
  'You are Penny, a bank\'s accessibility assistant for blind customers. Look at this photographed letter and return ONLY a JSON object, no markdown fences, no prose, with exactly these keys: {"sender": string, "letter_type": string, "summary_spoken": string (max 40 words, warm, plain English, no jargon, written to be read aloud), "explain_spoken": string (max 80 words, plain-English explanation of what this letter means for the customer), "required_action": one of "none" | "order_card" | "confirm_address" | "form_fill" | "scam_alert", "sensitive_content": boolean (true if a PIN, password, or full card number is visible), "exact_text": string (the letter verbatim)}. If any card number or PIN is visible, replace it with [hidden] everywhere, including exact_text.';

// SPEC 13.1's five values. SPEC 19 has no form-fill flow and SPEC 10 gives a UI
// only to order_card and scam_alert, so confirm_address and form_fill are
// accepted here and mapped to "none" client-side.
const ACTIONS = ["none", "order_card", "confirm_address", "form_fill", "scam_alert"];

const KEYS = [
  "sender",
  "letter_type",
  "summary_spoken",
  "explain_spoken",
  "required_action",
  "sensitive_content",
  "exact_text",
];

export default async function handler(req: Req, res: Res) {
  // SPEC 13.1: "Accept POST".
  if (req.method !== "POST") {
    res.status(502).json({ ok: false });
    return;
  }

  const key = process.env.ANTHROPIC_API_KEY;
  // SPEC 13.1: "Missing ANTHROPIC_API_KEY → immediate 502."
  if (!key) {
    res.status(502).json({ ok: false });
    return;
  }

  const body = req.body as { imageBase64?: unknown; mediaType?: unknown } | undefined;
  const imageBase64 = body?.imageBase64;
  if (typeof imageBase64 !== "string" || !imageBase64) {
    res.status(502).json({ ok: false });
    return;
  }
  // SPEC 11.1 step 3 sends "image/jpeg" and SPEC 13.1's request pins that media
  // type, so anything else is not a request this function can serve.
  const mediaType = body?.mediaType === undefined ? "image/jpeg" : body.mediaType;
  if (mediaType !== "image/jpeg") {
    res.status(502).json({ ok: false });
    return;
  }

  try {
    // SPEC 2: serverless functions use plain fetch — no SDKs.
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 1024,
        temperature: 0,
        system: SYSTEM_PROMPT,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image",
                source: { type: "base64", media_type: "image/jpeg", data: imageBase64 },
              },
              { type: "text", text: "Read this letter." },
            ],
          },
        ],
      }),
    });

    if (!response.ok) throw new Error(`Claude API responded ${response.status}`);

    const data = (await response.json()) as { content?: { text?: unknown }[] };
    const text = data.content?.[0]?.text;
    if (typeof text !== "string") throw new Error("No text block in the response");

    const letter = JSON.parse(stripFences(text)) as Record<string, unknown>;

    // SPEC 13.1: "validate all seven keys exist and required_action is one of
    // the five values".
    for (const name of KEYS) {
      if (!(name in letter)) throw new Error(`Missing key: ${name}`);
    }
    if (!ACTIONS.includes(letter.required_action as string)) {
      throw new Error(`Unknown required_action: ${String(letter.required_action)}`);
    }

    res.status(200).json({ ok: true, letter });
  } catch {
    // SPEC 13.1: "Any failure → res.status(502).json({ ok: false })". The
    // client's fixture fallback (SPEC 11.1 step 4) handles it, so nothing is
    // gained by distinguishing the causes to the caller.
    res.status(502).json({ ok: false });
  }
}

// SPEC 13.1: "strip any ```json fences". The system prompt forbids them, so this
// only catches a model that adds them anyway.
function stripFences(text: string): string {
  const trimmed = text.trim();
  if (!trimmed.startsWith("```")) return trimmed;
  return trimmed
    .replace(/^```[a-zA-Z]*\s*/, "")
    .replace(/\s*```$/, "")
    .trim();
}
