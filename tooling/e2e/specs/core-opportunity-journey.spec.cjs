/**
 * REL-106~110 Core Opportunity Journey.
 * DEV/TEST fixture only. production money mutation 0.
 */
const { test, expect } = require("@playwright/test");
const { assertQaIsolation } = require("../lib/qa-env-isolation-guard.cjs");
const { ensureLocalWebRuntime } = require("../lib/local-web-runtime.cjs");
const {
  stubCoreOpportunityJourney,
  TEST_OPPORTUNITY_ITEM,
  JOURNEY_TRADE_ID,
} = require("../lib/consumer-route-stubs.cjs");

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

async function startJourney(page, width, height) {
  await page.unrouteAll({ behavior: "ignoreErrors" }).catch(() => {});
  await stubCoreOpportunityJourney(page);
  await page.setViewportSize({ width, height });
  await page.goto(`${runtime.baseUrl}/`, { waitUntil: "load" });
  await expect(page.getByTestId("home-authenticated")).toBeVisible({
    timeout: 20000,
  });
  await expect(page.getByTestId("guest-first-visit")).toHaveCount(0);
  await hideNextDevChrome(page);
}

async function runJourney(page, width, height, shotPrefix) {
  await startJourney(page, width, height);
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
  await expect(page).toHaveURL(new RegExp(`/profits/${TEST_OPPORTUNITY_ITEM.id}`));
  await expect(
    page.locator("[data-sdr='capital'], [data-sdrm='capital']").locator("visible=true").first(),
  ).toContainText(TEST_OPPORTUNITY_ITEM.requiredCapitalUsdt);
  const detailCta = page.locator("[data-requires-preflight='true']").locator("visible=true").first();
  await expect(detailCta).toBeEnabled();
  await detailCta.click();
  const confirmCta = page.getByRole("button", { name: "수익 벌기", exact: true });
  await expect(confirmCta).toBeVisible();
  await expect(page.locator("[data-sdr-sheet]")).toContainText(
    TEST_OPPORTUNITY_ITEM.requiredCapitalUsdt,
  );
  await confirmCta.click();
  await expect(page).toHaveURL(new RegExp(`/trades/${JOURNEY_TRADE_ID}/execute`), {
    timeout: 20000,
  });
  await expect(page.getByTestId("trade-execute")).toHaveAttribute(
    "data-consumer-state",
    "MatchingInProgress",
  );
  await expect(page.getByText("확정 수익")).toHaveCount(0);
  await page.getByRole("link", { name: "참여 내역" }).click();
  await expect(page.getByTestId("trades-shell")).toHaveAttribute(
    "data-list-state",
    "ready",
    { timeout: 20000 },
  );
  await expect(
    page.locator(`[href="/trades/${JOURNEY_TRADE_ID}/execute"]`),
  ).toBeVisible();
  await page.screenshot({
    path: `governance/release-master/rel-106-110-journey/${shotPrefix}.png`,
    fullPage: false,
  });
}

test("desktop core journey keeps identity and required capital", async ({
  page,
}) => {
  await runJourney(page, 1440, 1080, "desktop-1440");
});

test("mobile core journey keeps identity and required capital", async ({
  page,
}) => {
  await runJourney(page, 390, 693, "mobile-390");
});
