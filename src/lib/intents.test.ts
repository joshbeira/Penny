import assert from "node:assert/strict";
import test from "node:test";
import { INTENTS, contextualOffer, matchIntent } from "./intents.ts";
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
test("sheet scope beats global when a sheet is open", () => {
  assert.equal(matchIntent("stop", CONTEXT.sheet)?.intentId, "cancel");
  assert.equal(matchIntent("stop", CONTEXT.global)?.intentId, "stop_speaking");

  assert.equal(matchIntent("yes", CONTEXT.sheet)?.intentId, "confirm");
  assert.equal(matchIntent("order it", CONTEXT.sheet)?.intentId, "confirm");
  assert.equal(matchIntent("never mind", CONTEXT.global), null);
  assert.equal(
    matchIntent("word for word", CONTEXT.postbox)?.intentId,
    "mode_exact",
  );
  assert.equal(matchIntent("word for word", CONTEXT.global), null);
  assert.equal(
    matchIntent("twenty thirty", CONTEXT.journey)?.intentId,
    "era_2030",
  );
  assert.equal(matchIntent("twenty thirty", CONTEXT.global), null);
});

test("day_query extracts the weekday", () => {
  for (const day of WEEKDAYS) {
    const match = matchIntent(`What did I spend on ${day}?`, CONTEXT.global);
    assert.equal(match?.intentId, "day_query");
    assert.equal(match?.params.day, day);
  }
  assert.deepEqual(matchIntent("What's on Saturday?", CONTEXT.global), null);
  assert.equal(
    matchIntent("Anything on Saturday?", CONTEXT.global)?.params.day,
    "saturday",
  );
  assert.equal(
    matchIntent("what did I spend", CONTEXT.global)?.intentId,
    "play_week",
  );
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
  assert.equal(
    contextualOffer("/"),
    "I can check your balance, play your week, read a letter, or read your receipts. Which one?",
  );
  for (const route of [
    "/",
    "/postbox",
    "/receipts",
    "/settings",
    "/journey",
    "/director",
  ]) {
    const line = contextualOffer(route);
    assert.ok(line.length > 0, `${route} has no offer`);
    assert.ok(
      !line.toLowerCase().includes("try saying"),
      `${route} says "try saying"`,
    );
  }
  assert.equal(
    matchIntent("what can you do", CONTEXT.global)?.intentId,
    "help",
  );
});
