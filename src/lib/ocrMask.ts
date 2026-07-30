import { createWorker } from "tesseract.js";
import type { Bbox, Worker } from "tesseract.js";
import { toJpegBlob } from "./capture";

// SPEC 11.1 step 2 — masking, and it runs ALWAYS BEFORE ANY NETWORK. That
// ordering is the product claim (SPEC 12.3 D: "Proves the on-device privacy
// claim"), not an implementation detail: PostBox.tsx awaits maskImage() before
// it even reads the armed letter, so there is no branch in which a photograph
// leaves the device unmasked.

// tesseract.js 5.1.1 fetches all three of its runtime assets from jsdelivr by
// default (worker/browser/defaultOptions.js, worker-script/browser/getCore.js,
// worker-script/index.js). SPEC 12.3 D runs in airplane mode and states
// "tesseract is bundled", so all three are served from our own origin out of
// public/tesseract/.
//
// They stay in public/ rather than being ?url-imported: Vite would hash the
// filenames, and corePath must address a *directory* — getCore() appends
// tesseract-core-simd-lstm.wasm.js or tesseract-core-lstm.wasm.js itself after
// feature-detecting SIMD, so both are shipped. Those .wasm.js files embed their
// binary as base64, so no separate .wasm is needed. langPath gets
// /eng.traineddata.gz appended (gzip defaults true).
//
// resolvePaths() makes these absolute against window.location.href, which is
// required: the worker is spawned from a Blob URL with no useful base.
const OPTIONS = {
  workerPath: "/tesseract/worker.min.js",
  corePath: "/tesseract",
  langPath: "/tesseract",
};

// SPEC 11.1 step 2's own values.
const TIMEOUT_MS = 10_000;
const PADDING = 4;

// "every word whose text (spaces stripped) matches /\d{4,}/ or
// /^\d{2}-\d{2}-\d{2}$/" — card numbers and account numbers, then sort codes.
const RUN_OF_DIGITS = /\d{4,}/;
const SORT_CODE = /^\d{2}-\d{2}-\d{2}$/;

// ---------------------------------------------------------------------------
// The worker
// ---------------------------------------------------------------------------

let worker: Promise<Worker> | null = null;

// SPEC 11.1 step 2: "a tesseract.js `eng` worker is created when Post Box
// mounts (show nothing; first use may take seconds — the *masking* state covers
// it)". Idempotent, and deliberately never terminated: SPEC 11.1 fixes creation
// and says nothing about teardown, and tearing down on tab-change would
// re-instantiate ~8 MB of wasm every time the user returns to Post Box.
//
// oem 1 is LSTM_ONLY, which is what selects the -lstm core files above.
export function startWorker(): Promise<Worker> {
  if (!worker) {
    worker = createWorker("eng", 1, OPTIONS).catch((error) => {
      // Don't cache a rejected promise: a failed load (offline first run, say)
      // would otherwise poison every later attempt in this session.
      worker = null;
      throw error;
    });
  }
  return worker;
}

// ---------------------------------------------------------------------------
// Masking
// ---------------------------------------------------------------------------

// SPEC 11.1 step 2 outputs `{ maskedBlob, maskedCount }`. maskedCount is
// nullable because SPEC 10's chip has to distinguish "0 items hidden on device"
// from "Masking unavailable"; null carries the second state without adding a
// field to the specified shape.
export type MaskResult = { maskedBlob: Blob; maskedCount: number | null };

export async function maskImage(canvas: HTMLCanvasElement): Promise<MaskResult> {
  let boxes: Bbox[] | null;
  try {
    boxes = await withTimeout(findSensitiveBoxes(canvas));
  } catch {
    // SPEC 11.1 step 2 names only the 10s timeout, but a worker that fails to
    // load means exactly the same thing to the user, and "Masking unavailable"
    // is already SPEC 10's chip for it.
    boxes = null;
  }

  // Recognition is kept separate from drawing so this is the only place the
  // canvas is written, synchronously, after the race has settled. A recognise
  // call that finishes late therefore cannot paint over an image already
  // encoded and shipped.
  if (boxes) draw(canvas, boxes);

  return { maskedBlob: await toJpegBlob(canvas), maskedCount: boxes ? boxes.length : null };
}

async function findSensitiveBoxes(canvas: HTMLCanvasElement): Promise<Bbox[]> {
  const instance = await startWorker();

  // v5's `output` defaults to { text: true } and returns no word boxes at all;
  // blocks is what carries them, down blocks → paragraphs → lines → words.
  const { data } = await instance.recognize(canvas, {}, { text: false, blocks: true });

  const boxes: Bbox[] = [];
  for (const block of data.blocks ?? []) {
    for (const paragraph of block.paragraphs) {
      for (const line of paragraph.lines) {
        for (const word of line.words) {
          if (isSensitive(word.text)) boxes.push(word.bbox);
        }
      }
    }
  }
  return boxes;
}

function isSensitive(text: string): boolean {
  const stripped = text.replace(/\s+/g, "");
  return RUN_OF_DIGITS.test(stripped) || SORT_CODE.test(stripped);
}

// SPEC 11.1 step 2: "fillRect a black box over its bbox padded 4px".
function draw(canvas: HTMLCanvasElement, boxes: Bbox[]): void {
  const context = canvas.getContext("2d");
  if (!context) return;

  context.fillStyle = "#000000";
  for (const box of boxes) {
    context.fillRect(
      box.x0 - PADDING,
      box.y0 - PADDING,
      box.x1 - box.x0 + PADDING * 2,
      box.y1 - box.y0 + PADDING * 2,
    );
  }
}

function withTimeout<T>(promise: Promise<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(
      () => reject(new Error(`Masking exceeded ${TIMEOUT_MS}ms`)),
      TIMEOUT_MS,
    );
    promise.then(resolve, reject).finally(() => window.clearTimeout(timer));
  });
}
