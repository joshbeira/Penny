import {
  requestOrderCard,
  cancelOpenSheet,
  confirmOpenSheet,
  isSheetOpen,
} from "../components/ConfirmSheet";
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
  return w.SpeechRecognition ?? w.webkitSpeechRecognition;
}
export function speechRecognitionSupported(): boolean {
  return ctor() !== undefined;
}
const RESTART_MS = 250;
const MAX_EMPTY_RESTARTS = 3;
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
      if (stopped || !useSettings.getState().alwaysListening) {
        onEnd();
        return;
      }
      if (empty > MAX_EMPTY_RESTARTS) {
        useSettings.getState().setAlwaysListening(false);
        onEnd();
        void speak({
          text: "I can't reach the microphone. Always listening is off — tap the microphone when you need me.",
        });
        return;
      }
      timer = window.setTimeout(start, RESTART_MS);
    };
    recognition.onerror = () => {};

    try {
      recognition.start();
    } catch {
      onEnd();
    }
  };

  start();

  return () => {
    stopped = true;
    window.clearTimeout(timer);
    current?.stop();
    if (!current) onEnd();
  };
}
export type IntentContext = { route: string; navigate: (to: string) => void };

const GBP = new Intl.NumberFormat("en-GB", {
  style: "currency",
  currency: "GBP",
});

const WEEKDAYS = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
];
function dayIndex(date: string): number {
  return (new Date(`${date}T00:00:00`).getDay() + 6) % 7;
}

function cap(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}
function offer(context: IntentContext): void {
  void speak({ text: contextualOffer(context.route) });
}
function navigateTo(context: IntentContext, to: string, arrival: string): void {
  context.navigate(to);
  void speak({ text: arrival });
}

const HANDLERS: Record<
  IntentId,
  (context: IntentContext, params: IntentParams) => void
> = {
  confirm: (context) => {
    if (!confirmOpenSheet()) offer(context);
  },
  cancel: (context) => {
    if (!cancelOpenSheet()) offer(context);
  },
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
    void speak({
      text: "Always listening off. Tap the microphone when you need me.",
    });
  },
  listening_off: () => {
    useSettings.getState().setVoiceInput(false);
    void speak({ text: "Voice input off. Turn it back on in Settings." });
  },
  quiet_on: () => void enterQuietMode(),
  quiet_off: () => {
    useSettings.getState().setQuietMode(false);
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
  day_query: (_context, params) => {
    const day = params.day ?? "";
    const named = cap(day);
    const spent = WEEK.filter(
      (tx) => dayIndex(tx.date) === WEEKDAYS.indexOf(day),
    );

    if (spent.length === 0) {
      void speak({ text: `Nothing on ${named}.` });
      return;
    }
    const items = spent.map(
      (tx) =>
        `${tx.merchant}, ${tx.amount > 0 ? "plus " : ""}${GBP.format(Math.abs(tx.amount))}`,
    );
    void speak({ text: `${named}: ${items.join(". ")}.` });
  },
  play_week: () => void playWeek(WEEK),
  glance: () => void glance(),
  bills: () => {
    const phrases = billPhrases(ACCOUNT);
    void speak({
      text:
        phrases.length === 0
          ? "No bills due this week."
          : `${phrases.join(". ")}.`,
    });
  },
  order_card: () => requestOrderCard(),

  read_receipts: () => void readReceiptsAloud(),
  verify_chain: () => void verifyChainAloud(),

  repeat: (context) => {
    if (!repeatLast()) offer(context);
  },

  help: (context) => offer(context),
  stop_speaking: () => {
    stopSpeaking();
    stopEarcons();
  },

  go_home: (context) => navigateTo(context, "/", "Home."),
  go_postbox: (context) =>
    navigateTo(
      context,
      "/postbox",
      "Post Box is open. Tap anywhere to photograph a letter.",
    ),
  go_receipts: (context) => navigateTo(context, "/receipts", "Receipts."),
  go_settings: (context) => navigateTo(context, "/settings", "Settings."),
  go_journey: (context) =>
    navigateTo(context, "/journey", "Sight-loss journey."),
};
export function runIntent(transcript: string, context: IntentContext): void {
  const match = matchIntent(transcript, {
    route: context.route,
    sheetOpen: isSheetOpen(),
  });
  if (!match) {
    offer(context);
    return;
  }

  HANDLERS[match.intentId](context, match.params);
}
