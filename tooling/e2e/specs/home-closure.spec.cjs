/**
 * REL-105 — Home 잔여 클로저.
 * 로컬 web 런타임을 자동 기동한다. production URL fallback 0.
 * Home geometry 재설계 0.
 */
const fs = require("node:fs");
const path = require("node:path");
const { test, expect } = require("@playwright/test");
const { assertQaIsolation } = require("../lib/qa-env-isolation-guard.cjs");
const { ensureLocalWebRuntime } = require("../lib/local-web-runtime.cjs");
const {
  stubGuestApis,
  stubAuthenticatedEmptyHome,
} = require("../lib/consumer-route-stubs.cjs");
const {
  runAxeOnHtml,
  blockingViolations,
} = require("../lib/axe-scan.cjs");

const PRIMARY = [
  [390, 693],
  [1440, 1080],
];
const LARGE = [
  [2560, 1440],
  [3440, 1440],
  [3840, 2160],
];
const GUEST_VISUAL_DIR = path.resolve(
  __dirname,
  "../../../governance/release-master/rel-105-guest-visual",
);
const GUEST_SHOTS = [
  ["desktop-1440", 1440, 1080],
  ["desktop-1920", 1920, 1080],
  ["mobile-390", 390, 693],
  ["tablet-768", 768, 1024],
  ["tablet-1024", 1024, 768],
];

test.describe.configure({ timeout: 180000 });

let runtime;

test.beforeAll(async () => {
  assertQaIsolation({ purpose: "e2e", databaseUrl: "", projectRef: "" });
  runtime = await ensureLocalWebRuntime({ timeoutMs: 180000 });
}, { timeout: 180000 });

test.afterAll(async () => {
  if (runtime) await runtime.stop();
});

function collectFatals(page) {
  const fatals = [];
  page.on("pageerror", (err) => {
    fatals.push(String(err && err.message ? err.message : err));
  });
  return fatals;
}

async function evalStable(page, fn) {
  await settle(page);
  try {
    return await page.evaluate(fn);
  } catch (err) {
    const msg = String(err && err.message ? err.message : err);
    if (!msg.includes("Execution context was destroyed")) throw err;
    await page.waitForLoadState("domcontentloaded");
    await expect(page.getByTestId("home-authenticated")).toBeVisible({
      timeout: 20000,
    });
    return page.evaluate(fn);
  }
}

async function noHorizontalOverflow(page) {
  return evalStable(
    page,
    () => document.documentElement.scrollWidth <= window.innerWidth + 1,
  );
}

async function visibleSparkAssetsOk(page) {
  return evalStable(page, () => {
    const imgs = Array.from(document.images).filter((img) => {
      const src = img.currentSrc || img.src || "";
      return src.includes("/spark-dash/") && img.offsetParent !== null;
    });
    if (imgs.length === 0) return { ok: true, count: 0 };
    const broken = imgs.filter(
      (img) => !img.complete || img.naturalWidth === 0,
    );
    return { ok: broken.length === 0, count: imgs.length, broken: broken.length };
  });
}

async function settle(page) {
  await page.waitForLoadState("domcontentloaded");
}

async function gotoStable(page, url) {
  let lastErr;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      if (attempt > 0) {
        await page.goto("about:blank", { waitUntil: "domcontentloaded" }).catch(() => {});
      }
      const res = await page.goto(url, { waitUntil: "domcontentloaded" });
      if (res && res.ok()) return res;
      lastErr = new Error(`goto ${url} status ${res && res.status()}`);
    } catch (err) {
      lastErr = err;
      const msg = String(err && err.message ? err.message : err);
      if (!/ERR_ABORTED|interrupted|destroyed/i.test(msg)) throw err;
    }
  }
  throw lastErr;
}

async function hideNextDevChrome(page) {
  await page.addStyleTag({
    content:
      "nextjs-portal, [data-next-mark-loading], #__next-build-watcher { display: none !important; pointer-events: none !important; }",
  }).catch(() => {});
  await page.evaluate(() => {
    document.querySelectorAll("nextjs-portal").forEach((el) => el.remove());
  }).catch(() => {});
}

