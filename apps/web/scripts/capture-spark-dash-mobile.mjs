/**
 * Mobile Spark Dash capture — fixture route only.
 * Desktop capture는 별도로 돌리고 이 스크립트는 Desktop CSS를 건드리지 않는다.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(path.join(here, "../../../tooling/verify/stack-lock.cjs"));
const { chromium } = require("@playwright/test");
const outDir = path.join(here, "../../../_tmp_spark_dash_refs");
const mobileUrl = process.env.SD_MOBILE_URL ?? "http://localhost:3000/dev/spark-dash-mobile";
const desktopUrl = process.env.SD_URL ?? "http://localhost:3000/dev/spark-dash-desktop";

fs.mkdirSync(outDir, { recursive: true });

const hideChrome =
  "nextjs-portal, [data-next-mark-loading], #__next-build-watcher { display: none !important; }";

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
  await page.waitForTimeout(700);
  return { page, errors };
}

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

const browser = await chromium.launch({ headless: true });

const { page, errors } = await openPage(browser, mobileUrl, 390, 693, ".sdm-root");
await page.screenshot({ path: path.join(outDir, "final-mobile-390x693.png"), fullPage: false });
await page.screenshot({ path: path.join(outDir, "final-mobile-390x693-full.png"), fullPage: true });

const geometry = await page.evaluate((pickSrc) => {
  const pick = eval(`(${pickSrc})`);
  const hero = pick("[data-sdm='hero']");
  const cta = pick("[data-sdm='cta']");
  const nav = pick("[data-sdm='nav']");
  return {
    viewport: { w: window.innerWidth, h: window.innerHeight },
    root: pick(".sdm-root"),
    header: pick(".sdm-header"),
    scroll: pick(".sdm-scroll"),
    hero,
    cta,
    nav,
    doc: {
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
      scrollHeight: document.documentElement.scrollHeight,
      innerWidth: window.innerWidth,
    },
    overflowX: document.documentElement.scrollWidth > window.innerWidth + 1,
    ctaHiddenByNav:
      cta && nav ? cta.bottom > nav.y + 1 : null,
  };
}, pickBox.toString());

const clipped = await page.evaluate(() => {
  const nodes = [...document.querySelectorAll(".sdm-root *")];
  return nodes
    .filter((el) => {
      const s = getComputedStyle(el);
      if (s.overflow === "visible") return false;
      const cls = String(el.className);
      if (cls.includes("sdm-greet") || cls.includes("sdm-product") || cls.includes("sdm-ai")) {
        return false;
      }
      return el.scrollWidth > el.clientWidth + 2 || el.scrollHeight > el.clientHeight + 2;
    })
    .slice(0, 16)
    .map((el) => String(el.className));
});

const truth = await page.evaluate(() => {
  const text = document.body.innerText;
  return {
    hasCountdown: /\d{2}:\d{2}:\d{2}/.test(text),
    hasFakeDeadline: /마감 임박|남은 시간/.test(text),
    hasDayRange: /\d+\s*~\s*\d+\s*일/.test(text),
    durations: [...document.querySelectorAll(".sdm-metric .v, .sdm-pop-foot .v")].map(
      (el) => el.textContent?.trim(),
    ),
  };
});

const sizes = [
  [320, 693, "final-mobile-320.png"],
  [360, 693, "final-mobile-360.png"],
  [375, 693, "final-mobile-375.png"],
  [390, 844, "final-mobile-390x844.png"],
  [430, 844, "final-mobile-430.png"],
];
const responsive = [];
for (const [w, h, name] of sizes) {
  const next = await openPage(browser, mobileUrl, w, h, ".sdm-root");
  const measure = await next.page.evaluate((pickSrc) => {
    const pick = eval(`(${pickSrc})`);
    return {
      innerWidth: window.innerWidth,
      innerHeight: window.innerHeight,
      rootW: document.querySelector(".sdm-root")?.getBoundingClientRect().width ?? null,
      scrollW: document.documentElement.scrollWidth,
      overflowX: document.documentElement.scrollWidth > window.innerWidth + 1,
      hero: pick("[data-sdm='hero']"),
      cta: pick("[data-sdm='cta']"),
      nav: pick("[data-sdm='nav']"),
    };
  }, pickBox.toString());
  responsive.push({ w, h, ...measure, errors: next.errors });
  await next.page.screenshot({ path: path.join(outDir, name), fullPage: false });
  if (name === "final-mobile-390x844.png") {
    await next.page.screenshot({
      path: path.join(outDir, "final-mobile-390x844-full.png"),
      fullPage: true,
    });
  }
  await next.page.close();
}

const refPath = path.join(outDir, "figma-mobile-390x693.png");
const overlayPath = path.join(outDir, "overlay-mobile-390.png");
const diffPath = path.join(outDir, "diff-mobile-390.png");
if (fs.existsSync(refPath)) {
  const overlayPage = await browser.newPage({ viewport: { width: 390, height: 693 } });
  const refUrl = `data:image/png;base64,${fs.readFileSync(refPath).toString("base64")}`;
  const finUrl = `data:image/png;base64,${fs.readFileSync(path.join(outDir, "final-mobile-390x693.png")).toString("base64")}`;
  await overlayPage.setContent(
    `<!doctype html><html><body style="margin:0;background:#000">
<canvas id="c" width="390" height="693"></canvas>
<script>
const c=document.getElementById('c');
const x=c.getContext('2d');
const a=new Image(); const b=new Image();
let n=0;
function go(){
  if(++n<2) return;
  x.drawImage(a,0,0,390,693);
  x.globalAlpha=0.5;
  x.drawImage(b,0,0,390,693);
}
a.onload=go; b.onload=go;
a.src=${JSON.stringify(refUrl)};
b.src=${JSON.stringify(finUrl)};
</script></body></html>`,
    { waitUntil: "load" },
  );
  await overlayPage.waitForTimeout(300);
  await overlayPage.screenshot({ path: overlayPath, fullPage: false });

  await overlayPage.evaluate(
    async ({ refUrl: r, finUrl: f }) => {
      const c = document.getElementById("c");
      const x = c.getContext("2d");
      const load = (src) =>
        new Promise((res, rej) => {
          const img = new Image();
          img.onload = () => res(img);
          img.onerror = rej;
          img.src = src;
        });
      const [ra, rb] = await Promise.all([load(r), load(f)]);
      const ca = document.createElement("canvas");
      ca.width = 390;
      ca.height = 693;
      const xa = ca.getContext("2d");
      xa.drawImage(ra, 0, 0, 390, 693);
      const da = xa.getImageData(0, 0, 390, 693).data;
      x.clearRect(0, 0, 390, 693);
      x.drawImage(rb, 0, 0, 390, 693);
      const db = x.getImageData(0, 0, 390, 693);
      for (let i = 0; i < db.data.length; i += 4) {
        const dr = Math.abs(db.data[i] - da[i]);
        const dg = Math.abs(db.data[i + 1] - da[i + 1]);
        const dbv = Math.abs(db.data[i + 2] - da[i + 2]);
        if (dr + dg + dbv > 48) {
          db.data[i] = 255;
          db.data[i + 1] = 48;
          db.data[i + 2] = 80;
          db.data[i + 3] = 220;
        } else {
          db.data[i + 3] = 40;
        }
      }
      x.putImageData(db, 0, 0);
    },
    { refUrl, finUrl },
  );
  await overlayPage.screenshot({ path: diffPath, fullPage: false });
  await overlayPage.close();
}

const desktop = await openPage(browser, desktopUrl, 1440, 1080, ".sd-root");
const desktopPath = path.join(outDir, "regression-desktop-1440-after-mobile.png");
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
    errors: [],
  };
});
await desktop.page.close();

const report = {
  errors,
  geometry,
  clipped,
  truth,
  responsive,
  desktopGeom,
  paths: {
    final390: path.join(outDir, "final-mobile-390x693.png"),
    overlay: overlayPath,
    diff: diffPath,
    desktop: desktopPath,
  },
};
fs.writeFileSync(path.join(outDir, "geometry-mobile.json"), JSON.stringify(report, null, 2));

await page.close();
await browser.close();
console.log(JSON.stringify(report, null, 2));
