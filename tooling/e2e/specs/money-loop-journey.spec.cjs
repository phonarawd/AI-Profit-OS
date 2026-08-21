/**
 * REL-111~119 money loop journey.
 * DEV/TEST fixture only. production money mutation 0.
 */
const { test, expect } = require("@playwright/test");
const { assertQaIsolation } = require("../lib/qa-env-isolation-guard.cjs");
const { ensureLocalWebRuntime } = require("../lib/local-web-runtime.cjs");
const {
  stubMoneyLoop,
  HISTORY_JOURNAL_ID,
} = require("../lib/consumer-route-stubs.cjs");

test.describe.configure({ timeout: 180000 });
let runtime;
test.beforeAll(async () => {
  assertQaIsolation({ purpose: "e2e", databaseUrl: "", projectRef: "" });
  runtime = await ensureLocalWebRuntime({ timeoutMs: 180000 });
}, { timeout: 180000 });
test.afterAll(async () => {
  if (runtime) await runtime.stop();
});

async function hideNextDevChrome(page) {
  await page
    .addStyleTag({
      content:
        "nextjs-portal, [data-next-mark-loading], #__next-build-watcher { display: none !important; pointer-events: none !important; }",
    })
    .catch(() => {});
}

async function noOverflow(page) {
  const overflow = await page.evaluate(() => {
    const root = document.documentElement;
    return root.scrollWidth - root.clientWidth;
  });
  expect(overflow).toBeLessThanOrEqual(1);
}

async function submitWithdraw(page, destination) {
  await page.getByTestId("withdraw-amount-input").fill("10");
  if (destination) {
    await page.getByTestId("withdraw-destination-input").fill(destination);
  }
  await page.getByTestId("withdraw-step-up-challenge").click();
  await expect(page.getByTestId("withdraw-step-up-panel")).toHaveAttribute(
    "data-challenge-ready",
    "true",
  );
  await page.getByTestId("withdraw-step-up-proof").fill("1234");
  await page.getByTestId("withdraw-step-up-verify").click();
  await expect(page.getByTestId("withdraw-step-up-token-ready")).toBeAttached();
  await page.getByTestId("withdraw-amount-input").fill("10");
  if (destination) {
    await page.getByTestId("withdraw-destination-input").fill(destination);
  }
  await expect(page.getByTestId("withdraw-submit")).toBeEnabled();
  await page.getByTestId("withdraw-submit").click();
  await expect(page.getByTestId("withdraw-result")).toContainText("접수했어요");
}

async function runMoneyLoop(page, width, height, shotPrefix) {
  const pageErrors = [];
  page.on("pageerror", (err) => pageErrors.push(String(err)));
  await page.unrouteAll({ behavior: "ignoreErrors" }).catch(() => {});
  await stubMoneyLoop(page);
  await page.addInitScript(() => {
    window.localStorage.setItem("peotteok_deposit_consult_ack", "1");
  });
  await page.setViewportSize({ width, height });

  await page.goto(`${runtime.baseUrl}/wallet`, { waitUntil: "load" });
  await expect(page.getByTestId("wallet-home")).toHaveAttribute(
    "data-wallet-view",
    "ready",
  );
  await expect(page.getByTestId("app-shell")).toHaveCount(0);
  await expect(page.getByText("12.50")).toBeVisible();
  await hideNextDevChrome(page);
  await noOverflow(page);
  await page.screenshot({
    path: `governance/release-master/rel-111-119-journey/${shotPrefix}-wallet.png`,
    fullPage: false,
  });

  await page.getByTestId("wallet-deposit-cta").click();
  await expect(page).toHaveURL(/\/wallet\/deposit/);
  await expect(page.getByTestId("wallet-deposit-page")).toHaveAttribute(
    "data-address-state",
    "ready",
  );
  await expect(page.getByTestId("deposit-address-value")).toContainText("TQA");
  await expect(page.getByTestId("deposit-continue")).toHaveAttribute(
    "data-credited",
    "false",
  );

  await page.getByRole("tab", { name: "원화" }).click();
  await expect(page.getByTestId("wallet-deposit-page")).toHaveAttribute(
    "data-deposit-tab",
    "krw",
  );
  await page.getByTestId("krw-depositor-name").fill("홍길동");
  await page.getByTestId("krw-amount").fill("10000");
  await page.getByTestId("deposit-continue").click();
  await expect(page.getByTestId("krw-pending")).toBeVisible();

  await page.goto(`${runtime.baseUrl}/wallet/withdraw/usdt?mode=profit`, {
    waitUntil: "load",
  });
  await expect(page.getByTestId("wallet-withdraw-usdt")).toBeVisible();
  await submitWithdraw(page, "TQAWITHDRAWADDR116");

  await page.goto(`${runtime.baseUrl}/wallet/withdraw/krw?mode=profit`, {
    waitUntil: "load",
  });
  await expect(page.getByTestId("wallet-withdraw-krw")).toBeVisible();
  await submitWithdraw(page);

  await page.goto(`${runtime.baseUrl}/wallet/history`, { waitUntil: "load" });
  await expect(page.getByTestId("wallet-history")).toHaveAttribute(
    "data-history-view",
    "ready",
  );
  await expect(page.getByTestId("wallet-history-row")).toContainText("25.00 USDT");
  await page.getByTestId("wallet-history-row").click();
  await expect(page).toHaveURL(new RegExp(`/wallet/history/${HISTORY_JOURNAL_ID}`));
  await expect(page.getByTestId("wallet-history-detail")).toHaveAttribute(
    "data-history-detail-view",
    "ready",
  );
  await expect(page.getByTestId("history-detail-entries")).toContainText("25.00 USDT");
  await noOverflow(page);
  await page.screenshot({
    path: `governance/release-master/rel-111-119-journey/${shotPrefix}-history-detail.png`,
    fullPage: false,
  });
  expect(pageErrors, pageErrors.join("\n")).toEqual([]);
}

test("desktop money loop stays one route and one truth", async ({ page }) => {
  await runMoneyLoop(page, 1440, 1080, "desktop");
});

test("mobile money loop stays one route and one truth", async ({ page }) => {
  await runMoneyLoop(page, 390, 693, "mobile");
});

test("responsive sanity 768/1024 does not fork truth", async ({ page }) => {
  await page.unrouteAll({ behavior: "ignoreErrors" }).catch(() => {});
  await stubMoneyLoop(page);
  await page.setViewportSize({ width: 768, height: 1024 });
  await page.goto(`${runtime.baseUrl}/wallet`, { waitUntil: "load" });
  await expect(page.getByTestId("wallet-home")).toHaveAttribute(
    "data-wallet-view",
    "ready",
  );
  await expect(page.getByText("12.50")).toBeVisible();
  await page.setViewportSize({ width: 1024, height: 768 });
  await expect(page.getByText("12.50")).toBeVisible();
  await expect(page.getByTestId("app-shell")).toHaveCount(0);
});
