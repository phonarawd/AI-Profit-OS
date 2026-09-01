/**
 * Admin critical + system-control Axe. Fake "반영 완료" is not an a11y pass.
 */
const { test, expect } = require("@playwright/test");
const { assertQaIsolation } = require("../lib/qa-env-isolation-guard.cjs");
const { ensureLocalAdminRuntime } = require("../lib/local-admin-runtime.cjs");
const { blockingViolations } = require("../lib/axe-scan.cjs");
const inventory = require("../fixtures/full-product-axe-inventory.v1.json");

test.describe.configure({ timeout: 240000 });
let runtime;

test.beforeAll(async () => {
  assertQaIsolation({ purpose: "e2e", databaseUrl: "", projectRef: "" });
  runtime = await ensureLocalAdminRuntime({ timeoutMs: 180000 });
}, { timeout: 180000 });

test.afterAll(async () => {
  if (runtime) await runtime.stop();
});

test("admin inventory axe has no serious/critical", async ({ page }) => {
  for (const route of inventory.admin) {
    await page.setViewportSize({ width: 1024, height: 768 });
    await page.goto(runtime.baseUrl + route.path, { waitUntil: "domcontentloaded" });
    await expect(page.getByTestId(route.testId)).toBeVisible({ timeout: 20000 });
    if (route.path.includes("system-control")) {
      await expect(page.getByText("반영 완료")).toHaveCount(0);
    }
    await page.addScriptTag({ path: require.resolve("axe-core") });
    const results = await page.evaluate(async () =>
      window.axe.run(document, {
        runOnly: { type: "tag", values: ["wcag2a", "wcag2aa"] },
      }),
    );
    const blocking = blockingViolations(results);
    expect(blocking, `${route.path} ${JSON.stringify(blocking.map((v) => v.id))}`).toEqual([]);
  }
});
