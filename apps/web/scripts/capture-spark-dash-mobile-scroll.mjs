import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(path.join(here, "../../../tooling/verify/stack-lock.cjs"));
const { chromium } = require("@playwright/test");
const outDir = path.join(here, "../../../_tmp_spark_dash_refs");
const url = process.env.SD_MOBILE_URL ?? "http://127.0.0.1:3000/dev/spark-dash-mobile";
const desktopUrl = process.env.SD_URL ?? "http://127.0.0.1:3000/dev/spark-dash-desktop";

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
const failed = [];
page.on("response", (res) => {
  if (res.status() >= 400) failed.push(`${res.status()} ${res.url()}`);
});
await page.goto(url, { waitUntil: "domcontentloaded", timeout: 90000 });
await page.waitForSelector(".sdm-root");
await page.addStyleTag({
  content: "nextjs-portal, [data-next-mark-loading], #__next-build-watcher { display: none !important; }",
});
await page.waitForTimeout(500);

const scroll = page.locator(".sdm-scroll");
await scroll.evaluate((el) => {
  el.scrollTop = 420;
});
await page.waitForTimeout(200);
await page.screenshot({ path: path.join(outDir, "final-mobile-scroll-wallet.png"), fullPage: false });

await scroll.evaluate((el) => {
  el.scrollTop = 820;
});
await page.waitForTimeout(200);
await page.screenshot({ path: path.join(outDir, "final-mobile-scroll-ai.png"), fullPage: false });

await scroll.evaluate((el) => {
  el.scrollTop = el.scrollHeight;
});
await page.waitForTimeout(200);
await page.screenshot({ path: path.join(outDir, "final-mobile-scroll-popular.png"), fullPage: false });

const desktop = await browser.newPage({ viewport: { width: 1440, height: 1080 }, deviceScaleFactor: 1 });
await desktop.goto(desktopUrl, { waitUntil: "domcontentloaded", timeout: 90000 });
await desktop.waitForSelector(".sd-root");
await desktop.addStyleTag({
  content: "nextjs-portal, [data-next-mark-loading], #__next-build-watcher { display: none !important; }",
});
await desktop.waitForTimeout(400);
const now = await desktop.screenshot({ type: "png" });
const approvedPath = path.join(outDir, "founder-approved-desktop.png");
const approved = fs.readFileSync(approvedPath);
const sameBytes = Buffer.compare(now, approved) === 0;

const overlayPage = await browser.newPage({ viewport: { width: 1440, height: 1080 } });
const refUrl = `data:image/png;base64,${approved.toString("base64")}`;
const finUrl = `data:image/png;base64,${now.toString("base64")}`;
const diff = await overlayPage.evaluate(
  async ({ r, f }) => {
    const load = (src) =>
      new Promise((res, rej) => {
        const img = new Image();
        img.onload = () => res(img);
        img.onerror = rej;
        img.src = src;
      });
    const [a, b] = await Promise.all([load(r), load(f)]);
    const c = document.createElement("canvas");
    c.width = 1440;
    c.height = 1080;
    const x = c.getContext("2d");
    x.drawImage(a, 0, 0);
    const da = x.getImageData(0, 0, 1440, 1080).data;
    x.drawImage(b, 0, 0);
    const db = x.getImageData(0, 0, 1440, 1080);
    let changed = 0;
    for (let i = 0; i < db.data.length; i += 4) {
      const dr = Math.abs(db.data[i] - da[i]);
      const dg = Math.abs(db.data[i + 1] - da[i + 1]);
      const dbv = Math.abs(db.data[i + 2] - da[i + 2]);
      if (dr + dg + dbv > 24) changed += 1;
    }
    return { changed, total: 1440 * 1080, ratio: changed / (1440 * 1080) };
  },
  { r: refUrl, f: finUrl },
);

fs.writeFileSync(
  path.join(outDir, "desktop-regression-after-mobile.json"),
  JSON.stringify({ sameBytes, diff, failed: [...new Set(failed)] }, null, 2),
);

console.log(JSON.stringify({ sameBytes, diff, failed: [...new Set(failed)] }, null, 2));
await browser.close();
