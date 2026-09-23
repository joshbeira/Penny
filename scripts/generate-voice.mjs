import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const LINES = join(HERE, "voice-lines.json");
const OUT = join(HERE, "..", "public", "audio");

const API = "https://api.elevenlabs.io/v1";

const force = process.argv.includes("--force");
const voiceName = (voice) => (voice.name ?? "").split(" - ")[0].trim();
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
  if (!key) {
    console.warn(
      "ELEVENLABS_API_KEY is not set — no audio written. Penny falls back to speechSynthesis.",
    );
    process.exit(0);
  }

  const lines = JSON.parse(await readFile(LINES, "utf8"));

  const voicesResponse = await fetch(`${API}/voices`, {
    headers: { "xi-api-key": key },
  });
  if (!voicesResponse.ok) {
    throw new Error(`GET /v1/voices responded ${voicesResponse.status}`);
  }

  const { voices } = await voicesResponse.json();
  if (!Array.isArray(voices) || voices.length === 0) {
    throw new Error("GET /v1/voices returned no voices");
  }

  const voice = resolveVoice(voices);
  console.log(
    `Voice: ${voice.name} (${voice.voice_id}) — ${lines.length} lines`,
  );

  await mkdir(OUT, { recursive: true });

  for (const line of lines) {
    const file = join(OUT, `${line.id}.mp3`);
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
      throw new Error(
        `POST /v1/text-to-speech for "${line.id}" responded ${response.status}`,
      );
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
