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

test.describe.configure({ timeout: 180000, retries: 2 });

let runtime;

test.beforeAll(async () => {
  assertQaIsolation({ purpose: "e2e", databaseUrl: "", projectRef: "" });
  runtime = await ensureLocalWebRuntime({ timeoutMs: 180000 });
}, { timeout: 180000 });

test.afterAll(async () => {
  if (runtime) await runtime.stop();
});

async function applyOpportunitySearch(page, value) {
  const search = page.locator(".sd-desktop-only [data-sdp='search']");
  await expect(search).toBeVisible();
  await search.click();
  await search.fill("");
  await expect(search).toHaveValue("");
  // keyboard.type drives React onChange reliably under load (DOM setter alone can desync).
  await page.keyboard.type(String(value), { delay: 20 });
  await expect(search).toHaveValue(value);
  await expect
    .poll(async () => search.inputValue(), { timeout: 5000 })
    .toBe(value);
}
async function hideNextDevChrome(page) {
  await page
    .addStyleTag({
      content:
        "nextjs-portal, [data-next-mark-loading], #__next-build-watcher, .pwa-overlay { display: none !important; pointer-events: none !important; }",
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
  await applyOpportunitySearch(page, "zzz-no-match");
  await expect(page.getByText("0개의 기회")).toBeVisible({ timeout: 30000 });
  await expect(page.locator("[data-sdp='filter-empty']")).toBeVisible({
    timeout: 10000,
  });
  await expect(page.locator("[data-sdp='card']")).toHaveCount(0);
  await applyOpportunitySearch(page, "QA");
  await expect(page.locator("[data-sdp='filter-empty']")).toHaveCount(0);
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

test("desktop grid windows above 20 items, then reveals every item via scroll with zero omission or duplication", async ({
  page,
}) => {
  await openProfits(page, "windowed", 1440, 1080);
  await expect(page.getByTestId("profits-shell")).toHaveAttribute(
    "data-profits-state",
    "READY",
  );
  const TOTAL = 47;
  // The windowed code path must be engaged for a >threshold feed (this is
  // the structural proof that VirtualOpportunityGrid's own `windowed`
  // branch - not the passthrough "render everything" branch - is live).
  await expect(page.locator("[data-sdp='grid']")).toHaveAttribute(
    "data-virtual",
    "on",
  );

  const firstCard = page.locator("[data-sdp='card']").first();
  await expect(firstCard).toBeVisible();
  await firstCard.focus();
  await expect(firstCard).toBeFocused();

  // In-memory pagination (no real network latency between "pages") means a
  // modest 47-item feed can finish growing from 20 to 47 within a single
  // IntersectionObserver tick on a fast machine - there is no reliable way
  // to freeze a "still exactly 20, not yet grown" browser frame without an
  // artificial delay that would not exist in production. The correctness
  // property that actually matters or a real financial listing (no
  // opportunity ever silently dropped or shown twice while the window
  // grows) is asserted below via the final, fully-settled state instead of
  // racing a live paint.
  for (let i = 0; i < 35; i += 1) {
    const remaining = await page.getByTestId("opportunity-grid-sentinel").count();
    if (remaining === 0) break;
    // scrollIntoViewIfNeeded() is a no-op once the sentinel is already
    // visible, and a DOM mutation that keeps it intersecting does not
    // reliably re-fire IntersectionObserver in this browser - force real
    // scroll-position movement past the current bottom instead so each
    // iteration is a genuine new scroll event. The per-step wait is
    // generous (not a tight race) because a contended low-core dev machine
    // needs real wall-clock time for the observer callback + React
    // re-render to actually land between scroll events, not just a fast
    // machine's frame budget.
    await page.mouse.wheel(0, 1600);
    await page.waitForTimeout(300);
  }
  await expect(page.locator("[data-sdp='card']")).toHaveCount(TOTAL, {
    timeout: 25000,
  });
  await expect(page.getByTestId("opportunity-grid-sentinel")).toHaveCount(0);

  const hrefs = await page
    .locator("[data-sdp='card']")
    .evaluateAll((els) => els.map((el) => el.getAttribute("href")));
  expect(new Set(hrefs).size).toBe(TOTAL);
  for (let i = 1; i <= TOTAL; i += 1) {
    expect(hrefs).toContain(
      `/profits/qa-windowed-opp-${String(i).padStart(2, "0")}`,
    );
  }
  const lastCard = page.locator("[data-sdp='card']").last();
  await lastCard.focus();
  await expect(lastCard).toBeFocused();
});

test("mobile list windows above 20 items, then reveals every item via scroll with zero omission or duplication", async ({
  page,
}) => {
  await openProfits(page, "windowed", 390, 693);
  await expect(page.getByTestId("profits-mobile-shell")).toBeVisible();
  const TOTAL = 47;

  // Structural proof the windowed branch (not the passthrough "render
  // everything" branch) is engaged for a >threshold feed - checked via a
  // synchronous render-time attribute (not a live DOM count) because the
  // IntersectionObserver rootMargin (600px) can start preloading the next
  // page before the very first Playwright poll lands, so "still exactly 20"
  // is not a reliably observable live browser frame (same race already
  // documented on the desktop test above).
  await expect(page.locator("[data-sdpm='scroll']")).toHaveAttribute(
    "data-virtual",
    "on",
  );

  // .sdpm-root is height:100dvh with its own internal .sdpm-scroll
  // (overflow-y:auto) - the page/body itself never scrolls on this route,
  // so mouse-wheel events must be dispatched while the pointer is actually
  // over that inner scroll container (hover first) to land on the right
  // scrollport, exactly like the desktop grid's page-level wheel scroll
  // above but scoped to the mobile app-shell's inner scroller.
  const scroller = page.locator("[data-sdpm='scroll']");
  await scroller.hover();
  for (let i = 0; i < 60; i += 1) {
    const remaining = await page.getByTestId("profits-mobile-sentinel").count();
    if (remaining === 0) break;
    // Same generous-wait rationale as the desktop loop above - a contended
    // low-core dev machine needs real wall-clock time per scroll step, not
    // a tight race against a fast-machine frame budget.
    await page.mouse.wheel(0, 2400);
    await page.waitForTimeout(400);
  }

  await expect(page.locator("[data-sdpm='card']")).toHaveCount(TOTAL, {
    timeout: 30000,
  });
  await expect(page.getByTestId("profits-mobile-sentinel")).toHaveCount(0);

  const hrefs = await page
    .locator("[data-sdpm='card']")
    .evaluateAll((els) => els.map((el) => el.getAttribute("href")));
  expect(new Set(hrefs).size).toBe(TOTAL);
  for (let i = 1; i <= TOTAL; i += 1) {
    expect(hrefs).toContain(
      `/profits/qa-windowed-opp-${String(i).padStart(2, "0")}`,
    );
  }

  const lastCard = page.locator("[data-sdpm='card']").last();
  await lastCard.focus();
  await expect(lastCard).toBeFocused();
});
