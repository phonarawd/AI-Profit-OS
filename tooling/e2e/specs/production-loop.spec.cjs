/**
 * REL-507 PRODUCTION_E2E.
 * One line: login -> participate -> settlement -> wallet.
 * QA isolation only. production money mutation 0.
 */
const { test, expect } = require("@playwright/test");
const { assertQaIsolation } = require("../lib/qa-env-isolation-guard.cjs");
const { ensureLocalWebRuntime } = require("../lib/local-web-runtime.cjs");
const { createAuthSession } = require("../helpers/auth-session.cjs");
const {
  PRODUCTION_LOOP_TRADE_ID,
  PRODUCTION_LOOP_EMAIL,
  productionLoopProfitUsdt,
  stubProductionLoop,
} = require("../lib/production-loop.cjs");
const { TEST_OPPORTUNITY_ITEM } = require("../lib/consumer-route-stubs.cjs");

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

test("committed helper stays isolated", () => {
  const session = createAuthSession({ personaId: "qa-lab-persona-001" });
  expect(session.cookieName).toBe("aipo_session");
  expect(session.source).toBe("committed-helper");
});

test("one line login participate settlement wallet", async ({ page }) => {
  const profit = productionLoopProfitUsdt();
  const profitLine = `${profit} USDT`;
  await page.unrouteAll({ behavior: "ignoreErrors" }).catch(() => {});
  await stubProductionLoop(page);
  await page.setViewportSize({ width: 1440, height: 1080 });

  await page.goto(`${runtime.baseUrl}/auth/login`, { waitUntil: "load" });
  await expect(page.getByTestId("auth-login")).toBeVisible({ timeout: 20000 });
  await hideNextDevChrome(page);
  await page.getByTestId("auth-email").click();
  await expect(page.getByTestId("auth-email-form")).toBeVisible();
  await page.locator('input[name="email"]').fill(PRODUCTION_LOOP_EMAIL);
  await page.getByTestId("auth-email-submit").click();
  await expect(page.getByRole("status")).toContainText("메일함을 확인해 주세요.");

  await page.reload({ waitUntil: "load" });
  await expect(page.getByTestId("home-authenticated")).toBeVisible({
    timeout: 20000,
  });
  await expect(page.getByTestId("guest-first-visit")).toHaveCount(0);
  await hideNextDevChrome(page);

  const profitsCta = page.locator('a[href="/profits"]').locator("visible=true").first();
  await expect(profitsCta).toBeVisible();
  await profitsCta.click();
  await expect(page.getByTestId("profits-shell")).toBeVisible({ timeout: 20000 });
  const card = page.locator("[data-sdp='card'], [data-sdpm='card']").locator("visible=true").first();
  await expect(card).toBeVisible();
  await expect(card).toContainText(TEST_OPPORTUNITY_ITEM.requiredCapitalUsdt);
  await card.click();
  await expect(page.getByTestId("opportunity-detail")).toHaveAttribute(
    "data-detail-state",
    "ready",
    { timeout: 20000 },
  );
  const detailCta = page.locator("[data-requires-preflight='true']").locator("visible=true").first();
  await expect(detailCta).toBeEnabled();
  await detailCta.click();
  const confirmCta = page.getByRole("button", { name: "수익 벌기", exact: true });
  await expect(confirmCta).toBeVisible();
  await confirmCta.click();
  await expect(page).toHaveURL(new RegExp(`/trades/${PRODUCTION_LOOP_TRADE_ID}/execute`), {
    timeout: 20000,
  });
  await expect(page.getByTestId("trade-execute")).toHaveAttribute(
    "data-consumer-state",
    "Settled",
  );
  await expect(page.getByText(profitLine).first()).toBeVisible();

  await page.getByRole("link", { name: "참여 내역" }).click();
  await expect(page.getByTestId("trades-shell")).toBeVisible({ timeout: 20000 });
  await page.locator("[data-settlement-link='true']").click();
  await expect(page).toHaveURL(
    new RegExp(`/trades/${PRODUCTION_LOOP_TRADE_ID}/settlement`),
  );
  await expect(page.getByTestId("settlement-shell")).toHaveAttribute(
    "data-settlement-view",
    "ready",
    { timeout: 20000 },
  );
  await expect(page.getByText(profitLine).first()).toBeVisible();
  await expect(page.getByText("25.00 USDT")).toHaveCount(0);

  await page.goto(`${runtime.baseUrl}/wallet`, { waitUntil: "load" });
  await expect(page.getByTestId("wallet-home")).toHaveAttribute(
    "data-wallet-view",
    "ready",
    { timeout: 20000 },
  );
  await expect(page.getByText(profit).first()).toBeVisible();
  await expect(page.getByTestId("app-shell")).toHaveCount(0);
});

