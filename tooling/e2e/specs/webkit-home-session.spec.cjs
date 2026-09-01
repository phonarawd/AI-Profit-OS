/**
 * Home session resolution — loading paint is not PASS.
 * Home UI source is not changed. Next proxy authority is stubbed.
 */
const { test, expect } = require("@playwright/test");
const { assertQaIsolation } = require("../lib/qa-env-isolation-guard.cjs");
const { ensureLocalWebRuntime } = require("../lib/local-web-runtime.cjs");
const {
  stubGuestApis,
  stubAuthenticatedEmptyHome,
} = require("../lib/consumer-route-stubs.cjs");

test.describe.configure({ timeout: 240000 });
let runtime;

const HOME_GATE =
  '[data-testid="home-session-loading"], [data-testid="guest-first-visit"], [data-testid="home-authenticated"], [data-testid="home-session-unavailable"]';

test.beforeAll(async () => {
  assertQaIsolation({ purpose: "e2e", databaseUrl: "", projectRef: "" });
  process.env.LOCAL_WEB_RUNTIME_API_STUB = "1";
  process.env.API_HOST = process.env.API_HOST || "127.0.0.1:4000";
  runtime = await ensureLocalWebRuntime({ timeoutMs: 180000 });
}, { timeout: 180000 });

test.afterAll(async () => {
  if (runtime) await runtime.stop();
});

async function gotoHome(page) {
  try {
    await page.goto(runtime.baseUrl + "/", { waitUntil: "domcontentloaded" });
  } catch (err) {
    const msg = String(err && err.message ? err.message : err);
    if (!/NS_BINDING_ABORTED|interrupted|destroyed/i.test(msg)) throw err;
    await page.goto(runtime.baseUrl + "/", { waitUntil: "domcontentloaded" });
  }
}

async function waitSessionResolution(page, expectedTestId) {
  await expect(page.locator(HOME_GATE).first()).toBeVisible({ timeout: 90000 });
  await expect(page.getByTestId("home-session-loading")).toHaveCount(0, {
    timeout: 90000,
  });
  const unavailable = await page.getByTestId("home-session-unavailable").count();
  if (unavailable) {
    throw new Error(
      "WEBKIT_HOME_SESSION_UNAVAILABLE — proxy/stub miss, not a loading-paint PASS",
    );
  }
  await expect(page.getByTestId(expectedTestId)).toBeVisible({ timeout: 15000 });
}

test("guest stub resolves guest-first-visit, not loading-only", async ({ page }, testInfo) => {
  testInfo.annotations.push({
    type: "webkit-home-session",
    description: "guest-resolution",
  });
  await page.unrouteAll({ behavior: "ignoreErrors" }).catch(() => {});
  await stubGuestApis(page);
  await gotoHome(page);
  await waitSessionResolution(page, "guest-first-visit");
});

test("authenticated stub resolves authenticated shell", async ({ page }, testInfo) => {
  testInfo.annotations.push({
    type: "webkit-home-session",
    description: "authenticated-resolution",
  });
  await page.setExtraHTTPHeaders({ "x-aipo-qa-session": "authenticated" });
  await page.unrouteAll({ behavior: "ignoreErrors" }).catch(() => {});
  await stubAuthenticatedEmptyHome(page);
  await gotoHome(page);
  await waitSessionResolution(page, "home-authenticated");
});
