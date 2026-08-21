/**
 * Founder-approved Spark Dash Desktop mockup → 1440×1080 comparison target.
 * stale Figma/current implementation reference-desktop.png 를 덮어쓰지 않는다.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(path.join(here, "../../../tooling/verify/stack-lock.cjs"));
const { chromium } = require("@playwright/test");

const srcPath = path.join(
  here,
  "../../../_tmp_spark_dash_refs/error-zip/ChatGPT Image 2026년 8월 18일 오후 05_46_17.png",
);
const outPath = path.join(here, "../../../_tmp_spark_dash_refs/founder-approved-desktop.png");
const srcDataUrl = `data:image/png;base64,${fs.readFileSync(srcPath).toString("base64")}`;

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1080 } });
const result = await page.evaluate(async (url) => {
  const img = new Image();
  img.src = url;
  await img.decode();
  const src = document.createElement("canvas");
  src.width = img.naturalWidth;
  src.height = img.naturalHeight;
  const sx = src.getContext("2d", { willReadFrequently: true });
  sx.drawImage(img, 0, 0);
  const { data, width, height } = sx.getImageData(0, 0, src.width, src.height);

  const colScore = new Array(width);
  for (let x = 0; x < width; x++) {
    let sum = 0;
    let prev = -1;
    let edges = 0;
    for (let y = 0; y < height; y += 2) {
      const i = (y * width + x) * 4;
      const lum = 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
      sum += lum;
      if (prev >= 0 && Math.abs(lum - prev) > 28) edges += 1;
      prev = lum;
    }
    colScore[x] = { avg: sum / (height / 2), edges };
  }

  let split = Math.round(width * 0.62);
  let best = -1;
  const midStart = Math.round(width * 0.48);
  const midEnd = Math.round(width * 0.78);
  for (let x = midStart; x < midEnd; x++) {
    const window = colScore.slice(x - 6, x + 7);
    const avgEdge = window.reduce((a, c) => a + c.edges, 0) / window.length;
    const avgLum = window.reduce((a, c) => a + c.avg, 0) / window.length;
    const score = (avgLum > 210 ? 8 : 0) + (40 - avgEdge);
    if (score > best) {
      best = score;
      split = x;
    }
  }

  const cropW = Math.max(720, split - 8);
  const cropH = height;
  const dest = document.createElement("canvas");
  dest.width = 1440;
  dest.height = 1080;
  const dx = dest.getContext("2d");
  dx.fillStyle = "#f6f7fb";
  dx.fillRect(0, 0, 1440, 1080);
  const scale = Math.min(1440 / cropW, 1080 / cropH);
  const dw = Math.round(cropW * scale);
  const dh = Math.round(cropH * scale);
  const ox = Math.round((1440 - dw) / 2);
  const oy = Math.round((1080 - dh) / 2);
  dx.drawImage(src, 0, 0, cropW, cropH, ox, oy, dw, dh);
  return {
    dataUrl: dest.toDataURL("image/png"),
    src: { width, height },
    split,
    cropW,
    cropH,
    placed: { ox, oy, dw, dh, scale },
  };
}, srcDataUrl);
await browser.close();

const base64 = result.dataUrl.replace(/^data:image\/png;base64,/, "");
fs.writeFileSync(outPath, Buffer.from(base64, "base64"));
console.log(JSON.stringify({ outPath, bytes: fs.statSync(outPath).size, meta: result }, null, 2));
