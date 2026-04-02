import { createWriteStream } from "node:fs";
import { mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { PNG } from "pngjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const publicDir = join(__dirname, "..", "public");

function writeSolidPng(filename, size, r, g, b) {
  const png = new PNG({ width: size, height: size });
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (size * y + x) << 2;
      png.data[idx] = r;
      png.data[idx + 1] = g;
      png.data[idx + 2] = b;
      png.data[idx + 3] = 255;
    }
  }
  return new Promise((resolve, reject) => {
    png
      .pack()
      .pipe(createWriteStream(filename))
      .on("finish", resolve)
      .on("error", reject);
  });
}

await mkdir(publicDir, { recursive: true });
// Brand fill #1e3a5f
await writeSolidPng(join(publicDir, "pwa-192.png"), 192, 30, 58, 95);
await writeSolidPng(join(publicDir, "pwa-512.png"), 512, 30, 58, 95);