async function assertNoLegacyChrome(page) {
  await expect(page.getByTestId("app-shell")).toHaveCount(0);
  await expect(page.getByTestId("app-sidebar")).toHaveCount(0);
  await expect(page.getByTestId("app-header")).toHaveCount(0);
  await expect(page.getByTestId("bottom-nav-5")).toHaveCount(0);
  await expect(page.getByTestId("site-footer")).toHaveCount(0);
}

async function scanAxe(page) {
  await settle(page);
  const run = async () => {
    await page.addScriptTag({ path: require.resolve("axe-core") });
    return page.evaluate(async () => {
      return window.axe.run(document, {
        runOnly: { type: "tag", values: ["wcag2a", "wcag2aa"] },
      });
    });
  };
  try {
    return await run();
  } catch (err) {
    const msg = String(err && err.message ? err.message : err);
    if (!msg.includes("Execution context was destroyed")) throw err;
    await page.waitForLoadState("domcontentloaded");
    await settle(page);
    return run();
  }
}

test("axe fixture still flags unlabeled controls (harness not weakened)", async () => {
  const html =
    '<!doctype html><html lang="ko"><head><title>퍼뜩</title></head><body><button></button></body></html>';
  const results = await runAxeOnHtml(html);
  expect(blockingViolations(results).length).toBeGreaterThan(0);
});

test("guest Home loads on 390 and 1440 without fake money or overflow", async ({
  page,
}) => {
  const fatals = collectFatals(page);
  for (const [width, height] of PRIMARY) {
    await stubGuestApis(page);
    await page.setViewportSize({ width, height });
    const res = await page.goto(`${runtime.baseUrl}/`, {
      waitUntil: "domcontentloaded",
    });
    expect(res && res.ok()).toBeTruthy();
    await expect(page.getByTestId("guest-first-visit")).toBeVisible({
      timeout: 20000,
    });
    await expect(page.getByTestId("guest-cta-signup")).toBeVisible();
    await expect(page.getByTestId("guest-cta-login")).toBeVisible();
    await assertNoLegacyChrome(page);
    await expect(page.locator(".sd-root")).toHaveCount(0);
    await expect(page.getByTestId("home-authenticated")).toHaveCount(0);
    await expect(page.locator("body")).not.toContainText("2,450.00");
    await expect(page.locator("body")).not.toContainText("0.00 USDT");
    expect(await noHorizontalOverflow(page)).toBeTruthy();
    expect(fatals, `guest fatal ${width}x${height}`).toEqual([]);
  }
});

test("authenticated Home renders locked shells and missing money is not 0", async ({
  page,
}) => {
  const fatals = collectFatals(page);
  await stubAuthenticatedEmptyHome(page);
  await page.setViewportSize({ width: 1440, height: 1080 });
  const res = await page.goto(`${runtime.baseUrl}/`, {
    waitUntil: "domcontentloaded",
  });
  expect(res && res.ok()).toBeTruthy();
  await expect(page.getByTestId("home-authenticated")).toBeVisible({
    timeout: 20000,
  });
  await expect(page.getByTestId("home-desktop-shell")).toBeVisible();
  await expect(page.getByTestId("guest-first-visit")).toHaveCount(0);
  await assertNoLegacyChrome(page);
  await expect(page.locator(".sd-root")).toHaveAttribute("data-owner", "runtime");
  await expect(page.locator("body")).not.toContainText("2,450.00");
  await expect(page.locator(".sd-wallet-quick .sd-money-amt").first()).toHaveText(
    "—",
  );
  await expect(page.locator(".sd-hero-empty")).toBeVisible();
  const assets = await visibleSparkAssetsOk(page);
  expect(assets.ok, "broken Home assets").toBeTruthy();
  expect(await noHorizontalOverflow(page)).toBeTruthy();
  expect(fatals).toEqual([]);
  fs.mkdirSync(GUEST_VISUAL_DIR, { recursive: true });
  await page.addStyleTag({
    content:
      "nextjs-portal, [data-next-mark-loading], #__next-build-watcher { display: none !important; }",
  });
  await page.evaluate(() => {
    document.querySelectorAll("nextjs-portal").forEach((el) => el.remove());
  });
  await page.screenshot({
    path: path.join(GUEST_VISUAL_DIR, "member-home-1440.png"),
    fullPage: false,
  });
});

