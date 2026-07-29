// P0 stub (SPEC 17): /api/tts answers 502 so the client falls back to
// speechSynthesis (SPEC 6.3 step 5). The ElevenLabs implementation in SPEC 13.2
// is not part of P0.
//
// Typed locally rather than via @vercel/node so no dependency is added beyond SPEC 2.
type Response = {
  status: (code: number) => Response;
  json: (body: unknown) => void;
};

export default function handler(_req: unknown, res: Response) {
  res.status(502).json({ ok: false });
}
