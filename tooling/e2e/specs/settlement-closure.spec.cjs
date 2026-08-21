/**
 * REL-112 — SettlementDetail (/trades/[id]/settlement).
 * 로컬 web 런타임. production URL fallback 0.
 */
const { test, expect } = require("@playwright/test");
const { assertQaIsolation } = require("../lib/qa-env-isolation-guard.cjs");
const { ensureLocalWebRuntime } = require("../lib/local-web-runtime.cjs");
const {
  stubSettlement,
  SETTLEMENT_TRADE_ID,
} = require("../lib/consumer-route-stubs.cjs");
const {
  runAxeOnHtml,
  blockingViolations,
} = require("../lib/axe-scan.cjs");

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

async function openSettlement(page, mode, width = 1440, height = 1080) {
  await page.unrouteAll({ behavior: "ignoreErrors" }).catch(() => {});
  await stubSettlement(page, mode);
  await page.setViewportSize({ width, height });
  await page.goto(
    `${runtime.baseUrl}/trades/${SETTLEMENT_TRADE_ID}/settlement`,
    { waitUntil: "load" },
  );
  await expect(page.getByTestId("settlement-shell")).toBeVisible({
    timeout: 20000,
  });
  await hideNextDevChrome(page);
}

test("axe fixture still flags unlabeled controls (harness not weakened)", async () => {
  const html =
    '<!doctype html><html lang="ko"><head><title>퍼뜩</title></head><body><button></button></body></html>';
  const results = await runAxeOnHtml(html);
  expect(blockingViolations(results).length).toBeGreaterThan(0);
});

test("own settlement is ledger truth, not a client sum", async ({ page }) => {
  await openSettlement(page, "ready");
  await expect(page.getByTestId("settlement-shell")).toHaveAttribute(
    "data-settlement-view",
    "ready",
  );
  await expect(page.getByText("12.50 USDT").first()).toBeVisible();
  await expect(page.getByText("25.00 USDT")).toHaveCount(0);
  await expect(page.locator("[data-journal-state='ready']")).toBeVisible();
  await page.screenshot({
    path: "governance/release-master/rel-112-settlement/runtime-ready-1440.png",
    fullPage: false,
  });
  await openSettlement(page, "ready", 390, 693);
  await page.screenshot({
    path: "governance/release-master/rel-112-settlement/runtime-ready-390.png",
    fullPage: false,
  });
});

test("other person's journal is forbidden, not empty success", async ({
  page,
}) => {
  await openSettlement(page, "other");
  await expect(page.getByTestId("settlement-shell")).toHaveAttribute(
    "data-settlement-view",
    "forbidden",
  );
  await expect(page.getByText("다른 분의 내역은 볼 수 없어요.")).toBeVisible();
  await expect(page.getByText("정산 수익")).toHaveCount(0);
});

test("missing settlement is missing, not zero money", async ({ page }) => {
  await openSettlement(page, "missing");
  await expect(page.getByTestId("settlement-shell")).toHaveAttribute(
    "data-settlement-view",
    "missing",
  );
  await expect(page.getByText("이 정산을 찾을 수 없어요.")).toBeVisible();
  await expect(page.getByText("0.00 USDT")).toHaveCount(0);
});

test("settlement a11y has no new critical/serious axe violations", async ({
  page,
}) => {
  await openSettlement(page, "ready");
  await page.addScriptTag({ path: require.resolve("axe-core") });
  const results = await page.evaluate(async () => {
    return window.axe.run(document, {
      runOnly: { type: "tag", values: ["wcag2a", "wcag2aa"] },
    });
  });
  const blocking = blockingViolations(results);
  expect(blocking, JSON.stringify(blocking.map((v) => v.id))).toEqual([]);
});
