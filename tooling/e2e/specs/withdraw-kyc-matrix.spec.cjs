/**
 * #92 withdraw KYC matrix. Local web only. Production URL fallback 0.
 */
const { test, expect } = require("@playwright/test");
const { assertQaIsolation } = require("../lib/qa-env-isolation-guard.cjs");
const { ensureLocalWebRuntime } = require("../lib/local-web-runtime.cjs");
const { stubWithdraw } = require("../lib/consumer-route-stubs.cjs");

test.describe.configure({ timeout: 180000 });

let runtime;

function json(route, status, body) {
  return route.fulfill({
    status,
    contentType: "application/json",
    body: JSON.stringify(body),
  });
}

test.beforeAll(async () => {
  assertQaIsolation({ purpose: "e2e", databaseUrl: "", projectRef: "" });
  runtime = await ensureLocalWebRuntime({ timeoutMs: 180000 });
}, { timeout: 180000 });

test.afterAll(async () => {
  if (runtime) await runtime.stop();
});

async function overlayKyc(page, mode) {
  const path = "**/api/v1/compliance/kyc/status**";
  if (mode === "pending" || mode === "rejected" || mode === "none") {
    await page.route(path, (route) =>
      json(route, 200, { userId: "qa-withdraw-user", kycStatus: mode }),
    );
    return;
  }
  if (mode === "malformed") {
    await page.route(path, (route) =>
      json(route, 200, {
        userId: "qa-withdraw-user",
        kycStatus: "approved",
        extra: true,
      }),
    );
    return;
  }
  if (mode === "forbidden") {
    await page.route(path, (route) => json(route, 403, { error: "forbidden" }));
    return;
  }
  if (mode === "error") {
    await page.route(path, (route) =>
      json(route, 500, { error: "upstream_failed" }),
    );
    return;
  }
  if (mode === "network") {
    await page.route(path, (route) => route.abort("failed"));
    return;
  }
  if (mode === "hang") {
    await page.route(path, () => {});
  }
}

async function openKrw(page, mode, width = 1440, height = 1080) {
  await page.unrouteAll({ behavior: "ignoreErrors" }).catch(() => {});
  const stubMode = mode === "unauthorized" ? "unauthorized" : "ready";
  await stubWithdraw(page, stubMode);
  await overlayKyc(page, mode);
  await page.setViewportSize({ width, height });
  await page.goto(`${runtime.baseUrl}/wallet/withdraw/krw?mode=profit`, {
    waitUntil: "load",
  });
  await expect(page.getByTestId("wallet-withdraw-krw")).toBeVisible({
    timeout: 20000,
  });
}

test("ready approved shows the form", async ({ page }) => {
  await openKrw(page, "ready");
  await expect(page.getByTestId("wallet-withdraw-krw")).toHaveAttribute(
    "data-kyc-authority",
    "ready",
  );
  await expect(page.getByTestId("wallet-withdraw-krw")).toHaveAttribute(
    "data-kyc-status",
    "approved",
  );
  await expect(page.getByTestId("wallet-withdraw-krw")).toHaveAttribute(
    "data-kyc-form",
    "1",
  );
  await expect(page.getByTestId("withdraw-live-form")).toBeVisible();
});

test("pending hides the form", async ({ page }) => {
  await openKrw(page, "pending");
  await expect(page.getByTestId("wallet-withdraw-krw")).toHaveAttribute(
    "data-kyc-status",
    "pending",
  );
  await expect(page.getByTestId("wallet-withdraw-krw")).toHaveAttribute(
    "data-kyc-form",
    "0",
  );
  await expect(page.getByTestId("withdraw-live-form")).toHaveCount(0);
});

test("rejected hides the form", async ({ page }) => {
  await openKrw(page, "rejected");
  await expect(page.getByTestId("wallet-withdraw-krw")).toHaveAttribute(
    "data-kyc-form",
    "0",
  );
  await expect(page.getByTestId("withdraw-live-form")).toHaveCount(0);
});

test("none hides the form", async ({ page }) => {
  await openKrw(page, "none");
  await expect(page.getByTestId("wallet-withdraw-krw")).toHaveAttribute(
    "data-kyc-form",
    "0",
  );
  await expect(page.getByTestId("withdraw-live-form")).toHaveCount(0);
});

test("401 exposes login recovery", async ({ page }) => {
  await openKrw(page, "unauthorized");
  await expect(page.getByTestId("wallet-withdraw-krw")).toHaveAttribute(
    "data-kyc-authority",
    "unauthorized",
  );
  await expect(page.getByTestId("withdraw-login-cta")).toBeVisible();
  await expect(page.getByTestId("withdraw-login-cta")).toHaveAttribute(
    "href",
    "/auth/login",
  );
  await expect(page.getByTestId("withdraw-live-form")).toHaveCount(0);
});

test("403 is unauthorized and hides the form", async ({ page }) => {
  await openKrw(page, "forbidden");
  await expect(page.getByTestId("wallet-withdraw-krw")).toHaveAttribute(
    "data-kyc-authority",
    "unauthorized",
  );
  await expect(page.getByTestId("withdraw-login-cta")).toBeVisible();
  await expect(page.getByTestId("withdraw-live-form")).toHaveCount(0);
});

test("malformed 200 is unavailable", async ({ page }) => {
  await openKrw(page, "malformed");
  await expect(page.getByTestId("wallet-withdraw-krw")).toHaveAttribute(
    "data-kyc-authority",
    "unavailable",
  );
  await expect(page.getByTestId("withdraw-live-form")).toHaveCount(0);
});

test("5xx is unavailable", async ({ page }) => {
  await openKrw(page, "error");
  await expect(page.getByTestId("wallet-withdraw-krw")).toHaveAttribute(
    "data-kyc-authority",
    "unavailable",
  );
  await expect(page.getByTestId("withdraw-live-form")).toHaveCount(0);
});

test("network failure is unavailable", async ({ page }) => {
  await openKrw(page, "network");
  await expect(page.getByTestId("wallet-withdraw-krw")).toHaveAttribute(
    "data-kyc-authority",
    "unavailable",
  );
  await expect(page.getByTestId("withdraw-live-form")).toHaveCount(0);
});

test("loading hangs until status arrives", async ({ page }) => {
  await openKrw(page, "hang");
  await expect(page.getByTestId("wallet-withdraw-krw")).toHaveAttribute(
    "data-kyc-authority",
    "loading",
  );
  await expect(page.getByTestId("withdraw-live-form")).toHaveCount(0);
});
