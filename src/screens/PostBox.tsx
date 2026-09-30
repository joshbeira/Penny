import { useEffect, useRef, useState } from "react";
import { speak, stopSpeaking } from "../lib/audio";
import { captureCanvas } from "../lib/capture";
import { maskImage } from "../lib/ocrMask";
import { localReading, parseReading } from "../lib/reading";
import type { Reading } from "../lib/reading";
import { downloadText } from "../lib/download";
import { Link, useSearchParams } from "react-router-dom";
import { useLibrary } from "../state/library";
import { useSettings } from "../state/settings";
import ReadingPreferences from "../components/ReadingPreferences";

type Mode = "summary" | "exact" | "explain";
let pickMode: ((mode: Mode) => void) | null = null;
export function setPostBoxMode(mode: Mode): boolean {
  if (!pickMode) return false;
  pickMode(mode);
  return true;
}
const BUTTON =
  "flex min-h-[48px] items-center justify-center rounded-full border border-amber px-5 py-2 text-body text-amber disabled:opacity-50";
const SAMPLE =
  "Oak Street Library\nDear reader,\nThe books you reserved are ready to collect. Please bring your library card to the front desk by Friday. We are open from nine in the morning until six in the evening.\nThank you,\nThe library team";
type Result = {
  letter: Reading;
  source: "device" | "sample" | "cloud" | "saved" | "reviewed";
  preview?: string;
  maskedCount?: number;
};

