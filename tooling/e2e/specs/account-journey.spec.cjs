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
  await go(page, "/me/peotteok", null, "peotteok-page");
  await expect(page.getByTestId("peotteok-ai-orb")).toBeVisible();
  await go(page, "/me/guide/faq", null, "guide-faq");
  await go(page, "/me/guide/partners", null, "guide-partners");
  await expect(page.getByTestId("market-partner-grid")).toBeVisible();
  await go(page, "/me/legal", null, "legal-hub");
  await go(page, "/me/events", null, "events-page");
  await expect(page.getByText("골격")).toHaveCount(0);
  await go(page, "/me/strategies", null, "strategies-page");
  await expect(page.getByTestId("strategies-page")).toHaveAttribute(
    "data-account-view",
    "ready",
  );
  await expect(
    page.getByText("지금은 확인할 수 있는 전략이 없어요."),
  ).toBeVisible();
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

test("strategies ready empty has no leftover chrome or fake money", async ({
  page,
}) => {
  for (const [width, height] of [
    [390, 844],
    [768, 1024],
    [1024, 768],
    [1440, 1080],
  ]) {
    await page.setViewportSize({ width, height });
    await go(page, "/me/strategies", null, "strategies-page");
    const root = page.getByTestId("strategies-page");
    await expect(root).toBeVisible();
    await expect(root).toHaveAttribute("data-account-view", "ready");
    await expect(page.getByRole("heading", { level: 1, name: "내 전략" })).toBeVisible();
    await expect(
      page.getByText("지금은 확인할 수 있는 전략이 없어요."),
    ).toBeVisible();
    await expect(page.getByTestId("app-shell")).toHaveCount(0);
    await expect(page.getByText("0 USDT")).toHaveCount(0);
    await expect(page.getByText("0 KRW")).toHaveCount(0);
    await expect(page.getByText("ROI")).toHaveCount(0);
    await expect(page.getByText("도메인 todo")).toHaveCount(0);
    const overflow = await page.evaluate(
      () =>
        document.documentElement.scrollWidth >
        document.documentElement.clientWidth + 1,
    );
    expect(overflow, `${width} overflow`).toBeFalsy();
  }
});

test("strategies a11y has no new critical/serious axe violations", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1080 });
  await go(page, "/me/strategies", null, "strategies-page");
  await expect(page.getByTestId("strategies-page")).toHaveAttribute(
    "data-account-view",
    "ready",
  );
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

