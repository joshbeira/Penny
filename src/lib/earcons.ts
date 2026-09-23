import { ACCOUNT, HEALTH_WORD, accountHealth } from "../data/account";
import type { Health } from "../data/account";
import { WEEK } from "../data/transactions";
import type { Tx } from "../data/transactions";
import {
  announce,
  beginAudioActivity,
  endAudioActivity,
  ensureUnlocked,
} from "./audio";
import type { ToneApi } from "./audio";
import { haptic } from "./haptics";
const MOTIF_VOICE = {
  oscillator: { type: "triangle" as const },
  envelope: { attack: 0.005, decay: 0.08, sustain: 0.2, release: 0.3 },
};

const MOTIF: Record<Health, [string, string, string]> = {
  steady: ["C4", "E4", "G4"], // rising major
  tight: ["E4", "E4", "E4"], // level
  risk: ["G4", "Eb4", "C4"], // falling minor
};

const MOTIF_ONSETS = [0, 0.22, 0.44];
const MOTIF_DURATION = 0.16;

const BILL_PING = { note: "A5", duration: 0.09, onset: 0.72 };
const TRITONE = { notes: ["C5", "F#5"], duration: 0.12 };
const GLANCE_ANOMALY_ONSET = 0.95;
const NOTE_DURATION = 0.18;
const SWEEP_START = 0.3;
const SWEEP_SPAN = 4.4;
const SAME_DAY_OFFSET = 0.12;
const ANOMALY_LAG = 0.05;

const TIMBRE: Record<
  Tx["category"],
  "triangle" | "square" | "sawtooth" | "sine" | "pluck"
> = {
  groceries: "triangle",
  transport: "square",
  bills: "sawtooth",
  income: "sine",
  other: "pluck",
};

type Session = {
  tone: ToneApi;
  nodes: { dispose: () => void }[];
  timers: number[];
};

let session: Session | null = null;
async function begin(): Promise<ToneApi | null> {
  const tone = await ensureUnlocked();
  if (!tone) return null;

  teardown();
  beginAudioActivity();
  session = { tone, nodes: [], timers: [] };
  return tone;
}

function track<T extends { dispose: () => void }>(node: T): T {
  session?.nodes.push(node);
  return node;
}

function after(seconds: number, run: () => void): void {
  session?.timers.push(window.setTimeout(run, seconds * 1000));
}

function teardown(): void {
  const finished = session;
  if (!finished) return;
  session = null;

  finished.timers.forEach((timer) => window.clearTimeout(timer));
  finished.tone.getDraw().cancel(0);
  finished.nodes.forEach((node) => node.dispose());
  endAudioActivity();
}
export function stopEarcons(): void {
  teardown();
}
function finish(end: number, tail: number, line: string): void {
  after(end, () => announce(line));
  after(end + tail, teardown);
}

function tritone(tone: ToneApi, volume: number) {
  const synth = new tone.PolySynth(tone.Synth, MOTIF_VOICE).toDestination();
  synth.volume.value = volume;
  return track(synth);
}

export async function glance(
  account = ACCOUNT,
  week: Tx[] = WEEK,
): Promise<void> {
  const tone = await begin();
  if (!tone) return;

  const t0 = tone.now();
  const health = accountHealth(account);

  const motif = track(new tone.Synth(MOTIF_VOICE).toDestination());
  MOTIF[health].forEach((note, index) => {
    motif.triggerAttackRelease(note, MOTIF_DURATION, t0 + MOTIF_ONSETS[index]);
  });
  let end = MOTIF_ONSETS[MOTIF_ONSETS.length - 1] + MOTIF_DURATION;

  const bills = account.billsDueThisWeek.length;
  if (bills > 0) {
    motif.triggerAttackRelease(
      BILL_PING.note,
      BILL_PING.duration,
      t0 + BILL_PING.onset,
    );
    end = BILL_PING.onset + BILL_PING.duration;
  }
  const anomalies = week.filter((tx) => tx.isAnomaly).length;
  if (anomalies > 0) {
    tritone(tone, -4).triggerAttackRelease(
      TRITONE.notes,
      TRITONE.duration,
      t0 + GLANCE_ANOMALY_ONSET,
    );
    end = GLANCE_ANOMALY_ONSET + TRITONE.duration;
  }
  finish(end, 0.4, glanceLine(health, bills, anomalies));
}
function glanceLine(health: Health, bills: number, anomalies: number): string {
  const parts = [`${HEALTH_WORD[health]}.`];
  if (bills > 0)
    parts.push(`${cap(count(bills))} ${plural(bills, "bill")} this week.`);
  if (anomalies > 0) {
    parts.push(
      `${cap(count(anomalies))} ${plural(anomalies, "unusual payment")}.`,
    );
  }
  return parts.join(" ");
}

export async function playWeek(
  week: Tx[] = WEEK,
  onNote?: (id: string) => void,
): Promise<void> {
  const tone = await begin();
  if (!tone) return;

  const t0 = tone.now();
  const seenPerDay = new Map<number, number>();
  let end = 0;

  week.forEach((tx) => {
    const day = dayIndex(tx.date);
    const seen = seenPerDay.get(day) ?? 0;
    seenPerDay.set(day, seen + 1);
    const onset = SWEEP_START + (SWEEP_SPAN * day) / 7 + seen * SAME_DAY_OFFSET;

    const midi =
      48 +
      36 * (Math.log10(clamp(Math.abs(tx.amount), 1, 500)) / Math.log10(500));
    const frequency = tone.Frequency(midi, "midi").toFrequency();
    const panner = track(
      new tone.Panner(tx.amount > 0 ? -0.7 : 0.7).toDestination(),
    );
    const timbre = TIMBRE[tx.category];
    const voice = track(
      timbre === "pluck"
        ? new tone.PluckSynth().connect(panner)
        : new tone.Synth({ oscillator: { type: timbre } }).connect(panner),
    );
    voice.triggerAttackRelease(frequency, NOTE_DURATION, t0 + onset);
    if (onNote) tone.getDraw().schedule(() => onNote(tx.id), t0 + onset);

    if (tx.isAnomaly) {
      tritone(tone, 0).triggerAttackRelease(
        TRITONE.notes,
        TRITONE.duration,
        t0 + onset + ANOMALY_LAG,
      );
      after(onset + ANOMALY_LAG, () => haptic("alert"));
    }

    end = Math.max(end, onset + NOTE_DURATION);
  });
  finish(end, 1, weekLine(week));
}
function weekLine(week: Tx[]): string {
  const days = new Set(week.map((tx) => tx.date)).size;
  const parts = [`Played ${count(days)} ${plural(days, "day")}.`];

  const anomalies = week.filter((tx) => tx.isAnomaly);
  if (anomalies.length > 0) {
    const when = anomalies.map((tx) => weekdayName(tx.date)).join(" and ");
    parts.push(
      `${cap(count(anomalies.length))} ${plural(anomalies.length, "unusual payment")} on ${when}.`,
    );
  }
  return parts.join(" ");
}
function dayIndex(date: string): number {
  return (new Date(`${date}T00:00:00`).getDay() + 6) % 7;
}

function weekdayName(date: string): string {
  return new Date(`${date}T00:00:00`).toLocaleDateString("en-GB", {
    weekday: "long",
  });
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
const WORDS = [
  "zero",
  "one",
  "two",
  "three",
  "four",
  "five",
  "six",
  "seven",
  "eight",
  "nine",
];

function count(value: number): string {
  return WORDS[value] ?? String(value);
}

function cap(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function plural(value: number, noun: string): string {
  return value === 1 ? noun : `${noun}s`;
}
