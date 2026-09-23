import test from "node:test";
import assert from "node:assert/strict";
import handler from "../../api/read-letter.ts";
import { localReading } from "../../src/lib/reading.ts";

function response() {
  return {
    code: 0,
    body: {} as any,
    headers: {} as Record<string, string>,
    status(code: number) {
      this.code = code;
      return this;
    },
    json(body: unknown) {
      this.body = body;
    },
    setHeader(name: string, value: string) {
      this.headers[name] = value;
    },
  };
}
test("rejects invalid requests and never calls an upstream without consent", async () => {
  const original = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = async () => {
    calls += 1;
    throw new Error("Unexpected fetch");
  };
  try {
    for (const [req, code] of [
      [{ method: "GET" }, 405],
      [{ method: "POST", body: { text: "letter" } }, 400],
      [
        { method: "POST", body: { consent: true, text: "x".repeat(12001) } },
        400,
      ],
    ] as const) {
      const res = response();
      await handler(req, res);
      assert.equal(res.code, code);
      assert.equal(res.headers["Cache-Control"], "no-store");
    }
    assert.equal(calls, 0);
  } finally {
    globalThis.fetch = original;
  }
});
test("cloud is disabled unless explicitly enabled", async () => {
  const before = process.env.ENABLE_CLOUD_AI;
  delete process.env.ENABLE_CLOUD_AI;
  try {
    const res = response();
    await handler(
      { method: "POST", body: { text: "letter", consent: true } },
      res,
    );
    assert.equal(res.code, 503);
  } finally {
    if (before === undefined) delete process.env.ENABLE_CLOUD_AI;
    else process.env.ENABLE_CLOUD_AI = before;
  }
});
test("validates model output, masks input and preserves the original transcription", async () => {
  const before = {
    enabled: process.env.ENABLE_CLOUD_AI,
    key: process.env.GEMINI_API_KEY,
    fetch: globalThis.fetch,
  };
  process.env.ENABLE_CLOUD_AI = "true";
  process.env.GEMINI_API_KEY = "test-only-placeholder";
  let sent = "";
  try {
    globalThis.fetch = async (_url, init) => {
      sent = String(init?.body);
      return new Response(
        JSON.stringify({
          candidates: [
            {
              content: {
                parts: [
                  {
                    text: JSON.stringify({
                      ...localReading("Invented transcription"),
                      required_action: "order_card",
                    }),
                  },
                ],
              },
            },
          ],
        }),
      );
    };
    const res = response();
    await handler(
      {
        method: "POST",
        body: { consent: true, text: "PIN 4821. Library closes Friday." },
      },
      res,
    );
    assert.equal(res.code, 200);
    assert.ok(!sent.includes("4821"));
    assert.equal(
      res.body.letter.exact_text,
      "PIN [hidden]. Library closes Friday.",
    );
    assert.equal(res.body.letter.required_action, "none");
    globalThis.fetch = async () =>
      new Response(
        JSON.stringify({
          candidates: [{ content: { parts: [{ text: "null" }] } }],
        }),
      );
    const invalid = response();
    await handler(
      { method: "POST", body: { consent: true, text: "Letter" } },
      invalid,
    );
    assert.equal(invalid.code, 502);
  } finally {
    globalThis.fetch = before.fetch;
    for (const [name, value] of [
      ["ENABLE_CLOUD_AI", before.enabled],
      ["GEMINI_API_KEY", before.key],
    ]) {
      if (value === undefined) delete process.env[name!];
      else process.env[name!] = value;
    }
  }
});
