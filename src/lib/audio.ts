import { lineText } from "../data/voiceLines";
import type { FixedLineId } from "../data/voiceLines";
import { useSession } from "../state/session";
import { useSettings } from "../state/settings";
export type ToneApi = typeof import("tone");

let tone: ToneApi | null = null;
export async function ensureUnlocked(): Promise<ToneApi | null> {
  if (!useSession.getState().unlocked) return null;
  await unlock();
  return tone;
}
let activity = 0;
const speakingListeners = new Set<() => void>();

function emitSpeaking(): void {
  speakingListeners.forEach((listener) => listener());
}
export function beginAudioActivity(): void {
  activity += 1;
  if (activity === 1) {
    emitSpeaking();
    emitLiveBusy();
  }
}

export function endAudioActivity(): void {
  activity = Math.max(0, activity - 1);
  if (activity === 0) {
    emitSpeaking();
    emitLiveBusy();
  }
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
export type Announcement = { text: string; seq: number };
const MIN_GAP_MS = 900;

let announcement: Announcement = { text: "", seq: 0 };
const announcementListeners = new Set<() => void>();

let pending: string[] = [];
let draining = false;
const liveBusyListeners = new Set<() => void>();

function emitLiveBusy(): void {
  liveBusyListeners.forEach((listener) => listener());
}

export function getLiveBusy(): boolean {
  return draining || activity > 0;
}

export function subscribeLiveBusy(listener: () => void): () => void {
  liveBusyListeners.add(listener);
  return () => {
    liveBusyListeners.delete(listener);
  };
}

export function announce(text: string): void {
  pending.push(text);
  if (!draining) void drain();
}

async function drain(): Promise<void> {
  draining = true;
  emitLiveBusy();

  while (pending.length > 0) {
    announcement = {
      text: pending.shift() as string,
      seq: announcement.seq + 1,
    };
    announcementListeners.forEach((listener) => listener());
    await new Promise<void>((resolve) => {
      window.setTimeout(resolve, MIN_GAP_MS);
    });
  }

  draining = false;
  emitLiveBusy();
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
let element: HTMLAudioElement | null = null;

function audioElement(): HTMLAudioElement {
  if (!element) {
    element = new Audio();
    element.preload = "auto";
  }
  return element;
}
function silentClip(): string {
  const sampleRate = 8000;
  const samples = Math.round(sampleRate * 0.03);
  const bytes = new Uint8Array(44 + samples * 2);
  const view = new DataView(bytes.buffer);
  const ascii = (offset: number, text: string) => {
    for (let i = 0; i < text.length; i += 1)
      view.setUint8(offset + i, text.charCodeAt(i));
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

  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return `data:audio/wav;base64,${btoa(binary)}`;
}

let unlocking: Promise<void> | null = null;
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
  } catch {}

  if ("speechSynthesis" in window) {
    speechSynthesis.cancel();
    speechSynthesis.resume();
  }
  tone.getDestination().volume.value = -8;
}

export type SpeakInput = { id?: FixedLineId; text?: string };

let queue: Promise<void> = Promise.resolve();
let generation = 0;
let cancelPlayback: (() => void) | null = null;
export function stopSpeaking(): void {
  generation += 1;
  cancelPlayback?.();
  cancelPlayback = null;
  if ("speechSynthesis" in window) speechSynthesis.cancel();
}
let lastSpoken: SpeakInput | null = null;
export function repeatLast(): boolean {
  if (!lastSpoken) return false;
  void speak(lastSpoken);
  return true;
}

export function speak(input: SpeakInput): Promise<void> {
  const era = generation;
  const next = queue
    .then(() => (era === generation ? run(input) : undefined))
    .catch(() => undefined);
  queue = next;
  return next;
}
let entering = false;

export async function enterQuietMode(): Promise<void> {
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
  const text = input.text ?? (input.id ? lineText(input.id) : "");
  if (!text) return;
  lastSpoken = input;
  announce(text);
  if (useSettings.getState().quietMode) {
    pushCard(text);
    return;
  }
  if (!useSession.getState().unlocked) return;
  const era = generation;

  beginAudioActivity();
  try {
    if (input.id)
      await play(`${import.meta.env.BASE_URL}audio/${input.id}.mp3`);
    else await synthesise(text);
  } catch {
    if (era !== generation) return;
    await synthesise(text);
  } finally {
    endAudioActivity();
  }
}

function play(url: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const player = audioElement();

    const cleanup = () => {
      player.removeEventListener("ended", onEnded);
      player.removeEventListener("error", onError);
      if (cancelPlayback === abort) cancelPlayback = null;
    };
    const onEnded = () => {
      cleanup();
      resolve();
    };
    const onError = () => {
      cleanup();
      reject(new Error(`Playback failed: ${url}`));
    };
    const abort = () => {
      cleanup();
      player.pause();
      resolve();
    };

    cancelPlayback = abort;
    player.addEventListener("ended", onEnded);
    player.addEventListener("error", onError);
    player.src = url;
    player.play().catch(onError);
  });
}
function synthesise(text: string): Promise<void> {
  if (!("speechSynthesis" in window)) {
    announce(
      "Speech is unavailable in this browser. You can read or download the text.",
    );
    return Promise.resolve();
  }
  return new Promise((resolve) => {
    let finished = false;
    let voiceTimer = 0;
    let speechTimer = 0;
    const finish = () => {
      finished = true;
      clearTimeout(voiceTimer);
      clearTimeout(speechTimer);
      speechSynthesis.removeEventListener("voiceschanged", start);
      if (cancelPlayback === finish) cancelPlayback = null;
      resolve();
    };
    cancelPlayback = finish;
    let started = false;
    function start() {
      if (finished || started) return;
      const voice = speechSynthesis
        .getVoices()
        .find(
          (candidate) =>
            candidate.localService && candidate.lang.startsWith("en"),
        );
      if (!voice) return;
      started = true;
      clearTimeout(voiceTimer);
      speechSynthesis.removeEventListener("voiceschanged", start);
      const chunks = text.match(/[^\n.!?]{1,200}(?:[.!?]+|\s|$)|.{1,200}/g) ?? [
        text,
      ];
      let index = 0;
      const next = () => {
        clearTimeout(speechTimer);
        if (finished) return;
        if (index >= chunks.length) {
          finish();
          return;
        }
        const utterance = new SpeechSynthesisUtterance(chunks[index++]);
        utterance.voice = voice!;
        utterance.lang = voice!.lang;
        utterance.rate = useSettings.getState().speechRate;
        utterance.onend = next;
        utterance.onerror = () => {
          if (finished) return;
          announce(
            "Speech stopped unexpectedly. You can try again or download the text.",
          );
          finish();
        };
        speechTimer = window.setTimeout(() => {
          finish();
          speechSynthesis.cancel();
          announce("Speech timed out. Try reading again.");
        }, 60_000);
        speechSynthesis.speak(utterance);
      };
      next();
    }
    speechSynthesis.addEventListener("voiceschanged", start);
    voiceTimer = window.setTimeout(() => {
      if (!started) {
        announce(
          "An on-device voice is unavailable. You can read or download the text.",
        );
        finish();
      }
    }, 2000);
    start();
  });
}
