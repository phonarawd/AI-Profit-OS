"use strict";

const { test, expect } = require("@playwright/test");
const { assertQaIsolation } = require("../lib/qa-env-isolation-guard.cjs");
const { ensureLocalWebRuntime } = require("../lib/local-web-runtime.cjs");

test.describe.configure({ timeout: 300000 });

let runtime;

const SHELL_ROUTES = [
  "/wallet",
  "/wallet/history",
  "/trades",
  "/me/settings",
  "/me/inbox",
  "/me/peotteok",
  "/me/guide/partners",
];

const AUTH_ROUTES = ["/auth/login", "/auth/signup", "/onboarding"];

async function open(page, route, width, height) {
  await page.setViewportSize({ width, height });
  const response = await page.goto(`${runtime.baseUrl}${route}`, { waitUntil: "domcontentloaded" });
  expect(response, `${route} should return a response`).not.toBeNull();
  expect(response.status(), `${route} should stay below 500`).toBeLessThan(500);
  await page.waitForTimeout(150);
  const metrics = await page.evaluate(() => ({
    width: window.innerWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  expect(metrics.scrollWidth, `${route} horizontal overflow`).toBeLessThanOrEqual(metrics.width + 2);
}

test.beforeAll(async () => {
  assertQaIsolation({ purpose: "e2e", databaseUrl: "", projectRef: "" });
  runtime = await ensureLocalWebRuntime({ timeoutMs: 180000 });
}, { timeout: 180000 });

test.afterAll(async () => {
  if (runtime) await runtime.stop();
});

test("desktop app routes share one Spark Dash shell and do not collapse to mobile width", async ({ page }) => {
  for (const route of SHELL_ROUTES) {
    await open(page, route, 1440, 1080);
    await expect(page.getByTestId("consumer-spark-shell")).toBeVisible();
    await expect(page.getByTestId("consumer-spark-sidebar")).toBeVisible();
    await expect(page.getByTestId("consumer-spark-topbar")).toBeVisible();
    await expect(page.locator(".csp-bottom-nav")).toBeHidden();
  }

  for (const route of ["/me/settings", "/me/peotteok"]) {
    await open(page, route, 1440, 1080);
    const frame = page.locator("[data-account-view]").first();
    await expect(frame).toBeVisible();
    const box = await frame.boundingBox();
    expect(box, `${route} account frame should have a box`).not.toBeNull();
    expect(box.width, `${route} must not remain a 672px legacy column`).toBeGreaterThan(800);
  }
});

test("mobile app routes use the Spark mobile header and bottom navigation", async ({ page }) => {
  for (const route of SHELL_ROUTES) {
    await open(page, route, 390, 844);
    await expect(page.getByTestId("consumer-spark-shell")).toBeVisible();
    await expect(page.getByTestId("consumer-spark-sidebar")).toBeHidden();
    await expect(page.locator(".csp-mobile-header")).toBeVisible();
    await expect(page.locator(".csp-bottom-nav")).toBeVisible();
  }
});

test("auth and onboarding use full Spark Dash responsive guest composition", async ({ page }) => {
  for (const route of AUTH_ROUTES) {
    await open(page, route, 1440, 1080);
    await expect(page.getByTestId("guest-chrome")).toBeVisible();
    await expect(page.locator(".csp-auth-story")).toBeVisible();
    const panel = await page.locator(".csp-auth-panel").boundingBox();
    expect(panel).not.toBeNull();
    expect(panel.width).toBeGreaterThan(500);
  }

  for (const route of AUTH_ROUTES) {
    await open(page, route, 390, 844);
    await expect(page.getByTestId("guest-chrome")).toBeVisible();
    await expect(page.locator(".csp-auth-story")).toBeHidden();
  }
});

test("Founder-locked native Spark surfaces keep their dedicated presentation", async ({ page }) => {
  for (const route of ["/", "/me", "/profits"]) {
    await open(page, route, 1440, 1080);
    await expect(page.getByTestId("consumer-spark-shell")).toHaveCount(0);
  }
});
