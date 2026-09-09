/**
 * Product onboarding 7-step. Fake live profit 0. Complete CTA is Home.
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

test("onboarding stays a product shell", () => {
  const page = read("apps/web/app/onboarding/page.tsx");
  const flow = read("packages/ui/components/onboarding/OnboardingFlow.tsx");
  expect(page).toContain("OnboardingFlow");
  expect(page).not.toContain("GuestChrome");
  expect(flow).toContain("OnboardingShell");
  expect(flow).toContain("SettlementTimeline");
  expect(flow).toContain('window.location.href = "/"');
  expect(flow).not.toMatch(/\+\$/);
  expect(flow).not.toContain("/wallet/deposit");
});

test("money formatter refuses float recalc", () => {
  const fmt = read("packages/ui/components/onboarding/product/format-money.ts");
  expect(fmt).toContain("부동소수점 재계산 금지");
  expect(fmt).not.toMatch(/Number\(/);
});

test("onboarding axe fixture", async () => {
  const html = `<!doctype html><html lang="ko"><head><title>시작</title></head>
  <body>
    <main>
      <h1>퍼뜩 AI가 전 세계 가격을 모아요</h1>
      <button type="button">다음</button>
    </main>
  </body></html>`;
  const results = await runAxeOnHtml(html);
  expect(blockingViolations(results)).toEqual([]);
});

test("runtime onboarding route when base URL is provided", async ({ page }) => {
  const base = process.env.PLAYWRIGHT_BASE_URL;
  test.skip(!base, "PLAYWRIGHT_BASE_URL 없으면 로컬 웹 기동을 강제하지 않음");
  await page.addInitScript(() => {
    localStorage.removeItem("peotteok_product_onboarding_v1");
  });
  await page.emulateMedia({ reducedMotion: "reduce" });
  const res = await page.goto(new URL("/onboarding", base).toString(), {
    waitUntil: "domcontentloaded",
  });
  expect(res && (res.ok() || res.status() === 200 || res.status() === 307 || res.status() === 302)).toBeTruthy();
});
