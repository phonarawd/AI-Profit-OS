/**
 * /me/invite closure — GET/POST referral truth + premium surface.
 * Local web runtime only. production URL fallback 0.
 */
const { test, expect } = require("@playwright/test");
const { assertQaIsolation } = require("../lib/qa-env-isolation-guard.cjs");
const { ensureLocalWebRuntime } = require("../lib/local-web-runtime.cjs");
const { stubInvite } = require("../lib/account-route-stubs.cjs");
const {
  runAxeOnHtml,
  blockingViolations,
} = require("../lib/axe-scan.cjs");

const VIEWPORTS = [
  { width: 390, height: 844 },
  { width: 768, height: 1024 },
  { width: 1024, height: 768 },
  { width: 1440, height: 1080 },
];

const LOGIN_LINE = "로그인하면 초대를 볼 수 있어요.";
const UNAVAILABLE_LINE = "초대 현황을 확인할 수 없음";
const DISABLED_LINE = "지금은 초대를 받을 수 없음";
const LOADING_LINE = "불러오는 중";
const SUCCESS_LINE = "초대 코드를 연결했어요.";
const DENIED_LINE = "이 코드는 연결할 수 없어요.";
const BIND_UNAUTH_LINE = "다시 로그인해 주세요.";
const BIND_UNAVAILABLE_LINE = "지금은 연결할 수 없음";
const ALREADY_BOUND_LINE = "이미 연결된 초대가 있어요.";
const MISSING_LINE = "확인할 수 없음";
const TITLE = "친구 초대";

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

async function openInvite(page, mode, width = 1440, height = 1080, options = {}) {
  if (width && typeof width === "object") {
    options = width;
    width = 1440;
    height = 1080;
  }
  await page.unrouteAll({ behavior: "ignoreErrors" }).catch(() => {});
  const captured = await stubInvite(page, mode, options);
  await page.setViewportSize({ width, height });
  await page.goto(`${runtime.baseUrl}/me/invite`, { waitUntil: "load" });
  await expect(page.getByTestId("invite-home-page")).toBeVisible({
    timeout: 20000,
  });
  await hideNextDevChrome(page);
  return captured;
}

async function assertNoOverflow(page) {
  const metrics = await page.evaluate(() => {
    const doc = document.documentElement;
    const heading = document.querySelector("h1, h2");
    const nodes = [...document.querySelectorAll("main, h1, h2, p, a, li, button, input")];
    const clipped = nodes.some((el) => {
      const r = el.getBoundingClientRect();
      if (r.width <= 0 || r.height <= 0) return false;
      return r.right > window.innerWidth + 2 || r.left < -2;
    });
    return {
      overflowX: doc.scrollWidth - doc.clientWidth,
      clipped,
      headingVisible: !!(heading && heading.getClientRects().length),
    };
  });
  expect(metrics.overflowX).toBeLessThanOrEqual(1);
  expect(metrics.clipped).toBeFalsy();
  expect(metrics.headingVisible).toBeTruthy();
}

async function assertNoFakeInviteData(page) {
  await expect(page.getByText("0 USDT")).toHaveCount(0);
  await expect(page.getByText("0 KRW")).toHaveCount(0);
  await expect(page.getByText("0원")).toHaveCount(0);
  await expect(page.locator("canvas")).toHaveCount(0);
  await expect(page.locator("img[alt*='QR' i]")).toHaveCount(0);
  await expect(page.getByText(/https?:\/\/\S*invite/i)).toHaveCount(0);
  await expect(page.getByTestId("app-shell")).toHaveCount(0);
}

async function runAxe(page) {
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
}

test("axe fixture still flags unlabeled controls (harness not weakened)", async () => {
  const html =
    '<!doctype html><html lang="ko"><head><title>퍼떡</title></head><body><button></button></body></html>';
  const results = await runAxeOnHtml(html);
  expect(blockingViolations(results).length).toBeGreaterThan(0);
});

test("GET loading state is visible before ready", async ({ page }) => {
  await page.unrouteAll({ behavior: "ignoreErrors" }).catch(() => {});
  await stubInvite(page, "ready", { getDelayMs: 2500 });
  await page.setViewportSize({ width: 1440, height: 1080 });
  const nav = page.goto(`${runtime.baseUrl}/me/invite`, { waitUntil: "domcontentloaded" });
  await expect(page.getByTestId("invite-home-page")).toHaveAttribute(
    "data-account-view",
    "loading",
    { timeout: 15000 },
  );
  await expect(page.getByText(LOADING_LINE).first()).toBeVisible();
  await nav;
  await expect(page.getByTestId("invite-home-page")).toHaveAttribute(
    "data-account-view",
    "ready",
    { timeout: 20000 },
  );
});

