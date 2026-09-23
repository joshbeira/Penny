import assert from "node:assert/strict";
import test from "node:test";
import { sha256Hex } from "./hash.ts";

test("sha256Hex matches the known vector for the empty string", async () => {
  assert.equal(
    await sha256Hex(""),
    "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
  );
});

test('sha256Hex matches the known vector for "abc"', async () => {
  assert.equal(
    await sha256Hex("abc"),
    "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
  );
});
test("sha256Hex returns 64 lowercase hex characters", async () => {
  for (const input of ["", "abc", "0".repeat(64) + "|x"]) {
    assert.match(await sha256Hex(input), /^[0-9a-f]{64}$/);
  }
});
