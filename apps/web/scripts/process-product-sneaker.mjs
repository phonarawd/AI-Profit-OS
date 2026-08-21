/**
 * Fixture ProductMedia — 가장자리 연결된 검정만 제거.
 * 힐탭 등 제품 내부 검정은 유지. production owner를 바꾸지 않는다.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(path.join(here, "../../../tooling/verify/stack-lock.cjs"));
const { chromium } = require("@playwright/test");

const srcPath = path.join(here, "../public/spark-dash/product-sneaker-source.png");
const outPath = path.join(here, "../public/spark-dash/product-sneaker-hero.png");
const srcDataUrl = `data:image/png;base64,${fs.readFileSync(srcPath).toString("base64")}`;

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 800, height: 600 } });
const dataUrl = await page.evaluate(async (url) => {
  const img = new Image();
  img.src = url;
  await img.decode();
  const canvas = document.createElement("canvas");
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  ctx.drawImage(img, 0, 0);
  const image = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const { data, width, height } = image;
  const idx = (x, y) => (y * width + x) * 4;
  const isBg = (i) => data[i] < 30 && data[i + 1] < 30 && data[i + 2] < 30;
  const seen = new Uint8Array(width * height);
  const qx = [];
  const qy = [];
  const push = (x, y) => {
    if (x < 0 || y < 0 || x >= width || y >= height) return;
    const p = y * width + x;
    if (seen[p]) return;
    if (!isBg(idx(x, y))) return;
    seen[p] = 1;
    qx.push(x);
    qy.push(y);
  };
  for (let x = 0; x < width; x++) {
    push(x, 0);
    push(x, height - 1);
  }
  for (let y = 0; y < height; y++) {
    push(0, y);
    push(width - 1, y);
  }
  for (let n = 0; n < qx.length; n++) {
    const x = qx[n];
    const y = qy[n];
    push(x - 1, y);
    push(x + 1, y);
    push(x, y - 1);
    push(x, y + 1);
  }
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const p = y * width + x;
      const i = p * 4;
      if (seen[p]) {
        data[i + 3] = 0;
        continue;
      }
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      if (max - min > 8 && r > g && r > b) {
        data[i] = Math.min(255, Math.round(r * 0.92 + 18));
        data[i + 1] = Math.min(255, Math.round(g * 1.04 + 6));
        data[i + 2] = Math.min(255, Math.round(b * 1.04 + 6));
      }
    }
  }
  ctx.putImageData(image, 0, 0);
  return canvas.toDataURL("image/png");
}, srcDataUrl);
await browser.close();

const base64 = dataUrl.replace(/^data:image\/png;base64,/, "");
fs.writeFileSync(outPath, Buffer.from(base64, "base64"));
console.log(JSON.stringify({ outPath, bytes: fs.statSync(outPath).size }));
