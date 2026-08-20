/**
 * Mobile Spark Dash final polish capture — fixture route only.
 * Desktop CSS / Desktop 컴포넌트는 읽기·스크린샷만 하고 수정하지 않는다.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(path.join(here, "../../../tooling/verify/stack-lock.cjs"));
const { chromium } = require("@playwright/test");
const outDir = path.join(here, "../../../_tmp_spark_dash_refs");
const mobileUrl = process.env.SD_MOBILE_URL ?? "http://127.0.0.1:3000/dev/spark-dash-mobile";
const desktopUrl = process.env.SD_URL ?? "http://127.0.0.1:3000/dev/spark-dash-desktop";

fs.mkdirSync(outDir, { recursive: true });

const hideChrome =
  "nextjs-portal, [data-next-mark-loading], #__next-build-watcher { display: none !important; }";

function pickBox(sel) {
  const el = document.querySelector(sel);
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return {
    x: Math.round(r.x),
    y: Math.round(r.y),
    w: Math.round(r.width),
    h: Math.round(r.height),
    bottom: Math.round(r.bottom),
    right: Math.round(r.right),
  };
}

async function openPage(browser, url, width, height, selector) {
  const page = await browser.newPage({
    viewport: { width, height },
    deviceScaleFactor: 1,
  });
  const errors = [];
  page.on("pageerror", (e) => errors.push(`pageerror:${e}`));
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(`console:${msg.text()}`);
  });
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 90000 });
  await page.waitForSelector(selector, { timeout: 30000 });
  await page.addStyleTag({ content: hideChrome });
  await page.waitForTimeout(800);
  return { page, errors };
}

async function crop(page, selector, dest) {
  const loc = page.locator(selector).first();
  if ((await loc.count()) === 0) return null;
  await loc.screenshot({ path: dest });
  return dest;
}

async function writeDiff(browser, refPath, finPath, dest, w, h) {
  if (!fs.existsSync(refPath) || !fs.existsSync(finPath)) return null;
  const overlayPage = await browser.newPage({ viewport: { width: w, height: h } });
  const refUrl = `data:image/png;base64,${fs.readFileSync(refPath).toString("base64")}`;
  const finUrl = `data:image/png;base64,${fs.readFileSync(finPath).toString("base64")}`;
  await overlayPage.setContent(
    `<!doctype html><html><body style="margin:0;background:#000">
<canvas id="c" width="${w}" height="${h}"></canvas></body></html>`,
    { waitUntil: "load" },
  );
  const changed = await overlayPage.evaluate(
    async ({ r, f, w: cw, h: ch }) => {
      const c = document.getElementById("c");
      const x = c.getContext("2d");
      const load = (src) =>
        new Promise((res, rej) => {
          const img = new Image();
          img.onload = () => res(img);
          img.onerror = rej;
          img.src = src;
        });
      const [a, b] = await Promise.all([load(r), load(f)]);
      x.drawImage(a, 0, 0, cw, ch);
      const da = x.getImageData(0, 0, cw, ch).data;
      x.drawImage(b, 0, 0, cw, ch);
      const db = x.getImageData(0, 0, cw, ch);
      let n = 0;
      for (let i = 0; i < db.data.length; i += 4) {
        const dr = Math.abs(db.data[i] - da[i]);
        const dg = Math.abs(db.data[i + 1] - da[i + 1]);
        const dbv = Math.abs(db.data[i + 2] - da[i + 2]);
        if (dr + dg + dbv > 48) {
          db.data[i] = 255;
          db.data[i + 1] = 48;
          db.data[i + 2] = 80;
          db.data[i + 3] = 220;
          n += 1;
        } else {
          db.data[i + 3] = 40;
        }
      }
      x.putImageData(db, 0, 0);
      return n;
    },
    { r: refUrl, f: finUrl, w, h },
  );
  await overlayPage.screenshot({ path: dest, fullPage: false });
  await overlayPage.close();
  return changed;
}

const browser = await chromium.launch({ headless: true });
const sizes = [
  [320, 693, "final-mobile-320-polish.png", "final-mobile-320.png"],
  [360, 693, "final-mobile-360-polish.png", "final-mobile-360.png"],
  [390, 693, "final-mobile-390-polish.png", "final-mobile-390x693.png"],
  [412, 844, "final-mobile-412-polish.png", null],
  [430, 844, "final-mobile-430-polish.png", "final-mobile-430.png"],
];

const responsive = [];
let cropHero = null;
let cropAi = null;

for (const [w, h, name, baseline] of sizes) {
  const { page, errors } = await openPage(browser, mobileUrl, w, h, ".sdm-root");
  const measure = await page.evaluate((pickSrc) => {
    const pick = eval(`(${pickSrc})`);
    const money = [...document.querySelectorAll(".sdm-money")].map((el) => {
      const style = getComputedStyle(el);
      return {
        text: el.textContent,
        wrap: style.flexWrap,
        whiteSpace: style.whiteSpace,
        w: Math.round(el.getBoundingClientRect().width),
        h: Math.round(el.getBoundingClientRect().height),
        overflow: el.scrollWidth > el.clientWidth + 1,
      };
    });
    return {
      innerWidth: window.innerWidth,
      overflowX: document.documentElement.scrollWidth > window.innerWidth + 1,
      hero: pick("[data-sdm='hero']"),
      cta: pick("[data-sdm='cta']"),
      nav: pick("[data-sdm='nav']"),
      product: pick("[data-sdm='product']"),
      ai: pick("[data-sdm='ai']"),
      bolt: pick(".sdm-greet-bolt"),
      title: pick(".sdm-greet-title"),
      money,
      truth: {
        durations: [...document.querySelectorAll(".sdm-metric .v, .sdm-pop-foot .v")].map(
          (el) => el.textContent?.trim(),
        ),
        hasCountdown: /\d{2}:\d{2}:\d{2}/.test(document.body.innerText),
        hasDayRange: /\d+\s*~\s*\d+\s*일/.test(document.body.innerText),
      },
    };
  }, pickBox.toString());

  const dest = path.join(outDir, name);
  await page.screenshot({ path: dest, fullPage: false });

  if (w === 390) {
    cropHero = await crop(page, "[data-sdm='hero']", path.join(outDir, "crop-mobile-hero-polish.png"));
    await page.locator(".sdm-scroll").evaluate((el) => {
      const ai = el.querySelector("[data-sdm='ai']");
      if (ai) el.scrollTop = Math.max(0, ai.offsetTop - 24);
    });
    await page.waitForTimeout(250);
    cropAi = await crop(page, "[data-sdm='ai']", path.join(outDir, "crop-mobile-ai-card-polish.png"));
    await page.screenshot({
      path: path.join(outDir, "final-mobile-390-polish-ai.png"),
      fullPage: false,
    });
  }

  const profit = measure.money.find((item) => item.text?.includes("+284.00"));
  responsive.push({
    w,
    h,
    overflowX: measure.overflowX,
    hero: measure.hero,
    cta: measure.cta,
    nav: measure.nav,
    product: measure.product,
    ai: measure.ai,
    boltRightOfTitle:
      measure.bolt && measure.title ? measure.bolt.x >= measure.title.right - 8 : null,
    ctaHiddenByNav:
      measure.cta && measure.nav ? measure.cta.bottom > measure.nav.y + 1 : null,
    profitUsdt: profit,
    truth: measure.truth,
    errors,
  });

  if (baseline) {
    await writeDiff(
      browser,
      path.join(outDir, baseline),
      dest,
      path.join(outDir, name.replace("final-", "diff-")),
      w,
      h,
    );
  }

  await page.close();
}

const desktop = await openPage(browser, desktopUrl, 1440, 1080, ".sd-root");
const desktopPath = path.join(outDir, "regression-desktop-1440-after-mobile-polish.png");
await desktop.page.screenshot({ path: desktopPath, fullPage: false });
const desktopGeom = await desktop.page.evaluate(() => {
  const pick = (sel) => {
    const el = document.querySelector(sel);
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) };
  };
  return {
    root: pick(".sd-root"),
    sidebar: pick(".sd-sidebar"),
    header: pick(".sd-header"),
    hero: pick(".sd-hero"),
    wallet: pick(".sd-wallet"),
    scrollWidth: document.documentElement.scrollWidth,
  };
});
await desktop.page.close();

const report = {
  responsive,
  cropHero,
  cropAi,
  desktopGeom,
  paths: {
    polish320: path.join(outDir, "final-mobile-320-polish.png"),
    polish360: path.join(outDir, "final-mobile-360-polish.png"),
    polish390: path.join(outDir, "final-mobile-390-polish.png"),
    polish430: path.join(outDir, "final-mobile-430-polish.png"),
    cropHero,
    cropAi,
    desktop: desktopPath,
  },
};
fs.writeFileSync(path.join(outDir, "geometry-mobile-polish.json"), JSON.stringify(report, null, 2));

await browser.close();
console.log(JSON.stringify(report, null, 2));
