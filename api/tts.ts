import { Readable } from "node:stream";

// SPEC 13.2. Keys are server-side only (SPEC 18) and never reach the client.
//
// SPEC 17's phase table assigns this file to NO phase — P0 built a 502 stub, P2
// needed only that stub, and SPEC 14's voice script (P7) covers the recorded
// fixed lines, not this. P2 recorded the gap and P3, P4, P5 and P6 each carried
// it forward unchanged. It lands here because no later phase would ever claim
// it, and without it Penny never uses the ElevenLabs voice at runtime: every
// line composed at runtime — SPEC 11.5's read-aloud, and Exact/Explain on every
// letter (SPEC 11.1 step 6) — would stay on SPEC 6.3 step 5's speechSynthesis
// fallback forever.
//
// Typed locally rather than via @vercel/node so no dependency is added beyond
// SPEC 2, following api/read-letter.ts.
type Req = { method?: string; body?: unknown };

type Res = {
  status: (code: number) => Res;
  json: (body: unknown) => void;
  setHeader: (name: string, value: string) => void;
  // The Node response is a writable stream; SPEC 13.2 says "stream the response
  // back", so the upstream body is piped into it.
  on: (event: string, listener: () => void) => void;
};

const API = "https://api.elevenlabs.io/v1";

// SPEC 13.2: "reject > 600 chars".
const MAX_CHARS = 600;

// SPEC 13.2: "Resolve the voice once per cold start." Cached as the promise, not
// the value, so concurrent first requests share one lookup instead of racing.
// It is deliberately NOT cached on failure — a key whose permissions are fixed
// mid-life should start working without a redeploy.
let voicePromise: Promise<string> | null = null;

type Voice = { voice_id: string; name?: string; description?: string; labels?: unknown };

// SPEC 13.2's resolution, verbatim: "pick the voice named 'Alice'; if absent,
// the first voice whose labels/description contain 'British'; else the first
// voice."
//
// The "British" test is case-insensitive, matching scripts/generate-voice.mjs:
// ElevenLabs ships label values lowercased ({ accent: "british" }), so a
// case-sensitive match would make the branch unreachable. The two must agree —
// the recorded fixed lines and the runtime lines are the same voice or the
// demo has two Pennys.
function resolveVoice(voices: Voice[]): Voice {
  const alice = voices.find((voice) => voice.name === "Alice");
  if (alice) return alice;

  const british = voices.find((voice) =>
    `${JSON.stringify(voice.labels ?? {})} ${voice.description ?? ""}`
      .toLowerCase()
      .includes("british"),
  );
  if (british) return british;

  return voices[0];
}

async function voiceId(key: string): Promise<string> {
  const response = await fetch(`${API}/voices`, { headers: { "xi-api-key": key } });
  if (!response.ok) throw new Error(`GET /v1/voices responded ${response.status}`);

  const { voices } = (await response.json()) as { voices?: Voice[] };
  if (!Array.isArray(voices) || voices.length === 0) throw new Error("No voices returned");

  return resolveVoice(voices).voice_id;
}

export default async function handler(req: Req, res: Res) {
  if (req.method !== "POST") {
    res.status(502).json({ ok: false });
    return;
  }

  const key = process.env.ELEVENLABS_API_KEY;
  // SPEC 13.2: "Missing key or upstream error → 502 (client falls back to
  // speechSynthesis)."
  if (!key) {
    res.status(502).json({ ok: false });
    return;
  }

  const text = (req.body as { text?: unknown } | undefined)?.text;
  if (typeof text !== "string" || !text) {
    res.status(400).json({ ok: false });
    return;
  }
  // SPEC 13.2 says "reject" without naming a code. 400 rather than 502: this is
  // the caller's error, not the upstream's, and SPEC 6.3 step 5 treats any
  // non-200 the same way, so the fallback is unaffected either way.
  if (text.length > MAX_CHARS) {
    res.status(400).json({ ok: false });
    return;
  }

  try {
    if (!voicePromise) voicePromise = voiceId(key);

    let id: string;
    try {
      id = await voicePromise;
    } catch (error) {
      // Do not let one bad lookup poison every later request in this instance.
      voicePromise = null;
      throw error;
    }

    // SPEC 2: plain fetch, no SDK.
    const upstream = await fetch(`${API}/text-to-speech/${id}?output_format=mp3_44100_128`, {
      method: "POST",
      headers: { "xi-api-key": key, "content-type": "application/json" },
      body: JSON.stringify({
        text,
        model_id: "eleven_multilingual_v2",
        voice_settings: { stability: 0.5, similarity_boost: 0.75 },
      }),
    });

    if (!upstream.ok || !upstream.body) {
      throw new Error(`POST /v1/text-to-speech responded ${upstream.status}`);
    }

    // SPEC 13.2: "Stream the response back with content-type: audio/mpeg."
    // Every failure that can be detected at all is detected above, before a
    // single byte is written, so the 502 path below can still set a status.
    res.setHeader("content-type", "audio/mpeg");
    res.status(200);
    Readable.fromWeb(upstream.body as Parameters<typeof Readable.fromWeb>[0]).pipe(
      res as unknown as NodeJS.WritableStream,
    );
  } catch {
    // SPEC 13.2: any upstream error → 502. SPEC 6.3 step 5's speechSynthesis
    // fallback is what the client does with it, so the cause buys the caller
    // nothing.
    res.status(502).json({ ok: false });
  }
}
