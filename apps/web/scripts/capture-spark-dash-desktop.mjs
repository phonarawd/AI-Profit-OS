/**
 * Desktop visual capture — fixture route only.
 * founder-approved-desktop.png 가 비교 기준.
 * stale reference-desktop.png 는 덮어쓰지 않는다.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(path.join(here, "../../../tooling/verify/stack-lock.cjs"));
const { chromium } = require("@playwright/test");
const outDir = path.join(here, "../../../_tmp_spark_dash_refs");
const url = process.env.SD_URL ?? "http://localhost:3000/dev/spark-dash-desktop";

fs.mkdirSync(outDir, { recursive: true });

const hideChrome =
  "nextjs-portal, [data-next-mark-loading], #__next-build-watcher { display: none !important; }";

async function openPage(browser, width, height) {
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
  await page.waitForSelector(".sd-root", { timeout: 30000 });
  await page.addStyleTag({ content: hideChrome });
  await page.waitForTimeout(700);
  return { page, errors };
}

const browser = await chromium.launch({ headless: true });

const { page, errors } = await openPage(browser, 1440, 1080);
const finalPath = path.join(outDir, "final-desktop-1440-v3.png");
await page.screenshot({ path: finalPath, fullPage: false });
await page.screenshot({ path: path.join(outDir, "final-desktop-1440.png"), fullPage: false });

for (const [sel, name] of [
  [".sd-wallet-quick", "crop-sidebar-wallet.png"],
  [".sd-wallet", "crop-hero-wallet.png"],
  [".sd-hero", "crop-hero.png"],
  [".sd-hero", "crop-hero-v3.png"],
  [".sd-sidebar", "crop-sidebar.png"],
  [".sd-ai", "crop-ai-sidebar-v3.png"],
]) {
  const loc = page.locator(sel).first();
  if (await loc.count()) await loc.screenshot({ path: path.join(outDir, name) });
}

const geometry = await page.evaluate(() => {
  const pick = (sel) => {
    const el = document.querySelector(sel);
    if (!el) return null;
    const r = el.getBoundingClientRect();
    const s = getComputedStyle(el);
    return {
      x: Math.round(r.x),
      y: Math.round(r.y),
      w: Math.round(r.width),
      h: Math.round(r.height),
      overflow: s.overflow,
      scrollW: el.scrollWidth,
      scrollH: el.scrollHeight,
      clientW: el.clientWidth,
      clientH: el.clientHeight,
    };
  };
  return {
    viewport: { w: window.innerWidth, h: window.innerHeight },
    root: pick(".sd-root"),
    sidebar: pick(".sd-sidebar"),
    main: pick(".sd-main"),
    header: pick(".sd-header"),
    hero: pick(".sd-hero"),
    wallet: pick(".sd-wallet"),
    ctaPrimary: pick(".sd-cta-primary"),
    ctaSecondary: pick(".sd-cta-secondary"),
    stats: pick(".sd-stats"),
    statsSec: pick(".sd-stats-sec"),
    pops: pick(".sd-pops"),
    popsSec: pick(".sd-pops-sec"),
    intro: pick(".sd-intro"),
    stage: pick(".sd-content.sd-stage"),
    headerStage: pick(".sd-header-stage"),
    introStage: pick(".sd-intro-stage"),
    doc: {
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
      scrollHeight: document.documentElement.scrollHeight,
      clientHeight: document.documentElement.clientHeight,
    },
  };
});

const clipped = await page.evaluate(() => {
  const nodes = [...document.querySelectorAll(".sd-root *")];
  return nodes
    .filter((el) => {
      const s = getComputedStyle(el);
      if (s.overflow === "visible") return false;
      const cls = String(el.className);
      if (cls.includes("sd-hero-energy") || cls.includes("sd-intro-art") || cls.includes("sd-ai")) {
        return false;
      }
      return el.scrollWidth > el.clientWidth + 2 || el.scrollHeight > el.clientHeight + 2;
    })
    .slice(0, 16)
    .map((el) => String(el.className));
});

const dayHits = await page.evaluate(() => {
  const text = document.body.innerText;
  return {
    hasIl: /일/.test(text) && /소요/.test(text) && /\d+\s*일/.test(text),
    hasDay: /\bday(s)?\b/i.test(text),
    durations: [...document.querySelectorAll(".sd-metric.dur .v, .sd-pop-duration .v")].map(
      (el) => el.textContent,
    ),
  };
});

fs.writeFileSync(
  path.join(outDir, "geometry-desktop.json"),
  JSON.stringify({ geometry, clipped, dayHits, errors }, null, 2),
);

const sizes = [
  [1280, 1080, "final-desktop-1280-v3.png"],
  [1366, 1080, "final-desktop-1366-v3.png"],
  [1680, 1080, "final-desktop-1680-v3.png"],
  [1920, 1080, "final-desktop-1920-v3.png"],
];
const responsive = [];
for (const [w, h, name] of sizes) {
  const next = await openPage(browser, w, h);
  const measure = await next.page.evaluate(() => {
    const root = document.querySelector(".sd-root");
    const main = document.querySelector(".sd-main");
    const stage = document.querySelector(".sd-content.sd-stage");
    const hero = document.querySelector(".sd-hero");
    const rb = (el) => {
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) };
    };
    return {
      innerWidth: window.innerWidth,
      rootW: root?.getBoundingClientRect().width ?? null,
      main: rb(main),
      stage: rb(stage),
      hero: rb(hero),
      scrollW: document.documentElement.scrollWidth,
      scrollH: document.documentElement.scrollHeight,
    };
  });
  responsive.push({ w, ...measure });
  await next.page.screenshot({ path: path.join(outDir, name), fullPage: false });
  await next.page.close();
}

const refPath = path.join(outDir, "founder-approved-desktop.png");
const overlayPath = path.join(outDir, "overlay-founder-approved-v3.png");
const diffPath = path.join(outDir, "diff-founder-approved-v3.png");
if (fs.existsSync(refPath)) {
  const overlayPage = await browser.newPage({ viewport: { width: 1440, height: 1080 } });
  const refUrl = `data:image/png;base64,${fs.readFileSync(refPath).toString("base64")}`;
  const finUrl = `data:image/png;base64,${fs.readFileSync(finalPath).toString("base64")}`;
  const htmlPath = path.join(outDir, "overlay.html");
  fs.writeFileSync(
    htmlPath,
    `<!doctype html><html><body style="margin:0;background:#000">
<canvas id="c" width="1440" height="1080"></canvas>
<script>
const c=document.getElementById('c');
const x=c.getContext('2d');
const a=new Image(); const b=new Image();
let n=0;
function go(){
  if(++n<2) return;
  x.drawImage(a,0,0,1440,1080);
  x.globalAlpha=0.5;
  x.drawImage(b,0,0,1440,1080);
}
a.onload=go; b.onload=go;
a.src=${JSON.stringify(refUrl)};
b.src=${JSON.stringify(finUrl)};
</script></body></html>`,
  );
  await overlayPage.setContent(fs.readFileSync(htmlPath, "utf8"), { waitUntil: "load" });
  await overlayPage.waitForTimeout(300);
  await overlayPage.screenshot({ path: overlayPath, fullPage: false });

  await overlayPage.evaluate(async ({ refUrl: r, finUrl: f }) => {
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
    ca.width = 1440;
    ca.height = 1080;
    const xa = ca.getContext("2d");
    xa.drawImage(ra, 0, 0, 1440, 1080);
    const da = xa.getImageData(0, 0, 1440, 1080).data;
    x.clearRect(0, 0, 1440, 1080);
    x.drawImage(rb, 0, 0, 1440, 1080);
    const db = x.getImageData(0, 0, 1440, 1080);
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
  }, { refUrl, finUrl });
  await overlayPage.screenshot({ path: diffPath, fullPage: false });
  await overlayPage.close();
}

fs.writeFileSync(
  path.join(outDir, "geometry-desktop.json"),
  JSON.stringify({ geometry, clipped, dayHits, errors, responsive }, null, 2),
);

await page.close();
await browser.close();

console.log(
  JSON.stringify(
    {
      finalPath,
      overlayPath,
      diffPath,
      errors,
      geometry: {
        root: geometry.root,
        sidebar: geometry.sidebar,
        main: geometry.main,
        hero: geometry.hero,
        statsSec: geometry.statsSec,
        popsSec: geometry.popsSec,
        stage: geometry.stage,
        headerStage: geometry.headerStage,
        introStage: geometry.introStage,
        wallet: geometry.wallet,
        ctaPrimary: geometry.ctaPrimary,
        ctaSecondary: geometry.ctaSecondary,
        doc: geometry.doc,
      },
      clipped,
      dayHits,
      responsive,
    },
    null,
    2,
  ),
);
