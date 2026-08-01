// SPEC 13.1. Keys are server-side only (SPEC 18) and never reach the client.
//
// SPEC 17's phase table assigns this file to no phase — P3 owns its only caller
// (SPEC 11.1 step 3), so it lands here. With no GEMINI_API_KEY present the
// function answers 502 immediately, which is SPEC 13.1's specified behaviour and
// the path SPEC 11.1 step 4's fixture fallback is built for.
//
// VENDOR: SPEC 13.1 originally specified the Claude API. Changed to Google
// Gemini at the user's direction — there is no Anthropic credit for this
// project, and a §13.1 that cannot be called is worse than one that names a
// different vendor. SPEC 13.1 and SPEC 18 were amended to match. Everything the
// spec actually constrains is unchanged: the same SYSTEM_PROMPT verbatim, the
// same masked JPEG, temperature 0, the same seven-key contract, the same five
// required_action values, and the same "any failure → 502" so SPEC 11.1 step 4's
// fixture fallback still carries the demo.
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

// SPEC 13.1's model, chosen by measurement against this project's key rather
// than by reputation. SPEC 11.1 step 3 aborts the whole call at 8s, and that
// budget also has to cover a phone uploading a ~1600px JPEG over mobile data,
// so latency is the binding constraint, not capability.
//
// Measured on the three SPEC 5.3 prop letters, temperature 0:
//   gemini-3.1-flash-lite  1.4-1.8s  card=order_card  scam=scam_alert
//                                    pin=none/sensitive, PIN masked to [hidden]
//   gemini-3.5-flash       5.7-6.3s  same verdicts, but only ~1.7s inside the
//                                    abort before the upload is even counted,
//                                    and it returned 403 on one of the three
//   gemini-2.5-flash/-lite           retired for new keys (404)
//   gemini-2.5-pro                   429, quota
//   gemini-3.6-flash                 403, not permitted for this key
// Three consecutive runs of flash-lite returned order_card every time.
const MODEL = "gemini-3.1-flash-lite";

const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

export default async function handler(req: Req, res: Res) {
  // SPEC 13.1: "Accept POST".
  if (req.method !== "POST") {
    res.status(502).json({ ok: false });
    return;
  }

  const key = process.env.GEMINI_API_KEY;
  // SPEC 13.1: "Missing GEMINI_API_KEY → immediate 502."
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
    const response = await fetch(ENDPOINT, {
      method: "POST",
      headers: {
        "x-goog-api-key": key,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        // SPEC 13.1's system prompt, unchanged — Gemini takes it here rather
        // than as a top-level `system` field.
        systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents: [
          {
            role: "user",
            parts: [
              { inline_data: { mime_type: "image/jpeg", data: imageBase64 } },
              { text: "Read this letter." },
            ],
          },
        ],
        generationConfig: {
          // SPEC 13.1's temperature 0 — a letter must read the same way twice.
          temperature: 0,
          // SPEC 13.1 pins max_tokens 1024. Raised because on Gemini the
          // reasoning tokens are drawn from the SAME budget as the reply, so
          // 1024 can be spent before a single character of JSON is emitted —
          // and `exact_text` alone is the whole letter verbatim.
          maxOutputTokens: 4096,
          // Belt and braces with the fence stripper below: the system prompt
          // already forbids fences, and this makes the model emit bare JSON.
          responseMimeType: "application/json",
        },
      }),
    });

    if (!response.ok) throw new Error(`Gemini API responded ${response.status}`);

    const data = (await response.json()) as {
      candidates?: { content?: { parts?: { text?: unknown }[] } }[];
    };
    // SPEC 13.1 reads data.content[0].text; the Gemini equivalent is the first
    // text part of the first candidate.
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (typeof text !== "string") throw new Error("No text part in the response");

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
