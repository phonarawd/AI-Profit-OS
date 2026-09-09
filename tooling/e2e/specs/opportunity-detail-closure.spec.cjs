/**
 * REL-107 — Opportunity Detail (/profits/[id]).
 * 로컬 web 런타임. production URL fallback 0.
 * Home geometry 재설계 0.
 */
const { test, expect } = require("@playwright/test");
const { assertQaIsolation } = require("../lib/qa-env-isolation-guard.cjs");
const { ensureLocalWebRuntime } = require("../lib/local-web-runtime.cjs");
const { stubOpportunityRoom } = require("../lib/consumer-route-stubs.cjs");
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

async function openDetail(page, mode, width, height, id = "qa-rel106-opp") {
  await page.unrouteAll({ behavior: "ignoreErrors" }).catch(() => {});
  await stubOpportunityRoom(page, mode);
  await page.setViewportSize({ width, height });
  await page.goto(`${runtime.baseUrl}/profits/${id}`, {
    waitUntil: "domcontentloaded",
  });
  await expect(page.getByTestId("opportunity-detail")).toBeVisible({
    timeout: 20000,
  });
  await hideNextDevChrome(page);
}

test("axe fixture still flags unlabeled controls (harness not weakened)", async () => {
  const html =
    '<!doctype html><html lang="ko"><head><title>퍼뜩</title></head><body><button></button></body></html>';
  const results = await runAxeOnHtml(html);
  expect(blockingViolations(results).length).toBeGreaterThan(0);
});

test("401 is unauthorized, not empty or ready", async ({ page }) => {
  await openDetail(page, "unauthorized", 1440, 1080);
  await expect(page.getByTestId("opportunity-detail")).toHaveAttribute(
    "data-detail-state",
    "unauthorized",
  );
  await expect(
    page.locator(".sd-desktop-only").getByText("로그인하면 이 기회를 확인할 수 있어요."),
  ).toBeVisible();
  await expect(page.locator("[data-sdr='hero']")).toHaveCount(0);
  await expect(
    page.locator(".sd-desktop-only").getByText("이 기회는 이제 없어요."),
  ).toHaveCount(0);
  await assertNoLegacyChrome(page);
});

test("500 is error, not missing or success", async ({ page }) => {
  await openDetail(page, "error", 1440, 1080);
  await expect(page.getByTestId("opportunity-detail")).toHaveAttribute(
    "data-detail-state",
    "error",
  );
  await expect(
    page.locator(".sd-desktop-only").getByText("기회를 불러오지 못했어요."),
  ).toBeVisible();
  await expect(
    page.locator(".sd-desktop-only").getByText("이 기회는 이제 없어요."),
  ).toHaveCount(0);
  await expect(page.getByText("0 USDT")).toHaveCount(0);
});

test("404 is missing, not a fake room", async ({ page }) => {
  await openDetail(page, "missing", 390, 693);
  await expect(page.getByTestId("opportunity-detail")).toHaveAttribute(
    "data-detail-state",
    "missing",
  );
  await expect(
    page.locator(".sd-mobile-placeholder").getByText("이 기회는 이제 없어요."),
  ).toBeVisible();
  await expect(page.locator("[data-sdrm='hero']")).toHaveCount(0);
  await assertNoLegacyChrome(page);
});

test("ready detail keeps list identity and required capital", async ({
  page,
}) => {
  await openDetail(page, "ready", 1440, 1080);
  await expect(page.getByTestId("opportunity-detail")).toHaveAttribute(
    "data-detail-state",
    "ready",
  );
  await expect(page.locator("h1.sdr-title")).toHaveText("QA 시세 참고 상품");
  await expect(page.locator("[data-sdr='capital']")).toContainText("250.00");
  await expect(page.locator("[data-sdr='capital']")).not.toContainText(
    "확인할 수 없음",
  );
  await expect(
    page.locator(".sd-desktop-only").getByRole("button", { name: "이 기회로 수익 벌기" }),
  ).toBeVisible();
  await expect(
    page.locator(".sd-desktop-only [data-requires-preflight='true']"),
  ).toHaveCount(1);
  await expect(page).toHaveURL(/\/profits\/qa-rel106-opp/);
  await page.screenshot({
    path: "governance/release-master/rel-107-room/runtime-ready-1440.png",
    fullPage: false,
  });
});

