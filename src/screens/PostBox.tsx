import { useEffect, useRef, useState } from "react";
import { requestOrderCard } from "../components/ConfirmSheet";
import { SCENARIOS } from "../data/letters";
import type { Letter } from "../data/letters";
import type { FixedLineId } from "../data/voiceLines";
import { speak } from "../lib/audio";
import { captureCanvas, toBase64 } from "../lib/capture";
import { haptic } from "../lib/haptics";
import { maskImage, startWorker } from "../lib/ocrMask";
import { useDirector } from "../state/director";
import { useReceipts } from "../state/receipts";

// SPEC 10's Post Box and SPEC 11.1's pipeline. Element order is the Layout Lock
// baseline (SPEC 16) — never reorder.
//
// SPEC 3 has no module for the pipeline itself, so the orchestration lives here
// in the screen; capture.ts and ocrMask.ts own their steps.

// A letter as the UI consumes it. SPEC 5.3's `key` is a fixture identifier —
// SPEC 13.1's seven keys do not include it, so a live API letter has none.
type Reading = Omit<Letter, "key">;

// SPEC 11.1 step 6: "fixtures use their fixed audio ids; live API letters use
// runtime TTS". SPEC 5.3 marks which summary_spoken values are recorded lines.
//
// scam maps to `scam_filed` rather than to its own summary_spoken: SPEC 5.3
// calls that string "superseded in the UI by the fixed scam_filed line" and
// SPEC 11.4 says the line "replaces the summary". So scam_filed IS this
// letter's summary — both the first reading and every Summary replay from the
// mode switch — and SCENARIOS.scam.summary_spoken is never spoken anywhere.
const SUMMARY_LINE: Record<Letter["key"], FixedLineId> = {
  card: "summary_card",
  nhs: "summary_nhs",
  pin: "pin_privacy",
  scam: "scam_filed",
};

// SPEC 11.1 step 3.
const READ_TIMEOUT_MS = 8_000;

type Mode = "summary" | "exact" | "explain";

// SPEC 10: "segmented mode switch Summary | Exact | Explain (fixed order)".
const MODES: { value: Mode; label: string }[] = [
  { value: "summary", label: "Summary" },
  { value: "exact", label: "Exact" },
  { value: "explain", label: "Explain" },
];

// SPEC 11.7's `mode_summary` / `mode_exact` / `mode_explain`: "Switches reading
// mode and replays that text." A module-level registry, like Journey's era and
// P6's sheet registry — voice needs a handle on a screen it is not rendering,
// and SPEC 3's tree has no module for one.
//
// It registers pick(), not setMode(), so voice takes the identical path SPEC
// 10's segmented control takes: switch AND replay, one implementation.
// Registration is gated on there being a letter on screen, so false means
// "nothing to read yet" and lib/voiceInput.ts offers instead of switching an
// invisible control.
let pickMode: ((mode: Mode) => void) | null = null;

export function setPostBoxMode(mode: Mode): boolean {
  if (!pickMode) return false;
  pickMode(mode);
  return true;
}

type Result = {
  letter: Reading;
  summaryId: FixedLineId | null;
  preview: string;
  maskedCount: number | null;
};

