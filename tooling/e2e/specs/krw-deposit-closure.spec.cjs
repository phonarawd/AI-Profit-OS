/**
 * REL-115 — KrwDeposit (/wallet/deposit?tab=krw)
 */
const { test, expect } = require("@playwright/test");
const { assertQaIsolation } = require("../lib/qa-env-isolation-guard.cjs");
const { ensureLocalWebRuntime } = require("../lib/local-web-runtime.cjs");
const { stubDeposit } = require("../lib/consumer-route-stubs.cjs");
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

async function openKrw(page, mode, width = 1440, height = 1080) {
  await page.unrouteAll({ behavior: "ignoreErrors" }).catch(() => {});
  await stubDeposit(page, mode);
  await page.addInitScript(() => {
    window.localStorage.setItem("peotteok_deposit_consult_ack", "1");
  });
  await page.setViewportSize({ width, height });
  await page.goto(`${runtime.baseUrl}/wallet/deposit?tab=krw`, {
    waitUntil: "load",
  });
  await expect(page.getByTestId("wallet-deposit-page")).toBeVisible({
    timeout: 20000,
  });
  await hideNextDevChrome(page);
}

test("KRW happy path is pending, not credited", async ({ page }) => {
  await openKrw(page, "ready");
  await page.getByTestId("krw-depositor-name").fill("홍길동");
  await page.getByTestId("krw-amount").fill("10000");
  await page.getByTestId("deposit-continue").click();
  await expect(page.getByTestId("wallet-deposit-page")).toHaveAttribute(
    "data-krw-state",
    "pending",
  );
  await expect(page.getByTestId("krw-pending")).toBeVisible();
  await expect(page.getByText("잔액에 넣지 않았어요")).toBeVisible();
  await expect(page.getByText("입금 완료")).toHaveCount(0);
  await page.screenshot({
    path: "governance/release-master/rel-115-krw-deposit/runtime-pending-1440.png",
    fullPage: false,
  });
  await openKrw(page, "ready", 390, 693);
  await page.getByTestId("krw-depositor-name").fill("홍길동");
  await page.getByTestId("krw-amount").fill("10000");
  await page.getByTestId("deposit-continue").click();
  await expect(page.getByTestId("krw-pending")).toBeVisible();
  await page.screenshot({
    path: "governance/release-master/rel-115-krw-deposit/runtime-pending-390.png",
    fullPage: false,
  });
});

test("KRW deny is not a fake success", async ({ page }) => {
  await openKrw(page, "krw_deny");
  await page.getByTestId("krw-depositor-name").fill("홍길동");
  await page.getByTestId("krw-amount").fill("10000");
  await page.getByTestId("deposit-continue").click();
  await expect(page.getByTestId("wallet-deposit-page")).toHaveAttribute(
    "data-krw-state",
    "denied",
  );
  await expect(page.getByText("지금은 원화 입금을 신청할 수 없어요.")).toBeVisible();
});

test("krw-deposit a11y + overflow passes 390/768/1024/1440", async ({ page }) => {
  await assertFourBreakpointA11y({
    page,
    label: "krw-deposit",
    open: ({ width, height }) => openKrw(page, "ready", width, height),
  });
});
