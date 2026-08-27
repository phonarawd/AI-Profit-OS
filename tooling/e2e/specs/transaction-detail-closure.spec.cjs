/**
 * REL-119 — TransactionDetail (/wallet/history/[journalId])
 */
const { test, expect } = require("@playwright/test");
const { assertQaIsolation } = require("../lib/qa-env-isolation-guard.cjs");
const { ensureLocalWebRuntime } = require("../lib/local-web-runtime.cjs");
const {
  stubHistory,
  HISTORY_JOURNAL_ID,
} = require("../lib/consumer-route-stubs.cjs");
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

async function openDetail(page, mode, width = 1440, height = 1080) {
  await page.unrouteAll({ behavior: "ignoreErrors" }).catch(() => {});
  await stubHistory(page, mode);
  await page.setViewportSize({ width, height });
  await page.goto(
    `${runtime.baseUrl}/wallet/history/${HISTORY_JOURNAL_ID}`,
    { waitUntil: "load" },
  );
  await expect(page.getByTestId("wallet-history-detail")).toBeVisible({
    timeout: 20000,
  });
  await hideNextDevChrome(page);
}

test("own detail is the server slip, not a recalculated win", async ({
  page,
}) => {
  await openDetail(page, "ready");
  await expect(page.getByTestId("wallet-history-detail")).toHaveAttribute(
    "data-history-detail-view",
    "ready",
  );
  await expect(page.getByTestId("history-detail-entries")).toContainText("25.00 USDT");
  await expect(page.getByText("50.00")).toHaveCount(0);
  await page.screenshot({
    path: "governance/release-master/rel-119-history-detail/runtime-ready-1440.png",
    fullPage: false,
  });
  await openDetail(page, "ready", 390, 693);
  await expect(page.getByTestId("history-detail-entries")).toContainText("25.00 USDT");
  await page.screenshot({
    path: "governance/release-master/rel-119-history-detail/runtime-ready-390.png",
    fullPage: false,
  });
});

test("another person's slip is forbidden, not empty", async ({ page }) => {
  await openDetail(page, "other");
  await expect(page.getByTestId("wallet-history-detail")).toHaveAttribute(
    "data-history-detail-view",
    "forbidden",
  );
  await expect(page.getByText("다른 분의 내역은 볼 수 없어요.")).toBeVisible();
  await expect(page.getByTestId("history-detail-entries")).toHaveCount(0);
});

test("transaction-detail a11y + overflow passes 390/768/1024/1440", async ({ page }) => {
  await assertFourBreakpointA11y({
    page,
    label: "transaction-detail",
    open: ({ width, height }) => openDetail(page, "ready", width, height),
  });
});
