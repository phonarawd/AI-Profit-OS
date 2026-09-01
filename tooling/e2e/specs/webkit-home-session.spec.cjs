/**
 * Home session resolution — loading paint is not PASS.
 * Home UI source is not changed. Authority is loopback API stub +
 * context.route + in-page fetch rebind. page.route is not used:
 * WebKit misses same-origin rewrite fetches and can hang forever.
 */
const { test, expect } = require("@playwright/test");
const { assertQaIsolation } = require("../lib/qa-env-isolation-guard.cjs");
const { ensureLocalWebRuntime } = require("../lib/local-web-runtime.cjs");
const { AUTHENTICATED_EMPTY_HOME } = require("../lib/consumer-route-stubs.cjs");

test.describe.configure({ timeout: 240000 });
let runtime;

const HOME_GATE =
  '[data-testid="home-session-loading"], [data-testid="guest-first-visit"], [data-testid="home-authenticated"], [data-testid="home-session-unavailable"]';

const GUEST_HOME_READ = {
  viewState: "unauthorized",
  reasonCode: "home.read.auth_required",
  session: { status: "guest" },
  money: null,
  opportunity: null,
  growth: null,
  ledgerTotal: null,
  todayPossibleProfitUsdt: null,
  provenance: { todayPossibleProfitUsdt: null, ledgerTotal: null },
  domainFsm: null,
};

test.beforeAll(async () => {
  assertQaIsolation({ purpose: "e2e", databaseUrl: "", projectRef: "" });
  process.env.LOCAL_WEB_RUNTIME_API_STUB = "1";
  process.env.API_HOST = process.env.API_HOST || "127.0.0.1:4000";
  runtime = await ensureLocalWebRuntime({ timeoutMs: 180000 });
}, { timeout: 180000 });

test.afterAll(async () => {
  if (runtime) await runtime.stop();
});

function buildFetchStubScript(mode) {
  return `(() => {
    const mode = ${JSON.stringify(mode)};
    const guest = ${JSON.stringify(GUEST_HOME_READ)};
    const auth = ${JSON.stringify(AUTHENTICATED_EMPTY_HOME)};
    if (window.__aipoHomeReadStubMode === mode && window.__aipoHomeReadStubInstalled) {
      return;
    }
    window.__aipoHomeReadStubMode = mode;
    window.__aipoHomeReadStubInstalled = true;
    const orig = window.__aipoOrigFetch || window.fetch.bind(window);
    window.__aipoOrigFetch = orig;
    window.fetch = async function aipoHomeReadStub(input, init) {
      if (init && init.signal && init.signal.aborted) {
        throw new DOMException("The operation was aborted.", "AbortError");
      }
      const url = String(
        typeof input === "string" ? input : (input && input.url) || "",
      );
      if (url.indexOf("/api/v1/") === -1) {
        return orig(input, init);
      }
      if (url.indexOf("/api/v1/me/home-read") !== -1) {
        const body = mode === "authenticated" ? auth : guest;
        return new Response(JSON.stringify(body), {
          status: mode === "authenticated" ? 200 : 401,
          headers: { "content-type": "application/json" },
        });
      }
      return new Response(
        JSON.stringify({ error: "unauthorized", viewState: "unauthorized" }),
        { status: 401, headers: { "content-type": "application/json" } },
      );
    };
  })();`;
}

async function fulfillApiRoute(route, mode) {
  const url = route.request().url();
  if (!url.includes("/api/v1/")) {
    return route.fallback();
  }
  if (url.includes("/api/v1/me/home-read")) {
    const body = mode === "authenticated" ? AUTHENTICATED_EMPTY_HOME : GUEST_HOME_READ;
    return route.fulfill({
      status: mode === "authenticated" ? 200 : 401,
      contentType: "application/json",
      headers: { "cache-control": "no-store" },
      body: JSON.stringify(body),
    });
  }
  return route.fulfill({
    status: 401,
    contentType: "application/json",
    body: JSON.stringify({ error: "unauthorized", viewState: "unauthorized" }),
  });
}

async function installHomeReadAuthority(page, context, mode) {
  const handler = (route) => fulfillApiRoute(route, mode);
  await context.route("**/api/v1/**", handler);
  await context.route("http://127.0.0.1:4000/**", handler);
  await context.route("http://localhost:4000/**", handler);
  const script = buildFetchStubScript(mode);
  await page.addInitScript(script);
  return script;
}

async function gotoHome(page, script) {
  try {
    await page.goto(runtime.baseUrl + "/", { waitUntil: "domcontentloaded" });
  } catch (err) {
    const msg = String(err && err.message ? err.message : err);
    if (!/NS_BINDING_ABORTED|interrupted|destroyed/i.test(msg)) throw err;
    await page.goto(runtime.baseUrl + "/", { waitUntil: "domcontentloaded" });
  }
  if (script) {
    await page.evaluate(script).catch(() => {});
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

test("guest stub resolves guest-first-visit, not loading-only", async ({
  page,
  context,
}, testInfo) => {
  testInfo.annotations.push({
    type: "webkit-home-session",
    description: "guest-resolution",
  });
  const script = await installHomeReadAuthority(page, context, "guest");
  await gotoHome(page, script);
  await waitSessionResolution(page, "guest-first-visit");
});

test("authenticated stub resolves authenticated shell", async ({
  page,
  context,
}, testInfo) => {
  testInfo.annotations.push({
    type: "webkit-home-session",
    description: "authenticated-resolution",
  });
  await page.setExtraHTTPHeaders({ "x-aipo-qa-session": "authenticated" });
  const script = await installHomeReadAuthority(page, context, "authenticated");
  await gotoHome(page, script);
  await waitSessionResolution(page, "home-authenticated");
});