test("401 is unauthorized, not an empty invite win", async ({ page }) => {
  await openInvite(page, "unauthorized");
  await expect(page.getByTestId("invite-home-page")).toHaveAttribute(
    "data-account-view",
    "unauthorized",
  );
  await expect(page.getByText(LOGIN_LINE)).toBeVisible();
  await expect(page.getByTestId("invite-home")).toHaveCount(0);
  await expect(page.getByTestId("invite-bind-submit")).toHaveCount(0);
  await expect(page.getByTestId("app-shell")).toHaveCount(0);
});

test("403 is unauthorized, not ready", async ({ page }) => {
  await openInvite(page, "unauthorized403");
  await expect(page.getByTestId("invite-home-page")).toHaveAttribute(
    "data-account-view",
    "unauthorized",
  );
  await expect(page.getByText(LOGIN_LINE)).toBeVisible();
  await expect(page.getByTestId("invite-home")).toHaveCount(0);
});

test("500 is unavailable", async ({ page }) => {
  await openInvite(page, "error");
  await expect(page.getByTestId("invite-home-page")).toHaveAttribute(
    "data-account-view",
    "unavailable",
  );
  await expect(page.getByText(UNAVAILABLE_LINE)).toBeVisible();
  await expect(page.getByTestId("invite-home")).toHaveCount(0);
});

test("GET network failure is unavailable", async ({ page }) => {
  await openInvite(page, "network");
  await expect(page.getByTestId("invite-home-page")).toHaveAttribute(
    "data-account-view",
    "unavailable",
  );
  await expect(page.getByText(UNAVAILABLE_LINE)).toBeVisible();
});

test("disabled program hides bind", async ({ page }) => {
  const captured = await openInvite(page, "disabled");
  await expect(page.getByTestId("invite-home-page")).toHaveAttribute(
    "data-account-view",
    "disabled",
  );
  await expect(page.getByText(DISABLED_LINE)).toBeVisible();
  await expect(page.getByTestId("invite-bind-submit")).toHaveCount(0);
  expect(captured.bindCount).toBe(0);
});

test("ready invite stays server-owned", async ({ page }) => {
  await openInvite(page, "ready");
  await expect(page.getByTestId("invite-home-page")).toHaveAttribute(
    "data-account-view",
    "ready",
  );
  await expect(page.getByTestId("invite-home")).toBeVisible();
  await expect(page.getByText("QA120INVITE")).toBeVisible();
  await expect(page.getByRole("heading", { name: TITLE })).toBeVisible();
  await expect(page.getByTestId("invite-cta-share")).toBeDisabled();
  await assertNoFakeInviteData(page);
});

test("absent optional data does not become zero or money", async ({ page }) => {
  await openInvite(page, "readyAbsent");
  await expect(page.getByTestId("invite-home-page")).toHaveAttribute(
    "data-account-view",
    "ready",
  );
  await expect(page.locator('[data-stat="joined"]')).toHaveText(MISSING_LINE);
  await expect(page.locator('[data-stat="bonus"]')).toHaveText(MISSING_LINE);
  await expect(page.getByText(MISSING_LINE).first()).toBeVisible();
  await assertNoFakeInviteData(page);
});

test("empty bind code does not POST", async ({ page }) => {
  const captured = await openInvite(page, "ready");
  await page.getByTestId("invite-bind-code").fill("");
  await page.getByTestId("invite-bind-submit").click();
  await expect(page.getByText(SUCCESS_LINE)).toHaveCount(0);
  expect(captured.bindCount).toBe(0);
});

test("whitespace-only bind code does not POST", async ({ page }) => {
  const captured = await openInvite(page, "ready");
  await page.getByTestId("invite-bind-code").fill("   ");
  await page.getByTestId("invite-bind-submit").click();
  await expect(page.getByText(SUCCESS_LINE)).toHaveCount(0);
  expect(captured.bindCount).toBe(0);
});

test("valid bind trims exact referralCode body", async ({ page }) => {
  const captured = await openInvite(page, "ready", {
    bindStatus: 200,
    bindDelayMs: 400,
  });
  await page.getByTestId("invite-bind-code").fill("  QA-BIND-01  ");
  await expect(page.getByText(SUCCESS_LINE)).toHaveCount(0);
  await page.getByTestId("invite-bind-submit").click();
  await expect(page.getByText(SUCCESS_LINE)).toHaveCount(0);
  await expect(page.getByTestId("invite-bind-panel")).toHaveAttribute(
    "data-bind-view",
    "submitting",
  );
  await expect(page.getByText(SUCCESS_LINE)).toBeVisible();
  expect(captured.bindCount).toBe(1);
  expect(JSON.parse(captured.bindBodies[0])).toEqual({
    referralCode: "QA-BIND-01",
  });
  expect(captured.bindBodies[0]).not.toMatch(/userId|user_id|clientId/);
});

