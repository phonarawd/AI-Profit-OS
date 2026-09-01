/**
 * REL-125 — Settings (/me/settings).
 */
const { test, expect } = require("@playwright/test");
const { assertQaIsolation } = require("../lib/qa-env-isolation-guard.cjs");
const { ensureLocalWebRuntime } = require("../lib/local-web-runtime.cjs");
const { stubSettings } = require("../lib/account-route-stubs.cjs");
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

async function overlayPrefs(page, mode) {
  if (mode === "prefs-malformed") {
    await page.route("**/api/v1/me/notification-prefs**", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ master: "true", opportunity: 1 }),
      }),
    );
    return;
  }
  if (mode === "prefs-401") {
    await page.route("**/api/v1/me/notification-prefs**", (route) =>
      route.fulfill({
        status: 401,
        contentType: "application/json",
        body: JSON.stringify({ error: "unauthorized" }),
      }),
    );
  }
}

async function openSettings(page, mode, width = 1440, height = 1080) {
  await page.unrouteAll({ behavior: "ignoreErrors" }).catch(() => {});
  await stubSettings(page, mode);
  await overlayPrefs(page, mode);
  await page.setViewportSize({ width, height });
  await page.goto(`${runtime.baseUrl}/me/settings`, { waitUntil: "load" });
  await expect(page.getByTestId("settings-page")).toBeVisible({ timeout: 20000 });
}

test("401 is unauthorized, not a fake settings success", async ({ page }) => {
  await openSettings(page, "unauthorized");
  await expect(page.getByTestId("settings-page")).toHaveAttribute(
    "data-account-view",
    "unauthorized",
  );
  await expect(page.getByText("로그인하면 설정을 볼 수 있어요.")).toBeVisible();
  await expect(page.getByTestId("settings-panel")).toHaveCount(0);
  await expect(page.getByTestId("app-shell")).toHaveCount(0);
});

test("ready settings keep isolated prefs and leftover chrome off", async ({
  page,
}) => {
  await openSettings(page, "ready");
  await expect(page.getByTestId("settings-panel")).toBeVisible();
  await expect(page.getByTestId("settings-notify")).toBeVisible();
  await expect(page.getByTestId("delete-account-submit")).toBeVisible();
  await expect(page.getByText("계정 삭제 요청이 접수되었어요.")).toHaveCount(0);
  await page.screenshot({
    path: "governance/release-master/rel-125-settings/runtime-ready-1440.png",
    fullPage: false,
  });
  await openSettings(page, "ready", 390, 693);
  await page.screenshot({
    path: "governance/release-master/rel-125-settings/runtime-ready-390.png",
    fullPage: false,
  });
});

test("malformed prefs stay unavailable and do not render all-true switches", async ({
  page,
}) => {
  await openSettings(page, "prefs-malformed");
  await expect(page.getByTestId("settings-panel")).toBeVisible();
  await expect(page.getByTestId("settings-panel")).toHaveAttribute(
    "data-prefs-view",
    "unavailable",
  );
  await expect(page.getByTestId("settings-notify")).toBeVisible();
  await expect(page.locator("[data-notify-channel]")).toHaveCount(0);
});

test("prefs 401 is unauthorized, not an all-true ready panel", async ({
  page,
}) => {
  await openSettings(page, "prefs-401");
  await expect(page.getByTestId("settings-panel")).toHaveAttribute(
    "data-prefs-view",
    "unauthorized",
  );
  await expect(page.locator("[data-notify-channel]")).toHaveCount(0);
});

test("ux prefs 401 does not show confirmed defaults", async ({ page }) => {
  await page.unrouteAll({ behavior: "ignoreErrors" }).catch(() => {});
  const { stubSettings } = require("../lib/account-route-stubs.cjs");
  await stubSettings(page, "ready");
  await page.route("**/api/v1/me/ux-prefs**", (route) =>
    route.fulfill({
      status: 401,
      contentType: "application/json",
      body: JSON.stringify({ error: "unauthorized" }),
    }),
  );
  await page.setViewportSize({ width: 1440, height: 1080 });
  await page.goto(`${runtime.baseUrl}/me/settings`, { waitUntil: "load" });
  await expect(page.getByTestId("settings-panel")).toHaveAttribute(
    "data-ux-prefs-view",
    "unauthorized",
  );
  await expect(page.locator("[data-font-scale-confirmed='true']")).toHaveCount(0);
  await expect(page.locator("[data-tone-band-confirmed='true']")).toHaveCount(0);
  await expect(page.getByTestId("settings-tone-band")).toHaveAttribute(
    "data-tone-band-authority",
    "none",
  );
  await expect(page.locator("[data-font-scale-option]")).toHaveCount(3);
});

