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

test("guest stub resolves guest-first-visit, not loading-only", async ({ page }, testInfo) => {
  testInfo.annotations.push({
    type: "webkit-home-session",
    description: "guest-resolution",
  });
  await page.unrouteAll({ behavior: "ignoreErrors" }).catch(() => {});
  await stubGuestApis(page);
  await gotoHome(page);
  await expect(page.getByTestId("guest-first-visit")).toBeVisible({
    timeout: 45000,
  });
  await expect(page.getByTestId("home-session-loading")).toHaveCount(0);
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
  await expect(page.getByTestId("home-authenticated")).toBeVisible({
    timeout: 45000,
  });
  await expect(page.getByTestId("home-session-loading")).toHaveCount(0);
});
