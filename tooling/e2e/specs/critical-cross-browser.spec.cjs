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
  { path: "/wallet", testId: "wallet-home", cta: "wallet-deposit-cta" },
  { path: "/wallet/deposit?tab=usdt", testId: "wallet-deposit-page", cta: "deposit-tabs" },
  { path: "/wallet/withdraw", testId: "wallet-withdraw", cta: "wallet-withdraw" },
  { path: "/wallet/history", testId: "wallet-history", cta: "wallet-history" },
  { path: "/me/settings", testId: "settings-page", cta: "settings-page" },
  { path: "/me", testId: "me-hub", cta: "me-hub" },
];

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

async function assertKeyboardReachable(page, engine, routePath, width) {
  await page.keyboard.press("Tab");
  await page.keyboard.press("Tab");
  const info = await page.evaluate(() => {
    const el = document.activeElement;
    if (!el || el === document.body || el === document.documentElement) {
      return { tag: el ? el.tagName : "", ok: false };
    }
    const tag = el.tagName;
    const role = el.getAttribute ? el.getAttribute("role") : "";
    const ok =
      ["A", "BUTTON", "INPUT", "TEXTAREA", "SELECT", "SUMMARY"].includes(tag) ||
      (typeof el.tabIndex === "number" && el.tabIndex >= 0) ||
      role === "button" ||
      role === "link";
    return { tag, ok };
  });
  expect(info.ok, `${engine} ${routePath} ${width} focus=${info.tag}`).toBeTruthy();
}

test("critical consumer routes load without fatal overflow", async ({ page }, testInfo) => {
  const engine = testInfo.project.name;
  expect(engine === "chromium" || engine === "firefox" || engine === "webkit").toBeTruthy();
  testInfo.annotations.push({ type: "browser-engine", description: engine });
  await page.addInitScript(() => {
    window.localStorage.setItem("peotteok_deposit_consult_ack", "1");
    const orig = window.fetch.bind(window);
    window.fetch = (input, init) => {
      const url = String(typeof input === "string" ? input : (input && input.url) || "");
      if (!url.includes("/api/v1/")) return orig(input, init);
      const kind =
        (window.sessionStorage && window.sessionStorage.getItem("aipo-qa-stub")) || "guest";
      if (kind === "guest") {
        return Promise.resolve(
          new Response(JSON.stringify({ error: "unauthorized", viewState: "unauthorized" }), {
            status: 401,
            headers: { "content-type": "application/json" },
          }),
        );
      }
      return orig(input, init);
    };
  });
  let lastPath = "";
  for (const route of ROUTES) {
    const stubKind = route.path === "/" ? "guest" : "live";
    if (lastPath) {
      await page.evaluate((kind) => {
        window.sessionStorage.setItem("aipo-qa-stub", kind);
      }, stubKind);
    }
    if (lastPath !== route.path) {
      await page.unrouteAll({ behavior: "ignoreErrors" }).catch(() => {});
      await stubRoute(page, route.path);
      lastPath = route.path;
    }
    for (const vp of VIEWPORTS) {
      const pageErrors = [];
      page.removeAllListeners("pageerror");
      page.on("pageerror", (err) => pageErrors.push(String(err?.message || err)));
      await page.setViewportSize(vp);
      await gotoSafe(page, runtime.baseUrl + route.path);
      if (route.path === "/") {
        await expect(page.locator(HOME_READY).first()).toBeVisible({ timeout: 45000 });
        await expect(
          page
            .locator(
              '[data-testid="guest-cta-signup"], [data-testid="home-authenticated"], [data-testid="home-session-unavailable"]',
            )
            .first(),
        ).toBeVisible();
      } else {
        await expect(page.getByTestId(route.testId)).toBeVisible({ timeout: 45000 });
        await expect(page.getByTestId(route.cta)).toBeVisible();
      }
      const overflow = await page.evaluate(() => {
        const root = document.scrollingElement || document.documentElement;
        return root.scrollWidth > root.clientWidth + 1;
      });
      expect(overflow, `${engine} ${route.path} ${vp.width} overflow`).toBe(false);
      expect(pageErrors, `${engine} ${route.path} pageerror`).toEqual([]);
      await assertKeyboardReachable(page, engine, route.path, vp.width);
    }
  }
  await page.evaluate(() => {
    window.sessionStorage.setItem("aipo-qa-stub", "guest");
  });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 390, height: 693 });
  await page.unrouteAll({ behavior: "ignoreErrors" }).catch(() => {});
  await stubGuestApis(page);
  await gotoSafe(page, runtime.baseUrl + "/");
  await expect(page.locator(HOME_READY).first()).toBeVisible({ timeout: 45000 });
  const motion = await page.evaluate(() =>
    window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  expect(motion, `${engine} reduced-motion`).toBe(true);
});
