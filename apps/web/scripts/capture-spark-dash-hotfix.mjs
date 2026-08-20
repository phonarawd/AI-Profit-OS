/**
 * Duration + Summary icon hotfix capture only.
 * v3 baseline PNG 을 덮어쓰지 않는다.
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

await page.screenshot({
  path: path.join(outDir, "final-desktop-duration-icon-hotfix.png"),
  fullPage: false,
});

const stats = page.locator(".sd-stats").first();
if (await stats.count()) {
  await stats.screenshot({ path: path.join(outDir, "crop-summary-icons-hotfix.png") });
}

const durationBox = await page.evaluate(() => {
  const nodes = [
    ...document.querySelectorAll(".sd-metric.dur, .sd-pop-duration"),
  ];
  if (!nodes.length) return null;
  const rects = nodes.map((el) => el.getBoundingClientRect());
  const left = Math.min(...rects.map((r) => r.left));
  const top = Math.min(...rects.map((r) => r.top));
  const right = Math.max(...rects.map((r) => r.right));
  const bottom = Math.max(...rects.map((r) => r.bottom));
  return {
    x: Math.max(0, Math.floor(left) - 8),
    y: Math.max(0, Math.floor(top) - 8),
    width: Math.min(1440, Math.ceil(right - left) + 16),
    height: Math.min(1080, Math.ceil(bottom - top) + 16),
  };
});
if (durationBox) {
  await page.screenshot({
    path: path.join(outDir, "crop-duration-hotfix.png"),
    clip: durationBox,
  });
}

const audit = await page.evaluate(() => {
  const durations = [...document.querySelectorAll(".sd-metric.dur .v, .sd-pop-duration .v")].map(
    (el) => (el.textContent ?? "").trim(),
  );
  const icons = [...document.querySelectorAll(".sd-stat-ico")].map((el) => ({
    key: el.getAttribute("data-stat-icon"),
    hasSvg: Boolean(el.querySelector("svg")),
    childCount: el.childElementCount,
    w: Math.round(el.getBoundingClientRect().width),
    h: Math.round(el.getBoundingClientRect().height),
  }));
  const converted = durations.filter((t) =>
    /10,?080|11,?520|8,?640|12,?960|14,?400|15,?840|17,?280/.test(t),
  );
  const fakeInvented = durations.filter((t) =>
    /30\s*~\s*60분|90\s*~\s*120분|120\s*~\s*240분/.test(t),
  );
  const zeroMin = durations.filter((t) => /^0분$/.test(t));
  const clipped = [...document.querySelectorAll(".sd-root *")]
    .filter((el) => {
      const s = getComputedStyle(el);
      if (s.overflow === "visible") return false;
      const cls = String(el.className);
      if (cls.includes("sd-hero-energy") || cls.includes("sd-intro-art") || cls.includes("sd-ai")) {
        return false;
      }
      return el.scrollWidth > el.clientWidth + 2 || el.scrollHeight > el.clientHeight + 2;
    })
    .slice(0, 12)
    .map((el) => String(el.className));
  const root = document.querySelector(".sd-root")?.getBoundingClientRect();
  const statsSec = document.querySelector(".sd-stats-sec")?.getBoundingClientRect();
  const popsSec = document.querySelector(".sd-pops-sec")?.getBoundingClientRect();
  return {
    durations,
    converted,
    fakeInvented,
    zeroMin,
    icons,
    emptyCircle: icons.filter((i) => !i.hasSvg),
    clipped,
    fit: {
      vw: window.innerWidth,
      vh: window.innerHeight,
      rootH: root ? Math.round(root.height) : null,
      statsY: statsSec ? Math.round(statsSec.y) : null,
      popsY: popsSec ? Math.round(popsSec.y) : null,
      scrollH: document.documentElement.scrollHeight,
    },
  };
});

const { page: page1280, errors: errors1280 } = await openPage(browser, 1280, 1080);
const sanity1280 = await page1280.evaluate(() => {
  const durs = [...document.querySelectorAll(".sd-metric.dur, .sd-pop-duration")].map((el) => {
    const r = el.getBoundingClientRect();
    return {
      text: el.querySelector(".v")?.textContent?.trim() ?? "",
      w: Math.round(r.width),
      overflow: el.scrollWidth > el.clientWidth + 2,
    };
  });
  return {
    durations: durs,
    overflow: durs.filter((d) => d.overflow),
    scrollW: document.documentElement.scrollWidth,
  };
});
await page1280.close();
await page.close();
await browser.close();

const report = {
  errors,
  errors1280,
  audit,
  sanity1280,
  paths: {
    final: path.join(outDir, "final-desktop-duration-icon-hotfix.png"),
    summary: path.join(outDir, "crop-summary-icons-hotfix.png"),
    duration: path.join(outDir, "crop-duration-hotfix.png"),
  },
};
fs.writeFileSync(path.join(outDir, "hotfix-audit.json"), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