test("mobile ready detail keeps one-route truth", async ({ page }) => {
  await openDetail(page, "ready", 390, 693);
  await expect(page.getByTestId("opportunity-detail")).toHaveAttribute(
    "data-detail-state",
    "ready",
  );
  await expect(page.locator("h1.sdrm-title")).toHaveText("QA 시세 참고 상품");
  await expect(page.locator("[data-sdrm='capital']")).toContainText("250.00");
  await page.screenshot({
    path: "governance/release-master/rel-107-room/runtime-ready-390.png",
    fullPage: false,
  });
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth <= window.innerWidth + 1,
  );
  expect(overflow).toBeTruthy();
});

test("CTA issues preflight and does not treat opportunity as trade", async ({
  page,
}) => {
  await openDetail(page, "ready", 1440, 1080);
  await hideNextDevChrome(page);
  const cta = page.locator(".sd-desktop-only [data-requires-preflight='true']");
  await expect(cta).toBeVisible();
  await expect(cta).toBeEnabled();
  const preflight = page.waitForRequest(
    (req) => req.method() === "POST" && req.url().includes("/preflight"),
  );
  await cta.click({ force: true });
  await preflight;
  const sheet = page.locator("dialog.sdr-sheet");
  await expect(sheet).toHaveAttribute("data-sdr-sheet", "PREFLIGHT_READY", {
    timeout: 10000,
  });
  await expect(sheet).toBeVisible();
  await expect(sheet).toContainText("250.00");
  await expect(sheet).toContainText("시세가 움직이면 안전하게 멈출 수 있어요");
  await expect(page).toHaveURL(/\/profits\/qa-rel106-opp/);
  await expect(page).not.toHaveURL(/\/trades\/qa-rel106-opp/);
  await sheet.getByRole("button", { name: "수익 벌기" }).click();
  await expect(page).toHaveURL(/\/trades\/qa-rel107-trade\/execute/, {
    timeout: 10000,
  });
  await expect(page).not.toHaveURL(/\/trades\/qa-rel106-opp/);
});

test("detail a11y has no new critical/serious axe violations", async ({
  page,
}) => {
  await openDetail(page, "ready", 1440, 1080);
  await expect(page.getByTestId("opportunity-detail")).toHaveAttribute(
    "data-detail-state",
    "ready",
  );
  const run = async () => {
    await page.addScriptTag({ path: require.resolve("axe-core") });
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
    await expect(page.getByTestId("opportunity-detail")).toBeVisible({
      timeout: 20000,
    });
    results = await run();
  }
  const blocking = blockingViolations(results);
  expect(blocking, JSON.stringify(blocking.map((v) => v.id))).toEqual([]);
});

test("ready detail shows no-buy/no-sell badges and result disclaimer (desktop)", async ({
  page,
}) => {
  await openDetail(page, "ready", 1440, 1080);
  const badges = page.locator(
    ".sd-desktop-only [data-testid='execution-no-buy-sell-badges']",
  );
  await expect(badges).toBeVisible();
  await expect(badges).toContainText("직접 사지 않아요");
  await expect(badges).toContainText("직접 팔지 않아요");
  const disclaimer = page.locator(
    ".sd-desktop-only [data-testid='execution-disclaimer-result']",
  );
  await expect(disclaimer).toContainText(
    "예상 결과는 시장 상황에 따라 달라질 수 있습니다.",
  );
});

test("ready detail shows no-buy/no-sell badges and result disclaimer (mobile)", async ({
  page,
}) => {
  await openDetail(page, "ready", 390, 693);
  const badges = page.locator(
    ".sd-mobile-placeholder [data-testid='execution-no-buy-sell-badges']",
  );
  await expect(badges).toBeVisible();
  await expect(badges).toContainText("직접 사지 않아요");
  await expect(badges).toContainText("직접 팔지 않아요");
  const disclaimer = page.locator(
    ".sd-mobile-placeholder [data-testid='execution-disclaimer-result']",
  );
  await expect(disclaimer).toContainText(
    "예상 결과는 시장 상황에 따라 달라질 수 있습니다.",
  );
});
