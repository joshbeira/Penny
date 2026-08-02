// SPEC 11.7 — the voice control surface.
//
// The governing principle is that a button a blind customer cannot find is not a
// control: every interactive element in SPEC 10 has at least one phrasing here,
// and the button is only the sighted affordance.
//
// This module is the LANGUAGE, in two parts:
//   1. INTENTS — pure data. Ids, scopes and phrase lists, nothing else, so a
//      phrasing can be extended without touching flow code.
//   2. The matcher — normalise(), matchIntent(), contextualOffer(). Pure
//      functions, no side effects, no flow logic.
//
// The HANDS are next door in voiceInput.ts, which owns the recogniser and the
// dispatch table and calls the same functions SPEC 10's buttons call.
//
// This file imports NOTHING. That is deliberate rather than incidental: it is
// what lets src/lib/intents.test.ts load the matcher under `node --test` with
// no DOM, no stubbed storage and no bundler — and the claim P8 makes, that no
// SPEC 10 control is voice-unreachable, is a claim about this table that only a
// test iterating it can keep honest.

// ---------------------------------------------------------------------------
// 1. INTENTS — pure data
// ---------------------------------------------------------------------------

// SPEC 11.7's priority order is "(1) sheet-scoped when a dialog is open — these
// override everything; (2) screen-scoped; (3) global", and within that, "first
// match wins". So THE ARRAY ORDER BELOW IS THE SPECIFICATION, not a detail:
// scope decides which entries are eligible, position decides which of the
// eligible ones wins.
export type Scope = "sheet" | "postbox" | "journey" | "global";

export type IntentId =
  | "confirm"
  | "cancel"
  | "mode_summary"
  | "mode_exact"
  | "mode_explain"
  | "era_2019"
  | "era_2026"
  | "era_2030"
  | "always_listening_off"
  | "always_listening_on"
  | "listening_off"
  | "quiet_off"
  | "quiet_on"
  | "demo_mode_off"
  | "demo_mode_on"
  | "day_query"
  | "play_week"
  | "glance"
  | "bills"
  | "order_card"
  | "read_receipts"
  | "verify_chain"
  | "repeat"
  | "help"
  | "stop_speaking"
  | "go_home"
  | "go_postbox"
  | "go_receipts"
  | "go_settings"
  | "go_journey";

export type Intent = { id: IntentId; scope: Scope; phrases: string[] };

