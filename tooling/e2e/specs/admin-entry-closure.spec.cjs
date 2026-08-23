/**
 * REL-200~207 Admin entry journey.
 * 로컬 admin 런타임. production URL fallback 0.
 */
const { test, expect } = require("@playwright/test");
const { assertQaIsolation } = require("../lib/qa-env-isolation-guard.cjs");
const { ensureLocalAdminRuntime } = require("../lib/local-admin-runtime.cjs");
const {
  runAxeOnHtml,
  blockingViolations,
} = require("../lib/axe-scan.cjs");

test.describe.configure({ timeout: 180000 });

let runtime;

test.beforeAll(async () => {
  assertQaIsolation({ purpose: "e2e", databaseUrl: "", projectRef: "" });
  runtime = await ensureLocalAdminRuntime({ timeoutMs: 180000 });
}, { timeout: 180000 });

test.afterAll(async () => {
  if (runtime) await runtime.stop();
});

async function openAdmin(page, pathName, width, height) {
  await page.setViewportSize({ width, height });
  await page.goto(`${runtime.baseUrl}${pathName}`, {
    waitUntil: "domcontentloaded",
  });
}

test("desktop dashboard is honest about missing user count", async ({ page }) => {
  await openAdmin(page, "/admin", 1440, 1080);
  await expect(page.getByRole("heading", { name: "한눈에 보기" })).toBeVisible();
  await expect(page.getByTestId("admin-user-count")).toContainText("확인할 수 없음");
  await expect(page.locator('[data-testid="app-shell"]')).toHaveCount(0);
  await expect(page.locator('[data-testid="bottom-nav-5"]')).toHaveCount(0);
});

test("mobile users list stays unavailable and jump is present", async ({ page }) => {
  await openAdmin(page, "/admin/users", 390, 693);
  await expect(page.getByRole("heading", { name: "회원 관리" })).toBeVisible();
  await expect(page.getByTestId("admin-users-list")).toContainText("확인할 수 없음");
  await expect(page.locator("#admin-user-jump")).toBeVisible();
});

test("ledger wallet and compliance routes render without leftover stub-only copy", async ({
  page,
}) => {
  await openAdmin(page, "/admin/ledger", 1024, 768);
  await expect(page.getByRole("heading", { name: "입출금·정산 장부" })).toBeVisible();
  await expect(page.locator("text=Admin §9.1.1 골격")).toHaveCount(0);

  await openAdmin(page, "/admin/wallet", 768, 1024);
  await expect(page.getByRole("heading", { name: "입출금 관리" })).toBeVisible();

  await openAdmin(page, "/admin/compliance?tab=kyc", 1440, 1080);
  await expect(page.getByRole("heading", { name: "법적 확인·제재" })).toBeVisible();
  await expect(page.getByTestId("compliance-kyc-panel")).toBeVisible();
  await expect(page.locator("text=Admin §9.1.1 골격")).toHaveCount(0);
});

test("dashboard axe has no new critical/serious", async ({ page }) => {
  await openAdmin(page, "/admin", 1440, 1080);
  const html = await page.content();
  const results = await runAxeOnHtml(html);
  expect(blockingViolations(results)).toEqual([]);
});
