/**
 * /me/settings closure — prefs fail-closed + logout/delete guards.
 * Local web runtime only. production URL fallback 0.
 */
const fs = require("node:fs");
const path = require("node:path");
const { test, expect } = require("@playwright/test");
const { assertQaIsolation } = require("../lib/qa-env-isolation-guard.cjs");
const { ensureLocalWebRuntime } = require("../lib/local-web-runtime.cjs");
const {
  TEST_PREF_FLAGS,
  TEST_PREFS,
  stubSettings,
} = require("../lib/account-route-stubs.cjs");
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

const copySrc = fs.readFileSync(
  path.join(__dirname, "../../../packages/ui/copy/ko/settings.ts"),
  "utf8",
);
function copy(key) {
  const match = copySrc.match(new RegExp(key + ': "([^"]+)"'));
  if (!match) throw new Error("missing copy " + key);
  return match[1];
}

const TITLE = copy("title");
const LOGIN_LINE = copy("loginToView");
const PAGE_UNAVAILABLE = copy("pageUnavailable");
const PREFS_LOADING = copy("loading");
const PREFS_UNAVAILABLE = copy("unavailable");
const DELETE_SUCCESS = copy("deleteAccepted");
const DELETE_FAIL = copy("deleteUnavailable");
const LOGOUT_FAIL = copy("logoutUnavailable");
const DELETE_PHRASE = "\ud0c8\ud1f4\ud558\uaca0\uc2b5\ub2c8\ub2e4";

const ALL_TRUE = { ...TEST_PREF_FLAGS };
const ALL_FALSE = Object.fromEntries(
  Object.keys(TEST_PREF_FLAGS).map((key) => [key, false]),
);
const MIXED = {
  ...TEST_PREF_FLAGS,
  master: true,
  opportunity: false,
  wallet: true,
  notice: false,
  campaign: true,
  opsMessage: false,
  strategyMatch: true,
};

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

async function openSettings(page, mode, width, height, options) {
  if (width && typeof width === "object") {
    options = width;
    width = 1440;
    height = 1080;
  }
  width = width || 1440;
  height = height || 1080;
  options = options || {};
  await page.unrouteAll({ behavior: "ignoreErrors" }).catch(() => {});
  const captured = await stubSettings(page, mode, options);
  await page.setViewportSize({ width, height });
  await page.goto(`${runtime.baseUrl}/me/settings`, { waitUntil: "load" });
  await expect(page.getByTestId("settings-page")).toBeVisible({
    timeout: 20000,
  });
  await hideNextDevChrome(page);
  return captured;
}

