import { lineText } from "../data/voiceLines";
import type { FixedLineId } from "../data/voiceLines";
import { useSession } from "../state/session";
import { useSettings } from "../state/settings";

// SPEC 3: unlock, speak(), fixed-line player, sound-dot state. It also owns the
// live-region text (see `announce` below) because it is the only module both
// speak() and earcons.ts share.

// ---------------------------------------------------------------------------
// Tone handle
// ---------------------------------------------------------------------------

// A *type-only* reference: `typeof import("tone")` is erased at compile time, so
// nothing pulls tone into the initial bundle.
//
// This matters more than it looks. tone's index.js evaluates getContext() at
// module top level (its deprecated Transport/Destination/Master/Listener/Draw/
// context exports), and getContext() constructs a real AudioContext. The
// package does not declare `sideEffects: false`, so Rollup cannot drop those.
// A static `import * as Tone from "tone"` would therefore build an AudioContext
// on page load — before the splash tap — breaking SPEC 6.1's "No audio API may
// be called anywhere before session.unlocked is true". Hence the dynamic
// import inside unlock(), which is also what code-splits tone out of the entry
// chunk.
export type ToneApi = typeof import("tone");

let tone: ToneApi | null = null;

// The one accessor earcons.ts and haptics.ts use.
//
// It awaits unlock() rather than assuming it has run, because P1 persists
// session.unlocked to sessionStorage: after a full page reload inside the same
// tab the splash is skipped and unlock() never fires, yet the Glance button is
// right there on Home. Every caller is inside a click or a post-click chain, so
// Tone.start() still has its gesture. unlock() is idempotent, so this is a
// no-op once it has run.
//
// null means SPEC 6.1's gate is still shut — no audio API may be touched.
export async function ensureUnlocked(): Promise<ToneApi | null> {
  if (!useSession.getState().unlocked) return null;
  await unlock();
  return tone;
}

// ---------------------------------------------------------------------------
// Sound-dot state (SPEC 6.3 step 6, SPEC 4)
// ---------------------------------------------------------------------------

// A refcount rather than a boolean: SPEC 4 pulses the dot "whenever Penny is
// speaking or playing an earcon", and those two channels are independent —
// earcons.ts calls these too, and a Glance can overlap a spoken line.
let activity = 0;
const speakingListeners = new Set<() => void>();

function emitSpeaking(): void {
  speakingListeners.forEach((listener) => listener());
}

export function beginAudioActivity(): void {
  activity += 1;
  if (activity === 1) emitSpeaking();
}

export function endAudioActivity(): void {
  activity = Math.max(0, activity - 1);
  if (activity === 0) emitSpeaking();
}

export function isSpeaking(): boolean {
  return activity > 0;
}

export function subscribeSpeaking(listener: () => void): () => void {
  speakingListeners.add(listener);
  return () => {
    speakingListeners.delete(listener);
  };
}

// ---------------------------------------------------------------------------
// Live region (SPEC 15, SPEC 6.3 step 1)
// ---------------------------------------------------------------------------

// SPEC 7.1 and 7.2 post their completion lines straight here rather than through
// speak(), which would speak them. `seq` lets LiveRegion.tsx re-announce an
// identical string — replaying the Glance must not go silent for a screen
// reader just because the text has not changed.
export type Announcement = { text: string; seq: number };

let announcement: Announcement = { text: "", seq: 0 };
const announcementListeners = new Set<() => void>();

export function announce(text: string): void {
  announcement = { text, seq: announcement.seq + 1 };
  announcementListeners.forEach((listener) => listener());
}

export function getAnnouncement(): Announcement {
  return announcement;
}

export function subscribeAnnouncement(listener: () => void): () => void {
  announcementListeners.add(listener);
  return () => {
    announcementListeners.delete(listener);
  };
}

// ---------------------------------------------------------------------------
// Text cards (SPEC 11.3, SPEC 6.3 step 2)
// ---------------------------------------------------------------------------

// Quiet Mode replaces speech with cards, so the stack belongs to the gateway
// that suppresses the speech. It sits here beside the live region for the same
// reason that does: audio.ts is the non-component module every speaker shares,
// and SPEC 3's state/ directory has exactly four stores.
//
// The array is swapped rather than mutated — TextCard.tsx reads it through
// useSyncExternalStore, which compares snapshots by identity.
export type TextCardEntry = { id: number; text: string };

