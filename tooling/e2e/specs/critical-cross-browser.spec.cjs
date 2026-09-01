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
} = require("../lib/consumer-route-stubs.cjs");
const { stubSettings, stubAccountHub } = require("../lib/account-route-stubs.cjs");

const VIEWPORTS = [
  { width: 390, height: 693 },
  { width: 768, height: 1024 },
  { width: 1024, height: 768 },
  { width: 1440, height: 1080 },
];

const ROUTES = [
  { path: "/", testId: "home-shell", cta: "home-shell" },
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
  if (path.startsWith("/profits/")) await stubOpportunityRoom(page, "ready");
  else if (path.startsWith("/wallet/deposit")) await stubDeposit(page, "ready");
  else if (path.startsWith("/wallet/withdraw")) await stubWithdraw(page, "ready");
  else if (path.startsWith("/wallet/history")) await stubHistory(page, "ready");
  else if (path.startsWith("/wallet")) await stubWallet(page, "ready");
  else if (path.startsWith("/me/settings")) await stubSettings(page, "ready");
  else if (path === "/me") await stubAccountHub(page, "ready");
}

test("critical consumer routes load without fatal overflow", async ({ page }, testInfo) => {
  const engine = testInfo.project.name;
  expect(engine === "chromium" || engine === "firefox" || engine === "webkit").toBeTruthy();
  testInfo.annotations.push({ type: "browser-engine", description: engine });
  for (const route of ROUTES) {
    for (const vp of VIEWPORTS) {
      const pageErrors = [];
      page.removeAllListeners("pageerror");
      page.on("pageerror", (err) => pageErrors.push(String(err?.message || err)));
      await page.unrouteAll({ behavior: "ignoreErrors" }).catch(() => {});
      await stubRoute(page, route.path);
      await page.addInitScript(() => {
        window.localStorage.setItem("peotteok_deposit_consult_ack", "1");
      });
      await page.setViewportSize(vp);
      await page.goto(runtime.baseUrl + route.path, { waitUntil: "load" });
      await expect(page.getByTestId(route.testId)).toBeVisible({ timeout: 20000 });
      await expect(page.getByTestId(route.cta)).toBeVisible();
      const overflow = await page.evaluate(() => {
        const root = document.scrollingElement || document.documentElement;
        return root.scrollWidth > root.clientWidth + 1;
      });
      expect(overflow, `${engine} ${route.path} ${vp.width} overflow`).toBe(false);
      expect(pageErrors, `${engine} ${route.path} pageerror`).toEqual([]);
      const focusable = page.getByTestId(route.cta);
      await focusable.focus();
      await expect(focusable).toBeFocused();
    }
  }
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 390, height: 693 });
  await page.goto(runtime.baseUrl + "/", { waitUntil: "load" });
  await expect(page.getByTestId("home-shell")).toBeVisible();
  const motion = await page.evaluate(() =>
    window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  expect(motion, `${engine} reduced-motion`).toBe(true);
});