export default function PostBox() {
  const [params] = useSearchParams();
  const textSize = useSettings((state) => state.textSize);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Result | null>(() => {
    const saved = useLibrary
      .getState()
      .letters.find((letter) => letter.id === params.get("letter"));
    return saved
      ? { letter: localReading(saved.text, false), source: "saved" }
      : null;
  });
  const [draft, setDraft] = useState("");
  const [editing, setEditing] = useState(false);
  const [saveOpen, setSaveOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [mode, setMode] = useState<Mode>("exact");
  const [message, setMessage] = useState("");
  const [share, setShare] = useState(false);
  const preview = useRef<string | null>(null);
  const operation = useRef(0);
  const lock = useRef(false);
  useEffect(
    () => () => {
      operation.current += 1;
      if (preview.current) URL.revokeObjectURL(preview.current);
      stopSpeaking();
    },
    [],
  );

  function clear() {
    operation.current += 1;
    stopSpeaking();
    if (preview.current) URL.revokeObjectURL(preview.current);
    preview.current = null;
    setResult(null);
    setMessage("");
    setShare(false);
    setMode("exact");
    setEditing(false);
    setSaveOpen(false);
    setDraft("");
  }
  function useText(value: string) {
    try {
      const letter = localReading(value, false);
      clear();
      setResult({ letter, source: "reviewed" });
      setMessage(
        "Reviewed text ready. Saving or sharing will include the text exactly as shown.",
      );
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Could not read this text.",
      );
    }
  }
  async function onFile(file: File) {
    if (lock.current) return;
    clear();
    if (!file.type.startsWith("image/") || file.size > 15 * 1024 * 1024) {
      setMessage("Choose an image smaller than 15 MB. JPEG and PNG work best.");
      return;
    }
    const run = operation.current;
    lock.current = true;
    setBusy(true);
    try {
      const canvas = await captureCanvas(file);
      const masked = await maskImage(canvas);
      const letter = localReading(masked.text);
      if (run !== operation.current) return;
      preview.current = URL.createObjectURL(masked.maskedBlob);
      setResult({
        letter,
        source: "device",
        preview: preview.current,
        maskedCount: masked.maskedCount,
      });
      setMessage("Reading ready. Your photograph has stayed on this device.");
    } catch (error) {
      if (run === operation.current)
        setMessage(
          error instanceof Error
            ? error.message
            : "Could not read this image. Try another photograph.",
        );
    } finally {
      lock.current = false;
      if (run === operation.current) setBusy(false);
    }
  }
  function sample() {
    clear();
    setResult({ letter: localReading(SAMPLE), source: "sample" });
    setMessage("Sample letter loaded. You can now try reading aloud.");
  }
  async function summarise() {
    if (!result || !share || lock.current) return;
    const run = operation.current;
    lock.current = true;
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/read-letter", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ text: result.letter.exact_text, consent: true }),
        signal: AbortSignal.timeout(15_000),
      });
      if (!response.ok)
        throw new Error(
          "AI summaries are unavailable. Your on-device reading is still here.",
        );
      const data = await response.json();
      const letter = parseReading(data.letter);
      if (run !== operation.current) return;
      setResult({
        ...result,
        letter: { ...letter, exact_text: result.letter.exact_text },
        source: "cloud",
      });
      setMode("summary");
      setShare(false);
      setMessage(
        "AI summary ready. Check names, dates and amounts against the original.",
      );
    } catch (error) {
      if (run === operation.current)
        setMessage(
          error instanceof Error
            ? error.message
            : "AI summaries are unavailable. Your reading is still here.",
        );
    } finally {
      lock.current = false;
      if (run === operation.current) setBusy(false);
    }
  }
  function pick(next: Mode) {
    if (!result) return;
    if (next !== "exact" && result.source !== "cloud") {
      setMessage(
        "Use the optional AI summary below for a summary or explanation.",
      );
      return;
    }
    setMode(next);
    stopSpeaking();
    void speak({
      text:
        next === "exact"
          ? result.letter.exact_text
          : next === "summary"
            ? result.letter.summary_spoken
            : result.letter.explain_spoken,
    });
  }
  useEffect(() => {
    pickMode = result ? pick : null;
    return () => {
      pickMode = null;
    };
  });
  const text = result
    ? mode === "exact"
      ? result.letter.exact_text
      : mode === "summary"
        ? result.letter.summary_spoken
        : result.letter.explain_spoken
    : "";
  return (
    <div className="reader-stack">
      <p className="eyebrow">Your post, at your pace</p>
      <h2 className="reader-title">Make the small print speak.</h2>
      <p className="text-text-dim">
        Photograph a printed English letter, read the recognised text, or listen
        aloud. No account needed.
      </p>
      <label className={`upload-zone ${busy ? "opacity-50" : ""}`}>
        <span className="text-card">Photograph a letter</span>
        <span className="text-caption text-text-dim">
          Take a photo or choose an image · up to 15 MB
        </span>
        <input
          type="file"
          accept="image/*"
          capture="environment"
          aria-label="Photograph a letter"
          disabled={busy}
          className="sr-only"
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = "";
            if (file) void onFile(file);
          }}
        />
      </label>
      <button className={BUTTON} disabled={busy} onClick={sample}>
        Try a sample letter
      </button>
      {!result && (
        <details>
          <summary className="feedback-link">Paste or type a letter</summary>
          <label className="field-label">
            Letter text
            <textarea
              className="text-field"
              rows={6}
              maxLength={16000}
              value={draft}
              disabled={busy}
              onChange={(event) => setDraft(event.target.value)}
            />
          </label>
          <p className="my-3 text-caption text-text-dim">
            Pasted text is kept as entered. Review personal details before
            sharing.
          </p>
          <button
            className={BUTTON}
            disabled={busy || !draft.trim()}
            onClick={() => useText(draft)}
          >
            Use this text
          </button>
        </details>
      )}
      <p className="text-caption text-text-dim">
        Photos stay in this tab. Number masking is imperfect and may hide dates
        too. Check the text before relying on it.
      </p>
      <p role="status" aria-label="Reading status" aria-live="polite">
        {busy ? "Reading… this can take a moment on your device." : message}
      </p>
      {result && (
        <section className="reader-result" aria-label="Letter reading">
          <p className="eyebrow">
            {result.source === "sample"
              ? "Sample letter"
              : result.source === "cloud"
                ? "AI-assisted reading"
                : result.source === "saved"
                  ? "Saved on this device"
                  : result.source === "reviewed"
                    ? "Reviewed text"
                    : "Read on your device"}
          </p>
          <h2 className="text-card">{result.letter.sender}</h2>
          {result.preview && (
            <img
              src={result.preview}
              alt="Letter preview with detected number sequences masked"
              className="mt-4 max-h-[180px] w-full rounded-2xl object-contain"
            />
          )}
          {result.maskedCount !== undefined && (
            <p className="mt-2 text-caption text-text-dim">
              {result.maskedCount} number regions hidden in the preview. Other
              personal details may remain.
            </p>
          )}
          {result.source === "cloud" && (
            <div
              role="group"
              aria-label="Reading mode"
              className="mt-4 flex flex-wrap gap-2"
            >
              {(
                [
                  ["exact", "Text"],
                  ["summary", "Summary"],
                  ["explain", "Explain"],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  className={BUTTON}
                  aria-pressed={mode === value}
                  onClick={() => pick(value)}
                >
                  {label}
                </button>
              ))}
            </div>
          )}
          <ReadingPreferences />
          <p className="letter-text" style={{ fontSize: `${textSize}px` }}>
            {text}
          </p>
          {editing && (
            <div className="reader-stack mb-5">
              <label className="field-label">
                Correct the recognised text
                <textarea
                  className="text-field"
                  rows={8}
                  maxLength={16000}
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  style={{ fontSize: `${textSize}px` }}
                />
              </label>
              <p className="text-caption text-text-dim">
                Changes replace this reading and remove any previous AI summary.
                Saved copies remain unchanged.
              </p>
              <button
                className={BUTTON}
                disabled={!draft.trim()}
                onClick={() => useText(draft)}
              >
                Apply corrections
              </button>
              <button className={BUTTON} onClick={() => setEditing(false)}>
                Cancel editing
              </button>
            </div>
          )}
          {result.letter.required_action === "scam_alert" && (
            <p className="text-danger">
              Possible scam indicators. Penny has not reported this letter or
              verified its sender.
            </p>
          )}
          <div className="flex flex-wrap gap-3">
            <button className={BUTTON} onClick={() => pick(mode)}>
              Read aloud
            </button>
            <button className={BUTTON} onClick={stopSpeaking}>
              Stop reading
            </button>
            <button
              className={BUTTON}
              onClick={() => downloadText("penny-letter.txt", text)}
            >
              Download text
            </button>
            <button className={BUTTON} disabled={busy} onClick={clear}>
              Clear letter
            </button>
            <button
              className={BUTTON}
              disabled={busy}
              onClick={() => {
                stopSpeaking();
                setDraft(result.letter.exact_text);
                setEditing(true);
              }}
            >
              Correct text
            </button>
            <button
              className={BUTTON}
              disabled={busy}
              onClick={() => {
                setTitle(result.letter.exact_text.split("\n")[0].slice(0, 100));
                setSaveOpen(true);
              }}
            >
              Save to library
            </button>
          </div>
          {saveOpen && (
            <form
              className="reader-stack mt-6"
              onSubmit={(event) => {
                event.preventDefault();
                try {
                  useLibrary.getState().save(title, result.letter.exact_text);
                  setSaveOpen(false);
                  setMessage(
                    "Saved to your device library. No photo was saved.",
                  );
                } catch (error) {
                  setMessage(
                    error instanceof Error
                      ? error.message
                      : "Could not save this letter.",
                  );
                }
              }}
            >
              <label className="field-label">
                Letter title
                <input
                  className="text-field"
                  maxLength={100}
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                />
              </label>
              <p className="text-caption text-text-dim">
                Save the reviewed text in this browser. Anyone with access to
                this browser profile can read it. Photos and AI summaries are
                not saved.
              </p>
              <button className={BUTTON} type="submit">
                Save letter on this device
              </button>
              <button
                className={BUTTON}
                type="button"
                onClick={() => setSaveOpen(false)}
              >
                Cancel saving
              </button>
            </form>
          )}
          <Link className="feedback-link mt-4" to="/library">
            Open your library
          </Link>
          {result.source !== "cloud" &&
            import.meta.env.VITE_DISABLE_CLOUD_AI !== "true" && (
              <details className="mt-6">
                <summary className="min-h-[48px] cursor-pointer text-amber">
                  Optional AI summary
                </summary>
                <p className="mt-2 text-caption text-text-dim">
                  This sends the recognised text shown above to Google Gemini
                  through Penny’s server. Names, addresses and other personal
                  details may remain. Your photograph is not sent. AI can make
                  mistakes.
                </p>
                <label className="mt-3 flex min-h-[48px] items-center gap-3">
                  <input
                    type="checkbox"
                    checked={share}
                    onChange={(event) => setShare(event.target.checked)}
                  />
                  Send this text for an AI summary
                </label>
                <button
                  className={BUTTON}
                  disabled={!share || busy}
                  onClick={() => void summarise()}
                >
                  Create AI summary
                </button>
              </details>
            )}
        </section>
      )}
    </div>
  );
}
