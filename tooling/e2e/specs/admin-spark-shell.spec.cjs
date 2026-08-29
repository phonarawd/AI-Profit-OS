"use strict";

const { test, expect } = require("@playwright/test");
const { assertQaIsolation } = require("../lib/qa-env-isolation-guard.cjs");
const { ensureLocalAdminRuntime } = require("../lib/local-admin-runtime.cjs");

test.describe.configure({ timeout: 360000 });

let runtime;

const ADMIN_ROUTES = [
  "/",
  "/admin",
  "/admin/users",
  "/admin/users/missing-id",
  "/admin/users/missing-id/finance",
  "/admin/ledger",
  "/admin/wallet",
  "/admin/adapters",
  "/admin/ai-logs",
  "/admin/audit",
  "/admin/compliance",
  "/admin/execution-policy",
  "/admin/growth",
  "/admin/growth/deposit",
  "/admin/growth/ticker",
  "/admin/growth/whale",
  "/admin/growth/content",
  "/admin/opportunities",
  "/admin/reports/financial",
  "/admin/risk",
  "/admin/support",
  "/admin/system-control",
];

async function openAdmin(page, route, width, height) {
  await page.setViewportSize({ width, height });
  const response = await page.goto(`${runtime.baseUrl}${route}`, {
    waitUntil: "domcontentloaded",
  });
  expect(response, `${route} should return a response`).not.toBeNull();
  expect(response.status(), `${route} should stay below 500`).toBeLessThan(500);
  await expect(page.getByTestId("admin-app-shell")).toBeVisible();
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

async function expectAdminTheme(page, route) {
  const values = await page.evaluate(() => {
    const style = getComputedStyle(document.body);
    return {
      bg: style.getPropertyValue("--color-pd-bg").trim(),
      accent: style.getPropertyValue("--color-pd-accent").trim(),
      text: style.getPropertyValue("--color-pd-text").trim(),
    };
  });
  expect(values.bg, route).toBe("#0b0f17");
  expect(values.accent, route).toBe("#ff2d6b");
  expect(values.text, route).toBe("#f6f7fa");
}

test.beforeAll(async () => {
  assertQaIsolation({ purpose: "e2e", databaseUrl: "", projectRef: "" });
  runtime = await ensureLocalAdminRuntime({ timeoutMs: 180000 });
}, { timeout: 180000 });

test.afterAll(async () => {
  if (runtime) await runtime.stop();
});

test("all 22 admin routes render the navy/pink shell on desktop", async ({ page }) => {
  for (const route of ADMIN_ROUTES) {
    await openAdmin(page, route, 1440, 1080);
    await expectAdminTheme(page, route);
    await expectNoHorizontalOverflow(page, route);
  }
});

test("all 22 admin routes remain usable on mobile", async ({ page }) => {
  for (const route of ADMIN_ROUTES) {
    await openAdmin(page, route, 390, 844);
    await expectAdminTheme(page, route);
    await expectNoHorizontalOverflow(page, route);
  }
});

test("mobile admin menu opens on the first click and closes cleanly", async ({ page }) => {
  await openAdmin(page, "/admin", 390, 844);
  const menuButton = page.locator(".admin-menu-button");
  await expect(menuButton).toBeVisible();
  await expect(menuButton).toHaveAttribute("aria-expanded", "false");
  await menuButton.click();
  await expect(page.getByRole("navigation", { name: "운영 메뉴" })).toBeVisible();
  await expect(menuButton).toHaveAttribute("aria-expanded", "true");
  await page.locator(".admin-sidebar-close").click();
  await expect(menuButton).toHaveAttribute("aria-expanded", "false");
});
