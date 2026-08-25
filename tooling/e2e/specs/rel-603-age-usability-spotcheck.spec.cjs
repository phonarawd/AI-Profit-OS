/**
 * REL-603 — automated age-band usability cohort runs on staging preview.
 * 9 cohorts × 4 scenarios (signup · opportunity · participate entry · wallet).
 * Human participants 0 · production mutation 0 · MCP-only evidence 0.
 *
 * Route stubs: stubGuestApis · stubOpportunityFeed · stubCoreOpportunityJourney ·
 * stubOpportunityRoom (catalog parity) · stubWallet
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

const DESKTOP_BREAKPOINT = 1280;
const GOTO_ATTEMPTS = 3;
const GOTO_TIMEOUT_MS = 60_000;
const GOTO_RETRY_DELAY_MS = 750;

test.describe.configure({ timeout: 180000 });

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

async function hideNextDevChrome(page) {
  await page
    .addStyleTag({
      content:
        "nextjs-portal, [data-next-mark-loading], #__next-build-watcher { display: none !important; pointer-events: none !important; }",
    })
    .catch(() => {});
}

async function stabilizePage(page) {
  await page.waitForLoadState("domcontentloaded");
  await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => {});
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isTransientNavigationError(error) {
  const msg = String(error?.message || error);
  return (
    /page\.goto: Timeout \d+ms exceeded/i.test(msg) ||
    /net::ERR_/i.test(msg) ||
    /NS_ERROR_/i.test(msg) ||
    /NS_BINDING_ABORTED/i.test(msg) ||
    /Navigation interrupted/i.test(msg) ||
    /Navigation failed because page crashed/i.test(msg) ||
    /frame was detached/i.test(msg) ||
    /Target closed/i.test(msg) ||
    /Cannot find context/i.test(msg) ||
    /Execution context was destroyed/i.test(msg)
  );
}

async function isIncompleteDocument(page, scenario) {
  try {
    const html = await page.content();
    if (!html || html.length < 400) return true;
    if (!includesAny(html, scenario.mustIncludeAny)) return true;
    const url = page.url();
    return !url || url === "about:blank" || url.startsWith("chrome-error://");
  } catch {
    return true;
  }
}

async function isRetryableRootError(page, scenario, error) {
  const msg = String(error?.message || error);
  if (
    /waiting for navigation to finish/i.test(msg) ||
    /Execution context was destroyed/i.test(msg) ||
    /Cannot find context/i.test(msg) ||
    /Target closed/i.test(msg) ||
    /frame was detached/i.test(msg)
  ) {
    return true;
  }
  if (/element\(s\) not found/i.test(msg) || /Received:\s+undefined/i.test(msg)) {
    return isIncompleteDocument(page, scenario);
  }
  return false;
}

async function gotoOnce(page, cohort, scenario) {
  const url = baseUrl.replace(/\/$/, "") + scenario.path;
  const res = await page.goto(url, {
    waitUntil: "load",
    timeout: GOTO_TIMEOUT_MS,
  });
  expect(res, cohort.id + " " + scenario.id + " response").not.toBeNull();
  expect(scenario.expectStatus).toContain(res.status());
  await hideNextDevChrome(page);
  await stabilizePage(page);
  return res;
}

async function gotoStaging(page, cohort, scenario) {
  const url = baseUrl.replace(/\/$/, "") + scenario.path;
  let lastError;
  for (let attempt = 1; attempt <= GOTO_ATTEMPTS; attempt += 1) {
    try {
      return await gotoOnce(page, cohort, scenario);
    } catch (error) {
      lastError = error;
      if (
        !isTransientNavigationError(error) ||
        attempt === GOTO_ATTEMPTS
      ) {
        throw error;
      }
      console.warn(
        `[REL-603] transient goto retry ${attempt}/${GOTO_ATTEMPTS - 1} ${cohort.id} ${scenario.id} ${url}`,
      );
      await page.goto("about:blank", { timeout: 10_000 }).catch(() => {});
      await sleep(GOTO_RETRY_DELAY_MS * attempt);
    }
  }
  throw lastError;
}

async function waitForScenarioRoot(page, cohort, scenario, check) {
  try {
    await check();
  } catch (error) {
    if (!(await isRetryableRootError(page, scenario, error))) {
      throw error;
    }
    console.warn(
      `[REL-603] transient root retry ${cohort.id} ${scenario.id} ${scenario.path}`,
    );
    await page.goto("about:blank", { timeout: 10_000 }).catch(() => {});
    await gotoOnce(page, cohort, scenario);
    await check();
  }
}

async function assertNoHorizontalOverflow(page, label) {
  await stabilizePage(page);
  let overflow = false;
  try {
    overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 2,
    );
  } catch (error) {
    const msg = String(error?.message || error);
    if (
      msg.includes("Cannot find context") ||
      msg.includes("Execution context was destroyed")
    ) {
      await stabilizePage(page);
      overflow = await page.evaluate(
        () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 2,
      );
    } else {
      throw error;
    }
  }
  expect(overflow, label + " horizontal overflow").toBeFalsy();
}

async function assertSurfaceSafety(page, cohort, scenario) {
  const html = await page.content();
  const bad = forbiddenHit(html);
  expect(bad, cohort.id + " " + scenario.id + " forbidden token").toBeNull();
  expect(
    includesAny(html, scenario.mustIncludeAny),
    cohort.id + " " + scenario.id + " expected marker",
  ).toBeTruthy();
  await assertNoHorizontalOverflow(
    page,
    cohort.id + " " + scenario.id,
  );
  return html;
}

function profitsCard(page, viewportWidth) {
  const selector =
    viewportWidth >= DESKTOP_BREAKPOINT
      ? "[data-sdp='card']"
      : "[data-sdpm='card']";
  return page.locator(selector).first();
}

async function openEmailSignupForm(page, cohort, scenario) {
  const emailToggle = page.getByTestId("auth-email-toggle");
  const emailForm = page.getByTestId("auth-email-form");

  for (let round = 0; round < 2; round++) {
    try {
      await stabilizePage(page);
      await expect(emailToggle).toBeVisible({ timeout: 20_000 });
      await emailToggle.scrollIntoViewIfNeeded().catch(() => {});

      for (let attempt = 0; attempt < 4; attempt++) {
        if (await emailForm.isVisible()) return;
        await emailToggle.click({ timeout: 10_000 });
        try {
          await emailForm.waitFor({ state: "visible", timeout: 5_000 });
          return;
        } catch {
          await emailToggle.evaluate((el) => el.click()).catch(() => {});
          try {
            await emailForm.waitFor({ state: "visible", timeout: 5_000 });
            return;
          } catch {
            // retry toggle interaction
          }
        }
      }
      await expect(emailForm).toBeVisible({ timeout: 20_000 });
      return;
    } catch (error) {
      const msg = String(error?.message || error);
      if (
        round === 0 &&
        (msg.includes("Cannot find context") ||
          msg.includes("Execution context was destroyed"))
      ) {
        await gotoStaging(page, cohort, scenario);
        continue;
      }
      throw error;
    }
  }
}

async function runSignup(page, cohort, scenario) {
  await page.unrouteAll({ behavior: "ignoreErrors" }).catch(() => {});
  await stubGuestApis(page);
  await gotoStaging(page, cohort, scenario);

  await waitForScenarioRoot(page, cohort, scenario, async () => {
    await expect(page.getByTestId("auth-signup")).toBeVisible({ timeout: 20_000 });
  });
  await openEmailSignupForm(page, cohort, scenario);

  const emailForm = page.getByTestId("auth-email-form");
  const emailSubmit = page.getByTestId("auth-email-submit");
  await expect(emailForm).toBeVisible({ timeout: 20_000 });
  await expect(emailSubmit).toBeDisabled();
  await stabilizePage(page);
  await page
    .getByTestId("auth-terms")
    .locator('input[type="checkbox"]')
    .check({ force: true });
  await expect(emailSubmit).toBeEnabled();

  const html = await assertSurfaceSafety(page, cohort, scenario);
  const axe = await runAxeOnHtml(html);
  const blocking = blockingViolations(axe, []);
  expect(blocking, cohort.id + " S1 axe blocking").toHaveLength(0);
}

async function runOpportunity(page, cohort, scenario) {
  await page.unrouteAll({ behavior: "ignoreErrors" }).catch(() => {});
  await stubOpportunityFeed(page, "ready");
  await gotoStaging(page, cohort, scenario);

  await waitForScenarioRoot(page, cohort, scenario, async () => {
    await expect(page.getByTestId("profits-shell")).toHaveAttribute(
      "data-profits-state",
      "READY",
      { timeout: 20_000 },
    );
  });
  const card = profitsCard(page, cohort.viewport.width);
  await expect(card).toBeVisible({ timeout: 20_000 });
  await expect(card).toHaveAttribute(
    "href",
    `/profits/${TEST_OPPORTUNITY_ITEM.id}`,
  );
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

  await page.unrouteAll({ behavior: "ignoreErrors" }).catch(() => {});
  await stubCoreOpportunityJourney(page);
  await gotoStaging(page, cohort, scenario);

  await waitForScenarioRoot(page, cohort, scenario, async () => {
    await expect(page.getByTestId("profits-shell")).toHaveAttribute(
      "data-profits-state",
      "READY",
      { timeout: 20_000 },
    );
  });
  const card = profitsCard(page, cohort.viewport.width);
  await expect(card).toBeVisible({ timeout: 20_000 });
  const detailUrl = new RegExp(`/profits/${TEST_OPPORTUNITY_ITEM.id}$`);
  await Promise.all([
    page.waitForURL(detailUrl, { timeout: 20_000 }),
    card.click(),
  ]);

  await expect(page.getByTestId("opportunity-detail")).toHaveAttribute(
    "data-detail-state",
    "ready",
    { timeout: 20_000 },
  );
  await expect(page).toHaveURL(detailUrl);

  const detailCta = page
    .locator("[data-requires-preflight='true']")
    .locator("visible=true")
    .first();
  await expect(detailCta).toBeEnabled();
  await detailCta.click();

  await expect.poll(() => preflightRequests).toBe(1);
  await expect(page.locator("[data-sdr-sheet]")).toBeVisible({ timeout: 20_000 });
  await expect(
    page.getByRole("button", { name: "수익 벌기", exact: true }),
  ).toBeVisible();
  expect(
    participateRequests,
    cohort.id + " S3 must stop before participate POST",
  ).toBe(fixture.participatePostRequestsExpected);

  await assertSurfaceSafety(page, cohort, scenario);
}

async function runWallet(page, cohort, scenario) {
  await page.unrouteAll({ behavior: "ignoreErrors" }).catch(() => {});
  await stubWallet(page, "ready");
  await gotoStaging(page, cohort, scenario);

  await waitForScenarioRoot(page, cohort, scenario, async () => {
    await expect(page.getByTestId("wallet-home")).toHaveAttribute(
      "data-wallet-view",
      "ready",
      { timeout: 20_000 },
    );
  });
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
