/**
 * REL-110 — Matching result (/trades).
 * 로컬 web 런타임. production URL fallback 0.
 */
const { test, expect } = require("@playwright/test");
const { assertQaIsolation } = require("../lib/qa-env-isolation-guard.cjs");
const { ensureLocalWebRuntime } = require("../lib/local-web-runtime.cjs");
const { stubTradeList } = require("../lib/consumer-route-stubs.cjs");
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

async function openTrades(page, mode, width = 1440, height = 1080) {
  await page.unrouteAll({ behavior: "ignoreErrors" }).catch(() => {});
  await stubTradeList(page, mode);
  await page.setViewportSize({ width, height });
  await page.goto(`${runtime.baseUrl}/trades`, { waitUntil: "load" });
  await expect(page.getByTestId("trades-shell")).toBeVisible({ timeout: 20000 });
  await hideNextDevChrome(page);
}

test("axe fixture still flags unlabeled controls (harness not weakened)", async () => {
  const html =
    '<!doctype html><html lang="ko"><head><title>퍼뜩</title></head><body><button></button></body></html>';
  const results = await runAxeOnHtml(html);
  expect(blockingViolations(results).length).toBeGreaterThan(0);
});

test("401 is unauthorized, not empty", async ({ page }) => {
  await openTrades(page, "unauthorized");
  await expect(page.getByTestId("trades-shell")).toHaveAttribute(
    "data-list-state",
    "unauthorized",
  );
  await expect(page.getByText("로그인하면 참여 내역을 볼 수 있어요.")).toBeVisible();
  await expect(page.getByText("아직 참여한 기회가 없어요.")).toHaveCount(0);
  await expect(page.getByTestId("app-shell")).toHaveCount(0);
});

test("500 is unavailable, not empty success", async ({ page }) => {
  await openTrades(page, "error");
  await expect(page.getByTestId("trades-shell")).toHaveAttribute(
    "data-list-state",
    "unavailable",
  );
  await expect(page.getByText("참여 목록을 불러오지 못했어요.")).toBeVisible();
  await expect(page.getByText("아직 참여한 기회가 없어요.")).toHaveCount(0);
  await expect(page.getByText("정산이 반영됐어요.")).toHaveCount(0);
});

test("empty list is empty, not error", async ({ page }) => {
  await openTrades(page, "empty", 390, 693);
  await expect(page.getByTestId("trades-shell")).toHaveAttribute(
    "data-list-state",
    "empty",
  );
  await expect(page.getByText("아직 참여한 기회가 없어요.")).toBeVisible();
  await expect(page.getByRole("link", { name: "다른 기회 보기" })).toBeVisible();
  await page.screenshot({
    path: "governance/release-master/rel-110-trades/runtime-empty-390.png",
    fullPage: false,
  });
});

test("ready list keeps expected vs confirmed and wallet owner", async ({
  page,
}) => {
  await openTrades(page, "ready");
  await expect(page.getByTestId("trades-shell")).toHaveAttribute(
    "data-list-state",
    "ready",
  );
  await expect(page.getByTestId("trades-shell")).toHaveAttribute(
    "data-profit-state",
    "ready",
  );
  await expect(page.locator("[data-consumer-state='MatchingInProgress']")).toBeVisible();
  await expect(page.locator("[data-consumer-state='Settled']")).toContainText(
    "정산 수익",
  );
  await expect(page.locator("[data-consumer-state='StoppedSafely']")).toBeVisible();
  await expect(page.getByText("지갑 수익")).toBeVisible();
  await expect(page.getByText("확정 수익")).toHaveCount(0);
  await page.screenshot({
    path: "governance/release-master/rel-110-trades/runtime-ready-1440.png",
    fullPage: false,
  });
  await openTrades(page, "ready", 390, 693);
  await page.screenshot({
    path: "governance/release-master/rel-110-trades/runtime-ready-390.png",
    fullPage: false,
  });
});

test("earnings embed uses wallet profit, not list sum", async ({ page }) => {
  await openTrades(page, "earnings_mismatch");
  const embed = page.locator("[data-earnings-embed='true']");
  await expect(embed).toHaveAttribute("data-earnings-owner", "wallet.profitUsdt");
  await expect(embed).toHaveAttribute("data-earnings-state", "ready");
  await expect(embed.getByText("4.00 USDT")).toBeVisible();
  await expect(embed.getByText("12.50 USDT")).toHaveCount(0);
  await expect(page.locator("[data-consumer-state='Settled']")).toContainText(
    "12.50 USDT",
  );
  await expect(embed.getByText("원")).toHaveCount(0);
  await page.screenshot({
    path: "governance/release-master/rel-111-earnings/runtime-mismatch-1440.png",
    fullPage: false,
  });
});

test("wallet profit failure is unavailable, not zero", async ({ page }) => {
  await openTrades(page, "profit_unavailable");
  await expect(page.getByTestId("trades-shell")).toHaveAttribute(
    "data-profit-state",
    "unavailable",
  );
  await expect(page.getByText("확인할 수 없음")).toBeVisible();
  await expect(page.getByText("0.00 USDT")).toHaveCount(0);
  await expect(page.getByTestId("trades-shell")).toHaveAttribute(
    "data-list-state",
    "ready",
  );
});

test("trades a11y has no new critical/serious axe violations", async ({
  page,
}) => {
  await openTrades(page, "ready");
  const run = async () => {
    await page.addScriptTag({ path: require.resolve("axe-core") });
    return page.evaluate(async () => {
      return window.axe.run(document, {
        runOnly: { type: "tag", values: ["wcag2a", "wcag2aa"] },
      });
    });
  };
  const results = await run();
  const blocking = blockingViolations(results);
  expect(blocking, JSON.stringify(blocking.map((v) => v.id))).toEqual([]);
});