test("fontScale persists across reload and changes computed type", async ({
  page,
}) => {
  let stored = {
    userId: "qa-account-user",
    toneBand: "mid",
    fontScale: "md",
    depositPref: "usdt",
    updatedAt: "2026-08-21T00:00:00.000Z",
  };
  await page.unrouteAll({ behavior: "ignoreErrors" }).catch(() => {});
  const { stubSettings } = require("../lib/account-route-stubs.cjs");
  await stubSettings(page, "ready");
  await page.route("**/api/v1/me/ux-prefs**", async (route) => {
    if (route.request().method() === "PUT") {
      const body = route.request().postDataJSON() || {};
      stored = { ...stored, ...body };
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(stored),
      });
    }
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(stored),
    });
  });
  await page.setViewportSize({ width: 1440, height: 1080 });
  await page.goto(`${runtime.baseUrl}/me/settings`, { waitUntil: "load" });
  await expect(page.getByTestId("settings-panel")).toHaveAttribute(
    "data-ux-prefs-view",
    "ready",
  );
  const mdSize = await page.locator("h1").evaluate((el) => getComputedStyle(el).fontSize);
  await page.locator("[data-font-scale-option='xl']").click();
  await expect(page.locator("[data-font-scale-confirmed='true']")).toHaveAttribute(
    "data-font-scale-option",
    "xl",
  );
  const xlSize = await page.locator("h1").evaluate((el) => getComputedStyle(el).fontSize);
  expect(parseFloat(xlSize)).toBeGreaterThan(parseFloat(mdSize));
  await page.reload({ waitUntil: "load" });
  await expect(page.locator("[data-font-scale-confirmed='true']")).toHaveAttribute(
    "data-font-scale-option",
    "xl",
  );
  await expect(page.locator("html")).toHaveAttribute("data-font-scale", "xl");
});

test("settings UX controls stay inside the viewport at required widths", async ({
  page,
}) => {
  for (const width of [390, 768, 1024, 1440]) {
    await openSettings(page, "ready", width, 900);
    await expect(page.getByTestId("settings-panel")).toHaveAttribute(
      "data-ux-prefs-view",
      "ready",
    );
    const overflow = await page.evaluate(() => {
      const root = document.scrollingElement || document.documentElement;
      return root.scrollWidth > root.clientWidth + 1;
    });
    expect(overflow, `horizontal overflow at ${width}`).toBe(false);
    await expect(page.locator("[data-font-scale-option='xl']")).toBeVisible();
    await expect(page.locator("[data-deposit-pref='krw']")).toBeVisible();
  }
});

test("depositPref priority is URL > stored > USDT", async ({ page }) => {
  const { stubDeposit } = require("../lib/consumer-route-stubs.cjs");
  async function openDeposit(tabQuery, storedPref) {
    await page.unrouteAll({ behavior: "ignoreErrors" }).catch(() => {});
    await stubDeposit(page, "ready");
    await page.route("**/api/v1/me/ux-prefs**", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          userId: "qa-account-user",
          toneBand: "mid",
          fontScale: "md",
          depositPref: storedPref,
          updatedAt: "2026-08-21T00:00:00.000Z",
        }),
      }),
    );
    await page.addInitScript(() => {
      window.localStorage.setItem("peotteok_deposit_consult_ack", "1");
    });
    const q = tabQuery ? `?tab=${tabQuery}` : "";
    await page.goto(`${runtime.baseUrl}/wallet/deposit${q}`, { waitUntil: "load" });
    await expect(page.getByTestId("wallet-deposit-page")).toBeVisible({
      timeout: 20000,
    });
  }
  await openDeposit("usdt", "krw");
  await expect(page.getByTestId("wallet-deposit-page")).toHaveAttribute(
    "data-deposit-tab",
    "usdt",
  );
  await expect(page.getByTestId("wallet-deposit-page")).toHaveAttribute(
    "data-deposit-tab-source",
    "url",
  );
  await openDeposit("krw", "usdt");
  await expect(page.getByTestId("wallet-deposit-page")).toHaveAttribute(
    "data-deposit-tab",
    "krw",
  );
  await expect(page.getByTestId("wallet-deposit-page")).toHaveAttribute(
    "data-deposit-tab-source",
    "url",
  );
  await openDeposit("", "krw");
  await expect(page.getByTestId("wallet-deposit-page")).toHaveAttribute(
    "data-deposit-tab",
    "krw",
  );
  await expect(page.getByTestId("wallet-deposit-page")).toHaveAttribute(
    "data-deposit-tab-source",
    "pref",
  );
  await page.unrouteAll({ behavior: "ignoreErrors" }).catch(() => {});
  await stubDeposit(page, "ready");
  await page.route("**/api/v1/me/ux-prefs**", (route) =>
    route.fulfill({
      status: 503,
      contentType: "application/json",
      body: JSON.stringify({ error: "unavailable" }),
    }),
  );
  await page.goto(`${runtime.baseUrl}/wallet/deposit`, { waitUntil: "load" });
  await expect(page.getByTestId("wallet-deposit-page")).toHaveAttribute(
    "data-deposit-tab",
    "usdt",
  );
  await expect(page.getByTestId("wallet-deposit-page")).toHaveAttribute(
    "data-deposit-tab-source",
    "default",
  );
});

test("settings a11y has no new critical/serious axe violations", async ({
  page,
}) => {
  await openSettings(page, "ready");
  await page.addScriptTag({ path: require.resolve("axe-core") });
  const results = await page.evaluate(async () => {
    return window.axe.run(document, {
      runOnly: { type: "tag", values: ["wcag2a", "wcag2aa"] },
    });
  });
  expect(blockingViolations(results), JSON.stringify(blockingViolations(results).map((v) => v.id))).toEqual([]);
});
