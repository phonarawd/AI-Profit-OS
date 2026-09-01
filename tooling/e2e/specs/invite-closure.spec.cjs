/**
 * REL-120 — Referral (/me/invite).
 * 로컬 web 런타임. production URL fallback 0.
 */
const { test, expect } = require("@playwright/test");
const { assertQaIsolation } = require("../lib/qa-env-isolation-guard.cjs");
const { ensureLocalWebRuntime } = require("../lib/local-web-runtime.cjs");
const { stubInvite } = require("../lib/account-route-stubs.cjs");
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

async function overlayInvite(page, mode) {
  if (mode === "own-code-empty-edges") {
    await page.route("**/api/v1/referral/me**", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          enabled: true,
          referralCode: "QA120INVITE",
          referralCodeStatus: "ready",
          edges: [],
          myBinding: null,
        }),
      }),
    );
    return;
  }
  if (mode === "malformed") {
    await page.route("**/api/v1/referral/me**", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          enabled: true,
          edges: [{ code: "EDGEONLY1" }],
        }),
      }),
    );
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

async function openInvite(page, mode, width = 1440, height = 1080) {
  await page.unrouteAll({ behavior: "ignoreErrors" }).catch(() => {});
  await stubInvite(
    page,
    mode === "unauthorized" || mode === "error" || mode === "disabled"
      ? mode
      : "ready",
  );
  await overlayInvite(page, mode);
  await page.setViewportSize({ width, height });
  await page.goto(`${runtime.baseUrl}/me/invite`, { waitUntil: "load" });
  await expect(page.getByTestId("invite-home-page")).toBeVisible({
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

test("401 is unauthorized, not an empty invite win", async ({ page }) => {
  await openInvite(page, "unauthorized");
  await expect(page.getByTestId("invite-home-page")).toHaveAttribute(
    "data-account-view",
    "unauthorized",
  );
  await expect(page.getByText("로그인하면 초대를 볼 수 있어요.")).toBeVisible();
  await expect(page.getByTestId("invite-home")).toHaveCount(0);
  await expect(page.getByTestId("app-shell")).toHaveCount(0);
});

test("own referralCode still displays when edges are empty", async ({
  page,
}) => {
  await openInvite(page, "own-code-empty-edges");
  await expect(page.getByTestId("invite-home-page")).toHaveAttribute(
    "data-account-view",
    "ready",
  );
  await expect(page.getByText("QA120INVITE")).toBeVisible();
});

test("missing referralCode is unavailable even if an edge code exists", async ({
  page,
}) => {
  await openInvite(page, "malformed");
  await expect(page.getByTestId("invite-home-page")).toHaveAttribute(
    "data-account-view",
    "unavailable",
  );
  await expect(page.getByTestId("invite-home")).toHaveCount(0);
  await expect(page.getByText("EDGEONLY1")).toHaveCount(0);
});

test("ready invite stays server-owned", async ({ page }) => {
  await openInvite(page, "ready");
  await expect(page.getByTestId("invite-home-page")).toHaveAttribute(
    "data-account-view",
    "ready",
  );
  await expect(page.getByTestId("invite-home")).toBeVisible();
  await expect(page.getByText("QA120INVITE")).toBeVisible();
  await expect(page.getByTestId("app-shell")).toHaveCount(0);
  await page.screenshot({
    path: "governance/release-master/rel-120-invite/runtime-ready-1440.png",
    fullPage: false,
  });
  await openInvite(page, "ready", 390, 693);
  await page.screenshot({
    path: "governance/release-master/rel-120-invite/runtime-ready-390.png",
    fullPage: false,
  });
});

test("invite a11y has no new critical/serious axe violations", async ({
  page,
}) => {
  await openInvite(page, "ready");
  await page.addScriptTag({ path: require.resolve("axe-core") });
  const results = await page.evaluate(async () => {
    return window.axe.run(document, {
      runOnly: { type: "tag", values: ["wcag2a", "wcag2aa"] },
    });
  });
  const blocking = blockingViolations(results);
  expect(blocking, JSON.stringify(blocking.map((v) => v.id))).toEqual([]);
});
