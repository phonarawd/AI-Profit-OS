/**
 * REL-603 — automated age-band usability cohort runs on staging preview.
 * 9 cohorts × 4 scenarios (signup · opportunity · participate entry · wallet).
 * Human participants 0 · production mutation 0 · MCP-only evidence 0.
 *
 * Browser assertions load the real staging UI bundle. API state is isolated with
 * committed QA route stubs so interaction tests are deterministic and cannot
 * mutate production/staging money state. Live staging route GETs are verified
 * separately by tooling/verify/rel-603-age-usability-spotcheck.cjs.
 */
const fs = require("node:fs");
const path = require("node:path");
const { test, expect } = require("@playwright/test");
const { assertQaIsolation } = require("../lib/qa-env-isolation-guard.cjs");
const { runAxeOnHtml, blockingViolations } = require("../lib/axe-scan.cjs");
const {
  TEST_OPPORTUNITY_ITEM,
  stubCoreOpportunityJourney,
  stubGuestApis,
  stubOpportunityFeed,
  stubOpportunityRoom,
  stubWallet,
} = require("../lib/consumer-route-stubs.cjs");

const root = path.resolve(__dirname, "../../..");
const fixture = JSON.parse(
  fs.readFileSync(
    path.join(root, "tooling/verify/fixtures/rel-603-age-usability-spotcheck.v1.json"),
    "utf8",
  ),
);

const baseUrl =
  process.env.REL603_STAGING_WEB ||
  process.env.PLAYWRIGHT_BASE_URL ||
  fixture.stagingWeb;

test.beforeAll(() => {
  assertQaIsolation({ purpose: "e2e", databaseUrl: "", projectRef: "" });
  if (!baseUrl.includes("ai-profit-web-preview")) {
    throw new Error("REL-603 requires staging preview web origin");
  }
  for (const host of fixture.forbiddenHosts || []) {
    if (baseUrl.includes(host)) {
      throw new Error("REL-603 forbidden host " + host);
    }
  }
});

function forbiddenHit(html) {
  const lower = html.toLowerCase();
  for (const token of fixture.forbiddenTokens || []) {
    if (lower.includes(String(token).toLowerCase())) return token;
  }
  return null;
}

function includesAny(html, needles) {
  const lower = html.toLowerCase();
  return (needles || []).some((n) => lower.includes(String(n).toLowerCase()));
}

async function gotoStaging(page, cohort, scenario) {
  const url = baseUrl.replace(/\/$/, "") + scenario.path;
  const res = await page.goto(url, {
    waitUntil: "domcontentloaded",
    timeout: 60_000,
  });
  expect(res, cohort.id + " " + scenario.id + " response").not.toBeNull();
  expect(scenario.expectStatus).toContain(res.status());
  return res;
}

async function assertSurfaceSafety(page, cohort, scenario) {
  const html = await page.content();
  const bad = forbiddenHit(html);
  expect(bad, cohort.id + " " + scenario.id + " forbidden token").toBeNull();
  expect(
    includesAny(html, scenario.mustIncludeAny),
    cohort.id + " " + scenario.id + " expected marker",
  ).toBeTruthy();

  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
  );
  expect(overflow, cohort.id + " " + scenario.id + " horizontal overflow").toBeFalsy();
  return html;
}

async function runSignup(page, cohort, scenario) {
  await stubGuestApis(page);
  await gotoStaging(page, cohort, scenario);

  await expect(page.getByTestId("auth-signup")).toBeVisible({ timeout: 20_000 });
  const emailToggle = page.getByTestId("auth-email-toggle");
  await expect(emailToggle).toBeEnabled();
  await emailToggle.click();

  const emailForm = page.getByTestId("auth-email-form");
  const emailSubmit = page.getByTestId("auth-email-submit");
  const terms = page.getByTestId("auth-terms").locator('input[name="terms"]');
  await expect(emailForm).toBeVisible();
  await expect(emailSubmit).toBeDisabled();
  await terms.check();
  await expect(emailSubmit).toBeEnabled();

  const html = await assertSurfaceSafety(page, cohort, scenario);
  const axe = await runAxeOnHtml(html);
  const blocking = blockingViolations(axe, []);
  expect(blocking, cohort.id + " S1 axe blocking").toHaveLength(0);
}