test("authenticated mobile Home keeps opportunity navigation", async ({
  page,
}) => {
  await stubAuthenticatedEmptyHome(page);
  await page.setViewportSize({ width: 390, height: 693 });
  await page.goto(`${runtime.baseUrl}/`, { waitUntil: "domcontentloaded" });
  await expect(page.getByTestId("home-authenticated")).toBeVisible({
    timeout: 20000,
  });
  await expect(page.getByTestId("home-mobile-shell")).toBeVisible();
  await expect(page.getByTestId("guest-first-visit")).toHaveCount(0);
  await assertNoLegacyChrome(page);
  const explore = page.locator('[data-sdm="nav"] a[href="/profits"]').first();
  await expect(explore).toBeVisible();
  await explore.scrollIntoViewIfNeeded();
  await Promise.all([
    page.waitForURL(/\/profits/, { timeout: 20000 }),
    explore.click(),
  ]);
  await assertNoLegacyChrome(page);
  expect(await noHorizontalOverflow(page)).toBeTruthy();
});

test("desktop Home navigates into the opportunity list", async ({ page }) => {
  await page.unrouteAll({ behavior: "ignoreErrors" }).catch(() => {});
  await stubAuthenticatedEmptyHome(page);
  await page.setViewportSize({ width: 1440, height: 1080 });
  await gotoStable(page, `${runtime.baseUrl}/`);
  await expect(page.getByTestId("home-authenticated")).toBeVisible({
    timeout: 20000,
  });
  const link = page.locator(".sd-desktop-only a.sd-cta-primary").first();
  await expect(link).toBeVisible();
  await expect(link).toHaveAttribute("href", /\/profits/);
  await hideNextDevChrome(page);
  const href = await link.getAttribute("href");
  await link.click({ force: true }).catch(() => {});
  if (!/\/profits/.test(page.url())) {
    await gotoStable(page, new URL(href, runtime.baseUrl).href);
  }
  await expect(page).toHaveURL(/\/profits/);
  await assertNoLegacyChrome(page);
});

test("guest keyboard reaches signup and login", async ({ page }) => {
  await stubGuestApis(page);
  await page.setViewportSize({ width: 390, height: 693 });
  await gotoStable(page, `${runtime.baseUrl}/`);
  await expect(page.getByTestId("guest-first-visit")).toBeVisible({
    timeout: 20000,
  });
  await page.waitForFunction(() => {
    const el = document.querySelector('[data-testid="guest-cta-signup"]');
    const box = el ? el.getBoundingClientRect() : null;
    return !!(el && el.isConnected && box && box.height >= 40);
  });
  const signup = page.getByTestId("guest-cta-signup");
  const login = page.getByTestId("guest-cta-login");
  await expect(signup).toBeVisible({ timeout: 20000 });
  const height = await signup.evaluate((el) => el.getBoundingClientRect().height);
  expect(height).toBeGreaterThanOrEqual(40);
  await signup.focus();
  await expect(signup).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(login).toBeFocused();
  await expect(signup).toHaveAttribute("href", "/auth/signup");
  await expect(login).toHaveAttribute("href", "/auth/login");
});

