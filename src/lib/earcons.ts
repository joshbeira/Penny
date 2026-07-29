import { ACCOUNT, HEALTH_WORD, accountHealth } from "../data/account";
import type { Health } from "../data/account";
import { WEEK } from "../data/transactions";
import type { Tx } from "../data/transactions";
import { announce, beginAudioActivity, endAudioActivity, ensureUnlocked } from "./audio";
import type { ToneApi } from "./audio";
import { haptic } from "./haptics";

// SPEC 7. Everything here is scheduled against tone.now() with explicit second
// offsets and never touches Tone.Transport: the Glance is played on every open
// and replayed from Home, the Journey preview and the director panel, so it has
// to sound identical every time. Transport carries tempo and position state
// that a second call would inherit.

// SPEC 7.1's motif synth, shared by the bill ping — only the anomaly tick is
// given a synth of its own.
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

// The tritone dyad, used by both the Glance's anomaly tick (SPEC 7.1) and
// playWeek's anomaly notes (SPEC 7.2).
const TRITONE = { notes: ["C5", "F#5"], duration: 0.12 };
const GLANCE_ANOMALY_ONSET = 0.95;

// SPEC 7.2.
const NOTE_DURATION = 0.18;
const SWEEP_START = 0.3;
const SWEEP_SPAN = 4.4;
const SAME_DAY_OFFSET = 0.12;
const ANOMALY_LAG = 0.05;

const TIMBRE: Record<Tx["category"], "triangle" | "square" | "sawtooth" | "sine" | "pluck"> = {
  groceries: "triangle",
  transport: "square",
  bills: "sawtooth",
  income: "sine",
  other: "pluck",
};

// ---------------------------------------------------------------------------
// Playback session — one at a time, always torn down
// ---------------------------------------------------------------------------

type Session = { tone: ToneApi; nodes: { dispose: () => void }[]; timers: number[] };

let session: Session | null = null;

// Starting an earcon stops whatever was playing, so double-tapping "Play the
// Glance" cannot double-schedule or leak nodes.
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

// SPEC 7.1 / 7.2 post their line "after completion", then the nodes go once the
// envelopes have rung out — disposing on the note's edge would clip the tail.
function finish(end: number, tail: number, line: string): void {
  after(end, () => announce(line));
  after(end + tail, teardown);
}

function tritone(tone: ToneApi, volume: number) {
  const synth = new tone.PolySynth(tone.Synth, MOTIF_VOICE).toDestination();
  synth.volume.value = volume;
  return track(synth);
}

// ---------------------------------------------------------------------------
// SPEC 7.1 — glance()
// ---------------------------------------------------------------------------

export async function glance(account = ACCOUNT, week: Tx[] = WEEK): Promise<void> {
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
    motif.triggerAttackRelease(BILL_PING.note, BILL_PING.duration, t0 + BILL_PING.onset);
    end = BILL_PING.onset + BILL_PING.duration;
  }

  // SPEC 7.1 gates this on "any tx in the last 7 days", but the fixtures are
  // dated 2026-07-06..12, so a wall-clock window is empty and the tick would
  // never fire — while SPEC 7.1's own closing line and SPEC 17 P2 both require
  // it ("rising triad + bill ping + anomaly tick"). The only reading that
  // satisfies the acceptance criterion is that WEEK *is* the week.
  const anomalies = week.filter((tx) => tx.isAnomaly).length;
  if (anomalies > 0) {
    // "second synth at −4dB relative" — a mono Synth cannot sound two notes, so
    // this is one PolySynth over SPEC 7.1's motif voice.
    tritone(tone, -4).triggerAttackRelease(
      TRITONE.notes,
      TRITONE.duration,
      t0 + GLANCE_ANOMALY_ONSET,
    );
    end = GLANCE_ANOMALY_ONSET + TRITONE.duration;
  }

  // With the SPEC 5 fixtures: 0.95 + 0.12 = 1.07s, inside SPEC 7.1's 2s.
  finish(end, 0.4, glanceLine(health, bills, anomalies));
}

// SPEC 7.1: "health word + bill count + anomaly count; omit absent parts".
function glanceLine(health: Health, bills: number, anomalies: number): string {
  const parts = [`${HEALTH_WORD[health]}.`];
  if (bills > 0) parts.push(`${cap(count(bills))} ${plural(bills, "bill")} this week.`);
  if (anomalies > 0) {
    parts.push(`${cap(count(anomalies))} ${plural(anomalies, "unusual payment")}.`);
  }
  return parts.join(" ");
}

// ---------------------------------------------------------------------------
// SPEC 7.2 — playWeek()
// ---------------------------------------------------------------------------

export async function playWeek(week: Tx[] = WEEK, onNote?: (id: string) => void): Promise<void> {
  const tone = await begin();
  if (!tone) return;

  const t0 = tone.now();
  const seenPerDay = new Map<number, number>();
  let end = 0;

  week.forEach((tx) => {
    const day = dayIndex(tx.date);
    const seen = seenPerDay.get(day) ?? 0;
    seenPerDay.set(day, seen + 1);

    // Multiple same-day transactions step +0.12s each, in array order.
    const onset = SWEEP_START + (SWEEP_SPAN * day) / 7 + seen * SAME_DAY_OFFSET;

    const midi =
      48 + 36 * (Math.log10(clamp(Math.abs(tx.amount), 1, 500)) / Math.log10(500));
    const frequency = tone.Frequency(midi, "midi").toFrequency();

    // Credits left, debits right.
    const panner = track(new tone.Panner(tx.amount > 0 ? -0.7 : 0.7).toDestination());
    const timbre = TIMBRE[tx.category];
    const voice = track(
      timbre === "pluck"
        ? new tone.PluckSynth().connect(panner)
        : new tone.Synth({ oscillator: { type: timbre } }).connect(panner),
    );
    voice.triggerAttackRelease(frequency, NOTE_DURATION, t0 + onset);

    // Draw runs on the animation frame nearest an AudioContext time, so the row
    // flash tracks the note without drifting. It is not Tone.Transport.
    if (onNote) tone.getDraw().schedule(() => onNote(tx.id), t0 + onset);

    if (tx.isAnomaly) {
      tritone(tone, 0).triggerAttackRelease(
        TRITONE.notes,
        TRITONE.duration,
        t0 + onset + ANOMALY_LAG,
      );
      // A timer rather than Draw: a dropped frame must not swallow the buzz.
      after(onset + ANOMALY_LAG, () => haptic("alert"));
    }

    end = Math.max(end, onset + NOTE_DURATION);
  });

  // With the SPEC 5 fixtures the sweep ends at 4.25s, inside SPEC 7.2's 5s. The
  // longer tail lets the PluckSynth voices ring out before disposal.
  finish(end, 1, weekLine(week));
}

// SPEC 7.2: "Played seven days. One unusual payment on Saturday."
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

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

// SPEC 7.2: dayIndex 0 = Monday. Parsed at local midnight so the weekday cannot
// shift by timezone — t8 has to land on Saturday.
function dayIndex(date: string): number {
  return (new Date(`${date}T00:00:00`).getDay() + 6) % 7;
}

function weekdayName(date: string): string {
  return new Date(`${date}T00:00:00`).toLocaleDateString("en-GB", { weekday: "long" });
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

// SPEC 7.1 and 7.2 both spell their counts as words, and the case follows the
// position: "Played seven days." mid-sentence, "One bill this week." at the
// start of one.
const WORDS = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine"];

function count(value: number): string {
  return WORDS[value] ?? String(value);
}

function cap(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function plural(value: number, noun: string): string {
  return value === 1 ? noun : `${noun}s`;
}
