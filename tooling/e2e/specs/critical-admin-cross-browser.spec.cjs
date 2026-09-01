/**
 * Admin critical routes — Chromium first. Home 0.
 */
const { test, expect } = require("@playwright/test");
const { assertQaIsolation } = require("../lib/qa-env-isolation-guard.cjs");
const { ensureLocalAdminRuntime } = require("../lib/local-admin-runtime.cjs");

test.describe.configure({ timeout: 240000 });
let runtime;

test.beforeAll(async () => {
  assertQaIsolation({ purpose: "e2e", databaseUrl: "", projectRef: "" });
  runtime = await ensureLocalAdminRuntime({ timeoutMs: 180000 });
}, { timeout: 180000 });

test.afterAll(async () => {
  if (runtime) await runtime.stop();
});

test("admin entry, mobile nav, system-control readout", async ({ page }, testInfo) => {
  testInfo.annotations.push({
    type: "browser-engine",
    description: testInfo.project.name || "chromium",
  });
  const pageErrors = [];
  page.on("pageerror", (err) => pageErrors.push(String(err?.message || err)));
  await page.setViewportSize({ width: 390, height: 693 });
  await page.goto(runtime.baseUrl + "/admin", { waitUntil: "domcontentloaded" });
  await expect(page.getByTestId("admin-session-bar")).toBeVisible({ timeout: 20000 });
  const menu = page.locator(".admin-menu-button");
  await expect(menu).toBeVisible();
  await menu.click();
  if ((await page.locator(".admin-sidebar").getAttribute("data-open")) !== "true") {
    await menu.click();
  }
  await expect(page.locator(".admin-sidebar")).toHaveAttribute("data-open", "true");
  await expect(page.locator("#admin-primary-navigation")).toBeVisible();
  await page.goto(runtime.baseUrl + "/admin/system-control", {
    waitUntil: "domcontentloaded",
  });
  await expect(page.getByTestId("admin-system-control-page")).toBeVisible();
  await expect(page.getByText("반영 완료")).toHaveCount(0);
  const operatorText = await page.locator("body").innerText();
  for (const term of ["JWT", "GitHub", "Supabase", "workflow", "pipeline", "CI/CD", "E2E"]) {
    expect(operatorText.includes(term), term).toBe(false);
  }
  const overflow = await page.evaluate(() => {
    const root = document.scrollingElement || document.documentElement;
    return root.scrollWidth > root.clientWidth + 1;
  });
  expect(overflow).toBe(false);
  expect(pageErrors).toEqual([]);
});
