/**
 * Live-browser Axe on critical routes. Harness presence ≠ PASS.
 * A skipped scan is not REMOTE_AXE_PASS. FULL_PRODUCT_AXE remains PARTIAL.
 */
const { test, expect } = require("@playwright/test");
const { assertQaIsolation } = require("../lib/qa-env-isolation-guard.cjs");
const { ensureLocalWebRuntime } = require("../lib/local-web-runtime.cjs");
const { stubWallet, stubDeposit, stubGuestApis } = require("../lib/consumer-route-stubs.cjs");
const { stubSettings, stubAccountHub } = require("../lib/account-route-stubs.cjs");
const { blockingViolations } = require("../lib/axe-scan.cjs");

const ROUTES = [
  { path: "/", testId: "guest-first-visit" },
  { path: "/profits", testId: "profits-shell" },
  { path: "/wallet", testId: "wallet-home" },
  { path: "/wallet/deposit?tab=usdt", testId: "wallet-deposit-page" },
  { path: "/me/settings", testId: "settings-page" },
  { path: "/me", testId: "me-hub" },
];

test.describe.configure({ timeout: 240000 });
let runtime;

test.beforeAll(async () => {
  assertQaIsolation({ purpose: "e2e", databaseUrl: "", projectRef: "" });
  runtime = await ensureLocalWebRuntime({ timeoutMs: 180000 });
}, { timeout: 180000 });

test.afterAll(async () => {
  if (runtime) await runtime.stop();
});

test("live axe critical consumer routes", async ({ page }, testInfo) => {
  expect(testInfo.project.name || "chromium").toBeTruthy();
  testInfo.annotations.push({
    type: "axe-layer",
    description: process.env.CI ? "REMOTE_AXE_PASS" : "LOCAL_AXE_PASS",
  });
  const known = require("../fixtures/axe-known-issues.v1.json");
  const allow = new Set(known.homeFreezeAllowlistedIds || []);
  for (const route of ROUTES) {
    await page.unrouteAll({ behavior: "ignoreErrors" }).catch(() => {});
    if (route.path === "/") await stubGuestApis(page);
    else if (route.path.startsWith("/wallet/deposit")) await stubDeposit(page, "ready");
    else if (route.path.startsWith("/wallet")) await stubWallet(page, "ready");
    else if (route.path.startsWith("/me/settings")) await stubSettings(page, "ready");
    else if (route.path === "/me") await stubAccountHub(page, "ready");
    await page.addInitScript(() => {
      window.localStorage.setItem("peotteok_deposit_consult_ack", "1");
    });
    await page.setViewportSize({ width: 390, height: 693 });
    await page.goto(runtime.baseUrl + route.path, { waitUntil: "load" });
    await expect(page.getByTestId(route.testId)).toBeVisible({ timeout: 20000 });
    await page.addScriptTag({ path: require.resolve("axe-core") });
    const results = await page.evaluate(async () =>
      window.axe.run(document, {
        runOnly: { type: "tag", values: ["wcag2a", "wcag2aa"] },
      }),
    );
    const blocking = blockingViolations(results).filter((v) => !allow.has(v.id));
    expect(blocking, `${route.path} ${JSON.stringify(blocking.map((v) => v.id))}`).toEqual([]);
  }
});