let cards: TextCardEntry[] = [];
let nextCardId = 1;
const cardListeners = new Set<() => void>();

function emitCards(): void {
  cardListeners.forEach((listener) => listener());
}

function pushCard(text: string): void {
  cards = [...cards, { id: nextCardId++, text }];
  emitCards();
}

// SPEC 11.3: "auto-dismiss 6s or on tap". Both routes land here.
export function dismissCard(id: number): void {
  cards = cards.filter((card) => card.id !== id);
  emitCards();
}

export function getCards(): TextCardEntry[] {
  return cards;
}

export function subscribeCards(listener: () => void): () => void {
  cardListeners.add(listener);
  return () => {
    cardListeners.delete(listener);
  };
}

// ---------------------------------------------------------------------------
// Unlock (SPEC 6.1)
// ---------------------------------------------------------------------------

// SPEC 6.3 step 3: "a shared HTMLAudioElement". It is created here so the 30ms
// silent buffer plays through the very element speak() reuses — that is what
// actually unlocks media playback for it on Android.
let element: HTMLAudioElement | null = null;

function audioElement(): HTMLAudioElement {
  if (!element) {
    element = new Audio();
    element.preload = "auto";
  }
  return element;
}

// 30ms of 16-bit mono PCM silence at 8kHz, as a data URI. Built here rather
// than shipped as an asset: SPEC 3's tree has no such file, and a data URI
// needs no object URL to revoke.
function silentClip(): string {
  const sampleRate = 8000;
  const samples = Math.round(sampleRate * 0.03);
  const bytes = new Uint8Array(44 + samples * 2);
  const view = new DataView(bytes.buffer);
  const ascii = (offset: number, text: string) => {
    for (let i = 0; i < text.length; i += 1) view.setUint8(offset + i, text.charCodeAt(i));
  };

  ascii(0, "RIFF");
  view.setUint32(4, 36 + samples * 2, true);
  ascii(8, "WAVE");
  ascii(12, "fmt ");
  view.setUint32(16, 16, true); // PCM header length
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true); // byte rate
  view.setUint16(32, 2, true); // block align
  view.setUint16(34, 16, true); // bits per sample
  ascii(36, "data");
  view.setUint32(40, samples * 2, true);
  // The sample frames stay zero — that is the silence.

  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return `data:audio/wav;base64,${btoa(binary)}`;
}

let unlocking: Promise<void> | null = null;

// SPEC 6.1's first four steps, in order. Splash.tsx owns the rest of the
// sequence (unlocked flag, greet, navigate, glance) because those are routing
// and state, not audio.
export function unlock(): Promise<void> {
  if (!unlocking) unlocking = runUnlock();
  return unlocking;
}

async function runUnlock(): Promise<void> {
  tone = await import("tone");
  await tone.start();

  const player = audioElement();
  player.src = silentClip();
  try {
    await player.play();
  } catch {
    // Nothing to recover: the silent buffer is an Android media-unlock hint,
    // and every later line still has SPEC 6.3 step 5 behind it.
  }

  speechSynthesis.cancel();
  speechSynthesis.resume();

  // SPEC 7's master output. It has no assigned slot in SPEC 6.1's list; here is
  // the first legal moment to touch Tone and the last one before any earcon.
  tone.getDestination().volume.value = -8;
}

// ---------------------------------------------------------------------------
// speak() — the single speech gateway (SPEC 6.3)
// ---------------------------------------------------------------------------

export type SpeakInput = { id?: FixedLineId; text?: string };

const ttsCache = new Map<string, string>();

// SPEC 6.3: "one line at a time; sequential calls await the previous line's
// end." Failures are absorbed into the chain so one bad line cannot wedge it.
let queue: Promise<void> = Promise.resolve();

export function speak(input: SpeakInput): Promise<void> {
  const next = queue.then(() => run(input)).catch(() => undefined);
  queue = next;
  return next;
}

