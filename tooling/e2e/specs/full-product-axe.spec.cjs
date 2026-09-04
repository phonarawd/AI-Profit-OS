/**
 * Full-product Axe sweep against the route inventory.
 * Home source is not patched. Home-only locked contrast is separated.
 */
const { test, expect } = require("@playwright/test");
const { assertQaIsolation } = require("../lib/qa-env-isolation-guard.cjs");
const { ensureLocalWebRuntime } = require("../lib/local-web-runtime.cjs");
const {
  stubWallet,
  stubDeposit,
  stubHistory,
  stubWithdraw,
  stubOpportunityFeed,
  stubOpportunityRoom,
  stubGuestApis,
} = require("../lib/consumer-route-stubs.cjs");
const { stubSettings, stubAccountHub } = require("../lib/account-route-stubs.cjs");
const { blockingViolations, scanPageAxe } = require("../lib/axe-scan.cjs");

const inventory = require("../fixtures/full-product-axe-inventory.v1.json");
const known = require("../fixtures/axe-known-issues.v1.json");

test.describe.configure({ timeout: 300000 });
let runtime;

test.beforeAll(async () => {
  assertQaIsolation({ purpose: "e2e", databaseUrl: "", projectRef: "" });
  process.env.LOCAL_WEB_RUNTIME_API_STUB = "1";
  process.env.API_HOST = process.env.API_HOST || "127.0.0.1:4000";
  runtime = await ensureLocalWebRuntime({ timeoutMs: 180000 });
}, { timeout: 180000 });

test.afterAll(async () => {
  if (runtime) await runtime.stop();
});

async function stubRoute(page, path) {
  if (path === "/") await stubGuestApis(page);
  else if (path === "/profits") await stubOpportunityFeed(page, "ready");
  else if (path.startsWith("/profits/")) await stubOpportunityRoom(page, "ready");
  else if (path.startsWith("/wallet/deposit")) await stubDeposit(page, "ready");
  else if (path.startsWith("/wallet/withdraw")) await stubWithdraw(page, "ready");
  else if (path.startsWith("/wallet/history")) await stubHistory(page, "ready");
  else if (path.startsWith("/wallet")) await stubWallet(page, "ready");
  else if (path.startsWith("/me/settings")) await stubSettings(page, "ready");
  else if (path === "/me") await stubAccountHub(page, "ready");
}

test("full product consumer axe inventory has no serious/critical", async ({ page }, testInfo) => {
  testInfo.annotations.push({
    type: "axe-layer",
    description: process.env.CI ? "REMOTE_FULL_PRODUCT_AXE" : "LOCAL_FULL_PRODUCT_AXE",
  });
  const homeAllow = new Set(known.homeFreezeAllowlistedIds || []);
  const lockedHome = [];
  for (const route of inventory.web) {
    await page.unrouteAll({ behavior: "ignoreErrors" }).catch(() => {});
    await stubRoute(page, route.path);
    await page.addInitScript(() => {
      window.localStorage.setItem("peotteok_deposit_consult_ack", "1");
    });
    await page.setViewportSize({ width: 390, height: 693 });
    await page.goto(runtime.baseUrl + route.path, { waitUntil: "domcontentloaded" });
    const surface = route.testId
      ? page.getByTestId(route.testId)
      : page.locator(route.selector).first();
    await expect(surface, route.path).toBeVisible({ timeout: 45000 });
    const results = await scanPageAxe(page);
    const blocking = blockingViolations(results);
    if (route.homeLocked) {
      const unexpected = blocking.filter((v) => !homeAllow.has(v.id));
      expect(unexpected, `${route.path} ${JSON.stringify(unexpected.map((v) => v.id))}`).toEqual([]);
      if (blocking.some((v) => homeAllow.has(v.id))) {
        lockedHome.push({
          path: route.path,
          ids: blocking.filter((v) => homeAllow.has(v.id)).map((v) => v.id),
          classification: "HOME_LOCKED_DEFECT",
          required: "FOUNDER_OPEN_FOR_CONTROLLED_POLISH_REQUIRED",
        });
      }
    } else {
      expect(blocking, `${route.path} ${JSON.stringify(blocking.map((v) => v.id))}`).toEqual([]);
    }
  }
  testInfo.annotations.push({
    type: "home-locked-axe",
    description: JSON.stringify(lockedHome),
  });
  expect(inventory.web.length, "inventory must actually run").toBeGreaterThan(8);
});
