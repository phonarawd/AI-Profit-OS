/**
 * REL-106 — Opportunity List (/profits).
 * 로컬 web 런타임. production URL fallback 0.
 * Home geometry 재설계 0.
 */
const { test, expect } = require("@playwright/test");
const { assertQaIsolation } = require("../lib/qa-env-isolation-guard.cjs");
const { ensureLocalWebRuntime } = require("../lib/local-web-runtime.cjs");
const { stubOpportunityFeed } = require("../lib/consumer-route-stubs.cjs");
const {
  runAxeOnHtml,
  blockingViolations,
} = require("../lib/axe-scan.cjs");

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

async function assertNoLegacyChrome(page) {
  await expect(page.getByTestId("app-shell")).toHaveCount(0);
  await expect(page.getByTestId("app-sidebar")).toHaveCount(0);
  await expect(page.getByTestId("app-header")).toHaveCount(0);
  await expect(page.getByTestId("bottom-nav-5")).toHaveCount(0);
  await expect(page.getByTestId("site-footer")).toHaveCount(0);
}

async function openProfits(page, mode, width, height) {
  await page.unrouteAll({ behavior: "ignoreErrors" }).catch(() => {});
  await stubOpportunityFeed(page, mode);
  await page.setViewportSize({ width, height });
  await page.goto(`${runtime.baseUrl}/profits`, { waitUntil: "domcontentloaded" });
  await expect(page.getByTestId("profits-shell")).toBeVisible({ timeout: 20000 });
  await hideNextDevChrome(page);
}

test("axe fixture still flags unlabeled controls (harness not weakened)", async () => {
  const html =
    '<!doctype html><html lang="ko"><head><title>퍼뜩</title></head><body><button></button></body></html>';
  const results = await runAxeOnHtml(html);
  expect(blockingViolations(results).length).toBeGreaterThan(0);
});

test("401 is unauthorized, not empty", async ({ page }) => {
  await openProfits(page, "unauthorized", 1440, 1080);
  await expect(page.getByTestId("profits-shell")).toHaveAttribute(
    "data-profits-state",
    "UNAUTHORIZED",
  );
  await expect(page.locator("[data-sdp='unauthorized']")).toBeVisible();
  await expect(page.locator("[data-sdp='empty']")).toHaveCount(0);
  await expect(page.locator("[data-sdp='card']")).toHaveCount(0);
  await assertNoLegacyChrome(page);
});

test("500 is error, not empty or success", async ({ page }) => {
  await openProfits(page, "error", 1440, 1080);
  await expect(page.getByTestId("profits-shell")).toHaveAttribute(
    "data-profits-state",
    "ERROR",
  );
  await expect(page.locator("[data-sdp='error']")).toBeVisible();
  await expect(page.locator("[data-sdp='empty']")).toHaveCount(0);
  await expect(page.getByText("0 USDT")).toHaveCount(0);
});

test("empty feed is empty, not a fake card", async ({ page }) => {
  await openProfits(page, "empty", 390, 693);
  await expect(page.getByTestId("profits-shell")).toHaveAttribute(
    "data-profits-state",
    "EMPTY",
  );
  await expect(page.getByTestId("profits-mobile-shell")).toBeVisible();
  await expect(page.locator("[data-sdpm='empty']")).toBeVisible();
  await expect(page.locator("[data-sdpm='card']")).toHaveCount(0);
  await page.screenshot({
    path: "governance/release-master/rel-106-profits/runtime-empty-390.png",
    fullPage: false,
  });
  await assertNoLegacyChrome(page);
});

test("ready list shows required capital from the feed owner", async ({
  page,
}) => {
  await openProfits(page, "ready", 1440, 1080);
  await expect(page.getByTestId("profits-shell")).toHaveAttribute(
    "data-profits-state",
    "READY",
  );
  const card = page.locator("[data-sdp='card']").first();
  await expect(card).toBeVisible();
  await expect(card).toHaveAttribute("href", "/profits/qa-rel106-opp");
  await expect(page.locator("[data-sdp='capital']").first()).toContainText(
    "250.00",
  );
  await page.screenshot({
    path: "governance/release-master/rel-106-profits/runtime-ready-1440.png",
    fullPage: false,
  });
  await expect(page.getByLabel("기회 검색")).toBeVisible();
  await page.locator(".sd-desktop-only [data-sdp='toolbar'] input[type='search']").fill("zzz-no-match");
  await expect(page.locator("[data-sdp='filter-empty']")).toBeVisible();
  await page.locator(".sd-desktop-only [data-sdp='toolbar'] input[type='search']").fill("QA");
  await expect(page.locator("[data-sdp='card']")).toHaveCount(1);
  await page.locator("[data-sdp-filter='joinable']").click();
  await expect(page.locator("[data-sdp='card']")).toHaveCount(1);
});

test("mobile ready list keeps one-route truth", async ({ page }) => {
  await openProfits(page, "ready", 390, 693);
  await expect(page.getByTestId("profits-mobile-shell")).toBeVisible();
  await expect(page.locator("[data-sdpm='card']").first()).toHaveAttribute(
    "href",
    "/profits/qa-rel106-opp",
  );
  await expect(page.locator("[data-sdpm='capital']").first()).toContainText(
    "250.00",
  );
  await page.screenshot({
    path: "governance/release-master/rel-106-profits/runtime-ready-390.png",
    fullPage: false,
  });
  let overflow = true;
  try {
    overflow = await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth + 1,
    );
  } catch (err) {
    const msg = String(err && err.message ? err.message : err);
    if (!msg.includes("Execution context was destroyed")) throw err;
    await page.waitForLoadState("domcontentloaded");
    overflow = await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth + 1,
    );
  }
  expect(overflow).toBeTruthy();
});

test("profits a11y has no new critical/serious axe violations", async ({
  page,
}) => {
  await openProfits(page, "ready", 1440, 1080);
  await expect(page.getByTestId("profits-shell")).toHaveAttribute(
    "data-profits-state",
    "READY",
  );
  const run = async () => {
    // Dev CSP blocks DOM-injected scripts; CDP evaluation keeps the committed
    // axe runtime executable without weakening the application policy.
    await page.evaluate(require("axe-core").source);
    return page.evaluate(async () => {
      return window.axe.run(document, {
        runOnly: { type: "tag", values: ["wcag2a", "wcag2aa"] },
      });
    });
  };
  let results;
  try {
    results = await run();
  } catch (err) {
    const msg = String(err && err.message ? err.message : err);
    if (!msg.includes("Execution context was destroyed")) throw err;
    await page.waitForLoadState("domcontentloaded");
    await expect(page.getByTestId("profits-shell")).toBeVisible({
      timeout: 20000,
    });
    results = await run();
  }
  const blocking = blockingViolations(results);
  expect(blocking, JSON.stringify(blocking.map((v) => v.id))).toEqual([]);
});
