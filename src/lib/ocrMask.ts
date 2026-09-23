import { createWorker } from "tesseract.js";
import type { Worker } from "tesseract.js";
import { toJpegBlob } from "./capture";
import { redactText } from "./reading";

let worker: Promise<Worker> | null = null;
export function startWorker(): Promise<Worker> {
  if (!worker)
    worker = createWorker("eng", 1, {
      workerPath: `${import.meta.env.BASE_URL}tesseract/worker.min.js`,
      corePath: `${import.meta.env.BASE_URL}tesseract`,
      langPath: `${import.meta.env.BASE_URL}tesseract`,
    }).catch((error) => {
      worker = null;
      throw error;
    });
  return worker;
}
export type MaskResult = {
  maskedBlob: Blob;
  maskedCount: number;
  text: string;
};

export async function maskImage(
  canvas: HTMLCanvasElement,
): Promise<MaskResult> {
  const pendingWorker = startWorker();
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const result = await Promise.race([
      pendingWorker.then((instance) =>
        instance.recognize(canvas, {}, { text: true, blocks: true }),
      ),
      new Promise<never>((_, reject) => {
        timer = setTimeout(
          () =>
            reject(
              new Error(
                "Reading timed out. Try a smaller, clearer photograph.",
              ),
            ),
          45_000,
        );
      }),
    ]);
    const context = canvas.getContext("2d");
    if (!context)
      throw new Error("Image processing is unavailable in this browser.");
    let maskedCount = 0;
    context.fillStyle = "#000000";
    for (const block of result.data.blocks ?? [])
      for (const paragraph of block.paragraphs)
        for (const line of paragraph.lines)
          for (const word of line.words) {
            if (
              /\d{4,}|\d{2}[- ]\d{2}[- ]\d{2}/.test(
                word.text.replace(/\s+/g, ""),
              )
            ) {
              const { x0, y0, x1, y1 } = word.bbox;
              context.fillRect(x0 - 4, y0 - 4, x1 - x0 + 8, y1 - y0 + 8);
              maskedCount += 1;
            }
          }
    return {
      maskedBlob: await toJpegBlob(canvas),
      maskedCount,
      text: redactText(result.data.text),
    };
  } catch (error) {
    // A failed worker must not poison future attempts or process subsequent requests.
    if (worker === pendingWorker) worker = null;
    void pendingWorker
      .then((instance) => instance.terminate())
      .catch(() => undefined);
    throw error;
  } finally {
    clearTimeout(timer);
  }
}