async function assertNoOverflow(page) {
  const metrics = await page.evaluate(() => {
    const doc = document.documentElement;
    const heading = document.querySelector("h1, h2");
    const nodes = [
      ...document.querySelectorAll("main, h1, h2, p, a, li, button, input"),
    ];
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

function switchBtn(page, key) {
  return page.locator(`[data-notify-channel="${key}"]`);
}

async function waitPrefs(page, view) {
  await expect(page.getByTestId("settings-notify")).toHaveAttribute(
    "data-prefs-view",
    view,
    { timeout: 20000 },
  );
}

async function expectExactPrefs(page, prefs) {
  await waitPrefs(page, "ready");
  for (const [key, value] of Object.entries(prefs)) {
    await expect(switchBtn(page, key)).toHaveAttribute(
      "aria-checked",
      value ? "true" : "false",
    );
  }
}

test("axe fixture still flags unlabeled controls (harness not weakened)", async () => {
  const html =
    '<!doctype html><html lang="ko"><head><title>putduk</title></head><body><button></button></body></html>';
  const results = await runAxeOnHtml(html);
  expect(blockingViolations(results).length).toBeGreaterThan(0);
});

test("GET loading state is visible before ready", async ({ page }) => {
  await page.unrouteAll({ behavior: "ignoreErrors" }).catch(() => {});
  await stubSettings(page, "ready", { getDelayMs: 2500 });
  await page.setViewportSize({ width: 1440, height: 1080 });
  const nav = page.goto(`${runtime.baseUrl}/me/settings`, {
    waitUntil: "domcontentloaded",
  });
  await expect(page.getByTestId("settings-page")).toBeVisible({
    timeout: 15000,
  });
  await expect(page.getByText(PREFS_LOADING).first()).toBeVisible();
  await expect(page.locator("[data-notify-channel]")).toHaveCount(0);
  await nav;
  await waitPrefs(page, "ready");
});

test("401 is unauthorized, not a fake settings success", async ({ page }) => {
  await openSettings(page, "unauthorized");
  await expect(page.getByTestId("settings-page")).toHaveAttribute(
    "data-account-view",
    "unauthorized",
  );
  await expect(page.getByText(LOGIN_LINE)).toBeVisible();
  await expect(page.getByTestId("settings-panel")).toHaveCount(0);
  await expect(page.locator("[data-notify-channel]")).toHaveCount(0);
  await expect(page.getByTestId("app-shell")).toHaveCount(0);
});

test("403 is unauthorized, not ready", async ({ page }) => {
  await openSettings(page, "unauthorized403");
  await expect(page.getByTestId("settings-page")).toHaveAttribute(
    "data-account-view",
    "unauthorized",
  );
  await expect(page.getByText(LOGIN_LINE)).toBeVisible();
  await expect(page.getByTestId("settings-panel")).toHaveCount(0);
});

test("prefs GET 401 is unauthorized", async ({ page }) => {
  const captured = await openSettings(page, "ready", { prefsStatus: 401 });
  await expect(page.getByTestId("settings-page")).toHaveAttribute(
    "data-account-view",
    "unauthorized",
  );
  await expect(page.locator("[data-notify-channel]")).toHaveCount(0);
  expect(captured.prefsPutCount).toBe(0);
});

test("prefs GET 403 is unauthorized", async ({ page }) => {
  const captured = await openSettings(page, "ready", { prefsStatus: 403 });
  await expect(page.getByTestId("settings-page")).toHaveAttribute(
    "data-account-view",
    "unauthorized",
  );
  await expect(page.locator("[data-notify-channel]")).toHaveCount(0);
  expect(captured.prefsPutCount).toBe(0);
});

test("500 is unavailable", async ({ page }) => {
  await openSettings(page, "error");
  await expect(page.getByTestId("settings-page")).toHaveAttribute(
    "data-account-view",
    "unavailable",
  );
  await expect(page.getByText(PAGE_UNAVAILABLE)).toBeVisible();
  await expect(page.getByTestId("settings-panel")).toHaveCount(0);
});

test("prefs GET 500 is unavailable, not all-true", async ({ page }) => {
  const captured = await openSettings(page, "ready", { prefsStatus: 500 });
  await waitPrefs(page, "unavailable");
  await expect(page.getByText(PREFS_UNAVAILABLE)).toBeVisible();
  await expect(page.locator("[data-notify-channel]")).toHaveCount(0);
  expect(captured.prefsPutCount).toBe(0);
});

test("GET network failure is unavailable", async ({ page }) => {
  const captured = await openSettings(page, "ready", {
    prefsNetworkFail: true,
  });
  await waitPrefs(page, "unavailable");
  await expect(page.getByText(PREFS_UNAVAILABLE)).toBeVisible();
  await expect(page.locator("[data-notify-channel]")).toHaveCount(0);
  expect(captured.prefsPutCount).toBe(0);
});

test("valid all true is ready exact", async ({ page }) => {
  await openSettings(page, "ready");
  await expectExactPrefs(page, ALL_TRUE);
});

test("valid mixed true/false is ready exact", async ({ page }) => {
  await openSettings(page, "ready", {
    prefs: { userId: TEST_PREFS.userId, ...MIXED },
  });
  await expectExactPrefs(page, MIXED);
});

test("valid all false is ready exact", async ({ page }) => {
  await openSettings(page, "ready", {
    prefs: { userId: TEST_PREFS.userId, ...ALL_FALSE },
  });
  await expectExactPrefs(page, ALL_FALSE);
});

const malformedCases = [
  { name: "empty-object", prefsBody: {} },
  { name: "null-body", prefsBody: null },
  {
    name: "missing-master",
    prefsBody: { userId: TEST_PREFS.userId, ...ALL_TRUE, master: undefined },
  },
  {
    name: "null-field",
    prefsBody: { userId: TEST_PREFS.userId, ...ALL_TRUE, wallet: null },
  },
  {
    name: "string-true",
    prefsBody: { userId: TEST_PREFS.userId, ...ALL_TRUE, notice: "true" },
  },
  {
    name: "number-one",
    prefsBody: { userId: TEST_PREFS.userId, ...ALL_TRUE, campaign: 1 },
  },
  {
    name: "object-field",
    prefsBody: { userId: TEST_PREFS.userId, ...ALL_TRUE, opsMessage: {} },
  },
  {
    name: "array-field",
    prefsBody: { userId: TEST_PREFS.userId, ...ALL_TRUE, strategyMatch: [] },
  },
];

for (const item of malformedCases) {
  test(`malformed 200 ${item.name} is unavailable, not all-true`, async ({
    page,
  }) => {
    const body = { ...item.prefsBody };
    if (item.name === "missing-master") delete body.master;
    const captured = await openSettings(page, "ready", {
      prefsBody: item.name === "null-body" ? null : body,
    });
    await waitPrefs(page, "unavailable");
    await expect(page.getByText(PREFS_UNAVAILABLE)).toBeVisible();
    await expect(page.locator("[data-notify-channel]")).toHaveCount(0);
    expect(captured.prefsPutCount).toBe(0);
  });
}

test("ready settings keep leftover chrome off", async ({ page }) => {
  await openSettings(page, "ready");
  await expect(page.getByTestId("settings-panel")).toBeVisible();
  await expect(page.getByTestId("settings-notify")).toBeVisible();
  await expect(page.getByTestId("delete-account-submit")).toBeVisible();
  await expect(page.getByText(DELETE_SUCCESS)).toHaveCount(0);
  await expect(page.getByTestId("app-shell")).toHaveCount(0);
});

test("single toggle sends one complete PUT", async ({ page }) => {
  const captured = await openSettings(page, "ready", { putDelayMs: 200 });
  await expectExactPrefs(page, ALL_TRUE);
  await switchBtn(page, "master").click();
  await expect(switchBtn(page, "master")).toHaveAttribute("aria-checked", "false");
  await expect.poll(() => captured.prefsPutCount).toBe(1);
  expect(JSON.parse(captured.prefsPutBodies[0])).toEqual({
    ...ALL_TRUE,
    master: false,
  });
});

test("rapid same-switch true-false-true keeps latest intent", async ({
  page,
}) => {
  const captured = await openSettings(page, "ready", { putDelayMs: 700 });
  await expectExactPrefs(page, ALL_TRUE);
  await page.evaluate(() => {
    const btn = document.querySelector('[data-notify-channel="master"]');
    btn.click();
    btn.click();
  });
  await expect(switchBtn(page, "master")).toHaveAttribute("aria-checked", "true");
  await expect.poll(() => captured.prefsPutCount).toBeGreaterThanOrEqual(1);
  await expect
    .poll(() => {
      const last = captured.prefsPutBodies[captured.prefsPutBodies.length - 1];
      return last ? JSON.parse(last).master : null;
    })
    .toBe(true);
  await expect(switchBtn(page, "master")).toHaveAttribute("aria-checked", "true");
  const last = JSON.parse(
    captured.prefsPutBodies[captured.prefsPutBodies.length - 1],
  );
  expect(Object.keys(last).sort()).toEqual(Object.keys(ALL_TRUE).sort());
});

test("rapid toggle A then B keeps both latest changes", async ({ page }) => {
  const captured = await openSettings(page, "ready", { putDelayMs: 700 });
  await expectExactPrefs(page, ALL_TRUE);
  await page.evaluate(() => {
    document.querySelector('[data-notify-channel="master"]').click();
    document.querySelector('[data-notify-channel="opportunity"]').click();
  });
  await expect(switchBtn(page, "master")).toHaveAttribute("aria-checked", "false");
  await expect(switchBtn(page, "opportunity")).toHaveAttribute(
    "aria-checked",
    "false",
  );
  await expect
    .poll(() => {
      const last = captured.prefsPutBodies[captured.prefsPutBodies.length - 1];
      if (!last) return false;
      const body = JSON.parse(last);
      return body.master === false && body.opportunity === false;
    })
    .toBeTruthy();
  await expect(switchBtn(page, "master")).toHaveAttribute("aria-checked", "false");
  await expect(switchBtn(page, "opportunity")).toHaveAttribute(
    "aria-checked",
    "false",
  );
  expect(
    JSON.parse(captured.prefsPutBodies[captured.prefsPutBodies.length - 1]),
  ).toEqual({
    ...ALL_TRUE,
    master: false,
    opportunity: false,
  });
});

test("PUT failure rolls back and shows no success copy", async ({ page }) => {
  const captured = await openSettings(page, "ready", { putStatus: 500 });
  await expectExactPrefs(page, ALL_TRUE);
  await switchBtn(page, "wallet").click();
  await expect.poll(() => captured.prefsPutCount).toBe(1);
  await expect(switchBtn(page, "wallet")).toHaveAttribute("aria-checked", "true");
  await expect(page.getByText(DELETE_SUCCESS)).toHaveCount(0);
  await expect(page.getByText(PREFS_UNAVAILABLE)).toHaveCount(0);
});

test("logout rapid double-click posts exactly once", async ({ page }) => {
  const captured = await openSettings(page, "ready", { logoutDelayMs: 800 });
  await waitPrefs(page, "ready");
  await expect(page.getByTestId("settings-logout")).toBeVisible();
  await page.evaluate(() => {
    const btn = document.querySelector('[data-testid="settings-logout"]');
    btn.click();
    btn.click();
  });
  await expect.poll(() => captured.logoutCount).toBe(1);
  await expect(page.getByTestId("settings-page")).toHaveAttribute(
    "data-account-view",
    "unauthorized",
    { timeout: 20000 },
  );
  expect(captured.logoutCount).toBe(1);
});

test("delete unchecked confirm posts 0", async ({ page }) => {
  const captured = await openSettings(page, "ready");
  await page.getByTestId("delete-account-phrase").fill(DELETE_PHRASE);
  await page.getByTestId("delete-account-submit").click();
  expect(captured.deleteCount).toBe(0);
});

test("delete wrong phrase posts 0", async ({ page }) => {
  const captured = await openSettings(page, "ready");
  await page.getByTestId("delete-account-phrase").fill("wrong-phrase");
  await page.getByTestId("delete-account-confirm").check();
  await page.getByTestId("delete-account-submit").click();
  expect(captured.deleteCount).toBe(0);
});

test("delete whitespace-only phrase posts 0", async ({ page }) => {
  const captured = await openSettings(page, "ready");
  await page.getByTestId("delete-account-phrase").fill("   ");
  await page.getByTestId("delete-account-confirm").check();
  await page.getByTestId("delete-account-submit").click();
  expect(captured.deleteCount).toBe(0);
});

test("delete correct phrase plus confirm posts 1", async ({ page }) => {
  const captured = await openSettings(page, "ready", { deleteDelayMs: 300 });
  await page.getByTestId("delete-account-phrase").fill(DELETE_PHRASE);
  await page.getByTestId("delete-account-confirm").check();
  await page.getByTestId("delete-account-submit").click();
  await expect(page.getByTestId("delete-account-submit")).toBeDisabled();
  await expect(page.getByText(DELETE_SUCCESS)).toBeVisible();
  expect(captured.deleteCount).toBe(1);
});

test("delete rapid double-click posts exactly once", async ({ page }) => {
  const captured = await openSettings(page, "ready", { deleteDelayMs: 800 });
  await page.getByTestId("delete-account-phrase").fill(DELETE_PHRASE);
  await page.getByTestId("delete-account-confirm").check();
  await page.evaluate(() => {
    const btn = document.querySelector('[data-testid="delete-account-submit"]');
    btn.click();
    btn.click();
  });
  await expect(page.getByText(DELETE_SUCCESS)).toBeVisible();
  expect(captured.deleteCount).toBe(1);
  await page.evaluate(() => {
    const btn = document.querySelector('[data-testid="delete-account-submit"]');
    if (btn) btn.click();
  });
  expect(captured.deleteCount).toBe(1);
});

test("delete failure is truthful and allows retry", async ({ page }) => {
  const captured = await openSettings(page, "ready", { deleteStatus: 500 });
  await waitPrefs(page, "ready");
  await page.getByTestId("delete-account-phrase").fill(DELETE_PHRASE);
  await page.getByTestId("delete-account-confirm").check();
  await page.getByTestId("delete-account-submit").click();
  await expect.poll(() => captured.deleteCount).toBe(1);
  await expect(page.getByTestId("settings-delete-status")).toBeVisible();
  await expect(page.getByText(DELETE_FAIL)).toBeVisible();
  await expect(page.getByText(DELETE_SUCCESS)).toHaveCount(0);
  await expect(page.getByTestId("delete-account-submit")).toBeEnabled();
});

test("logout failure is truthful", async ({ page }) => {
  const captured = await openSettings(page, "ready", { logoutStatus: 500 });
  await page.getByTestId("settings-logout").click();
  await expect(page.getByText(LOGOUT_FAIL)).toBeVisible();
  expect(captured.logoutCount).toBe(1);
});

test("settings a11y has no new critical/serious axe violations", async ({
  page,
}) => {
  await openSettings(page, "ready");
  await waitPrefs(page, "ready");
  await runAxe(page);
});

for (const vp of VIEWPORTS) {
  test(`settings responsive ${vp.width} has no overflow or leftover chrome`, async ({
    page,
  }) => {
    await openSettings(page, "ready", vp.width, vp.height);
    await waitPrefs(page, "ready");
    await assertNoOverflow(page);
    await expect(page.getByRole("heading", { name: TITLE })).toBeVisible();
    await expect(page.getByTestId("settings-logout")).toBeVisible();
    await expect(page.getByTestId("delete-account-submit")).toBeVisible();
    await expect(page.getByTestId("app-shell")).toHaveCount(0);
  });
}
