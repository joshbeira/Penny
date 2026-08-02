import assert from "node:assert/strict";
import test from "node:test";

// SPEC 11.7's matcher, locked. The claim P8 makes is that every control in
// SPEC 10 is reachable by voice, and that claim is only as good as the phrase
// table: an intent whose phrases are all swallowed by an earlier entry is a
// control a blind customer cannot reach, which is the exact failure SPEC 11.7
// exists to prevent. So the first test below iterates INTENTS itself rather
// than a hand-written sample — a shadowed phrase is a failure, not a surprise.
//
// The matcher only. SPEC 11.7's flows are DOM and side effects and are verified
// in the browser, as every phase since P2 has done.
//
// Runs on `node --test` with native type stripping: no test framework, and so no
// dependency beyond SPEC 2's table.
//
// intents.ts imports nothing at all, which is why this file needs no DOM, no
// window stub and no bundler — unlike state/receipts.test.ts, which has to
// stand in for window.localStorage before zustand's persist resolves it. The
// flow half lives in voiceInput.ts precisely so that stays true.
import { INTENTS, contextualOffer, matchIntent } from "./intents.ts";

// The context in which each scope's intents are eligible (SPEC 11.7's priority
// order). Global intents are exercised from Home with no sheet open, which is
// the state the customer is in for all but two of them.
const CONTEXT = {
  sheet: { route: "/", sheetOpen: true },
  postbox: { route: "/postbox", sheetOpen: false },
  journey: { route: "/journey", sheetOpen: false },
  global: { route: "/", sheetOpen: false },
};

const WEEKDAYS = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
];

// day_query's phrases carry the one template token, so a phrase is only a real
// utterance once a day is in it.
function utterance(phrase: string): string {
  return phrase.replace("{day}", "tuesday");
}

test("every phrase in every intent resolves to that intent", () => {
  for (const intent of INTENTS) {
    for (const phrase of intent.phrases) {
      const match = matchIntent(utterance(phrase), CONTEXT[intent.scope]);
      assert.equal(
        match?.intentId,
        intent.id,
        `"${phrase}" reached ${match?.intentId ?? "no intent"}, not ${intent.id}`,
      );
    }
  }
});

// SPEC 11.7: "(1) sheet-scoped when a dialog is open — these override
// everything". "stop" is the case that matters: it is `cancel` on an open sheet
// and `stop_speaking` everywhere else, so the same word must mean two things
// depending only on whether a dialog is up.
test("sheet scope beats global when a sheet is open", () => {
  assert.equal(matchIntent("stop", CONTEXT.sheet)?.intentId, "cancel");
  assert.equal(matchIntent("stop", CONTEXT.global)?.intentId, "stop_speaking");

  assert.equal(matchIntent("yes", CONTEXT.sheet)?.intentId, "confirm");
  assert.equal(matchIntent("order it", CONTEXT.sheet)?.intentId, "confirm");

  // And with no sheet open the sheet entries are not merely outranked, they are
  // not eligible at all — otherwise "no" would answer a dialog that is not there.
  assert.equal(matchIntent("never mind", CONTEXT.global), null);

  // The same rule on the screen-scoped tier: a reading mode is Post Box's, and
  // saying it anywhere else must not silently switch a mode that is not on screen.
  assert.equal(matchIntent("word for word", CONTEXT.postbox)?.intentId, "mode_exact");
  assert.equal(matchIntent("word for word", CONTEXT.global), null);
  assert.equal(matchIntent("twenty thirty", CONTEXT.journey)?.intentId, "era_2030");
  assert.equal(matchIntent("twenty thirty", CONTEXT.global), null);
});

test("day_query extracts the weekday", () => {
  for (const day of WEEKDAYS) {
    const match = matchIntent(`What did I spend on ${day}?`, CONTEXT.global);
    assert.equal(match?.intentId, "day_query");
    assert.equal(match?.params.day, day);
  }

  // Capitalisation, punctuation and a contraction all normalise away first
  // (SPEC 11.7), and the day still comes through.
  assert.deepEqual(matchIntent("What's on Saturday?", CONTEXT.global), null);
  assert.equal(
    matchIntent("Anything on Saturday?", CONTEXT.global)?.params.day,
    "saturday",
  );

  // Without a day named it is not a day query — it is the week sweep. This is
  // why day_query sits ahead of play_week: "what did I spend on Tuesday"
  // contains "what did I spend".
  assert.equal(matchIntent("what did I spend", CONTEXT.global)?.intentId, "play_week");
  assert.equal(
    matchIntent("what did I spend on Tuesday", CONTEXT.global)?.intentId,
    "day_query",
  );
});

test("unmatched input returns the contextual-help result", () => {
  const nonsense = "purple aardvark trombone";
  for (const context of Object.values(CONTEXT)) {
    assert.equal(matchIntent(nonsense, context), null);
  }

  // SPEC 11.7 pins Home's offer exactly, and forbids "try saying" everywhere.
  assert.equal(
    contextualOffer("/"),
    "I can check your balance, play your week, read a letter, or read your receipts. Which one?",
  );
  for (const route of ["/", "/postbox", "/receipts", "/settings", "/journey", "/director"]) {
    const line = contextualOffer(route);
    assert.ok(line.length > 0, `${route} has no offer`);
    assert.ok(!line.toLowerCase().includes("try saying"), `${route} says "try saying"`);
  }

  // `help` speaks the same list, so an unmatched utterance and an asked-for one
  // can never drift apart.
  assert.equal(matchIntent("what can you do", CONTEXT.global)?.intentId, "help");
});
