/**
 * REL-124 — Kyc (/me/kyc).
 */
const { test, expect } = require("@playwright/test");
const { assertQaIsolation } = require("../lib/qa-env-isolation-guard.cjs");
const { ensureLocalWebRuntime } = require("../lib/local-web-runtime.cjs");
const { stubKyc } = require("../lib/account-route-stubs.cjs");
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

async function openKyc(page, mode, width = 1440, height = 1080) {
  await page.unrouteAll({ behavior: "ignoreErrors" }).catch(() => {});
  await stubKyc(page, mode);
  await page.setViewportSize({ width, height });
  await page.goto(`${runtime.baseUrl}/me/kyc`, { waitUntil: "load" });
  await expect(page.getByTestId("kyc-page")).toBeVisible({ timeout: 20000 });
}

test("401 is unauthorized, not a fake approved KYC", async ({ page }) => {
  await openKyc(page, "unauthorized");
  await expect(page.getByTestId("kyc-page")).toHaveAttribute(
    "data-account-view",
    "unauthorized",
  );
  await expect(page.getByText("로그인하면 본인 확인을 볼 수 있어요.")).toBeVisible();
  await expect(page.getByTestId("kyc-status")).toHaveCount(0);
  await expect(page.getByTestId("app-shell")).toHaveCount(0);
});

test("ready none keeps the form and approved hides it", async ({ page }) => {
  await openKyc(page, "ready");
  await expect(page.getByTestId("kyc-status")).toHaveAttribute("data-kyc-status", "none");
  await expect(page.getByText("출금하려면 본인 확인이 필요해요.")).toBeVisible();
  await page.screenshot({
    path: "governance/release-master/rel-124-kyc/runtime-ready-1440.png",
    fullPage: false,
  });
  await openKyc(page, "approved");
  await expect(page.getByTestId("kyc-status")).toHaveAttribute(
    "data-kyc-status",
    "approved",
  );
  await expect(page.getByText("qa-account-user")).toHaveCount(0);
  await openKyc(page, "ready", 390, 693);
  await page.screenshot({
    path: "governance/release-master/rel-124-kyc/runtime-ready-390.png",
    fullPage: false,
  });
});

test("kyc a11y has no new critical/serious axe violations", async ({ page }) => {
  await openKyc(page, "ready");
  await page.addScriptTag({ path: require.resolve("axe-core") });
  const results = await page.evaluate(async () => {
    return window.axe.run(document, {
      runOnly: { type: "tag", values: ["wcag2a", "wcag2aa"] },
    });
  });
  expect(blockingViolations(results), JSON.stringify(blockingViolations(results).map((v) => v.id))).toEqual([]);
});
