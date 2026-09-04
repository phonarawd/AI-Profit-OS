/**
 * Home session resolution — loading paint is not PASS.
 * Home UI source is not changed.
 * Authority = same-origin /api/v1 via QA middleware (LOCAL_WEB_RUNTIME_API_STUB=1).
 * Cross-origin :4000 is not used: WebKit reports Load failed to other loopback ports.
 * context.route / page.route are not used: WebKit can match and hang.
 */
const { test, expect } = require("@playwright/test");
const { assertQaIsolation } = require("../lib/qa-env-isolation-guard.cjs");
const { ensureLocalWebRuntime } = require("../lib/local-web-runtime.cjs");

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
    await page.goto(runtime.baseUrl + "/", { waitUntil: "load" });
  } catch (err) {
    const msg = String(err && err.message ? err.message : err);
    if (!/NS_BINDING_ABORTED|interrupted|destroyed/i.test(msg)) throw err;
    await page.goto(runtime.baseUrl + "/", { waitUntil: "load" });
  }
}

async function sessionEvidence(page) {
  return page.evaluate(async () => {
    const ids = [
      "home-session-loading",
      "guest-first-visit",
      "home-authenticated",
      "home-session-unavailable",
    ];
    const counts = {};
    for (const id of ids) {
      counts[id] = document.querySelectorAll(`[data-testid="${id}"]`).length;
    }
    let sameOriginStatus = null;
    let sameOriginError = null;
    try {
      const res = await fetch("/api/v1/me/home-read", {
        credentials: "include",
        cache: "no-store",
      });
      sameOriginStatus = res.status;
    } catch (err) {
      sameOriginError = String(err && err.message ? err.message : err);
    }
    return {
      readyState: document.readyState,
      counts,
      sameOriginStatus,
      sameOriginError,
      resources: performance
        .getEntriesByType("resource")
        .map((e) => e.name)
        .filter((n) => n.includes("/api/v1/") || n.includes("home-read")),
    };
  });
}

async function waitSessionResolution(page, expectedTestId) {
  await expect(page.locator(HOME_GATE).first()).toBeVisible({ timeout: 90000 });
  try {
    await expect(page.getByTestId("home-session-loading")).toHaveCount(0, {
      timeout: 90000,
    });
  } catch (err) {
    const evidence = await sessionEvidence(page);
    throw new Error(
      `WEBKIT_HOME_SESSION_STILL_LOADING ${JSON.stringify(evidence)} :: ${String(err && err.message ? err.message : err)}`,
    );
  }
  const unavailable = await page.getByTestId("home-session-unavailable").count();
  if (unavailable) {
    const evidence = await sessionEvidence(page);
    throw new Error(
      `WEBKIT_HOME_SESSION_UNAVAILABLE ${JSON.stringify(evidence)}`,
    );
  }
  await expect(page.getByTestId(expectedTestId)).toBeVisible({ timeout: 15000 });
}

test("guest stub resolves guest-first-visit, not loading-only", async ({
  page,
}, testInfo) => {
  testInfo.annotations.push({
    type: "webkit-home-session",
    description: "guest-resolution",
  });
  await gotoHome(page);
  await waitSessionResolution(page, "guest-first-visit");
});

test("authenticated stub resolves authenticated shell", async ({
  page,
}, testInfo) => {
  testInfo.annotations.push({
    type: "webkit-home-session",
    description: "authenticated-resolution",
  });
  await page.setExtraHTTPHeaders({ "x-aipo-qa-session": "authenticated" });
  await gotoHome(page);
  await waitSessionResolution(page, "home-authenticated");
});
