"use strict";

const { test, expect } = require("@playwright/test");
const { assertQaIsolation } = require("../lib/qa-env-isolation-guard.cjs");
const { ensureLocalWebRuntime } = require("../lib/local-web-runtime.cjs");

test.describe.configure({ timeout: 300000 });

let runtime;

const USER_ROUTE_SAMPLES = [
  "/auth/login",
  "/auth/signup",
  "/onboarding",
  "/profits",
  "/trades",
  "/wallet",
  "/me/inbox",
  "/me/guide/partners",
];

async function openRoute(page, route, width, height) {
  await page.setViewportSize({ width, height });
  const response = await page.goto(`${runtime.baseUrl}${route}`, {
    waitUntil: "domcontentloaded",
  });
  expect(response, `${route} should return a response`).not.toBeNull();
  expect(response.status(), `${route} should stay below 500`).toBeLessThan(500);
  await expect(page.locator(".spark-global-boundary")).toHaveAttribute(
    "data-spark-global",
    "on",
  );
}

async function expectNoHorizontalOverflow(page, route) {
  const metrics = await page.evaluate(() => ({
    width: window.innerWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  expect(
    metrics.scrollWidth,
    `${route} horizontal overflow ${metrics.scrollWidth} > ${metrics.width}`,
  ).toBeLessThanOrEqual(metrics.width + 2);
}

async function cssVar(page, name) {
  return page.locator(".spark-global-boundary").evaluate((node, key) =>
    getComputedStyle(node).getPropertyValue(key).trim(),
  name);
}

test.beforeAll(async () => {
  assertQaIsolation({ purpose: "e2e", databaseUrl: "", projectRef: "" });
  runtime = await ensureLocalWebRuntime({ timeoutMs: 180000 });
}, { timeout: 180000 });

test.afterAll(async () => {
  if (runtime) await runtime.stop();
});

test("mobile/tablet user surfaces inherit the navy Spark Dash shell", async ({ page }) => {
  for (const route of USER_ROUTE_SAMPLES) {
    await openRoute(page, route, 390, 844);
    expect(await cssVar(page, "--color-lux-bg"), route).toBe("#08111f");
    expect(await cssVar(page, "--color-lux-accent"), route).toBe("#ff2e63");
    await expectNoHorizontalOverflow(page, route);
  }
});

test("desktop user surfaces inherit light canvas + accessible Spark accent", async ({ page }) => {
  for (const route of USER_ROUTE_SAMPLES) {
    await openRoute(page, route, 1440, 1080);
    expect(await cssVar(page, "--color-lux-bg"), route).toBe("#f6f7fb");
    expect(await cssVar(page, "--color-lux-accent"), route).toBe("#c81d55");
    await expectNoHorizontalOverflow(page, route);
  }
});

test("Founder-locked Home and Account Hub do not receive the global theme", async ({ page }) => {
  for (const route of ["/", "/me"]) {
    await page.setViewportSize({ width: 1440, height: 1080 });
    const response = await page.goto(`${runtime.baseUrl}${route}`, {
      waitUntil: "domcontentloaded",
    });
    expect(response).not.toBeNull();
    expect(response.status()).toBeLessThan(500);
    await expect(page.locator(".spark-global-boundary")).toHaveAttribute(
      "data-spark-global",
      "off",
    );
  }
});

test("unverified partner SVG marks stay hidden while partner names remain visible", async ({ page }) => {
  await openRoute(page, "/me/guide/partners", 1440, 1080);
  await expect(page.locator('img[src*="/brand/assets/markets/"]')).toHaveCount(0);
  await expect(page.getByText("이베이", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("아마존", { exact: true }).first()).toBeVisible();
});
