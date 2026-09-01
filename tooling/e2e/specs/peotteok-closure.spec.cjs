/**
 * REL-122 — AIInsight (/me/peotteok).
 */
const { test, expect } = require("@playwright/test");
const { assertQaIsolation } = require("../lib/qa-env-isolation-guard.cjs");
const { ensureLocalWebRuntime } = require("../lib/local-web-runtime.cjs");
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

async function stubPeotteok(page, mode) {
  await page.route("**/api/v1/**", async (route) => {
    const url = route.request().url();
    if (url.includes("/api/v1/auth/session")) {
      if (mode === "unauthorized") {
        return route.fulfill({
          status: 401,
          contentType: "application/json",
          body: JSON.stringify({ error: "unauthorized" }),
        });
      }
      if (mode === "error") {
        return route.fulfill({
          status: 500,
          contentType: "application/json",
          body: JSON.stringify({ error: "upstream_failed" }),
        });
      }
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          sessionId: "qa-peotteok-session",
          userId: "qa-peotteok-user",
          issuer: "ai-profit-os-nest",
          issuedAt: "2026-08-21T00:00:00.000Z",
          expiresAt: "2026-08-22T00:00:00.000Z",
          revoked: false,
          onboardingStage: "B_complete",
        }),
      });
    }
    if (url.includes("/api/v1/me/peotteok/chips")) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ chips: [], toneBand: "mid" }),
      });
    }
    return route.fulfill({
      status: 401,
      contentType: "application/json",
      body: JSON.stringify({ error: "unauthorized" }),
    });
  });
}

async function openPeotteok(page, mode = "ready", width = 1440, height = 1080) {
  await page.unrouteAll({ behavior: "ignoreErrors" }).catch(() => {});
  await stubPeotteok(page, mode);
  await page.setViewportSize({ width, height });
  await page.goto(`${runtime.baseUrl}/me/peotteok`, { waitUntil: "load" });
  await expect(page.getByTestId("peotteok-page")).toBeVisible({ timeout: 20000 });
}

test("unauthorized peotteok hides chat surface", async ({ page }) => {
  await openPeotteok(page, "unauthorized");
  await expect(page.getByTestId("peotteok-page")).toHaveAttribute(
    "data-account-view",
    "unauthorized",
  );
  await expect(page.getByTestId("peotteok-chat")).toHaveCount(0);
  await expect(page.getByTestId("peotteok-ai-orb")).toHaveCount(0);
  await expect(page.locator('a[href="/auth/login"]')).toBeVisible();
});

test("peotteok reuses spark-dash orb and keeps leftover chrome off", async ({
  page,
}) => {
  await openPeotteok(page, "ready");
  await expect(page.getByTestId("peotteok-ai-orb")).toBeVisible();
  await expect(page.getByText("퍼뜩은 확인된 사실만 말해요.")).toBeVisible();
  await expect(page.getByTestId("app-shell")).toHaveCount(0);
  await page.screenshot({
    path: "governance/release-master/rel-122-peotteok/runtime-ready-1440.png",
    fullPage: false,
  });
  await openPeotteok(page, "ready", 390, 693);
  await expect(page.getByTestId("peotteok-ai-orb")).toBeVisible();
  await page.screenshot({
    path: "governance/release-master/rel-122-peotteok/runtime-ready-390.png",
    fullPage: false,
  });
});

test("peotteok a11y has no new critical/serious axe violations", async ({
  page,
}) => {
  await openPeotteok(page, "ready");
  await page.addScriptTag({ path: require.resolve("axe-core") });
  const results = await page.evaluate(async () => {
    return window.axe.run(document, {
      runOnly: { type: "tag", values: ["wcag2a", "wcag2aa"] },
    });
  });
  expect(blockingViolations(results), JSON.stringify(blockingViolations(results).map((v) => v.id))).toEqual([]);
});
