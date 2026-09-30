import test from "node:test";
import assert from "node:assert/strict";
import { newLetter, validateLibrary } from "./library.ts";

test("saved letters preserve reviewed text and bound titles", () => {
  const entry = newLetter(
    "Library".repeat(30),
    "Collect by 2026-10-05. Reference 12345678.",
  );
  assert.equal(entry.title.length, 100);
  assert.match(entry.text, /12345678/);
  assert.equal(validateLibrary([entry])[0].id, entry.id);
});
test("invalid saved data cannot silently replace the library", () => {
  const entry = newLetter("Letter", "Synthetic example.");
  for (const value of [
    null,
    {},
    [entry, entry],
    [{ ...entry, text: "" }],
    [{ ...entry, savedAt: "bad" }],
    [{ ...entry, text: "a".repeat(16001) }],
    [{ ...entry, favourite: "yes" }],
  ]) {
    assert.throws(() => validateLibrary(value));
  }
});
