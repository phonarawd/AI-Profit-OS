/**
 * Home session resolution — loading paint is not PASS.
 * Home UI source is not changed.
 * Authority = loopback API stub (Next rewrite) + locked in-page fetch.
 * context.route / page.route are not used: WebKit can match and hang.
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
    const orig = window.__aipoOrigFetch || window.fetch.bind(window);
    window.__aipoOrigFetch = orig;
    const stub = function aipoHomeReadStub(input, init) {
      const url = String(
        typeof input === "string" ? input : (input && input.url) || "",
      );
      if (url.indexOf("/api/v1/") === -1) {
        return orig(input, init);
      }
      const body =
        url.indexOf("/api/v1/me/home-read") !== -1
          ? mode === "authenticated"
            ? auth
            : guest
          : { error: "unauthorized", viewState: "unauthorized" };
      const status =
        url.indexOf("/api/v1/me/home-read") !== -1 && mode === "authenticated"
          ? 200
          : 401;
      return Promise.resolve(
        new Response(JSON.stringify(body), {
          status,
          headers: { "content-type": "application/json" },
        }),
      );
    };
    const lockFetch = (target) => {
      try {
        Object.defineProperty(target, "fetch", {
          configurable: false,
          enumerable: true,
          writable: false,
          value: stub,
        });
      } catch (_err) {
        try {
          target.fetch = stub;
        } catch (_assignErr) {
          /* Next may have locked a hanging fetch; keep going. */
        }
      }
    };
    lockFetch(window);
    if (typeof globalThis !== "undefined") lockFetch(globalThis);
    window.__aipoHomeReadStubMode = mode;
  })();`;
}

async function installHomeReadAuthority(page, mode) {
  const script = buildFetchStubScript(mode);
  await page.addInitScript({ content: script });
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

async function waitSessionResolution(page, expectedTestId, script) {
  await expect(page.locator(HOME_GATE).first()).toBeVisible({ timeout: 90000 });
  const stillLoading = await page.getByTestId("home-session-loading").count();
  if (stillLoading && script) {
    await page.evaluate(script).catch(() => {});
    await page.reload({ waitUntil: "domcontentloaded" }).catch(() => {});
    await page.evaluate(script).catch(() => {});
  }
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
}, testInfo) => {
  testInfo.annotations.push({
    type: "webkit-home-session",
    description: "guest-resolution",
  });
  const script = await installHomeReadAuthority(page, "guest");
  await gotoHome(page, script);
  await waitSessionResolution(page, "guest-first-visit", script);
});

test("authenticated stub resolves authenticated shell", async ({
  page,
}, testInfo) => {
  testInfo.annotations.push({
    type: "webkit-home-session",
    description: "authenticated-resolution",
  });
  await page.setExtraHTTPHeaders({ "x-aipo-qa-session": "authenticated" });
  const script = await installHomeReadAuthority(page, "authenticated");
  await gotoHome(page, script);
  await waitSessionResolution(page, "home-authenticated", script);
});
