/**
 * REL-117 — KrwWithdraw (/wallet/withdraw/krw)
 */
const { test, expect } = require("@playwright/test");
const { assertQaIsolation } = require("../lib/qa-env-isolation-guard.cjs");
const { ensureLocalWebRuntime } = require("../lib/local-web-runtime.cjs");
const { stubWithdraw } = require("../lib/consumer-route-stubs.cjs");
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

async function openKrw(page, mode, width = 1440, height = 1080) {
  await page.unrouteAll({ behavior: "ignoreErrors" }).catch(() => {});
  await stubWithdraw(page, mode);
  await page.setViewportSize({ width, height });
  await page.goto(`${runtime.baseUrl}/wallet/withdraw/krw?mode=profit`, {
    waitUntil: "load",
  });
  await expect(page.getByTestId("wallet-withdraw-krw")).toBeVisible({
    timeout: 20000,
  });
  await hideNextDevChrome(page);
}

async function submitKrw(page) {
  await expect(page.getByTestId("withdraw-live-form")).toBeVisible();
  await page.getByTestId("withdraw-amount-input").fill("10000");
  await page.getByTestId("withdraw-step-up-challenge").click();
  await expect(page.getByTestId("withdraw-step-up-panel")).toHaveAttribute(
    "data-challenge-ready",
    "true",
  );
  await page.getByTestId("withdraw-step-up-proof").fill("1234");
  await page.getByTestId("withdraw-step-up-verify").click();
  await expect(page.getByTestId("withdraw-step-up-token-ready")).toBeAttached();
  await page.getByTestId("withdraw-amount-input").fill("10000");
  await expect(page.getByTestId("withdraw-submit")).toBeEnabled();
  await page.getByTestId("withdraw-submit").click();
}

test("KRW withdraw happy path is accepted, not credited", async ({ page }) => {
  await openKrw(page, "ready");
  await submitKrw(page);
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
    path: "governance/release-master/rel-117-krw-withdraw/runtime-accepted-1440.png",
    fullPage: false,
  });
  await openKrw(page, "ready", 390, 693);
  await submitKrw(page);
  await expect(page.getByTestId("withdraw-result")).toContainText("접수했어요");
  await page.screenshot({
    path: "governance/release-master/rel-117-krw-withdraw/runtime-accepted-390.png",
    fullPage: false,
  });
});

test("KRW withdraw deny is not a fake success", async ({ page }) => {
  await openKrw(page, "krw_deny");
  await submitKrw(page);
  await expect(page.getByTestId("withdraw-live-form")).toHaveAttribute(
    "data-withdraw-state",
    "denied",
  );
  await expect(page.getByText("지금은 출금할 수 없어요.")).toBeVisible();
});

test("KRW withdraw a11y has no new critical/serious", async ({ page }) => {
  await openKrw(page, "ready");
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
