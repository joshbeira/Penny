// SPEC 11.6's recogniser. Kept to the four settings the spec pins and nothing
// else — the intent matching lives next door in intents.ts, so this module is
// only the browser API.

// The constructor is prefixed in Chrome, which is the target (SPEC 0: Android
// Chrome). Typed locally because lib.dom.d.ts does not ship SpeechRecognition,
// and SPEC 2 admits no @types package for it.
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
  // SPEC 11.6's order: "SpeechRecognition || webkitSpeechRecognition".
  return w.SpeechRecognition ?? w.webkitSpeechRecognition;
}

// SPEC 10: the mic button is "rendered only if speech recognition is supported".
export function speechRecognitionSupported(): boolean {
  return ctor() !== undefined;
}

// Starts one utterance and resolves through the callbacks. Returns a stop
// handle so the button can toggle (SPEC 11.6: "tap toggles listening").
//
// `continuous: false` means the browser ends the session by itself after a
// single result, so onEnd fires on every path — result, silence, or error — and
// is what clears the button's listening state.
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

  const recognition = new Ctor();
  recognition.lang = "en-GB";
  recognition.continuous = false;
  recognition.interimResults = false;

  recognition.onresult = (event) => onResult(event.results[0][0].transcript);
  recognition.onend = onEnd;
  recognition.onerror = onEnd;

  recognition.start();
  return () => recognition.stop();
}