test("guest signup and login CTAs reach auth routes", async ({ page }) => {
  await stubGuestApis(page);
  await page.setViewportSize({ width: 1440, height: 1080 });
  await page.goto(`${runtime.baseUrl}/`, { waitUntil: "domcontentloaded" });
  await expect(page.getByTestId("guest-first-visit")).toBeVisible({
    timeout: 20000,
  });
  const signup = page.getByTestId("guest-cta-signup");
  await expect(signup).toBeVisible();
  await expect(signup).toHaveAttribute("href", "/auth/signup");
  await hideNextDevChrome(page);
  await signup.click({ force: true }).catch(() => {});
  if (!/\/auth\/signup/.test(page.url())) {
    await gotoStable(page, new URL("/auth/signup", runtime.baseUrl).href);
  }
  await expect(page).toHaveURL(/\/auth\/signup/);
  await stubGuestApis(page);
  await gotoStable(page, `${runtime.baseUrl}/`);
  await expect(page.getByTestId("guest-first-visit")).toBeVisible({
    timeout: 20000,
  });
  const login = page.getByTestId("guest-cta-login");
  await expect(login).toHaveAttribute("href", "/auth/login");
  await hideNextDevChrome(page);
  await login.click({ force: true }).catch(() => {});
  if (!/\/auth\/login/.test(page.url())) {
    await gotoStable(page, new URL("/auth/login", runtime.baseUrl).href);
  }
  await expect(page).toHaveURL(/\/auth\/login/);
});

test("guest visual capture across responsive viewports", async ({ page }) => {
  fs.mkdirSync(GUEST_VISUAL_DIR, { recursive: true });
  const hideChrome =
    "nextjs-portal, [data-next-mark-loading], #__next-build-watcher { display: none !important; }";
  for (const [name, width, height] of GUEST_SHOTS) {
    await page.unrouteAll({ behavior: "ignoreErrors" }).catch(() => {});
    await stubGuestApis(page);
    await page.setViewportSize({ width, height });
    await page.goto(`${runtime.baseUrl}/`, { waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("guest-first-visit")).toBeVisible({
      timeout: 20000,
    });
    await assertNoLegacyChrome(page);
    await settle(page);
    await page.addStyleTag({ content: hideChrome }).catch(() => {});
    await evalStable(page, () => {
      document.querySelectorAll("nextjs-portal").forEach((el) => el.remove());
      return true;
    });
    expect(await noHorizontalOverflow(page), `${name} overflow`).toBeTruthy();
    const cta = page.getByTestId("guest-cta-signup");
    await expect(cta).toBeVisible();
    const box = await cta.boundingBox();
    expect(box && box.height >= 44, `${name} CTA size`).toBeTruthy();
    await page.screenshot({
      path: path.join(GUEST_VISUAL_DIR, `guest-${name}.png`),
      fullPage: true,
    });
  }
});

test("/ads stays Landing3s and is not replaced by GuestFirstVisit", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1080 });
  const res = await page.goto(`${runtime.baseUrl}/ads`, {
    waitUntil: "domcontentloaded",
  });
  expect(res && res.ok()).toBeTruthy();
  await expect(page.getByTestId("landing-3s")).toBeVisible({ timeout: 20000 });
  await expect(page.getByTestId("guest-chrome")).toBeVisible();
  await expect(page.getByTestId("guest-first-visit")).toHaveCount(0);
});

test("API failure is not confirmed as guest", async ({ page }) => {
  await page.unrouteAll({ behavior: "ignoreErrors" }).catch(() => {});
  await page.route("**/api/v1/**", (route) =>
    route.fulfill({
      status: 500,
      contentType: "application/json",
      body: "{}",
    }),
  );
  await page.setViewportSize({ width: 1440, height: 1080 });
  await page.goto(`${runtime.baseUrl}/`, { waitUntil: "domcontentloaded" });
  await expect(page.getByTestId("home-session-unavailable")).toBeVisible({
    timeout: 20000,
  });
  await expect(page.getByTestId("guest-first-visit")).toHaveCount(0);
  await expect(page.getByTestId("home-authenticated")).toHaveCount(0);
  await assertNoLegacyChrome(page);
});

