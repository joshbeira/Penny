import { requestOrderCard, cancelOpenSheet, confirmOpenSheet, isSheetOpen } from "../components/ConfirmSheet";
import { ACCOUNT, billPhrases } from "../data/account";
import { WEEK } from "../data/transactions";
import { setJourneyEra } from "../screens/Journey";
import { setPostBoxMode } from "../screens/PostBox";
import { readReceiptsAloud, verifyChainAloud } from "../screens/Receipts";
import { useSettings } from "../state/settings";
import { enterQuietMode, repeatLast, speak, stopSpeaking } from "./audio";
import { glance, playWeek, stopEarcons } from "./earcons";
import { contextualOffer, matchIntent } from "./intents";
import type { IntentId, IntentParams } from "./intents";

// SPEC 11.6's recogniser and SPEC 11.7's dispatch. intents.ts next door is the
// LANGUAGE — pure phrase data and a pure matcher, importing nothing so the
// matcher can be unit-tested. This module is the EAR AND THE HANDS: it owns the
// browser API, and it owns the table that turns a matched intent into the very
// same call SPEC 10's button makes.
//
// Nothing below reimplements a flow. Every handler reaches an existing export:
// P4's readReceiptsAloud, P5's enterQuietMode, P6's confirmOpenSheet, and the
// four registries P8 adds beside them.

// ---------------------------------------------------------------------------
// The recogniser (SPEC 11.6)
// ---------------------------------------------------------------------------

// The constructor is prefixed in Chrome, which is the target (SPEC 0: Android
// Chrome). Typed locally because lib.dom.d.ts does not ship SpeechRecognition,
// and SPEC 2 admits no @types package for it.
type RecognitionEvent = { results: { 0: { 0: { transcript: string } } } };

type Recognition = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((event: RecognitionEvent) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
};

type RecognitionCtor = new () => Recognition;

function ctor(): RecognitionCtor | undefined {
  const w = window as unknown as {
    SpeechRecognition?: RecognitionCtor;
    webkitSpeechRecognition?: RecognitionCtor;
  };
  // SPEC 11.6's order: "SpeechRecognition || webkitSpeechRecognition".
  return w.SpeechRecognition ?? w.webkitSpeechRecognition;
}

// SPEC 10: the mic button is "rendered only if speech recognition is supported".
export function speechRecognitionSupported(): boolean {
  return ctor() !== undefined;
}

// SPEC 11.7's "Always listening": "recognition auto-restarts on `onend` so no
// button press is needed". A short delay rather than an immediate restart —
// Chrome rejects a start() issued inside its own onend.
const RESTART_MS = 250;

// A session that ends without ever producing a result, three times running, is
// a permission denial or a missing device rather than a customer who said
// nothing: restarting into that forever would spin the microphone for the rest
// of the session. SPEC 11.7 is silent on the failure path, so the guard is
// derived — it gives up and says so rather than looping in silence.
const MAX_EMPTY_RESTARTS = 3;

// Starts one utterance and resolves through the callbacks. Returns a stop handle
// so the button can toggle (SPEC 11.6: "tap toggles listening").
//
// `continuous: false` means the browser ends the session by itself after a
// single result, so onEnd fires on every path — result, silence, or error — and
// is what clears the button's listening state.
export function listen({
  onResult,
  onEnd,
}: {
  onResult: (transcript: string) => void;
  onEnd: () => void;
}): () => void {
  const Ctor = ctor();
  if (!Ctor) {
    onEnd();
    return () => {};
  }

  let stopped = false;
  let empty = 0;
  let timer = 0;
  let current: Recognition | null = null;

  const start = () => {
    const recognition = new Ctor();
    current = recognition;
    recognition.lang = "en-GB";
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onresult = (event) => {
      empty = 0;
      onResult(event.results[0][0].transcript);
    };
    recognition.onend = () => {
      current = null;
      empty += 1;

      // The setting is read at restart time, not captured, so turning "Always
      // listening" off by voice (SPEC 11.7's `always_listening_off`) takes
      // effect on the very next end.
      if (stopped || !useSettings.getState().alwaysListening) {
        onEnd();
        return;
      }
      if (empty > MAX_EMPTY_RESTARTS) {
        // Turning the setting off is what actually stops the loop: App.tsx keys
        // the always-listening session on it, so leaving it on would have the
        // component start another session the moment this one reported its end.
        useSettings.getState().setAlwaysListening(false);
        onEnd();
        void speak({
          text: "I can't reach the microphone. Always listening is off — tap the microphone when you need me.",
        });
        return;
      }
      timer = window.setTimeout(start, RESTART_MS);
    };
    recognition.onerror = () => {
      // Chrome fires onend after onerror, so the restart decision is made in one
      // place rather than two.
    };

    try {
      recognition.start();
    } catch {
      // start() throws if a session is somehow already running; the pending
      // onend will take the branch above.
      onEnd();
    }
  };

  start();

  return () => {
    stopped = true;
    window.clearTimeout(timer);
    current?.stop();
    // A session that never started has no onend to wait for.
    if (!current) onEnd();
  };
}

