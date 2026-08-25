"use strict";

const { test, expect } = require("@playwright/test");
const { assertQaIsolation } = require("../lib/qa-env-isolation-guard.cjs");
const { ensureLocalAdminRuntime } = require("../lib/local-admin-runtime.cjs");
const { runAxeOnHtml, blockingViolations } = require("../lib/axe-scan.cjs");

test.describe.configure({ timeout: 360000 });

let runtime;

const BASE_CONFIG = {
  configVersion: 1,
  krw: {
    bankName: "테스트은행",
    accountNumber: "000-000-000000",
    accountHolder: "퍼뜩 테스트",
    noticeKo: "본인 명의로 입금해 주세요.",
    krwWithdrawFeeKrw: 0,
  },
  usdtOnchain: {
    network: "TRC20",
    usdtWithdrawNetworkFeeUsdt: "1",
    sweeperPaused: false,
  },
  withdrawGuards: { minHoldingHours: 24 },
};

async function stubWalletApis(page, state) {
  await page.route("**/api/v1/admin/wallet/deposit-config", async (route) => {
    const request = route.request();
    if (request.method() === "PATCH") {
      state.patchBody = request.postDataJSON();
      const body = state.patchBody;
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          ...BASE_CONFIG,
          configVersion: 2,
          krw: { ...BASE_CONFIG.krw, ...(body.krw || {}) },
          usdtOnchain: {
            ...BASE_CONFIG.usdtOnchain,
            ...(body.usdtOnchain || {}),
          },
          withdrawGuards: {
            ...BASE_CONFIG.withdrawGuards,
            ...(body.withdrawGuards || {}),
          },
        }),
      });
    }
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(BASE_CONFIG),
    });
  });

  await page.route("**/api/v1/admin/wallet/krw-deposit-requests**", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ items: [] }),
    }),
  );
  await page.route("**/api/v1/admin/wallet/deposit-disputes", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ items: [] }),
    }),
  );
}

async function openSettings(page, width, height) {
  await page.setViewportSize({ width, height });
  const response = await page.goto(
    `${runtime.baseUrl}/admin/wallet?tab=deposit-settings`,
    { waitUntil: "domcontentloaded" },
  );
  expect(response).not.toBeNull();
  expect(response.status()).toBeLessThan(500);
  await expect(page.getByTestId("wallet-deposit-settings-panel")).toBeVisible();
  await expect(page.getByTestId("deposit-account-number")).toBeVisible();
}

async function expectNoBlockingA11y(page) {
  const result = await runAxeOnHtml(await page.content());
  const blocking = blockingViolations(result);
  expect(
    blocking,
    blocking.map((item) => `${item.id}: ${item.help}`).join("\n"),
  ).toEqual([]);
}

test.beforeAll(async () => {
  assertQaIsolation({ purpose: "e2e", databaseUrl: "", projectRef: "" });
  runtime = await ensureLocalAdminRuntime({ timeoutMs: 180000 });
}, { timeout: 180000 });

test.afterAll(async () => {
  if (runtime) await runtime.stop();
});

test("admin can edit the KRW deposit account through the audited PATCH contract", async ({ page }) => {
  const state = { patchBody: null };
  await stubWalletApis(page, state);
  await openSettings(page, 1440, 1080);

  await expect(page.getByTestId("wallet-deposit-settings-panel")).toHaveAttribute(
    "data-shared-usdt-address-edit",
    "forbidden",
  );
  await expect(page.getByText("사용자마다 전용 TRC20 입금주소를 자동 배정하며")).toBeVisible();
  await expectNoBlockingA11y(page);

  await page.getByTestId("deposit-bank-name").fill("국민은행");
  await page.getByTestId("deposit-account-holder").fill("주식회사 퍼뜩");
  await page.getByTestId("deposit-account-number").fill("12345678901234");
  await page.getByTestId("deposit-notice-ko").fill("반드시 본인 명의로 입금해 주세요.");
  await page.getByTestId("deposit-change-reason").fill("운영 입금계좌 변경");

  page.once("dialog", (dialog) => dialog.accept());
  await page.getByTestId("deposit-settings-save").click();
  await expect(page.getByText("입금 설정을 저장했습니다. 변경 기록도 함께 남았습니다.")).toBeVisible();

  expect(state.patchBody).not.toBeNull();
  expect(state.patchBody.krw).toEqual({
    bankName: "국민은행",
    accountNumber: "12345678901234",
    accountHolder: "주식회사 퍼뜩",
    noticeKo: "반드시 본인 명의로 입금해 주세요.",
    krwWithdrawFeeKrw: 0,
  });
  expect(state.patchBody.changeReason).toBe("운영 입금계좌 변경");
  expect(state.patchBody).not.toHaveProperty("sharedUsdtAddress");
  expect(Object.keys(state.patchBody.usdtOnchain || {}).sort()).toEqual([
    "sweeperPaused",
    "usdtWithdrawNetworkFeeUsdt",
  ]);
});

test("deposit settings stay usable and accessible without horizontal overflow on 390px mobile", async ({ page }) => {
  const state = { patchBody: null };
  await stubWalletApis(page, state);
  await openSettings(page, 390, 844);

  const metrics = await page.evaluate(() => ({
    width: window.innerWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  expect(metrics.scrollWidth).toBeLessThanOrEqual(metrics.width + 2);
  await expect(page.getByTestId("deposit-settings-save")).toBeVisible();
  await expectNoBlockingA11y(page);
});