export default function PostBox() {
  const [status, setStatus] = useState<"idle" | "masking" | "result">("idle");
  const [result, setResult] = useState<Result | null>(null);
  const [mode, setMode] = useState<Mode>("summary");
  const preview = useRef<string | null>(null);

  // SPEC 11.1 step 2: "a tesseract.js `eng` worker is created when Post Box
  // mounts (show nothing; first use may take seconds — the *masking* state
  // covers it)". Failures are swallowed here for exactly that reason —
  // maskImage() falls back to the "Masking unavailable" chip on its own.
  useEffect(() => {
    void startWorker().catch(() => undefined);
  }, []);

  useEffect(
    () => () => {
      if (preview.current) URL.revokeObjectURL(preview.current);
    },
    [],
  );

  async function onFile(file: File) {
    setStatus("masking");
    setResult(null);
    setMode("summary");

    // SPEC 11.1 step 1, then step 2 — and step 2 is unconditional. Masking
    // completes before the armed letter is even read, so no branch below can
    // reach the network with an unmasked image. This ordering is the privacy
    // claim; it must not be reordered or made conditional.
    const canvas = await captureCanvas(file);
    const { maskedBlob, maskedCount } = await maskImage(canvas);

    const { letter, summaryId } = await read(maskedBlob);

    if (preview.current) URL.revokeObjectURL(preview.current);
    preview.current = URL.createObjectURL(maskedBlob);

    setResult({ letter, summaryId, preview: preview.current, maskedCount });
    setStatus("result");

    await announce(letter, summaryId);
  }

  // SPEC 11.1 steps 3 and 4.
  async function read(maskedBlob: Blob): Promise<{ letter: Reading; summaryId: FixedLineId | null }> {
    const armed = useDirector.getState().armedLetter;

    // Step 3: "if director.armedLetter !== 'live' → use that fixture, skip
    // network." Nothing is encoded and no request is made on this path — which
    // is what makes SPEC 12.3 scenario D work with the radios off.
    if (armed !== "live") {
      // SPEC CONTRADICTION, resolved with the user.
      //   SPEC 12.3 D and SPEC 17 P3 both require `read_fallback` in scenario D
      //   (armed "PIN", airplane mode), but step 3 above skips the network, so
      //   step 4's failure branch — the only thing that plays the line — can
      //   never run on an armed path.
      //   The only reading that satisfies SPEC 12.3 A, SPEC 12.3 D and P3's
      //   acceptance criterion together is that the difference between A and D
      //   is the one the spec itself states: A is labelled "online", D is
      //   labelled "Airplane mode". So the line is gated on connectivity, not
      //   on the arming. Still no request is made.
      if (!navigator.onLine) await speak({ id: "read_fallback" });
      return { letter: SCENARIOS[armed], summaryId: SUMMARY_LINE[armed] };
    }

    try {
      return { letter: await readLive(maskedBlob), summaryId: null };
    } catch {
      // Step 4: "Any failure (abort, non-200, invalid JSON) → play
      // read_fallback, then use fixture SCENARIOS[...]". The spec's own
      // expression is `armedLetter !== "live" ? armedLetter : "card"`, but this
      // branch is only reachable when armed IS "live", so it reduces to "card".
      await speak({ id: "read_fallback" });
      return { letter: SCENARIOS.card, summaryId: SUMMARY_LINE.card };
    }
  }

  async function readLive(maskedBlob: Blob): Promise<Reading> {
    // SPEC 11.1 step 3: base64 of the MASKED blob, no `data:` prefix.
    const imageBase64 = await toBase64(maskedBlob);

    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), READ_TIMEOUT_MS);
    try {
      const response = await fetch("/api/read-letter", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ imageBase64, mediaType: "image/jpeg" }),
        signal: controller.signal,
      });
      if (!response.ok) throw new Error(`/api/read-letter responded ${response.status}`);

      // Throws on invalid JSON, which step 4 lists alongside abort and non-200.
      const data = (await response.json()) as { ok?: boolean; letter?: Record<string, unknown> };
      if (!data.ok || !data.letter) throw new Error("/api/read-letter returned no letter");

      return normalise(data.letter);
    } finally {
      window.clearTimeout(timer);
    }
  }

  // SPEC 11.1 steps 5 to 7 and 9, in order.
  async function announce(letter: Reading, summaryId: FixedLineId | null) {
    // Step 9 hands scam_alert to SPEC 11.4: "haptic("alert") → result card
    // tinted --danger at 12% opacity with a danger "Suspected scam" tag → play
    // scam_filed (replaces the summary) → silently addReceipt(...) → card
    // footer text "Receipt saved". No done_receipt line (the scam line already
    // said "filed")."
    //
    // The tint and the tag are rendered below off required_action; the tag
    // needs no new element because SPEC 5.3 already gives this fixture
    // letter_type "Suspected scam", which SPEC 10 already places.
    //
    // The speech is not awaited before the write: the receipt is silent and
    // invisible, so making it wait ~3s for the line to finish would buy
    // nothing, and the order the user perceives is still SPEC 11.4's.
    if (letter.required_action === "scam_alert") {
      haptic("alert");
      void speak({ id: "scam_filed" });
      await useReceipts.getState().addReceipt({
        action: "Scam letter filed",
        details: "Prize-draw pattern · 214 reports this month",
        method: "auto",
      });
      return;
    }

    if (letter.sensitive_content) {
      // Step 5: "play pin_privacy first (for the pin fixture this IS the
      // summary; do not speak a second summary)". A live sensitive letter has
      // no fixed id, so its own summary still follows.
      await speak({ id: "pin_privacy" });
      if (summaryId !== "pin_privacy") await speak({ text: letter.summary_spoken });
    } else {
      await speak(summaryId ? { id: summaryId } : { text: letter.summary_spoken });
    }

    // Step 7: "after summary, play offer_card; show the action button".
    if (letter.required_action === "order_card") await speak({ id: "offer_card" });
  }

  // SPEC 10: "switching modes speaks that mode's text". SPEC 11.1 step 6 fixes
  // which text: Summary keeps its recorded line where there is one, Exact and
  // Explain always go through runtime TTS (and so through speechSynthesis
  // whenever /api/tts is unavailable).
  function pick(next: Mode) {
    setMode(next);
    if (!result) return;
    const { letter, summaryId } = result;

    if (next === "exact") void speak({ text: letter.exact_text });
    else if (next === "explain") void speak({ text: letter.explain_spoken });
    else void speak(summaryId ? { id: summaryId } : { text: letter.summary_spoken });
  }

  // SPEC 11.7 makes `mode_*` reach the same pick() the segmented control calls.
  // Registered only while a result is on screen: with no letter there is nothing
  // to switch, and voiceInput.ts turns that into the contextual offer.
  useEffect(() => {
    if (!result) return undefined;
    pickMode = pick;
    return () => {
      pickMode = null;
    };
  });

  // SPEC 11.4's danger treatment. SPEC 4 reserves --danger for scam and tamper
  // and nothing else.
  const scam = result?.letter.required_action === "scam_alert";

  return (
    <>
      {/* SPEC 10: a styled <label> wrapping an sr-only file input, so the
          control has a real accessible name (SPEC 15).

          SPEC 11.7's camera constraint reshapes it in the IDLE state only: "the
          entire main region becomes the <label> for the file input
          (min-height 60vh), with the 56px button retained visually inside it.
          Nothing on that screen is a small target the customer has to locate."
          The reason is a browser rule, not a preference — a speech-recognition
          result is not a user-activation gesture, so `go_postbox` can only
          navigate and say "Tap anywhere to photograph a letter". That sentence
          has to be true of the whole screen.

          Three consequences, all deliberate:
          - the 56px pill is now a <span>, not a <button>. A real button nested
            in a label is invalid and would swallow the label's own click.
          - the idle hint is a <span class="block">, not a <p>. A label's content
            model is phrasing content; a <p> inside one is invalid HTML.
          - the input carries an explicit aria-label. Without it the accessible
            name would absorb the hint text and become "Photograph a letter Point
            at any letter — bank or not", which is not SPEC 10's name.

          Masking and result states keep the plain 56px pill. SPEC 10's element
          order is unchanged throughout — only the nesting moves, which is one of
          the two changes P8 migrates the Layout Lock baseline for. */}
      <label
        className={
          status === "idle"
            ? "flex min-h-[60vh] w-full cursor-pointer flex-col items-center justify-center gap-4 rounded-2xl border border-hairline"
            : "flex min-h-[56px] w-full cursor-pointer items-center justify-center rounded-full bg-amber px-6 text-body text-bg"
        }
      >
        {status === "idle" ? (
          <>
            <span className="flex min-h-[56px] items-center justify-center rounded-full bg-amber px-6 text-body text-bg">
              Photograph a letter
            </span>
            <span className="block text-caption text-text-dim">
              Point at any letter — bank or not.
            </span>
          </>
        ) : (
          "Photograph a letter"
        )}
        <input
          type="file"
          accept="image/*"
          capture="environment"
          aria-label="Photograph a letter"
          className="sr-only"
          onChange={(event) => {
            const file = event.target.files?.[0];
            // Cleared so photographing the same file twice still fires change.
            event.target.value = "";
            if (file) void onFile(file);
          }}
        />
      </label>

      {status === "masking" && (
        <div className="mt-4">
          <p className="text-body">Reading privately on your phone…</p>
          {/* Indeterminate; aria-hidden so the line above is the only
              announcement. */}
          <div aria-hidden="true" className="mt-2 h-[4px] overflow-hidden rounded-full bg-surface">
            <div className="h-full w-1/3 rounded-full bg-amber masking-bar" />
          </div>
        </div>
      )}

      {status === "result" && result && (
        <section className={`mt-4 rounded-2xl p-4 ${scam ? "bg-danger/12" : "bg-surface"}`}>
          <h2 className="text-card">{result.letter.sender}</h2>
          {/* SPEC 11.4's "danger 'Suspected scam' tag" is this tag restyled,
              not a new element: SPEC 5.3 already gives the scam fixture
              letter_type "Suspected scam". */}
          <p className={`mt-1 text-caption ${scam ? "text-danger" : "text-text-dim"}`}>
            {result.letter.letter_type}
          </p>

          <img
            src={result.preview}
            alt="Masked photograph of the letter"
            className="mt-3 max-h-[180px] w-full rounded-2xl object-contain"
          />
          <p className="mt-2 text-caption text-text-dim">
            {result.maskedCount === null
              ? "Masking unavailable"
              : `${result.maskedCount} items hidden on device`}
          </p>

          <div role="group" aria-label="Reading mode" className="mt-4 flex gap-2">
            {MODES.map((option) => (
              <button
                key={option.value}
                type="button"
                aria-pressed={mode === option.value}
                onClick={() => pick(option.value)}
                className={`flex min-h-[48px] flex-1 items-center justify-center rounded-full border text-body ${
                  mode === option.value
                    ? "border-amber bg-amber text-bg"
                    : "border-hairline text-text"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>

          {/* SPEC 10: the action row exists only for order_card. The flow it
              raises moved to components/ConfirmSheet.tsx in P8, because SPEC
              11.7 also reaches it globally by voice — this button and
              "order my card" now call the identical function. */}
          {result.letter.required_action === "order_card" && (
            <button
              type="button"
              onClick={requestOrderCard}
              className="mt-4 flex min-h-[56px] w-full items-center justify-center rounded-full bg-amber px-6 text-body text-bg"
            >
              Order replacement card
            </button>
          )}

          {/* SPEC 11.4's "card footer text 'Receipt saved'". It stands in for
              the `done_receipt` line the scam flow deliberately does not
              speak — scam_filed already said "I've filed it for you". */}
          {scam && <p className="mt-4 text-caption text-text-dim">Receipt saved</p>}
        </section>
      )}
    </>
  );
}

// SPEC 13.1 validates all five required_action values server-side; SPEC 19 has
// no form-fill flow and SPEC 10 gives a UI only to order_card and scam_alert,
// so "map confirm_address/form_fill to none client-side" happens here.
function normalise(letter: Record<string, unknown>): Reading {
  const action = letter.required_action;
  return {
    sender: String(letter.sender),
    letter_type: String(letter.letter_type),
    summary_spoken: String(letter.summary_spoken),
    explain_spoken: String(letter.explain_spoken),
    required_action: action === "order_card" || action === "scam_alert" ? action : "none",
    sensitive_content: Boolean(letter.sensitive_content),
    exact_text: String(letter.exact_text),
  };
}
