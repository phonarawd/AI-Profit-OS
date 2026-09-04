/**
 * REL-120~130 Account journey.
 * 실제 구현된 /me 경로만. production URL 0.
 */
const { test, expect } = require("@playwright/test");
const { assertQaIsolation } = require("../lib/qa-env-isolation-guard.cjs");
const { ensureLocalWebRuntime } = require("../lib/local-web-runtime.cjs");
const {
  stubAccountHub,
  stubInbox,
  stubInvite,
  stubKyc,
  stubSettings,
} = require("../lib/account-route-stubs.cjs");
const { blockingViolations } = require("../lib/axe-scan.cjs");

test.describe.configure({ timeout: 240000 });
let runtime;
test.beforeAll(async () => {
  assertQaIsolation({ purpose: "e2e", databaseUrl: "", projectRef: "" });
  runtime = await ensureLocalWebRuntime({ timeoutMs: 180000 });
}, { timeout: 180000 });
test.afterAll(async () => {
  if (runtime) await runtime.stop();
});

async function go(page, path, stub, testId) {
  await page.unrouteAll({ behavior: "ignoreErrors" }).catch(() => {});
  if (stub) await stub(page, "ready");
  await page.goto(`${runtime.baseUrl}${path}`, { waitUntil: "load" });
  await expect(page.getByTestId(testId)).toBeVisible({ timeout: 20000 });
  await expect(page.getByTestId("app-shell")).toHaveCount(0);
}

test("account journey: hub → inbox → settings → guides → legal", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1080 });
  await go(page, "/me", stubAccountHub, "me-hub");
  await go(page, "/me/inbox", stubInbox, "inbox-page");
  await go(page, "/me/invite", stubInvite, "invite-home-page");
  await go(page, "/me/settings", stubSettings, "settings-page");
  await go(page, "/me/kyc", stubKyc, "kyc-page");
  await go(page, "/me/support", null, "support-page");
  // D1 remediation note (2026-09-04, REM-D1-6E): /me/peotteok's ai-orb only
  // renders once fetchAuthSession() resolves view="ready" (GET
  // /api/v1/auth/session). This go() call previously passed a null stub, so
  // with no real Nest backend reachable in this harness the fetch failed and
  // view stayed "unauthorized"/"unavailable" - the assertion right below
  // could never pass. stubAccountHub intercepts exactly that endpoint (same
  // stub already used for "/me" above), so reuse it here too.
  await go(page, "/me/peotteok", stubAccountHub, "peotteok-page");
  await expect(page.getByTestId("peotteok-ai-orb")).toBeVisible();
  await go(page, "/me/guide/faq", null, "guide-faq");
  await go(page, "/me/guide/partners", null, "guide-partners");
  await expect(page.getByTestId("market-partner-grid")).toBeVisible();
  await go(page, "/me/legal", null, "legal-hub");
  await go(page, "/me/events", null, "events-page");
  await expect(page.getByText("골격")).toHaveCount(0);
  await go(page, "/me/strategies", null, "strategies-page");
  await expect(page.getByText("도메인 todo")).toHaveCount(0);
  await go(page, "/me/membership", null, "membership-page");
  await go(page, "/me/benefits", null, "benefits-page");
  await expect(page.getByText('membership: "sprout"')).toHaveCount(0);
  await page.screenshot({
    path: "governance/release-master/rel-130-compat/journey-1440.png",
    fullPage: false,
  });
});

test("responsive 390 / 768 / 1024 have no leftover chrome", async ({ page }) => {
  for (const [width, height] of [
    [390, 693],
    [768, 1024],
    [1024, 768],
  ]) {
    await page.setViewportSize({ width, height });
    await go(page, "/me", stubAccountHub, "me-hub");
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
    );
    expect(overflow, `${width} overflow`).toBeFalsy();
    await expect(page.getByTestId("app-shell")).toHaveCount(0);
  }
  await page.setViewportSize({ width: 390, height: 693 });
  await page.screenshot({
    path: "governance/release-master/rel-130-compat/journey-390.png",
    fullPage: false,
  });
});

test("ads and landing variants stay intended routes", async ({ page }) => {
  await page.goto(`${runtime.baseUrl}/ads`, { waitUntil: "load" });
  await expect(page.getByTestId("landing-3s")).toHaveCount(1);
  await page.goto(`${runtime.baseUrl}/l/meta`, { waitUntil: "load" });
  await expect(page.getByTestId("landing-3s")).toHaveCount(1);
});

test("hub a11y has no new critical/serious axe violations", async ({ page }) => {
  await go(page, "/me", stubAccountHub, "me-hub");
  await page.addScriptTag({ path: require.resolve("axe-core") });
  const results = await page.evaluate(async () => {
    return window.axe.run(document, {
      runOnly: { type: "tag", values: ["wcag2a", "wcag2aa"] },
    });
  });
  expect(
    blockingViolations(results),
    JSON.stringify(blockingViolations(results).map((v) => v.id)),
  ).toEqual([]);
});
