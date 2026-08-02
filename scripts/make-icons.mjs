import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

// SPEC 14: "uses sharp to rasterise public/icon.svg to public/icons/penny-192.png
// and penny-512.png". Those two files are what SPEC 14's manifest points at, and
// vite-plugin-pwa's includeManifestIcons precaches them — so they are committed
// rather than generated at build time. This script exists to regenerate them
// from the one source of truth if icon.svg ever changes.
//
// SPEC 2 lists sharp as a dev-only dependency, and it is used exactly here.

const HERE = dirname(fileURLToPath(import.meta.url));
const SOURCE = join(HERE, "..", "public", "icon.svg");
const OUT = join(HERE, "..", "public", "icons");

const SIZES = [192, 512];

async function main() {
  // Read as a Buffer rather than handing sharp the path: the SVG carries a
  // <text> element, and sharp resolves it through librsvg either way, but a
  // Buffer keeps the density argument below meaningful.
  const svg = await readFile(SOURCE);

  await mkdir(OUT, { recursive: true });

  for (const size of SIZES) {
    const file = join(OUT, `penny-${size}.png`);

    // icon.svg has a 512-unit viewBox, so rendering at the target size directly
    // rasterises the circle and the "P" at full resolution instead of scaling a
    // 512px bitmap down — the 192 is the one Android actually shows on the home
    // screen (SPEC 18: installed from the deployment URL).
    const png = await sharp(svg, { density: (72 * size) / 512 })
      .resize(size, size)
      .png()
      .toBuffer();

    await writeFile(file, png);
    console.log(`  write penny-${size}.png (${png.length} bytes)`);
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