// Every phrase is stored already normalised — lower case, no punctuation, no
// contractions — so matching is a substring test and nothing more.
//
// `{day}` in the day_query phrases is the one template token. It expands
// against the seven weekday names at match time and the match is what fills
// params.day, so a phrase only fires when a real day was actually named.
export const INTENTS: Intent[] = [
  // ---- Sheet scope. SPEC 11.7: "these override everything." -----------------
  {
    id: "confirm",
    scope: "sheet",
    phrases: [
      "yes",
      "yeah",
      "confirm",
      "go ahead",
      "do it",
      "approve",
      "that is right",
      "order it",
      "please do",
      "sounds good",
      "that is correct",
      "carry on",
    ],
  },
  {
    id: "cancel",
    scope: "sheet",
    phrases: [
      "no",
      "cancel",
      "stop",
      "never mind",
      "nevermind",
      "do not",
      "forget it",
      "not now",
      "leave it",
      "go back",
      "not this time",
      "hold on",
    ],
  },

  // ---- Post Box screen scope (SPEC 10's three reading modes) ----------------
  {
    id: "mode_summary",
    scope: "postbox",
    phrases: [
      "summarise",
      "summarize",
      "summary",
      "short version",
      "give me the summary",
      "sum it up",
      "in short",
      "briefly",
      "just the summary",
      "keep it short",
      "the gist",
      "shorten it",
    ],
  },
  {
    id: "mode_exact",
    scope: "postbox",
    phrases: [
      "word for word",
      "read it exactly",
      "exact",
      "verbatim",
      "the whole letter",
      "read the whole thing",
      "read it all",
      "every word",
      "the full text",
      "all of it",
      "read it in full",
      "the letter itself",
    ],
  },
  {
    id: "mode_explain",
    scope: "postbox",
    phrases: [
      "explain",
      "what does that mean",
      "in plain english",
      "what does this mean",
      "put it simply",
      "in simple terms",
      "help me understand",
      "what does it mean for me",
      "break it down",
      "plain english",
      "make it simple",
      "what is it about",
    ],
  },

  // ---- Journey screen scope (SPEC 10's slider) -----------------------------
  {
    id: "era_2019",
    scope: "journey",
    phrases: [
      "twenty nineteen",
      "two thousand and nineteen",
      "2019",
      "nineteen",
      "year 2019",
      "go to twenty nineteen",
      "back to twenty nineteen",
      "show me twenty nineteen",
      "set it to twenty nineteen",
      "the first year",
      "the earliest one",
      "the beginning",
    ],
  },
  {
    id: "era_2026",
    scope: "journey",
    phrases: [
      "twenty twenty six",
      "two thousand and twenty six",
      "2026",
      "year 2026",
      "go to twenty twenty six",
      "show me twenty twenty six",
      "set it to twenty twenty six",
      "today",
      "the present",
      "this year",
      "the middle one",
      "present day",
    ],
  },
  {
    id: "era_2030",
    scope: "journey",
    phrases: [
      "twenty thirty",
      "two thousand and thirty",
      "2030",
      "thirty",
      "year 2030",
      "go to twenty thirty",
      "show me twenty thirty",
      "set it to twenty thirty",
      "the future",
      "the last one",
      "the final year",
      "the end",
    ],
  },

  // ---- Global scope --------------------------------------------------------
  //
  // Four ORDERING RULES hold this section together. Each exists because the
  // alternative makes an intent unreachable, which SPEC 11.7's own principle
  // forbids:
  //
  //   a) always_listening_* before listening_off, and _off before _on —
  //      "always listening off" contains "always listening".
  //   b) quiet_off before quiet_on — "turn quiet mode off" contains
  //      "quiet mode". This inverts SPEC 11.7's table order, which lists
  //      quiet_on first; the table's order would leave quiet_off dead.
  //   c) day_query before play_week — "what did I spend on Tuesday" contains
  //      "what did I spend". Same inversion, same reason.
  //   d) stop_speaking last among the globals, and listening_off before it —
  //      its phrases are the shortest in the file ("stop", "enough"), so
  //      anything it precedes it would swallow. "stop listening" and
  //      "stop the microphone" reach listening_off for exactly this reason.
  {
    id: "always_listening_off",
    scope: "global",
    phrases: [
      "always listening off",
      "turn off always listening",
      "stop always listening",
      "do not always listen",
      "turn always listening off",
      "no need to keep listening",
      "stop listening all the time",
      "hands free off",
      "switch off always listening",
      "disable always listening",
    ],
  },
  {
    id: "always_listening_on",
    scope: "global",
    phrases: [
      "always listening",
      "always listen",
      "keep listening",
      "listen all the time",
      "keep the microphone on",
      "always be listening",
      "hands free",
      "turn on always listening",
      "stay listening",
      "listen continuously",
    ],
  },
  {
    id: "listening_off",
    scope: "global",
    phrases: [
      "stop listening",
      "turn off voice",
      "stop the microphone",
      "stop the mic",
      "turn off voice input",
      "voice input off",
      "turn voice off",
      "disable voice",
      "switch off the microphone",
      "stop hearing me",
    ],
  },
  {
    id: "quiet_off",
    scope: "global",
    phrases: [
      "quiet mode off",
      "turn quiet mode off",
      "turn off quiet mode",
      "speak up",
      "out loud",
      "you can talk",
      "you can speak",
      "stop whispering",
      "speak normally",
      "quiet mode is off",
      "talk to me normally",
      "switch off quiet mode",
    ],
  },
  {
    id: "quiet_on",
    scope: "global",
    phrases: [
      "quiet mode",
      "quiet mode on",
      "turn on quiet mode",
      "whisper",
      "i am in public",
      "be discreet",
      "quiet please",
      "keep it quiet",
      "go quiet",
      "discreet mode",
      "no one else should hear",
      "switch on quiet mode",
    ],
  },
  {
    id: "demo_mode_off",
    scope: "global",
    phrases: [
      "demo mode off",
      "turn off demo mode",
      "turn demo mode off",
      "switch off demo mode",
      "disable demo mode",
      "stop demo mode",
      "no demo mode",
      "end demo mode",
      "demo mode is off",
      "leave demo mode",
    ],
  },
  {
    id: "demo_mode_on",
    scope: "global",
    phrases: [
      "demo mode",
      "demo mode on",
      "turn on demo mode",
      "switch on demo mode",
      "enable demo mode",
      "start demo mode",
      "put it in demo mode",
      "go into demo mode",
      "demo mode please",
      "turn demo mode on",
    ],
  },
  {
    id: "day_query",
    scope: "global",
    phrases: [
      "what did i spend on {day}",
      "anything on {day}",
      "what happened on {day}",
      "what did i buy on {day}",
      "how much did i spend on {day}",
      "my spending on {day}",
      "transactions on {day}",
      "did i spend anything on {day}",
      "what went out on {day}",
      "{day} spending",
      "what about {day}",
      "show me {day}",
    ],
  },
  {
    id: "play_week",
    scope: "global",
    phrases: [
      "play my week",
      "what did i spend",
      "my spending",
      "what happened this week",
      "play my transactions",
      "play the week",
      "my week",
      "play my spending",
      "hear my week",
      "play back my week",
      "how did my week go",
      "sound out my week",
    ],
  },
  {
    id: "glance",
    scope: "global",
    phrases: [
      "balance",
      "what is my balance",
      "how much have i got",
      "am i okay for money",
      "how am i doing",
      "check my account",
      "play the glance",
      "glance",
      "how much money do i have",
      "what is in my account",
      "how much is left",
      "am i alright for money",
    ],
  },
  {
    id: "bills",
    scope: "global",
    phrases: [
      "what bills are due",
      "anything coming out",
      "any bills this week",
      "what do i owe",
      "my bills",
      "bills",
      "what bills do i have",
      "anything due",
      "what is due",
      "upcoming bills",
      "any payments due",
      "what is coming out",
    ],
  },
  {
    id: "order_card",
    scope: "global",
    phrases: [
      "order my card",
      "replace my card",
      "i need a new card",
      "order a replacement",
      "order a new card",
      "new card",
      "get me a new card",
      "order a replacement card",
      "replace my debit card",
      "my card needs replacing",
      "order the card",
      "i want a new card",
    ],
  },
  {
    id: "read_receipts",
    scope: "global",
    phrases: [
      "read my receipts",
      "what have you done",
      "my last actions",
      "what did you do",
      "read me my receipts",
      "read out my receipts",
      "read the receipts",
      "list my receipts",
      "what actions have you taken",
      "tell me what you have done",
      "what have you been doing",
      "read my log",
    ],
  },
  {
    id: "verify_chain",
    scope: "global",
    phrases: [
      "verify",
      "verify the chain",
      "check my receipts",
      "has anything changed",
      "check the chain",
      "verify my receipts",
      "is the chain intact",
      "has anything been tampered with",
      "check the receipts",
      "verify the receipts",
      "check for tampering",
      "is anything different",
    ],
  },
  {
    id: "repeat",
    scope: "global",
    phrases: [
      "say that again",
      "repeat",
      "what was that",
      "again please",
      "say it again",
      "come again",
      "one more time",
      "i missed that",
      "pardon",
      "what did you say",
      "play that again",
      "i did not catch that",
    ],
  },
  {
    id: "help",
    scope: "global",
    phrases: [
      "help",
      "what can you do",
      "what can i say",
      "my options",
      "what are my options",
      "what can i do",
      "what do you do",
      "how does this work",
      "what are my choices",
      "what else can you do",
      "what commands are there",
      "what is available",
    ],
  },
  {
    id: "stop_speaking",
    scope: "global",
    phrases: [
      "stop",
      "shush",
      "enough",
      "be quiet",
      "stop talking",
      "stop speaking",
      "hush",
      "that is enough",
      "stop it",
      "silence",
      "stop reading",
      "wait",
    ],
  },

  // ---- Navigation. Global reach, but LAST, so a longer intent phrase always
  // wins over a bare screen name: "read my receipts" reads them, "receipts"
  // goes there.
  {
    id: "go_home",
    scope: "global",
    phrases: [
      "home",
      "go home",
      "main screen",
      "take me home",
      "back home",
      "the home screen",
      "go to home",
      "main page",
      "home screen",
      "start screen",
      "go back home",
      "first screen",
    ],
  },
  {
    id: "go_postbox",
    scope: "global",
    phrases: [
      "post box",
      "postbox",
      "read a letter",
      "i have a letter",
      "scan a letter",
      "photograph a letter",
      "take a photo of a letter",
      "my post",
      "my mail",
      "read my post",
      "open the post box",
      "letter",
    ],
  },
  {
    id: "go_receipts",
    scope: "global",
    phrases: [
      "receipts",
      "my receipts",
      "show my receipts",
      "go to receipts",
      "open receipts",
      "the receipts screen",
      "receipts screen",
      "see my receipts",
      "receipt",
      "show me the receipts",
      "take me to receipts",
      "my action receipts",
    ],
  },
  {
    id: "go_settings",
    scope: "global",
    phrases: [
      "settings",
      "options",
      "preferences",
      "go to settings",
      "open settings",
      "the settings screen",
      "my settings",
      "settings screen",
      "show me settings",
      "take me to settings",
      "app settings",
      "change my settings",
    ],
  },
  {
    id: "go_journey",
    scope: "global",
    phrases: [
      "journey",
      "sight loss journey",
      "the demo slider",
      "the slider",
      "sight loss demo",
      "one customer three years",
      "the journey screen",
      "show me the journey",
      "go to the journey",
      "the three years",
      "open the journey",
      "journey demo",
    ],
  },
];

