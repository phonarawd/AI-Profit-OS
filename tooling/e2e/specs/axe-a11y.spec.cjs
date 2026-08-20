/**
 * REL-012: axe-core committed Playwright 하네스.
 * Home 390/1440 + /auth/login. Home geometry 변경 0.
 * 브라우저 실스캔은 AXE_BROWSER=1 (로컬 풀매트릭스 금지).
 */
const { test, expect } = require("@playwright/test");
const { assertQaIsolation } = require("../lib/qa-env-isolation-guard.cjs");
const {
  AXE_SCAN_TARGETS,
  blockingViolations,
  runAxeOnHtml,
  INTENTIONAL_FAIL_HTML,
  CLEAN_PROBE_HTML,
} = require("../lib/axe-scan.cjs");

test.beforeAll(() => {
  assertQaIsolation({ purpose: "e2e" });
});

test("scan matrix includes Home 390/1440 and one consumer route", () => {
  const homes = AXE_SCAN_TARGETS.filter((t) => t.route === "/");
  expect(homes.some((t) => t.width === 390 && t.height === 693)).toBeTruthy();
  expect(homes.some((t) => t.width === 1440 && t.height === 1080)).toBeTruthy();
  expect(
    AXE_SCAN_TARGETS.some(
      (t) => t.route === "/auth/login" || t.route === "/profits",
    ),
  ).toBeTruthy();
});

test("axe-core flags an unlabeled button (scan actually runs)", async () => {
  const results = await runAxeOnHtml(INTENTIONAL_FAIL_HTML);
  expect(blockingViolations(results).length).toBeGreaterThan(0);
});

test("axe-core runs on a labeled control fixture", async () => {
  const results = await runAxeOnHtml(CLEAN_PROBE_HTML);
  expect(Array.isArray(results.violations)).toBeTruthy();
});

test("browser Home/login axe scan", async ({ page }) => {
  test.skip(
    !process.env.AXE_BROWSER,
    "로컬 풀매트릭스 금지 — AXE_BROWSER=1 또는 REL-105",
  );
  const known = require("../fixtures/axe-known-issues.v1.json");
  const allow = new Set(known.homeFreezeAllowlistedIds || []);
  for (const target of AXE_SCAN_TARGETS) {
    await page.setViewportSize({
      width: target.width,
      height: target.height,
    });
    await page.goto(target.route, { waitUntil: "domcontentloaded" });
    await page.addScriptTag({ path: require.resolve("axe-core") });
    const results = await page.evaluate(async () => {
      return window.axe.run({
        runOnly: { type: "tag", values: ["wcag2a", "wcag2aa"] },
      });
    });
    const blocking = blockingViolations(results).filter((v) => !allow.has(v.id));
    if (target.route === "/") {
      // Home freeze: 신규 기하 패치 금지. allowlist 밖 critical/serious만 기록.
      expect(blocking, `${target.name} new Home a11y`).toEqual([]);
    } else {
      expect(blocking, `${target.name} a11y`).toEqual([]);
    }
  }
});
