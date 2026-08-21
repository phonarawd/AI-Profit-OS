/**
 * REL-118 — TransactionHistory (/wallet/history)
 */
const { test, expect } = require("@playwright/test");
const { assertQaIsolation } = require("../lib/qa-env-isolation-guard.cjs");
const { ensureLocalWebRuntime } = require("../lib/local-web-runtime.cjs");
const { stubHistory } = require("../lib/consumer-route-stubs.cjs");
const { blockingViolations } = require("../lib/axe-scan.cjs");

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

async function openHistory(page, mode, width = 1440, height = 1080) {
  await page.unrouteAll({ behavior: "ignoreErrors" }).catch(() => {});
  await stubHistory(page, mode);
  await page.setViewportSize({ width, height });
  await page.goto(`${runtime.baseUrl}/wallet/history`, { waitUntil: "load" });
  await expect(page.getByTestId("wallet-history")).toBeVisible({
    timeout: 20000,
  });
  await hideNextDevChrome(page);
}

test("history list uses REL-015 rows, not a mock total", async ({ page }) => {
  await openHistory(page, "ready");
  await expect(page.getByTestId("wallet-history")).toHaveAttribute(
    "data-history-view",
    "ready",
  );
  await expect(page.getByTestId("wallet-history-row")).toContainText("25.00 USDT");
  await expect(page.getByTestId("wallet-history-next")).toBeVisible();
  await expect(page.getByText("50.00")).toHaveCount(0);
  await page.screenshot({
    path: "governance/release-master/rel-118-history/runtime-ready-1440.png",
    fullPage: false,
  });
  await openHistory(page, "ready", 390, 693);
  await expect(page.getByTestId("wallet-history-row")).toBeVisible();
  await page.screenshot({
    path: "governance/release-master/rel-118-history/runtime-ready-390.png",
    fullPage: false,
  });
});

test("empty is not unauthorized, 401 is not empty", async ({ page }) => {
  await openHistory(page, "empty");
  await expect(page.getByTestId("wallet-history")).toHaveAttribute(
    "data-history-view",
    "empty",
  );
  await expect(page.getByTestId("wallet-history-empty")).toBeVisible();
  await openHistory(page, "unauthorized");
  await expect(page.getByTestId("wallet-history")).toHaveAttribute(
    "data-history-view",
    "unauthorized",
  );
  await expect(page.getByText("로그인하면 내역을 볼 수 있어요.")).toBeVisible();
});

test("history list a11y has no new critical/serious", async ({ page }) => {
  await openHistory(page, "ready");
  await page.addScriptTag({ path: require.resolve("axe-core") });
  const results = await page.evaluate(async () =>
    window.axe.run(document, {
      runOnly: { type: "tag", values: ["wcag2a", "wcag2aa"] },
    }),
  );
  const blocking = blockingViolations(results);
  expect(
    blocking.map((v) => ({
      id: v.id,
      nodes: v.nodes.map((n) => ({
        target: n.target,
        html: String(n.html || "").slice(0, 160),
      })),
    })),
  ).toEqual([]);
});