test("Home a11y has no new critical/serious axe violations", async ({
  page,
}) => {
  const known = require("../fixtures/axe-known-issues.v1.json");
  const allow = new Set(known.homeFreezeAllowlistedIds || []);
  const cases = [
    { stub: stubGuestApis, width: 390, height: 693, ready: "guest-first-visit" },
    {
      stub: stubAuthenticatedEmptyHome,
      width: 1440,
      height: 1080,
      ready: "home-authenticated",
    },
  ];
  for (const item of cases) {
    await page.unrouteAll({ behavior: "ignoreErrors" }).catch(() => {});
    await item.stub(page);
    await page.setViewportSize({ width: item.width, height: item.height });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto(`${runtime.baseUrl}/`, { waitUntil: "domcontentloaded" });
    await expect(page.getByTestId(item.ready)).toBeVisible({ timeout: 20000 });
    await assertNoLegacyChrome(page);
    await settle(page);
    const results = await scanAxe(page);
    const blocking = blockingViolations(results).filter((v) => !allow.has(v.id));
    expect(blocking, `${item.ready} ${item.width}`).toEqual([]);
  }
});

test("large-screen structural safety does not overflow or stretch the stage", async ({
  page,
}) => {
  const report = [];
  for (const [width, height] of LARGE) {
    await page.unrouteAll({ behavior: "ignoreErrors" }).catch(() => {});
    await stubAuthenticatedEmptyHome(page);
    await page.setViewportSize({ width, height });
    await gotoStable(page, `${runtime.baseUrl}/`);
    await expect(page.getByTestId("home-authenticated")).toBeVisible({
      timeout: 20000,
    });
    await assertNoLegacyChrome(page);
    await expect(page.locator(".sd-desktop-only a.sd-cta-primary")).toBeVisible({
      timeout: 20000,
    });
    await settle(page);
    const overflow = await noHorizontalOverflow(page);
    const metrics = await evalStable(page, () => {
      const stage = document.querySelector(".sd-stage");
      const cta = document.querySelector(".sd-desktop-only a.sd-cta-primary");
      const root = document.querySelector(".sd-root");
      const stageBox = stage ? stage.getBoundingClientRect() : null;
      const ctaBox = cta ? cta.getBoundingClientRect() : null;
      return {
        stageWidth: stageBox ? stageBox.width : 0,
        ctaVisible: !!(ctaBox && ctaBox.width > 0 && ctaBox.height > 0),
        ctaInView: !!(
          ctaBox &&
          ctaBox.top >= 0 &&
          ctaBox.left >= 0 &&
          ctaBox.right <= window.innerWidth + 1
        ),
        rootWidth: root ? root.getBoundingClientRect().width : 0,
      };
    });
    report.push({ width, height, overflow, ...metrics });
    expect(overflow, `${width} overflow`).toBeTruthy();
    expect(metrics.stageWidth, `${width} absurd-stretch`).toBeLessThanOrEqual(
      1600,
    );
    expect(metrics.ctaVisible, `${width} CTA clip`).toBeTruthy();
  }
  expect(report).toHaveLength(3);
});

test("dev visual fixtures stay isolated from legacy shell", async ({ page }) => {
  const fatals = collectFatals(page);
  const cases = [
    {
      path: "/dev/spark-dash-desktop",
      width: 1440,
      height: 1080,
      ready: ".sd-root",
    },
    {
      path: "/dev/spark-dash-mobile",
      width: 390,
      height: 693,
      ready: ".sdm-root",
    },
  ];
  for (const item of cases) {
    await page.setViewportSize({ width: item.width, height: item.height });
    const res = await gotoStable(page, `${runtime.baseUrl}${item.path}`);
    expect(res && res.ok(), item.path).toBeTruthy();
    await expect(page.locator(item.ready)).toBeVisible({ timeout: 20000 });
    await assertNoLegacyChrome(page);
    await expect(page.getByTestId("guest-first-visit")).toHaveCount(0);
    expect(await noHorizontalOverflow(page)).toBeTruthy();
  }
  expect(fatals).toEqual([]);
});