// ---------------------------------------------------------------------------
// Dispatch (SPEC 11.7)
// ---------------------------------------------------------------------------

// Everything voice needs that is not already a module-level export: the route it
// was spoken on, and the router's navigate. Both come from App.tsx's MicButton,
// which is where the hooks live.
export type IntentContext = { route: string; navigate: (to: string) => void };

const GBP = new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" });

const WEEKDAYS = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
];

// SPEC 7.2's convention, reused: dayIndex 0 = Monday, parsed at local midnight so
// a timezone cannot shift t8 off Saturday.
function dayIndex(date: string): number {
  return (new Date(`${date}T00:00:00`).getDay() + 6) % 7;
}

function cap(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

// SPEC 11.7's unmatched-input rule, and also its `help`: both speak the
// contextual list for the current screen, so one call site serves both and they
// can never drift apart.
function offer(context: IntentContext): void {
  void speak({ text: contextualOffer(context.route) });
}

// SPEC 11.7's confirmation policy: "Non-consequential state changes
// (navigation, reading modes, Quiet Mode, listening toggle, era) execute
// immediately and Penny announces the resulting state afterwards." The
// announcement goes through speak(), so SPEC 11.3's matrix applies unchanged —
// in Quiet Mode every one of these becomes a TextCard and still reaches the live
// region.
function navigateTo(context: IntentContext, to: string, arrival: string): void {
  context.navigate(to);
  void speak({ text: arrival });
}

const HANDLERS: Record<IntentId, (context: IntentContext, params: IntentParams) => void> = {
  // SPEC 11.7: "Confirms the open sheet with method: 'voice'." Both sheets
  // already register themselves and already carry that method (P6), and
  // ConfirmSheet's own cancel already speaks `cancel_ok` — so neither is
  // reimplemented here. The false branch is unreachable through matchIntent,
  // which only offers these two while a sheet is open; it is the honest answer
  // if that ever stops being true.
  confirm: (context) => {
    if (!confirmOpenSheet()) offer(context);
  },
  cancel: (context) => {
    if (!cancelOpenSheet()) offer(context);
  },

  // SPEC 11.7: "Switches reading mode and replays that text." setPostBoxMode
  // calls the same pick() SPEC 10's segmented control calls, and returns false
  // when there is no letter on screen yet — then the offer names what IS
  // available rather than switching an invisible control.
  mode_summary: (context) => {
    if (!setPostBoxMode("summary")) offer(context);
  },
  mode_exact: (context) => {
    if (!setPostBoxMode("exact")) offer(context);
  },
  mode_explain: (context) => {
    if (!setPostBoxMode("explain")) offer(context);
  },

  era_2019: (context) => {
    if (setJourneyEra("2019")) void speak({ text: "Twenty nineteen." });
    else offer(context);
  },
  era_2026: (context) => {
    if (setJourneyEra("2026")) void speak({ text: "Twenty twenty six." });
    else offer(context);
  },
  era_2030: (context) => {
    if (setJourneyEra("2030")) void speak({ text: "Twenty thirty." });
    else offer(context);
  },

  always_listening_on: () => {
    useSettings.getState().setAlwaysListening(true);
    void speak({ text: "Always listening on. I'll keep the microphone open." });
  },
  always_listening_off: () => {
    useSettings.getState().setAlwaysListening(false);
    void speak({ text: "Always listening off. Tap the microphone when you need me." });
  },

  // SPEC 11.7: "Disables voice input, announces the change." SPEC 10 gates the
  // mic on this setting, so the mic goes with it — and the line therefore has to
  // say where it went, or the control that turns voice back on becomes the one
  // thing a voice customer cannot find.
  listening_off: () => {
    useSettings.getState().setVoiceInput(false);
    void speak({ text: "Voice input off. Turn it back on in Settings." });
  },

  // Through enterQuietMode() rather than the setter: SPEC 11.3 wants `quiet_on`
  // spoken BEFORE the flag rises, or the gateway suppresses the very line that
  // announces it.
  quiet_on: () => void enterQuietMode(),
  quiet_off: () => {
    useSettings.getState().setQuietMode(false);
    // SPEC 11.7's line, verbatim.
    void speak({ text: "Quiet Mode off. I'll speak." });
  },

  demo_mode_on: () => {
    useSettings.getState().setDemoMode(true);
    void speak({ text: "Demo mode on." });
  },
  demo_mode_off: () => {
    useSettings.getState().setDemoMode(false);
    void speak({ text: "Demo mode off." });
  },

  // SPEC 11.7: "Speaks that day's transactions from WEEK with merchant and
  // amount; if none: 'Nothing on {day}.'"
  day_query: (_context, params) => {
    const day = params.day ?? "";
    const named = cap(day);
    const spent = WEEK.filter((tx) => dayIndex(tx.date) === WEEKDAYS.indexOf(day));

    if (spent.length === 0) {
      void speak({ text: `Nothing on ${named}.` });
      return;
    }

    // Credits are marked in words, not with a sign: "-£42.30" read aloud is not
    // a sentence. SPEC 10's rows draw the same distinction visually.
    const items = spent.map(
      (tx) => `${tx.merchant}, ${tx.amount > 0 ? "plus " : ""}${GBP.format(Math.abs(tx.amount))}`,
    );
    void speak({ text: `${named}: ${items.join(". ")}.` });
  },

  // SPEC 7.2's sweep, from wherever the customer is — SPEC 11.7 makes it global.
  // Off Home the row flashes have nothing to flash, which is why onNote is
  // optional in SPEC 7.2's signature.
  play_week: () => void playWeek(WEEK),
  glance: () => void glance(),

  // SPEC 11.7: "Speaks billsDueThisWeek from SPEC 5.1." The phrases come from
  // data/account.ts, so Home's bills line and this one cannot disagree.
  bills: () => {
    const phrases = billPhrases(ACCOUNT);
    void speak({
      text: phrases.length === 0 ? "No bills due this week." : `${phrases.join(". ")}.`,
    });
  },

  // SPEC 11.7's confirmation policy: an account consequence still passes through
  // ConfirmSheet and the Read-Back Rule — "voice never bypasses confirmation".
  // This raises the same sheet, with the same `readback_card` line and the same
  // receipt, that SPEC 10's Post Box button raises. One implementation, two ways
  // in, and the receipt records which one was used.
  order_card: () => requestOrderCard(),

  read_receipts: () => void readReceiptsAloud(),
  verify_chain: () => void verifyChainAloud(),

  repeat: (context) => {
    // Answering "say that again" with silence is the one response a voice-first
    // product cannot give, so an empty history offers instead.
    if (!repeatLast()) offer(context);
  },

  help: (context) => offer(context),

  // SPEC 11.7's barge-in. Both halves are needed and neither substitutes for the
  // other: audio.ts owns the speech queue and the shared media element,
  // earcons.ts owns the Tone graph.
  stop_speaking: () => {
    stopSpeaking();
    stopEarcons();
  },

  go_home: (context) => navigateTo(context, "/", "Home."),
  // SPEC 11.7's camera constraint, verbatim. A recognition result is not a user
  // activation gesture, so voice cannot open the file picker; the Post Box idle
  // state answers that by making its whole main region the label.
  go_postbox: (context) =>
    navigateTo(context, "/postbox", "Post Box is open. Tap anywhere to photograph a letter."),
  go_receipts: (context) => navigateTo(context, "/receipts", "Receipts."),
  go_settings: (context) => navigateTo(context, "/settings", "Settings."),
  go_journey: (context) => navigateTo(context, "/journey", "Sight-loss journey."),
};

// The single entry point App.tsx hands every transcript to.
export function runIntent(transcript: string, context: IntentContext): void {
  // isSheetOpen() is read here rather than passed in: a sheet can open or close
  // between the tap on the mic and the recogniser's result, and SPEC 11.7's
  // priority rule is about the moment the customer spoke.
  const match = matchIntent(transcript, {
    route: context.route,
    sheetOpen: isSheetOpen(),
  });

  // SPEC 11.7: never "try saying".
  if (!match) {
    offer(context);
    return;
  }

  HANDLERS[match.intentId](context, match.params);
}
