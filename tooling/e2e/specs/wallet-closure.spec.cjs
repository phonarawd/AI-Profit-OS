/**
 * REL-113 — Wallet (/wallet).
 * 로컬 web 런타임. production URL fallback 0.
 */
const { test, expect } = require("@playwright/test");
const { assertQaIsolation } = require("../lib/qa-env-isolation-guard.cjs");
const { ensureLocalWebRuntime } = require("../lib/local-web-runtime.cjs");
const { stubWallet } = require("../lib/consumer-route-stubs.cjs");
const {
  runAxeOnHtml,
  blockingViolations,
} = require("../lib/axe-scan.cjs");
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

async function openWallet(page, mode, width = 1440, height = 1080) {
  await page.unrouteAll({ behavior: "ignoreErrors" }).catch(() => {});
  await stubWallet(page, mode);
  await page.setViewportSize({ width, height });
  await page.goto(`${runtime.baseUrl}/wallet`, { waitUntil: "load" });
  await expect(page.getByTestId("wallet-home")).toBeVisible({ timeout: 20000 });
  await hideNextDevChrome(page);
}

test("axe fixture still flags unlabeled controls (harness not weakened)", async () => {
  const html =
    '<!doctype html><html lang="ko"><head><title>퍼뜩</title></head><body><button></button></body></html>';
  const results = await runAxeOnHtml(html);
  expect(blockingViolations(results).length).toBeGreaterThan(0);
});

test("401 is unauthorized, not zero buckets", async ({ page }) => {
  await openWallet(page, "unauthorized");
  await expect(page.getByTestId("wallet-home")).toHaveAttribute(
    "data-wallet-view",
    "unauthorized",
  );
  await expect(page.getByText("로그인하면 지갑을 볼 수 있어요.")).toBeVisible();
  await expect(page.getByTestId("bucket-breakdown")).toHaveCount(0);
  await expect(page.getByTestId("app-shell")).toHaveCount(0);
});

test("ready buckets stay server-owned", async ({ page }) => {
  await openWallet(page, "ready");
  await expect(page.getByTestId("wallet-home")).toHaveAttribute(
    "data-wallet-view",
    "ready",
  );
  await expect(page.getByTestId("bucket-breakdown")).toBeVisible();
  await expect(page.getByTestId("wallet-deposit-cta")).toBeVisible();
  await expect(page.getByTestId("wallet-withdraw-profit")).toHaveAttribute(
    "data-default-mode",
    "profit",
  );
  await expect(page.getByText("12.50")).toBeVisible();
  await page.screenshot({
    path: "governance/release-master/rel-113-wallet/runtime-ready-1440.png",
    fullPage: false,
  });
  await openWallet(page, "ready", 390, 693);
  await page.screenshot({
    path: "governance/release-master/rel-113-wallet/runtime-ready-390.png",
    fullPage: false,
  });
});

test("wallet a11y + overflow passes 390/768/1024/1440", async ({ page }) => {
  await assertFourBreakpointA11y({
    page,
    label: "wallet",
    open: ({ width, height }) => openWallet(page, "ready", width, height),
  });
});