async function runOpportunity(page, cohort, scenario) {
  await stubOpportunityFeed(page, "ready");
  await gotoStaging(page, cohort, scenario);

  await expect(page.getByTestId("profits-shell")).toHaveAttribute(
    "data-profits-state",
    "READY",
    { timeout: 20_000 },
  );
  const card = page
    .locator("[data-sdp='card'], [data-sdpm='card']")
    .locator("visible=true")
    .first();
  await expect(card).toBeVisible();
  await expect(card).toHaveAttribute("href", `/profits/${TEST_OPPORTUNITY_ITEM.id}`);
  await expect(card).toContainText(TEST_OPPORTUNITY_ITEM.requiredCapitalUsdt);

  await assertSurfaceSafety(page, cohort, scenario);
}

async function runParticipateEntry(page, cohort, scenario) {
  let preflightRequests = 0;
  let participateRequests = 0;
  page.on("request", (request) => {
    const url = request.url();
    if (url.includes("/preflight")) preflightRequests += 1;
    if (url.includes("/participate") && !url.includes("/preflight")) {
      participateRequests += 1;
    }
  });

  // Reuse the repository's proven REL-106~110 full journey stub contract so
  // detail hydration has the same read-model support as the canonical journey.
  // The test still stops before confirmation and asserts participate POST = 0.
  await stubCoreOpportunityJourney(page);
  await gotoStaging(page, cohort, scenario);

  await expect(page.getByTestId("profits-shell")).toHaveAttribute(
    "data-profits-state",
    "READY",
    { timeout: 20_000 },
  );
  const card = page
    .locator("[data-sdp='card'], [data-sdpm='card']")
    .locator("visible=true")
    .first();
  await expect(card).toBeVisible();
  await card.click();

  // Match the already-proven core journey ordering: first require the dynamic
  // detail read model to hydrate, then verify the canonical detail URL.
  await expect(page.getByTestId("opportunity-detail")).toHaveAttribute(
    "data-detail-state",
    "ready",
    { timeout: 20_000 },
  );
  await expect(page).toHaveURL(new RegExp(`/profits/${TEST_OPPORTUNITY_ITEM.id}$`));

  const detailCta = page
    .locator("[data-requires-preflight='true']")
    .locator("visible=true")
    .first();
  await expect(detailCta).toBeEnabled();
  await detailCta.click();

  await expect.poll(() => preflightRequests).toBe(1);
  await expect(page.locator("[data-sdr-sheet]")).toBeVisible({ timeout: 20_000 });
  await expect(page.getByRole("button", { name: "수익 벌기", exact: true })).toBeVisible();
  expect(
    participateRequests,
    cohort.id + " S3 must stop before participate POST",
  ).toBe(fixture.participatePostRequestsExpected);

  await assertSurfaceSafety(page, cohort, scenario);
}

async function runWallet(page, cohort, scenario) {
  await stubWallet(page, "ready");
  await gotoStaging(page, cohort, scenario);

  await expect(page.getByTestId("wallet-home")).toHaveAttribute(
    "data-wallet-view",
    "ready",
    { timeout: 20_000 },
  );
  await expect(page.getByTestId("wallet-deposit-cta")).toBeVisible();
  await expect(page.getByTestId("wallet-withdraw-profit")).toBeVisible();
  await expect(page.getByTestId("wallet-withdraw-principal")).toBeVisible();
  await expect(page.getByTestId("wallet-history-link")).toBeVisible();

  await assertSurfaceSafety(page, cohort, scenario);
}

for (const cohort of fixture.cohorts || []) {
  test.describe(`REL-603 cohort ${cohort.id} (${cohort.ageBand})`, () => {
    test.use({ viewport: cohort.viewport });

    for (const scenario of fixture.scenarios || []) {
      test(`${scenario.id} ${scenario.title} @ ${scenario.path}`, async ({ page }) => {
        if (scenario.id === "S1") return runSignup(page, cohort, scenario);
        if (scenario.id === "S2") return runOpportunity(page, cohort, scenario);
        if (scenario.id === "S3") return runParticipateEntry(page, cohort, scenario);
        if (scenario.id === "S4") return runWallet(page, cohort, scenario);
        throw new Error("unknown REL-603 scenario " + scenario.id);
      });
    }
  });
}
