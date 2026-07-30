// SPEC 11.1 step 1: createImageBitmap → canvas, long edge ≤1600px → JPEG
// quality 0.8. The encoder lives here rather than in ocrMask.ts so step 1's
// quality stays with step 1 — ocrMask.ts calls toJpegBlob() once it has drawn
// its boxes, and what it returns is what SPEC 11.1 step 3 base64-encodes.

const MAX_EDGE = 1600;
const JPEG_QUALITY = 0.8;

export async function captureCanvas(file: Blob): Promise<HTMLCanvasElement> {
  const bitmap = await createImageBitmap(file);
  try {
    // Only ever downscales: a photo already under the cap is left alone.
    const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);

    const context = canvas.getContext("2d");
    if (!context) throw new Error("No 2D context");
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);

    return canvas;
  } finally {
    bitmap.close();
  }
}

export function toJpegBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Canvas encode failed"))),
      "image/jpeg",
      JPEG_QUALITY,
    );
  });
}

// SPEC 11.1 step 3: "base64 of the masked blob, no `data:` prefix".
export function toBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener("load", () => {
      const result = String(reader.result);
      const comma = result.indexOf(",");
      resolve(comma === -1 ? result : result.slice(comma + 1));
    });
    reader.addEventListener("error", () => reject(reader.error ?? new Error("Read failed")));
    reader.readAsDataURL(blob);
  });
}
