import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const HERE = dirname(fileURLToPath(import.meta.url));
const SOURCE = join(HERE, "..", "public", "icon.svg");
const OUT = join(HERE, "..", "public", "icons");

const SIZES = [192, 512];

async function main() {
  const svg = await readFile(SOURCE);

  await mkdir(OUT, { recursive: true });

  for (const size of SIZES) {
    const file = join(OUT, `penny-${size}.png`);
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
