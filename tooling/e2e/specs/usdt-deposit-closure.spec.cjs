/**
 * REL-114 — UsdtDeposit (/wallet/deposit?tab=usdt)
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

async function openDeposit(page, mode, tab = "usdt", width = 1440, height = 1080) {
  await page.unrouteAll({ behavior: "ignoreErrors" }).catch(() => {});
  await stubDeposit(page, mode);
  await page.addInitScript(() => {
    window.localStorage.setItem("peotteok_deposit_consult_ack", "1");
  });
  await page.setViewportSize({ width, height });
  await page.goto(`${runtime.baseUrl}/wallet/deposit?tab=${tab}`, {
    waitUntil: "load",
  });
  await expect(page.getByTestId("wallet-deposit-page")).toBeVisible({
    timeout: 20000,
  });
  await hideNextDevChrome(page);
}

test("USDT happy path shows server address and never credits", async ({
  page,
}) => {
  await openDeposit(page, "ready");
  await expect(page.getByTestId("wallet-deposit-page")).toHaveAttribute(
    "data-address-state",
    "ready",
  );
  await expect(page.getByTestId("deposit-address-value")).toContainText("TQA");
  await expect(page.getByTestId("deposit-continue")).toHaveAttribute(
    "data-credited",
    "false",
  );
  await expect(page.getByText("입금 완료")).toHaveCount(0);
  await page.screenshot({
    path: "governance/release-master/rel-114-usdt-deposit/runtime-ready-1440.png",
    fullPage: false,
  });
  await openDeposit(page, "ready", "usdt", 390, 693);
  await expect(page.getByTestId("deposit-address-value")).toContainText("TQA");
  await page.screenshot({
    path: "governance/release-master/rel-114-usdt-deposit/runtime-ready-390.png",
    fullPage: false,
  });
});

test("USDT deny is not a fake success", async ({ page }) => {
  await openDeposit(page, "usdt_deny");
  await expect(page.getByTestId("wallet-deposit-page")).toHaveAttribute(
    "data-address-state",
    "denied",
  );
  await expect(page.getByText("지금은 입금 주소를 열 수 없어요.")).toBeVisible();
  await expect(page.getByText("입금 완료")).toHaveCount(0);
});

test("usdt-deposit a11y + overflow passes 390/768/1024/1440", async ({ page }) => {
  await assertFourBreakpointA11y({
    page,
    label: "usdt-deposit",
    open: ({ width, height }) => openDeposit(page, "ready", "usdt", width, height),
  });
});
