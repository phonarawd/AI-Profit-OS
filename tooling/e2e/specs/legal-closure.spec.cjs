/**
 * REL-128 — Legal (/me/legal*).
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
  ["/me/legal", "legal-hub"],
  ["/me/legal/terms", "legal-terms"],
  ["/me/legal/privacy", "legal-privacy"],
  ["/me/legal/oss", "legal-oss"],
  ["/me/legal/license", "legal-license"],
];

test("all 5 legal routes mount without leftover chrome", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1080 });
  for (const [path, testId] of ROUTES) {
    await page.goto(`${runtime.baseUrl}${path}`, { waitUntil: "load" });
    await expect(page.getByTestId(testId)).toBeVisible({ timeout: 20000 });
    await expect(page.getByTestId("app-shell")).toHaveCount(0);
  }
  await page.goto(`${runtime.baseUrl}/me/legal`, { waitUntil: "load" });
  await page.screenshot({
    path: "governance/release-master/rel-128-legal/runtime-ready-1440.png",
    fullPage: false,
  });
  await page.setViewportSize({ width: 390, height: 693 });
  await page.goto(`${runtime.baseUrl}/me/legal`, { waitUntil: "load" });
  await page.screenshot({
    path: "governance/release-master/rel-128-legal/runtime-ready-390.png",
    fullPage: false,
  });
});

test("legal hub a11y has no new critical/serious axe violations", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1080 });
  await page.goto(`${runtime.baseUrl}/me/legal`, { waitUntil: "load" });
  await page.addScriptTag({ path: require.resolve("axe-core") });
  const results = await page.evaluate(async () => {
    return window.axe.run(document, {
      runOnly: { type: "tag", values: ["wcag2a", "wcag2aa"] },
    });
  });
  expect(blockingViolations(results), JSON.stringify(blockingViolations(results).map((v) => v.id))).toEqual([]);
});
