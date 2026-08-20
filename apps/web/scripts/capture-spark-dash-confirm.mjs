/**
 * CUX-002 Participate Confirmation sheet visual QA.
 * /dev/spark-dash-room?sheet=* fixture only. REAL_RUNTIME_E2E 아님.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(path.join(here, "../../../tooling/verify/stack-lock.cjs"));
const { chromium } = require("@playwright/test");
const outDir = path.join(here, "../../../_tmp_spark_dash_refs");
const baseUrl =
  process.env.SD_ROOM_URL ?? "http://localhost:3000/dev/spark-dash-room";
const hideChrome =
  "nextjs-portal, [data-next-mark-loading], #__next-build-watcher { display: none !important; }";

const cases = [
  "ready",
  "issuing",
  "submitting",
  "accepted",
  "reused",
  "preflight_required",
  "insufficient",
  "stale",
  "expired",
  "blocked",
  "auth",
];

fs.mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch({ headless: true });
const results = [];

for (const name of cases) {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1080 },
    deviceScaleFactor: 1,
  });
  const errors = [];
  page.on("pageerror", (e) => errors.push(`pageerror:${e}`));
  const url = `${baseUrl}?sheet=${name}`;
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 90000 });
  await page.waitForSelector("[data-sdr-sheet]", { timeout: 30000 });
  await page.addStyleTag({ content: hideChrome });
  await page.waitForTimeout(600);
  const shot = path.join(outDir, `participate-confirm-${name}-1440.png`);
  await page.screenshot({ path: shot, fullPage: false });
  const measure = await page.evaluate(() => {
    const sheet = document.querySelector("[data-sdr-sheet]");
    const box = sheet?.getBoundingClientRect() ?? null;
    return {
      phase: sheet?.getAttribute("data-sdr-sheet") ?? null,
      error: sheet?.getAttribute("data-sdr-sheet-error") ?? null,
      title: document.querySelector(".sdr-sheet h2")?.textContent?.trim() ?? null,
      overflowX: document.documentElement.scrollWidth > window.innerWidth + 1,
      sheetW: box ? Math.round(box.width) : null,
      sheetH: box ? Math.round(box.height) : null,
      open: Boolean(sheet && "open" in sheet ? sheet.open : sheet),
    };
  });
  const fatal = errors.filter((e) => !e.includes("status of 500"));
  const ok = Boolean(measure.phase) && measure.overflowX === false && fatal.length === 0;
  results.push({ name, ok, url, ...measure, errors: fatal, shot });
  await page.close();
}

await browser.close();

const report = {
  schema: "participate-confirm.playwright.v1",
  intercept: false,
  realRuntimeEvidence: false,
  viewport: { width: 1440, height: 1080 },
  results,
  verdict: results.every((r) => r.ok) ? "PASS" : "FAIL",
};
fs.writeFileSync(
  path.join(outDir, "participate-confirm-1440.json"),
  `${JSON.stringify(report, null, 2)}\n`,
);
console.log(JSON.stringify(report, null, 2));
if (report.verdict !== "PASS") process.exit(1);
