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
  await expect(page.getByRole("heading", { name: "오늘 필요한 일부터 확인하세요" })).toBeVisible();
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
  await expect(page.getByRole("heading", { name: "돈의 이동 기록" })).toBeVisible();
  await expect(page.locator("text=Admin §9.1.1 골격")).toHaveCount(0);

  await openAdmin(page, "/admin/wallet", 768, 1024);
  await expect(page.getByRole("heading", { name: "입출금 관리" })).toBeVisible();

  await openAdmin(page, "/admin/compliance?tab=kyc", 1440, 1080);
  await expect(page.getByRole("heading", { name: "본인 확인·이용 제한" })).toBeVisible();
  await expect(page.getByTestId("compliance-kyc-panel")).toBeVisible();
  await expect(page.locator("text=Admin §9.1.1 골격")).toHaveCount(0);
});

test("beginner shell keeps connection details collapsed and mobile navigation usable", async ({
  page,
}) => {
  await openAdmin(page, "/admin", 390, 844);
  await expect(page.getByTestId("admin-app-shell")).toBeVisible();
  await expect(page.locator("#admin-bearer")).toHaveCount(0);
  await page.getByRole("button", { name: "전체 메뉴 열기" }).click();
  await expect(page.getByRole("navigation", { name: "운영 메뉴" })).toBeVisible();
  await expect(page.getByRole("link", { name: "오늘 할 일" })).toHaveAttribute(
    "aria-current",
    "page",
  );
  await page.locator(".admin-sidebar-close").click();
});

test("dashboard axe has no new critical/serious", async ({ page }) => {
  await openAdmin(page, "/admin", 1440, 1080);
  const html = await page.content();
  const results = await runAxeOnHtml(html);
  expect(blockingViolations(results)).toEqual([]);
});
