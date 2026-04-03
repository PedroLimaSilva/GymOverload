import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { PNG } from "pngjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const publicDir = join(__dirname, "..", "public");
const sourcePath = join(__dirname, "app-icon-source.png");

/** Brand green #28cd41 (manifest / icon pipeline; UI accent may differ by platform) */
const BR = 0x28;
const BG = 0xcd;
const BB = 0x41;

/**
 * Bilinear resize from a decoded pngjs PNG to a new PNG buffer (written by caller).
 */
function resizePng(src, dstW, dstH) {
  const sw = src.width;
  const sh = src.height;
  const srcData = src.data;
  const dst = new PNG({ width: dstW, height: dstH });

  for (let y = 0; y < dstH; y++) {
    for (let x = 0; x < dstW; x++) {
      const sx = ((x + 0.5) * sw) / dstW - 0.5;
      const sy = ((y + 0.5) * sh) / dstH - 0.5;
      const x0 = Math.max(0, Math.min(sw - 1, Math.floor(sx)));
      const y0 = Math.max(0, Math.min(sh - 1, Math.floor(sy)));
      const x1 = Math.max(0, Math.min(sw - 1, x0 + 1));
      const y1 = Math.max(0, Math.min(sh - 1, y0 + 1));
      const fx = sx - x0;
      const fy = sy - y0;
      const di = (dstW * y + x) << 2;

      for (let c = 0; c < 4; c++) {
        const i00 = ((sh * y0 + x0) << 2) + c;
        const i10 = ((sh * y0 + x1) << 2) + c;
        const i01 = ((sh * y1 + x0) << 2) + c;
        const i11 = ((sh * y1 + x1) << 2) + c;
        const v00 = srcData[i00];
        const v10 = srcData[i10];
        const v01 = srcData[i01];
        const v11 = srcData[i11];
        const top = v00 * (1 - fx) + v10 * fx;
        const bot = v01 * (1 - fx) + v11 * fx;
        dst.data[di + c] = Math.round(top * (1 - fy) + bot * fy);
      }
    }
  }
  return dst;
}

/**
 * Brand green silhouette: fill #28cd41, alpha from luminance × source alpha (gray artwork → mask).
 */
function brandGreenSilhouette(src, size) {
  const r = resizePng(src, size, size);
  for (let i = 0; i < r.data.length; i += 4) {
    const sr = r.data[i];
    const sg = r.data[i + 1];
    const sb = r.data[i + 2];
    const sa = r.data[i + 3];
    const lum = (0.299 * sr + 0.587 * sg + 0.114 * sb) / 255;
    const outA = Math.min(255, Math.round(lum * sa));
    r.data[i] = BR;
    r.data[i + 1] = BG;
    r.data[i + 2] = BB;
    r.data[i + 3] = outA;
  }
  return r;
}

function writePng(path, png) {
  writeFileSync(path, PNG.sync.write(png));
}

const raw = readFileSync(sourcePath);
const source = PNG.sync.read(raw);

if (source.width !== source.height) {
  console.warn(
    "make-pwa-icons: source is not square; resizing uses full bitmap (may look stretched in maskable slots)."
  );
}

writePng(join(publicDir, "pwa-192.png"), resizePng(source, 192, 192));
writePng(join(publicDir, "pwa-512.png"), resizePng(source, 512, 512));
writePng(join(publicDir, "favicon-32-light.png"), brandGreenSilhouette(source, 32));
writePng(join(publicDir, "favicon-32-dark.png"), brandGreenSilhouette(source, 32));
writePng(join(publicDir, "apple-touch-icon.png"), brandGreenSilhouette(source, 180));