// ---------------------------------------------------------------------------
// 2. The matcher — pure
// ---------------------------------------------------------------------------

export type MatchContext = { route: string; sheetOpen: boolean };
export type IntentParams = { day?: string };
export type Match = { intentId: IntentId; params: IntentParams };

const WEEKDAYS = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
];

// SPEC 11.7: "expand contractions (what's → what is, don't → do not, I'm → I
// am)". The three named are the pattern, not the whole set — a recogniser
// returns whatever the customer said, so the ones a customer would actually use
// on these phrasings are all here. Order matters: the longer left-hand sides go
// first so "what's" is not half-eaten by a shorter rule.
const CONTRACTIONS: [RegExp, string][] = [
  [/\bcan't\b/g, "cannot"],
  [/\bwon't\b/g, "will not"],
  [/\bshan't\b/g, "shall not"],
  [/\blet's\b/g, "let us"],
  [/\b(\w+)n't\b/g, "$1 not"],
  [/\bi'm\b/g, "i am"],
  [/\b(\w+)'re\b/g, "$1 are"],
  [/\b(\w+)'ve\b/g, "$1 have"],
  [/\b(\w+)'ll\b/g, "$1 will"],
  [/\b(\w+)'d\b/g, "$1 would"],
  [/\b(\w+)'s\b/g, "$1 is"],
];

// SPEC 11.7: "lowercase, strip punctuation, expand contractions …, collapse
// whitespace". Contractions are expanded BEFORE punctuation is stripped, since
// the apostrophe is the thing they hang on; curly apostrophes are folded first
// because that is what a speech recogniser actually returns.
export function normalise(transcript: string): string {
  let text = transcript.toLowerCase().replace(/[‘’ʼ`]/g, "'");
  for (const [pattern, replacement] of CONTRACTIONS) text = text.replace(pattern, replacement);
  return text
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function eligible(intent: Intent, context: MatchContext): boolean {
  // SPEC 11.7 priority (1): sheet-scoped intents apply only while a dialog is
  // open, and then they outrank everything — which they do by sitting first.
  if (intent.scope === "sheet") return context.sheetOpen;
  if (intent.scope === "postbox") return context.route === "/postbox";
  if (intent.scope === "journey") return context.route === "/journey";
  return true;
}

// SPEC 11.7: "A phrase matches if the normalised transcript contains it as a
// substring or equals it." `{day}` expands across the seven weekdays and the
// winner is returned as params.day, so day_query cannot fire without a day.
function phraseHit(phrase: string, heard: string): IntentParams | null {
  if (!phrase.includes("{day}")) return heard.includes(phrase) ? {} : null;

  for (const day of WEEKDAYS) {
    if (heard.includes(phrase.replace("{day}", day))) return { day };
  }
  return null;
}

// SPEC 11.7: "Matching is deterministic and priority-ordered — first match wins,
// no model."
export function matchIntent(transcript: string, context: MatchContext): Match | null {
  const heard = normalise(transcript);
  if (!heard) return null;

  for (const intent of INTENTS) {
    if (!eligible(intent, context)) continue;

    for (const phrase of intent.phrases) {
      const params = phraseHit(phrase, heard);
      if (params) return { intentId: intent.id, params };
    }
  }
  return null;
}

// SPEC 11.7's unmatched-input rule: "Never say 'try saying'. Speak a warm
// contextual offer naming what is available on the current screen." The Home
// line is the spec's own; the rest are composed the same way, from the intents
// that screen actually has. `help` speaks this too — SPEC 11.7 gives it "the
// contextual list for the current screen", which is the same list, so there is
// one implementation and they can never drift apart.
const OFFERS: Record<string, string> = {
  "/": "I can check your balance, play your week, read a letter, or read your receipts. Which one?",
  "/postbox":
    "I can read this letter as a summary, word for word, or explain it. I can also check your balance, or take you home. Which one?",
  "/receipts":
    "I can read your receipts, verify the chain, check your balance, or take you home. Which one?",
  "/settings":
    "I can turn Quiet Mode on or off, turn always listening on or off, or take you home. Which one?",
  "/journey":
    "I can set the year to twenty nineteen, twenty twenty six, or twenty thirty, or take you home. Which one?",
};

export function contextualOffer(route: string): string {
  // SPEC 12.1's /director renders Home behind the panel, so it offers Home's.
  return OFFERS[route] ?? OFFERS["/"];
}