test("bind 400 is denied", async ({ page }) => {
  const captured = await openInvite(page, "ready", { bindStatus: 400 });
  await page.getByTestId("invite-bind-code").fill("BADCODE");
  await page.getByTestId("invite-bind-submit").click();
  await expect(page.getByText(DENIED_LINE)).toBeVisible();
  await expect(page.getByText(SUCCESS_LINE)).toHaveCount(0);
  expect(captured.bindCount).toBe(1);
});

test("bind 409 is denied", async ({ page }) => {
  await openInvite(page, "ready", { bindStatus: 409 });
  await page.getByTestId("invite-bind-code").fill("USEDCODE");
  await page.getByTestId("invite-bind-submit").click();
  await expect(page.getByText(DENIED_LINE)).toBeVisible();
  await expect(page.getByText(SUCCESS_LINE)).toHaveCount(0);
});

test("bind 401 is unauthorized", async ({ page }) => {
  await openInvite(page, "ready", { bindStatus: 401 });
  await page.getByTestId("invite-bind-code").fill("NEEDLOGIN");
  await page.getByTestId("invite-bind-submit").click();
  await expect(page.getByText(BIND_UNAUTH_LINE)).toBeVisible();
  await expect(page.getByText(SUCCESS_LINE)).toHaveCount(0);
});

test("bind 403 is denied, not success", async ({ page }) => {
  await openInvite(page, "ready", { bindStatus: 403 });
  await page.getByTestId("invite-bind-code").fill("FORBIDDEN");
  await page.getByTestId("invite-bind-submit").click();
  await expect(page.getByText(DENIED_LINE)).toBeVisible();
  await expect(page.getByText(SUCCESS_LINE)).toHaveCount(0);
});

test("bind 500 is unavailable", async ({ page }) => {
  await openInvite(page, "ready", { bindStatus: 500 });
  await page.getByTestId("invite-bind-code").fill("SERVERFAIL");
  await page.getByTestId("invite-bind-submit").click();
  await expect(page.getByText(BIND_UNAVAILABLE_LINE)).toBeVisible();
  await expect(page.getByText(SUCCESS_LINE)).toHaveCount(0);
});

test("bind network failure is unavailable", async ({ page }) => {
  await openInvite(page, "ready", { bindNetworkFail: true });
  await page.getByTestId("invite-bind-code").fill("NETFAIL");
  await page.getByTestId("invite-bind-submit").click();
  await expect(page.getByText(BIND_UNAVAILABLE_LINE)).toBeVisible();
  await expect(page.getByText(SUCCESS_LINE)).toHaveCount(0);
});

test("rapid double-click posts exactly once", async ({ page }) => {
  const captured = await openInvite(page, "ready", {
    bindStatus: 200,
    bindDelayMs: 800,
  });
  await page.getByTestId("invite-bind-code").fill("ONCEONLY");
  await page.evaluate(() => {
    const btn = document.querySelector('[data-testid="invite-bind-submit"]');
    btn.click();
    btn.click();
  });
  await expect(page.getByText(SUCCESS_LINE)).toBeVisible();
  expect(captured.bindCount).toBe(1);
  expect(JSON.parse(captured.bindBodies[0])).toEqual({
    referralCode: "ONCEONLY",
  });
});

test("already-bound hides bind action", async ({ page }) => {
  const captured = await openInvite(page, "alreadyBound");
  await expect(page.getByText(ALREADY_BOUND_LINE)).toBeVisible();
  await expect(page.getByText("QA120BOUND")).toBeVisible();
  await expect(page.getByTestId("invite-bind-submit")).toHaveCount(0);
  expect(captured.bindCount).toBe(0);
});

test("invite a11y has no new critical/serious axe violations", async ({
  page,
}) => {
  await openInvite(page, "ready");
  await runAxe(page);
});

for (const vp of VIEWPORTS) {
  test(`invite responsive ${vp.width} has no overflow or leftover chrome`, async ({
    page,
  }) => {
    await openInvite(page, "ready", vp.width, vp.height);
    await assertNoOverflow(page);
    await assertNoFakeInviteData(page);
    await expect(page.getByRole("heading", { name: TITLE })).toBeVisible();
  });
}
