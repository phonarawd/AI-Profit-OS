"use strict";

const { test, expect } = require("@playwright/test");
const { assertQaIsolation } = require("../lib/qa-env-isolation-guard.cjs");
const { ensureLocalWebRuntime } = require("../lib/local-web-runtime.cjs");

test.describe.configure({ timeout: 300000 });

let runtime;
const ID = "00000000-0000-4000-8000-000000000000";

const SHELL_ROUTES = [
  "/wallet",
  "/wallet/deposit",
  "/wallet/withdraw",
  "/wallet/withdraw/usdt",
  "/wallet/withdraw/krw",
  "/wallet/history",
  `/wallet/history/${ID}`,
  "/trades",
  `/trades/${ID}/execute`,
  `/trades/${ID}/settlement`,
  "/me/benefits",
  "/me/events",
  "/me/guide/faq",
  "/me/guide/get-usdt",
  "/me/guide/market-weekly",
  "/me/guide/partners",
  "/me/guide/principal",
  "/me/guide/revenue",
  "/me/guide/usdt",
  "/me/inbox",
  "/me/invite",
  "/me/kyc",
  "/me/legal",
  "/me/legal/license",
  "/me/legal/oss",
  "/me/legal/privacy",
  "/me/legal/terms",
  "/me/membership",
  "/me/peotteok",
  "/me/settings",
  "/me/strategies",
  "/me/support",
];

const AUTH_ROUTES = [
  "/auth/login",
  "/auth/signup",
  "/auth/complete-profile",
  "/onboarding",
];

const LANDING_ROUTES = ["/ads", "/ads/meta", "/l/meta"];
const NATIVE_SPARK_ROUTES = ["/", "/me", "/profits"];

async function open(page, route, width, height) {
  const pageErrors = [];
  const severeConsole = [];
  const serverErrors = [];
  page.removeAllListeners("pageerror");
  page.removeAllListeners("console");
  page.removeAllListeners("response");
  page.on("pageerror", (err) => pageErrors.push(String(err?.message || err)));
  page.on("console", (msg) => {
    if (msg.type() === "error") {
      const text = msg.text();
      if (!/\b401\b|Unauthorized|ERR_ABORTED|Failed to load resource.*401/i.test(text)) {
        severeConsole.push(text);
      }
    }
  });
  page.on("response", (res) => {
    if (res.status() >= 500) serverErrors.push(`${res.status()} ${res.url()}`);
  });

  await page.setViewportSize({ width, height });
  const targetUrl = new URL(`${runtime.baseUrl}${route}`);
  const response = await page.goto(targetUrl.toString(), { waitUntil: "load" });
  expect(response, `${route} should return a response`).not.toBeNull();
  expect(response.status(), `${route} should stay below 500`).toBeLessThan(500);

  // Let client effects settle, but do not silently accept a redirect to a different surface.
  await page.waitForTimeout(300);
  await page.waitForLoadState("domcontentloaded");
  const currentPath = new URL(page.url()).pathname;
  expect(currentPath, `${route} unexpected client navigation`).toBe(targetUrl.pathname);

  const metrics = await page.evaluate(() => ({
    width: window.innerWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  expect(metrics.scrollWidth, `${route} horizontal overflow`).toBeLessThanOrEqual(metrics.width + 2);
  expect(serverErrors, `${route} 5xx subresource responses`).toEqual([]);
  expect(pageErrors, `${route} pageerror`).toEqual([]);
  expect(severeConsole, `${route} severe console errors`).toEqual([]);
}

test.beforeAll(async () => {
  assertQaIsolation({ purpose: "e2e", databaseUrl: "", projectRef: "" });
  runtime = await ensureLocalWebRuntime({ timeoutMs: 180000 });
}, { timeout: 180000 });

test.afterAll(async () => {
  if (runtime) await runtime.stop();
});

test("all desktop app routes share one Spark Dash shell and never collapse to a legacy mobile column", async ({ page }) => {
  for (const route of SHELL_ROUTES) {
    await open(page, route, 1440, 1080);
    await expect(page.getByTestId("consumer-spark-shell")).toBeVisible();
    await expect(page.getByTestId("consumer-spark-sidebar")).toBeVisible();
    await expect(page.getByTestId("consumer-spark-topbar")).toBeVisible();
    await expect(page.locator(".csp-bottom-nav")).toBeHidden();
  }

  for (const route of ["/me/settings", "/me/peotteok", "/me/guide/partners"]) {
    await open(page, route, 1440, 1080);
    const frame = page.locator("[data-account-view]").first();
    await expect(frame).toBeVisible();
    const box = await frame.boundingBox();
    expect(box, `${route} account frame should have a box`).not.toBeNull();
    expect(box.width, `${route} must not remain a 672px legacy column`).toBeGreaterThan(800);
  }
});

test("all mobile app routes use one Spark mobile header and bottom navigation", async ({ page }) => {
  for (const route of SHELL_ROUTES) {
    await open(page, route, 390, 844);
    await expect(page.getByTestId("consumer-spark-shell")).toBeVisible();
    await expect(page.getByTestId("consumer-spark-sidebar")).toBeHidden();
    await expect(page.locator(".csp-mobile-header")).toBeVisible();
    await expect(page.locator(".csp-bottom-nav")).toBeVisible();
  }
});

test("auth, onboarding, ads and landing surfaces use full Spark Dash responsive guest composition", async ({ page }) => {
  for (const route of [...AUTH_ROUTES, ...LANDING_ROUTES]) {
    await open(page, route, 1440, 1080);
    await expect(page.getByTestId("guest-chrome")).toBeVisible();
    await expect(page.locator(".csp-auth-story")).toBeVisible();
    const panel = await page.locator(".csp-auth-panel").boundingBox();
    expect(panel).not.toBeNull();
    expect(panel.width).toBeGreaterThan(500);
  }

  for (const route of [...AUTH_ROUTES, ...LANDING_ROUTES]) {
    await open(page, route, 390, 844);
    await expect(page.getByTestId("guest-chrome")).toBeVisible();
    await expect(page.locator(".csp-auth-story")).toBeHidden();
  }
});

test("Founder-locked and native Spark surfaces keep their dedicated presentation", async ({ page }) => {
  for (const route of NATIVE_SPARK_ROUTES) {
    await open(page, route, 1440, 1080);
    await expect(page.getByTestId("consumer-spark-shell")).toHaveCount(0);
  }
});

test("responsive sanity holds at minimum and wide supported widths", async ({ page }) => {
  const criticalRoutes = ["/wallet", "/me/settings", "/auth/signup"];
  for (const width of [320, 360, 430, 1280, 1366, 1920]) {
    for (const route of criticalRoutes) {
      await open(page, route, width, width < 768 ? 844 : 1080);
    }
  }
});
