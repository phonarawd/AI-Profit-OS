/**
 * Bounded critical-route matrix. Remote evidence must name the engine.
 * Home is read-only. No visual baseline rewrite.
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

const VIEWPORTS = [
  { width: 390, height: 693 },
  { width: 768, height: 1024 },
  { width: 1024, height: 768 },
  { width: 1440, height: 1080 },
];

const ROUTES = [
  { path: "/", testId: "guest-first-visit", cta: "guest-cta-signup" },
  { path: "/profits", testId: "profits-shell", cta: "profits-shell" },
  {
    path: "/profits/00000000-0000-4000-8000-000000000001",
    testId: "opportunity-detail",
    cta: "opportunity-detail",
  },
  { path: "/wallet", testId: "wallet-home", cta: "wallet-home" },
  { path: "/wallet/deposit?tab=usdt", testId: "wallet-deposit-page", cta: "wallet-deposit-page" },
  { path: "/wallet/withdraw", testId: "wallet-withdraw", cta: "wallet-withdraw" },
  { path: "/wallet/history", testId: "wallet-history", cta: "wallet-history" },
  { path: "/me/settings", testId: "settings-page", cta: "settings-page" },
  { path: "/me", testId: "me-hub", cta: "me-hub" },
];

const HOME_PAINTED =
  '[data-testid="home-session-loading"], [data-testid="guest-first-visit"], [data-testid="home-authenticated"], [data-testid="home-shell"], [data-testid="home-session-unavailable"]';
const HOME_READY =
  '[data-testid="guest-first-visit"], [data-testid="home-authenticated"], [data-testid="home-shell"], [data-testid="home-session-unavailable"]';

test.describe.configure({ timeout: 240000 });
let runtime;

test.beforeAll(async () => {
  assertQaIsolation({ purpose: "e2e", databaseUrl: "", projectRef: "" });
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

async function gotoSafe(page, url) {
  try {
    await page.goto(url, { waitUntil: "domcontentloaded" });
  } catch (err) {
    const msg = String(err && err.message ? err.message : err);
    if (!/NS_BINDING_ABORTED|interrupted|destroyed/i.test(msg)) throw err;
    await page.goto(url, { waitUntil: "domcontentloaded" });
  }
}

async function dumpSurface(page) {
  return page.evaluate(() => ({
    url: location.href,
    title: document.title,
    testids: Array.from(document.querySelectorAll("[data-testid]")).map((el) =>
      el.getAttribute("data-testid"),
    ),
    text: String((document.body && document.body.innerText) || "").slice(0, 400),
  }));
}

async function waitHomePainted(page) {
  try {
    await expect(page.locator(HOME_PAINTED).first()).toBeVisible({ timeout: 45000 });
  } catch (err) {
    throw new Error(`home-paint missing ${JSON.stringify(await dumpSurface(page))}\n${err}`);
  }
  const resolved = await page.locator(HOME_READY).count();
  return resolved > 0;
}

async function assertVisibleControlFocused(page, engine, routePath, width) {
  const control = page.getByRole("link").or(page.getByRole("button")).first();
  await expect(control, `${engine} ${routePath} ${width} control`).toBeVisible();
  await control.focus();
  await expect(control, `${engine} ${routePath} ${width} focused`).toBeFocused();
}

test("critical consumer routes load without fatal overflow", async ({ page }, testInfo) => {
  const engine = testInfo.project.name;
  expect(engine === "chromium" || engine === "firefox" || engine === "webkit").toBeTruthy();
  testInfo.annotations.push({ type: "browser-engine", description: engine });

  // Each route × viewport gets a fresh page. This preserves every assertion while
  // preventing an earlier Next-dev navigation/HMR fetch from leaking an aborted
  // promise into the next surface on WebKit.
  const context = page.context();

  async function makePage(stubKind) {
    const scoped = await context.newPage();
    await scoped.addInitScript((kind) => {
      window.localStorage.setItem("peotteok_deposit_consult_ack", "1");
      window.sessionStorage.setItem("aipo-qa-stub", kind);
      const orig = window.fetch.bind(window);
      window.fetch = (input, init) => {
        const url = String(typeof input === "string" ? input : (input && input.url) || "");
        if (url.indexOf("/api/v1/") === -1) return orig(input, init);
        const live =
          window.sessionStorage && window.sessionStorage.getItem("aipo-qa-stub") === "live";
        if (!live) {
          return Promise.resolve(
            new Response(JSON.stringify({ error: "unauthorized", viewState: "unauthorized" }), {
              status: 401,
              headers: { "content-type": "application/json" },
            }),
          );
        }
        return orig(input, init);
      };
    }, stubKind);
    return scoped;
  }

  for (const route of ROUTES) {
    const stubKind = route.path === "/" ? "guest" : "live";
    for (const vp of VIEWPORTS) {
      const scoped = await makePage(stubKind);
      try {
        await stubRoute(scoped, route.path);
        const pageErrors = [];
        scoped.on("pageerror", (err) => pageErrors.push(String(err?.message || err)));
        await scoped.setViewportSize(vp);
        await gotoSafe(scoped, runtime.baseUrl + route.path);
        if (route.path === "/") {
          const resolved = await waitHomePainted(scoped);
          if (resolved) {
            await expect(
              scoped
                .locator(
                  '[data-testid="guest-cta-signup"], [data-testid="home-authenticated"], [data-testid="home-session-unavailable"]',
                )
                .first(),
            ).toBeVisible();
          } else {
            await expect(scoped.getByTestId("home-session-loading")).toBeVisible();
            testInfo.annotations.push({
              type: "home-session-gate",
              description: `${engine} painted loading only`,
            });
          }
        } else {
          await expect(scoped.getByTestId(route.testId)).toBeVisible({ timeout: 45000 });
          await expect(scoped.getByTestId(route.cta)).toBeVisible();
        }
        const overflow = await scoped.evaluate(() => {
          const root = document.scrollingElement || document.documentElement;
          return root.scrollWidth > root.clientWidth + 1;
        });
        expect(overflow, `${engine} ${route.path} ${vp.width} overflow`).toBe(false);
        expect(pageErrors, `${engine} ${route.path} pageerror`).toEqual([]);
        const hasControl = await scoped.getByRole("link").or(scoped.getByRole("button")).count();
        if (hasControl > 0) {
          await assertVisibleControlFocused(scoped, engine, route.path, vp.width);
        }
      } finally {
        await scoped.close();
      }
    }
  }

  const reduced = await makePage("guest");
  try {
    await reduced.emulateMedia({ reducedMotion: "reduce" });
    await reduced.setViewportSize({ width: 390, height: 693 });
    await stubGuestApis(reduced);
    await gotoSafe(reduced, runtime.baseUrl + "/");
    await waitHomePainted(reduced);
    const motion = await reduced.evaluate(() =>
      window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    );
    expect(motion, `${engine} reduced-motion`).toBe(true);
  } finally {
    await reduced.close();
  }
});

