import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

// SPEC 14: writes public/audio/{id}.mp3 for every line in SPEC 6.2's inventory,
// resolving the ElevenLabs voice exactly as SPEC 13.2 does so the recorded
// lines and the runtime /api/tts voice are the same person.
//
// SPEC 14 settles where the inventory lives: "duplicate the table as JSON at
// scripts/voice-lines.json and make voiceLines.ts import that JSON — choose the
// JSON file as the single source of truth". P2 created it; src/data/voiceLines.ts
// already reads it. This script reads the same file, so the app can never speak
// a line that was not recorded, or look for a recording that has no line.
//
// SPEC 2: plain fetch, no SDK. SPEC 18: the key is server-side only and is never
// VITE_-prefixed, so it arrives through the environment and nothing here writes
// it anywhere.

const HERE = dirname(fileURLToPath(import.meta.url));
const LINES = join(HERE, "voice-lines.json");
const OUT = join(HERE, "..", "public", "audio");

const API = "https://api.elevenlabs.io/v1";

const force = process.argv.includes("--force");

// SPEC 13.2 names the voice "Alice", but ElevenLabs now suffixes its premade
// voices with a descriptor — the account lists "Alice - Clear, Engaging
// Educator". So the name is compared with that suffix stripped.
//
// This is load-bearing, not cosmetic: on an exact match Alice is missed, and
// SPEC 13.2's next branch picks the first British voice, which in this account
// is "George - Warm, Captivating Storyteller" — male. Penny would silently
// stop being the voice the spec names, in every recorded line and every runtime
// line, across the whole film. api/tts.ts carries the identical rule.
const voiceName = (voice) => (voice.name ?? "").split(" - ")[0].trim();

// SPEC 13.2's voice resolution: "pick the voice named 'Alice'; if absent, the
// first voice whose labels/description contain 'British'; else the first voice."
//
// The "British" test is case-insensitive. ElevenLabs ships label values
// lowercased ({ accent: "british" }), so a case-sensitive match would make this
// branch unreachable — which cannot be what SPEC 13.2 means by a fallback.
function resolveVoice(voices) {
  const alice = voices.find((voice) => voiceName(voice) === "Alice");
  if (alice) return alice;

  const british = voices.find((voice) =>
    `${JSON.stringify(voice.labels ?? {})} ${voice.description ?? ""}`
      .toLowerCase()
      .includes("british"),
  );
  if (british) return british;

  return voices[0];
}

async function main() {
  const key = process.env.ELEVENLABS_API_KEY;

  // SPEC 14: "If ELEVENLABS_API_KEY is unset, print a warning and exit 0 — the
  // app must remain fully functional via the speechSynthesis fallback."
  // (SPEC 6.3 step 5 is that fallback, and it is reached by a missing file just
  // as it is by a missing key.)
  if (!key) {
    console.warn(
      "ELEVENLABS_API_KEY is not set — no audio written. Penny falls back to speechSynthesis (SPEC 6.3 step 5).",
    );
    process.exit(0);
  }

  const lines = JSON.parse(await readFile(LINES, "utf8"));

  const voicesResponse = await fetch(`${API}/voices`, { headers: { "xi-api-key": key } });
  if (!voicesResponse.ok) {
    throw new Error(`GET /v1/voices responded ${voicesResponse.status}`);
  }

  const { voices } = await voicesResponse.json();
  if (!Array.isArray(voices) || voices.length === 0) {
    throw new Error("GET /v1/voices returned no voices");
  }

  const voice = resolveVoice(voices);
  console.log(`Voice: ${voice.name} (${voice.voice_id}) — ${lines.length} lines`);

  await mkdir(OUT, { recursive: true });

  for (const line of lines) {
    const file = join(OUT, `${line.id}.mp3`);

    // SPEC 14: "skipping existing files unless --force". These are filmed
    // assets — re-recording one silently would change a line the pitch has
    // already been cut against.
    if (!force && existsSync(file)) {
      console.log(`  skip  ${line.id}.mp3 (exists)`);
      continue;
    }

    const response = await fetch(
      `${API}/text-to-speech/${voice.voice_id}?output_format=mp3_44100_128`,
      {
        method: "POST",
        headers: { "xi-api-key": key, "content-type": "application/json" },
        body: JSON.stringify({
          text: line.text,
          model_id: "eleven_multilingual_v2",
          voice_settings: { stability: 0.5, similarity_boost: 0.75 },
        }),
      },
    );

    if (!response.ok) {
      throw new Error(`POST /v1/text-to-speech for "${line.id}" responded ${response.status}`);
    }

    const audio = Buffer.from(await response.arrayBuffer());
    await writeFile(file, audio);
    console.log(`  write ${line.id}.mp3 (${audio.length} bytes)`);
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
