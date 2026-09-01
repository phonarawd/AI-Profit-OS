/**
 * REL-121 — Notifications (/me/inbox).
 */
const { test, expect } = require("@playwright/test");
const { assertQaIsolation } = require("../lib/qa-env-isolation-guard.cjs");
const { ensureLocalWebRuntime } = require("../lib/local-web-runtime.cjs");
const { stubInbox } = require("../lib/account-route-stubs.cjs");
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

async function overlayInbox(page, mode) {
  if (mode === "empty") {
    await page.route("**/api/v1/me/inbox**", (route) => {
      if (route.request().url().includes("notification-prefs")) return route.fallback();
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ items: [] }),
      });
    });
    return;
  }
  if (mode === "malformed") {
    await page.route("**/api/v1/me/inbox**", (route) => {
      if (route.request().url().includes("notification-prefs")) return route.fallback();
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({}),
      });
    });
    return;
  }
  if (mode === "malformed-items-null") {
    await page.route("**/api/v1/me/inbox**", (route) => {
      if (route.request().url().includes("notification-prefs")) return route.fallback();
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ items: null }),
      });
    });
    return;
  }
  if (mode === "forbidden") {
    await page.route("**/api/v1/me/inbox**", (route) => {
      if (route.request().url().includes("notification-prefs")) return route.fallback();
      return route.fulfill({
        status: 403,
        contentType: "application/json",
        body: JSON.stringify({ error: "forbidden" }),
      });
    });
    return;
  }
  if (mode === "network") {
    await page.route("**/api/v1/me/inbox**", (route) => {
      if (route.request().url().includes("notification-prefs")) return route.fallback();
      return route.abort("failed");
    });
  }
}

async function hideNextDevChrome(page) {
  await page
    .addStyleTag({
      content:
        "nextjs-portal, [data-next-mark-loading], #__next-build-watcher { display: none !important; pointer-events: none !important; }",
    })
    .catch(() => {});
}

async function openInbox(page, mode, width = 1440, height = 1080) {
  await page.unrouteAll({ behavior: "ignoreErrors" }).catch(() => {});
  await stubInbox(page, mode === "empty" || mode === "error" || mode === "unauthorized" || mode === "ready" ? mode : "ready");
  await overlayInbox(page, mode);
  await page.setViewportSize({ width, height });
  await page.goto(`${runtime.baseUrl}/me/inbox`, { waitUntil: "load" });
  await expect(page.getByTestId("inbox-page")).toBeVisible({ timeout: 20000 });
  await hideNextDevChrome(page);
}

test("axe fixture still flags unlabeled controls (harness not weakened)", async () => {
  const html =
    '<!doctype html><html lang="ko"><head><title>퍼뜩</title></head><body><button></button></body></html>';
  const results = await runAxeOnHtml(html);
  expect(blockingViolations(results).length).toBeGreaterThan(0);
});

test("401 is unauthorized, not an empty inbox", async ({ page }) => {
  await openInbox(page, "unauthorized");
  await expect(page.getByTestId("inbox-page")).toHaveAttribute(
    "data-account-view",
    "unauthorized",
  );
  await expect(page.getByText("로그인하면 알림을 볼 수 있어요.")).toBeVisible();
  await expect(page.getByTestId("ops-inbox")).toHaveCount(0);
  await expect(page.getByTestId("app-shell")).toHaveCount(0);
});

test("valid empty list is ready, not unavailable", async ({ page }) => {
  await openInbox(page, "empty");
  await expect(page.getByTestId("inbox-page")).toHaveAttribute(
    "data-account-view",
    "ready",
  );
  await expect(page.getByTestId("ops-inbox")).toBeVisible();
});

test("malformed 200 stays unavailable and does not invent an empty inbox", async ({
  page,
}) => {
  await openInbox(page, "malformed");
  await expect(page.getByTestId("inbox-page")).toHaveAttribute(
    "data-account-view",
    "unavailable",
  );
  await expect(page.getByTestId("ops-inbox")).toHaveCount(0);
});

test("items null is unavailable, not empty ready", async ({ page }) => {
  await openInbox(page, "malformed-items-null");
  await expect(page.getByTestId("inbox-page")).toHaveAttribute(
    "data-account-view",
    "unavailable",
  );
  await expect(page.getByTestId("ops-inbox")).toHaveCount(0);
});

test("403 is unauthorized, not an empty inbox", async ({ page }) => {
  await openInbox(page, "forbidden");
  await expect(page.getByTestId("inbox-page")).toHaveAttribute(
    "data-account-view",
    "unauthorized",
  );
  await expect(page.getByTestId("ops-inbox")).toHaveCount(0);
});

test("5xx is unavailable, not an empty inbox", async ({ page }) => {
  await openInbox(page, "error");
  await expect(page.getByTestId("inbox-page")).toHaveAttribute(
    "data-account-view",
    "unavailable",
  );
  await expect(page.getByTestId("ops-inbox")).toHaveCount(0);
});

test("network failure is unavailable", async ({ page }) => {
  await openInbox(page, "network");
  await expect(page.getByTestId("inbox-page")).toHaveAttribute(
    "data-account-view",
    "unavailable",
  );
  await expect(page.getByTestId("ops-inbox")).toHaveCount(0);
});

test("ready inbox stays server-owned", async ({ page }) => {
  await openInbox(page, "ready");
  await expect(page.getByTestId("inbox-page")).toHaveAttribute(
    "data-account-view",
    "ready",
  );
  await expect(page.getByTestId("ops-inbox")).toBeVisible();
  await expect(page.getByText("계정 알림 예시")).toBeVisible();
  await page.screenshot({
    path: "governance/release-master/rel-121-inbox/runtime-ready-1440.png",
    fullPage: false,
  });
  await openInbox(page, "ready", 390, 693);
  await page.screenshot({
    path: "governance/release-master/rel-121-inbox/runtime-ready-390.png",
    fullPage: false,
  });
});

test("inbox a11y has no new critical/serious axe violations", async ({
  page,
}) => {
  await openInbox(page, "ready");
  await page.addScriptTag({ path: require.resolve("axe-core") });
  const results = await page.evaluate(async () => {
    return window.axe.run(document, {
      runOnly: { type: "tag", values: ["wcag2a", "wcag2aa"] },
    });
  });
  const blocking = blockingViolations(results);
  expect(blocking, JSON.stringify(blocking.map((v) => v.id))).toEqual([]);
});
