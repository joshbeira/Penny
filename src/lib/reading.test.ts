import test from "node:test";
import assert from "node:assert/strict";
import { localReading, parseReading, redactText } from "./reading.ts";

test("local reading preserves the user's actual letter instead of substituting a fixture", () => {
  const text = "Your library books are ready to collect by Friday.";
  assert.equal(localReading(text).exact_text, text);
  assert.equal(localReading(text).required_action, "none");
  assert.throws(() => localReading("   "), /No readable text/);
});
test("redaction hides number runs, separated card numbers, PINs and sort codes", () => {
  assert.equal(
    redactText("PIN 4821; card 1234 5678 9012 3456; sort 12-34-56."),
    "PIN [hidden]; card [hidden]; sort [hidden].",
  );
  assert.equal(
    redactText("Pay £25 by Friday at 10:30."),
    "Pay £25 by Friday at 10:30.",
  );
});
test("cloud contract rejects nulls, wrong types, absent fields and invalid actions", () => {
  for (const value of [
    null,
    [],
    {},
    { ...localReading("Letter"), sensitive_content: "false" },
    { ...localReading("Letter"), summary_spoken: null },
    { ...localReading("Letter"), required_action: "transfer_money" },
  ]) {
    assert.throws(() => parseReading(value));
  }
  assert.equal(parseReading(localReading("Letter")).exact_text, "Letter");
});
