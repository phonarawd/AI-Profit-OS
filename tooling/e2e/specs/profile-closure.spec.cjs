/**
 * REL-123 — Profile (/me).
 */
const { test, expect } = require("@playwright/test");
const { assertQaIsolation } = require("../lib/qa-env-isolation-guard.cjs");
const { ensureLocalWebRuntime } = require("../lib/local-web-runtime.cjs");
const { stubAccountHub } = require("../lib/account-route-stubs.cjs");
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

async function openMe(page, mode, width = 1440, height = 1080) {
  await page.unrouteAll({ behavior: "ignoreErrors" }).catch(() => {});
  await stubAccountHub(page, mode);
  await page.setViewportSize({ width, height });
  await page.goto(`${runtime.baseUrl}/me`, { waitUntil: "load" });
  await expect(page.getByTestId("me-hub")).toBeVisible({ timeout: 20000 });
  const layout = width >= 1024 ? "desktop" : "mobile";
  await expect(page.locator(`[data-account-layout='${layout}']`)).toBeVisible({
    timeout: 10000,
  });
}

test("401 is unauthorized, not a fake account", async ({ page }) => {
  await openMe(page, "unauthorized");
  await expect(page.getByTestId("me-hub")).toHaveAttribute(
    "data-account-view",
    "unauthorized",
  );
  await expect(page.getByText("로그인하면 계정을 볼 수 있어요.").first()).toBeVisible();
  await expect(page.getByTestId("app-shell")).toHaveCount(0);
});

test("ready hub has no invented zeros or leftover chrome", async ({ page }) => {
  await openMe(page, "ready");
  await expect(page.getByTestId("me-hub")).toHaveAttribute(
    "data-account-view",
    "ready",
  );
  await expect(page.getByText("프로필이 준비되어 있어요.")).toBeVisible();
  await expect(page.getByRole("link", { name: "설정" }).first()).toBeVisible();
  await expect(page.getByRole("link", { name: "혜택" }).first()).toBeVisible();
  await expect(page.locator("[data-account-hub='v2.1']")).toBeVisible();
  await expect(page.getByText("0 USDT")).toHaveCount(0);
  await expect(page.getByTestId("safe-stop-trust-metric")).toHaveCount(0);
  await page.screenshot({
    path: "governance/release-master/rel-123-profile/runtime-ready-1440.png",
    fullPage: false,
  });
  await openMe(page, "ready", 390, 693);
  await page.screenshot({
    path: "governance/release-master/rel-123-profile/runtime-ready-390.png",
    fullPage: false,
  });
});

test("profile a11y has no new critical/serious axe violations", async ({
  page,
}) => {
  await openMe(page, "ready");
  await page.addScriptTag({ path: require.resolve("axe-core") });
  const results = await page.evaluate(async () => {
    return window.axe.run(document, {
      runOnly: { type: "tag", values: ["wcag2a", "wcag2aa"] },
    });
  });
  expect(blockingViolations(results), JSON.stringify(blockingViolations(results).map((v) => v.id))).toEqual([]);
});
