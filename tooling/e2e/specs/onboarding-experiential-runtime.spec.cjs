/**
 * REL-104 — /onboarding 체험형 재확인.
 * 가짜 실시간 수익 0. 완료 CTA는 Home.
 */
const fs = require("node:fs");
const path = require("node:path");
const { test, expect } = require("@playwright/test");
const { assertQaIsolation } = require("../lib/qa-env-isolation-guard.cjs");
const { runAxeOnHtml, blockingViolations } = require("../lib/axe-scan.cjs");

const root = path.resolve(__dirname, "../../..");

test.beforeAll(() => {
  assertQaIsolation({ purpose: "e2e", databaseUrl: "", projectRef: "" });
});

function read(rel) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

test("onboarding stays experiential and demo-labeled", () => {
  const page = read("apps/web/app/onboarding/page.tsx");
  const flow = read("packages/ui/components/onboarding/OnboardingFlow.tsx");
  expect(page).toContain("OnboardingFlow");
  expect(flow).toContain("MarketDiffDemo");
  expect(flow).toContain("MatchConfidenceCard");
  expect(flow).toContain("BuyingPowerMeter");
  expect(flow).toContain("OpportunityDemoCard");
  expect(flow).toContain("practice_only");
  expect(flow).toContain('window.location.href = "/"');
  expect(flow).not.toMatch(/\+\$/);
  expect(flow).not.toContain("/wallet/deposit");
});

test("demo components refuse fake live money", () => {
  const meter = read("packages/ui/components/onboarding/BuyingPowerMeter.tsx");
  const market = read("packages/ui/components/onboarding/MarketDiffDemo.tsx");
  expect(meter).toContain("unavailable");
  expect(meter).not.toMatch(/1,200|USDT/);
  expect(market).toContain("체험");
  expect(market).toContain("demoNotLive");
});

test("onboarding axe fixture", async () => {
  const html = `<!doctype html><html lang="ko"><head><title>시작</title></head>
  <body>
    <main>
      <h1>설명 방식을 골라 주세요</h1>
      <button type="button">짧게</button>
      <button type="button">비교로</button>
      <button type="button">한 줄씩</button>
    </main>
  </body></html>`;
  const results = await runAxeOnHtml(html);
  expect(blockingViolations(results)).toEqual([]);
});

test("runtime onboarding route when base URL is provided", async ({ page }) => {
  const base = process.env.PLAYWRIGHT_BASE_URL;
  test.skip(!base, "PLAYWRIGHT_BASE_URL 없으면 로컬 웹 기동을 강제하지 않음");
  await page.addInitScript(() => {
    localStorage.removeItem("peotteok_onboarding_step");
    localStorage.removeItem("peotteok_tone_band");
  });
  await page.emulateMedia({ reducedMotion: "reduce" });
  const res = await page.goto(new URL("/onboarding", base).toString(), {
    waitUntil: "domcontentloaded",
  });
  expect(res && res.ok()).toBeTruthy();
  await expect(page.getByTestId("onboarding-flow")).toBeVisible();
  await expect(page.getByTestId("tone-young")).toBeVisible();
});
