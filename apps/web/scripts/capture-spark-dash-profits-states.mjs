/**
 * Phase 14 — UI state simulation. INTERCEPT ALLOWED.
 * REAL_RUNTIME_E2E 증거로 쓰지 않는다. Nike 상품 사진 맵 금지.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(path.join(here, "../../../tooling/verify/stack-lock.cjs"));
const { chromium } = require("@playwright/test");
const outDir = path.join(here, "../../../_tmp_spark_dash_refs");
const url = process.env.SD_PROFITS_URL ?? "http://localhost:3000/profits";
const hideChrome =
  "nextjs-portal, [data-next-mark-loading], #__next-build-watcher { display: none !important; }";

fs.mkdirSync(outDir, { recursive: true });

function envelope(items) {
  return {
    principalUsdt: "100.00",
    affordableCount: items.filter((i) => i.bucket === "affordable").length,
    nearMissCount: 0,
    items,
  };
}

function card(over = {}) {
  return {
    id: "opp-sim-1",
    assetId: "asset-sim-1",
    assetLabel: "시세 확인 상품",
    assetImageUrl: null,
    assetImageSource: null,
    assetImageAltKo: "시세 확인 상품",
    arbitrageType: "price",
    arbitrageTypeKo: "시세차익",
    expectedProfitUsdt: "12.50",
    expectedProfitKrwApprox: 17250,
    requiredCapitalUsdt: "100.00",
    estimatedDurationSec: 720,
    staleAt: "2026-08-19T00:00:00.000Z",
    status: "available",
    bucket: "affordable",
    marginPct: "12.5",
    buyMarketId: "ebay_us",
    buyMarketLabelKo: "이베이(미국)",
    ...over,
  };
}

const cases = [
  {
    name: "error",
    status: 500,
    body: { statusCode: 500, message: "error" },
    expectState: "ERROR",
  },
  {
    name: "empty",
    status: 200,
    body: envelope([]),
    expectState: "EMPTY",
  },
  {
    name: "unauthorized",
    status: 401,
    body: { statusCode: 401, message: "AUTH_REQUIRED" },
    expectState: "UNAUTHORIZED",
  },
  {
    name: "broken-image",
    status: 200,
    body: envelope([
      card({
        assetImageSource: "admin_r2",
        assetImageUrl: "https://example.invalid/profits-broken.png",
      }),
    ]),
    expectState: "READY",
    expectMedia: "BROKEN",
  },
  {
    name: "long-title",
    status: 200,
    body: envelope([
      card({
        assetLabel:
          "아주 긴 상품명으로 카드 제목이 한 줄을 넘어가도 레이아웃이 무너지지 않아야 하는 확인용 이름",
      }),
    ]),
    expectState: "READY",
  },
  {
    name: "null-duration",
    status: 200,
    body: envelope([card({ estimatedDurationSec: null })]),
    expectState: "READY",
    expectDurationDash: true,
  },
  {
    name: "policy-unknown",
    status: 200,
    body: envelope([
      card({
        assetImageSource: "ebay",
        assetImageUrl: "https://i.ebayimg.com/images/not-authorized.jpg",
      }),
    ]),
    expectState: "READY",
    expectMedia: "POLICY_UNKNOWN",
  },
  {
    name: "missing-media",
    status: 200,
    body: envelope([card({ assetImageUrl: null, assetImageSource: null })]),
    expectState: "READY",
    expectMedia: "MISSING",
  },
];

function isFeedUrl(raw) {
  try {
    const u = new URL(raw);
    return /\/api\/v1\/opportunities\/?$/.test(u.pathname);
  } catch {
    return false;
  }
}

const browser = await chromium.launch({ headless: true });
const results = [];

for (const spec of cases) {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1080 },
    deviceScaleFactor: 1,
  });
  const errors = [];
  page.on("pageerror", (e) => errors.push(`pageerror:${e}`));
  await page.route("**/*", async (route) => {
    const req = route.request();
    if (isFeedUrl(req.url()) && req.method() === "GET") {
      await route.fulfill({
        status: spec.status,
        contentType: "application/json",
        body: JSON.stringify(spec.body),
      });
      return;
    }
    if (req.url().includes("example.invalid")) {
      await route.abort();
      return;
    }
    await route.continue();
  });
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 90000 });
  await page.waitForSelector("[data-sdp='root']", { timeout: 30000 });
  await page.addStyleTag({ content: hideChrome });
  await page.waitForTimeout(700);
  const shot = path.join(outDir, `profits-desktop-state-${spec.name}.png`);
  await page.screenshot({ path: shot, fullPage: false });
  const measure = await page.evaluate(() => {
    const root = document.querySelector("[data-sdp='root']");
    const media = document.querySelector("[data-sdp-media]");
    const dur = document.querySelector(".sdp-need .dur");
    const title = document.querySelector(".sdp-card-title");
    const mediaBox = media?.getBoundingClientRect() ?? null;
    return {
      owner: root?.getAttribute("data-owner") ?? null,
      viewState: root?.getAttribute("data-sdp-state") ?? null,
      mediaState: media?.getAttribute("data-sdp-media") ?? null,
      duration: dur?.textContent?.trim() ?? null,
      title: title?.textContent?.trim() ?? null,
      overflowX: document.documentElement.scrollWidth > window.innerWidth + 1,
      officialChip: [...document.querySelectorAll("[data-sdp-filter]")].some(
        (el) => el.getAttribute("data-sdp-filter") === "official",
      ),
      mediaH: mediaBox ? Math.round(mediaBox.height) : null,
    };
  });
  await page.close();

  const okState = measure.viewState === spec.expectState;
  const okMedia = !spec.expectMedia || measure.mediaState === spec.expectMedia;
  const okDur = !spec.expectDurationDash || measure.duration === "—";
  const ok = okState && okMedia && okDur && measure.overflowX === false && !measure.officialChip;
  results.push({
    name: spec.name,
    ok,
    expectState: spec.expectState,
    ...measure,
    errors,
    shot,
  });
}

await browser.close();

const report = {
  schema: "profits.playwright-state-simulation.v1",
  intercept: true,
  realRuntimeEvidence: false,
  results,
  verdict: results.every((r) => r.ok) ? "PASS" : "FAIL",
};
fs.writeFileSync(
  path.join(outDir, "profits-desktop-states.json"),
  `${JSON.stringify(report, null, 2)}\n`,
);
console.log(JSON.stringify(report, null, 2));
if (report.verdict !== "PASS") process.exit(1);