// SPEC 11.3: "Toggling ON plays `quiet_on` as the final spoken line."
//
// Step 2 above suppresses unconditionally, so the only ordering that leaves
// that line audible is to speak it BEFORE the flag goes up — which is exactly
// what "final" means. The visible cost is that the toggle's pressed state lags
// the tap by the length of the line; the alternative would be an escape hatch
// in the gateway, and SPEC 6.3 step 2 admits none.
//
// It lives here rather than in the two components that call it (SPEC 10's
// Header toggle and SPEC 10's Settings row are the same setting) so there is
// one implementation, and here rather than in state/settings.ts so no import
// cycle forms with this module.
let entering = false;

export async function enterQuietMode(): Promise<void> {
  // Without this, a second tap during the ~2s line queues a second `quiet_on`.
  if (entering) return;
  entering = true;
  try {
    await speak({ id: "quiet_on" });
    useSettings.getState().setQuietMode(true);
  } finally {
    entering = false;
  }
}

async function run(input: SpeakInput): Promise<void> {
  // When both are given (SPEC 11.1 step 8's read-back), `text` is the exact
  // on-screen wording and the id is the recording of it, so the mirror takes
  // the text: a screen reader should hear "42 Lavender Grove", not "forty two".
  const text = input.text ?? (input.id ? lineText(input.id) : "");
  if (!text) return;

  // SPEC 6.3 step 1 — ALWAYS, in every mode. Screen-reader parity.
  announce(text);

  // SPEC 6.3 step 2: "render a TextCard with the text; play no speech; return."
  // The return is literal — nothing awaits the card — which is why SPEC 11.3
  // says cards *stack*: a burst like SPEC 11.5's read-aloud puts one up per
  // line, all at once, each running its own 6s timer.
  //
  // Earcons and haptic fallback blips are exempt because they never come
  // through here (SPEC 11.3's matrix keeps them audible in Quiet Mode); they
  // route through earcons.ts and haptics.ts.
  if (useSettings.getState().quietMode) {
    pushCard(text);
    return;
  }

  // SPEC 6.1 bars any audio API before the splash tap. speak() is only
  // reachable afterwards, but the invariant is load-bearing enough to enforce.
  if (!useSession.getState().unlocked) return;

  beginAudioActivity();
  try {
    // SPEC 6.3 step 3, then step 4.
    const url = input.id ? `/audio/${input.id}.mp3` : await ttsUrl(text);
    await play(url);
  } catch {
    // SPEC 6.3 step 5 — ANY failure: missing file, network, non-200, bad body.
    // With no fixed-line MP3s recorded and /api/tts answering 502 without an
    // ELEVENLABS_API_KEY, this is the live path for every line today.
    await synthesise(text);
  } finally {
    endAudioActivity();
  }
}

async function ttsUrl(text: string): Promise<string> {
  const cached = ttsCache.get(text);
  if (cached) return cached;

  const response = await fetch("/api/tts", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ text }),
  });
  if (!response.ok) throw new Error(`/api/tts responded ${response.status}`);

  const blob = await response.blob();
  if (!blob.type.startsWith("audio/")) throw new Error(`/api/tts returned ${blob.type}`);

  // SPEC 6.3 step 4: cache blobs in-memory keyed by text.
  const url = URL.createObjectURL(blob);
  ttsCache.set(text, url);
  return url;
}

function play(url: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const player = audioElement();

    const cleanup = () => {
      player.removeEventListener("ended", onEnded);
      player.removeEventListener("error", onError);
    };
    const onEnded = () => {
      cleanup();
      resolve();
    };
    const onError = () => {
      cleanup();
      reject(new Error(`Playback failed: ${url}`));
    };

    player.addEventListener("ended", onEnded);
    player.addEventListener("error", onError);
    player.src = url;
    player.play().catch(onError);
  });
}

// SPEC 6.3 step 5. Resolves on `error` as well as `end` so the queue keeps
// moving; getVoices() populates asynchronously in Chrome, so it is read at call
// time and an empty list is fine — lang alone still selects en-GB.
function synthesise(text: string): Promise<void> {
  return new Promise((resolve) => {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "en-GB";
    utterance.rate = 1.0;

    const voice = speechSynthesis.getVoices().find((candidate) => candidate.lang.startsWith("en-GB"));
    if (voice) utterance.voice = voice;

    utterance.addEventListener("end", () => resolve());
    utterance.addEventListener("error", () => resolve());
    speechSynthesis.speak(utterance);
  });
}
