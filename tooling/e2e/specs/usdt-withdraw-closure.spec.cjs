/**
 * REL-116 — UsdtWithdraw (/wallet/withdraw/usdt)
 */
const { test, expect } = require("@playwright/test");
const { assertQaIsolation } = require("../lib/qa-env-isolation-guard.cjs");
const { ensureLocalWebRuntime } = require("../lib/local-web-runtime.cjs");
const { stubWithdraw } = require("../lib/consumer-route-stubs.cjs");
const { assertFourBreakpointA11y } = require("../lib/four-breakpoint-a11y.cjs");

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

async function openUsdt(page, mode, width = 1440, height = 1080) {
  await page.unrouteAll({ behavior: "ignoreErrors" }).catch(() => {});
  await stubWithdraw(page, mode);
  await page.setViewportSize({ width, height });
  await page.goto(`${runtime.baseUrl}/wallet/withdraw/usdt?mode=profit`, {
    waitUntil: "load",
  });
  await expect(page.getByTestId("wallet-withdraw-usdt")).toBeVisible({
    timeout: 20000,
  });
  await hideNextDevChrome(page);
}

async function submitUsdt(page) {
  await expect(page.getByTestId("withdraw-live-form")).toBeVisible();
  await page.getByTestId("withdraw-amount-input").fill("10");
  await page.getByTestId("withdraw-destination-input").fill("TQAWITHDRAWADDR116");
  await page.getByTestId("withdraw-step-up-challenge").click();
  await expect(page.getByTestId("withdraw-step-up-panel")).toHaveAttribute(
    "data-challenge-ready",
    "true",
  );
  await page.getByTestId("withdraw-step-up-proof").fill("1234");
  await page.getByTestId("withdraw-step-up-verify").click();
  await expect(page.getByTestId("withdraw-step-up-token-ready")).toBeAttached();
  await page.getByTestId("withdraw-amount-input").fill("10");
  await page.getByTestId("withdraw-destination-input").fill("TQAWITHDRAWADDR116");
  await expect(page.getByTestId("withdraw-submit")).toBeEnabled();
  await page.getByTestId("withdraw-submit").click();
}

test("USDT withdraw happy path is accepted, not credited", async ({ page }) => {
  await openUsdt(page, "ready");
  await submitUsdt(page);
  await expect(page.getByTestId("withdraw-live-form")).toHaveAttribute(
    "data-withdraw-state",
    "accepted",
  );
  await expect(page.getByTestId("withdraw-live-form")).toHaveAttribute(
    "data-credited",
    "false",
  );
  await expect(page.getByTestId("withdraw-result")).toContainText("접수했어요");
  await expect(page.getByText("출금 완료")).toHaveCount(0);
  await page.screenshot({
    path: "governance/release-master/rel-116-usdt-withdraw/runtime-accepted-1440.png",
    fullPage: false,
  });
  await openUsdt(page, "ready", 390, 693);
  await submitUsdt(page);
  await expect(page.getByTestId("withdraw-result")).toContainText("접수했어요");
  await page.screenshot({
    path: "governance/release-master/rel-116-usdt-withdraw/runtime-accepted-390.png",
    fullPage: false,
  });
});

test("USDT withdraw deny is not a fake success", async ({ page }) => {
  await openUsdt(page, "usdt_deny");
  await submitUsdt(page);
  await expect(page.getByTestId("withdraw-live-form")).toHaveAttribute(
    "data-withdraw-state",
    "denied",
  );
  await expect(page.getByText("지금은 출금할 수 없어요.")).toBeVisible();
  await expect(page.getByText("출금 완료")).toHaveCount(0);
});

test("usdt-withdraw a11y + overflow passes 390/768/1024/1440", async ({ page }) => {
  await assertFourBreakpointA11y({
    page,
    label: "usdt-withdraw",
    open: ({ width, height }) => openUsdt(page, "ready", width, height),
  });
});
