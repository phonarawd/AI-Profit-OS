/**
 * REL-127 — Guides (/me/guide/*).
 */
const { test, expect } = require("@playwright/test");
const { assertQaIsolation } = require("../lib/qa-env-isolation-guard.cjs");
const { ensureLocalWebRuntime } = require("../lib/local-web-runtime.cjs");
const { blockingViolations } = require("../lib/axe-scan.cjs");

test.describe.configure({ timeout: 180000 });
let runtime;
test.beforeAll(async () => {
  assertQaIsolation({ purpose: "e2e", databaseUrl: "", projectRef: "" });
  runtime = await ensureLocalWebRuntime({ timeoutMs: 180000 });
}, { timeout: 180000 });
test.afterAll(async () => {
  if (runtime) await runtime.stop();
});

const ROUTES = [
  ["/me/guide/faq", "guide-faq"],
  ["/me/guide/usdt", "guide-usdt"],
  ["/me/guide/get-usdt", "guide-get-usdt-page"],
  ["/me/guide/principal", "guide-principal"],
  ["/me/guide/revenue", "guide-revenue"],
  ["/me/guide/partners", "guide-partners"],
  ["/me/guide/market-weekly", "guide-market-weekly"],
];

test("all 7 guide routes mount without leftover chrome", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1080 });
  for (const [path, testId] of ROUTES) {
    await page.goto(`${runtime.baseUrl}${path}`, { waitUntil: "load" });
    await expect(page.getByTestId(testId)).toBeVisible({ timeout: 20000 });
    await expect(page.getByTestId("app-shell")).toHaveCount(0);
    await expect(page.getByText("골격")).toHaveCount(0);
  }
  await page.goto(`${runtime.baseUrl}/me/guide/faq`, { waitUntil: "load" });
  await page.screenshot({
    path: "governance/release-master/rel-127-guides/runtime-ready-1440.png",
    fullPage: false,
  });
  await page.setViewportSize({ width: 390, height: 693 });
  await page.goto(`${runtime.baseUrl}/me/guide/faq`, { waitUntil: "load" });
  await page.screenshot({
    path: "governance/release-master/rel-127-guides/runtime-ready-390.png",
    fullPage: false,
  });
});

test("faq a11y has no new critical/serious axe violations", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1080 });
  await page.goto(`${runtime.baseUrl}/me/guide/faq`, { waitUntil: "load" });
  await page.addScriptTag({ path: require.resolve("axe-core") });
  const results = await page.evaluate(async () => {
    return window.axe.run(document, {
      runOnly: { type: "tag", values: ["wcag2a", "wcag2aa"] },
    });
  });
  expect(blockingViolations(results), JSON.stringify(blockingViolations(results).map((v) => v.id))).toEqual([]);
});
