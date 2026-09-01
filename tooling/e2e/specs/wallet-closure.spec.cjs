/**
 * REL-113 — Wallet (/wallet).
 * 로컬 web 런타임. production URL fallback 0.
 */
const { test, expect } = require("@playwright/test");
const { assertQaIsolation } = require("../lib/qa-env-isolation-guard.cjs");
const { ensureLocalWebRuntime } = require("../lib/local-web-runtime.cjs");
const { stubWallet } = require("../lib/consumer-route-stubs.cjs");
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

function json(route, status, body) {
  return route.fulfill({
    status,
    contentType: "application/json",
    body: JSON.stringify(body),
  });
}

const ZERO_WALLET_BUCKETS = {
  userId: "qa-user",
  principalUsdt: "0",
  profitUsdt: "0",
  lockedUsdt: "0",
  practiceUsdt: "0",
  liabilityUsdt: "0",
  asOfLedgerEntryId: "qa-ledger-zero",
};

async function overlayWalletBuckets(page, mode) {
  if (mode === "zero") {
    await page.route("**/api/v1/wallet/buckets**", (route) =>
      json(route, 200, ZERO_WALLET_BUCKETS),
    );
    return;
  }
  if (mode === "malformed") {
    await page.route("**/api/v1/wallet/buckets**", (route) =>
      json(route, 200, {
        userId: "qa-user",
        principalUsdt: "1.",
        profitUsdt: "12.50",
        lockedUsdt: "0.00",
        practiceUsdt: "0.00",
        liabilityUsdt: "0.00",
        asOfLedgerEntryId: "qa-ledger",
      }),
    );
    return;
  }
  if (mode === "error") {
    await page.route("**/api/v1/wallet/buckets**", (route) =>
      json(route, 500, { error: "upstream_failed" }),
    );
    return;
  }
  if (mode === "network") {
    await page.route("**/api/v1/wallet/buckets**", (route) =>
      route.abort("failed"),
    );
    return;
  }
  if (mode === "hang") {
    await page.route("**/api/v1/wallet/buckets**", () => {});
  }
}

async function openWallet(page, mode, width = 1440, height = 1080) {
  await page.unrouteAll({ behavior: "ignoreErrors" }).catch(() => {});
  const stubMode =
    mode === "unauthorized" ? "unauthorized" : "ready";
  await stubWallet(page, stubMode);
  await overlayWalletBuckets(page, mode);
  await page.setViewportSize({ width, height });
  await page.goto(`${runtime.baseUrl}/wallet`, { waitUntil: "load" });
  await expect(page.getByTestId("wallet-home")).toBeVisible({ timeout: 20000 });
  await hideNextDevChrome(page);
}

test("axe fixture still flags unlabeled controls (harness not weakened)", async () => {
  const html =
    '<!doctype html><html lang="ko"><head><title>퍼뜩</title></head><body><button></button></body></html>';
  const results = await runAxeOnHtml(html);
  expect(blockingViolations(results).length).toBeGreaterThan(0);
});

test("401 is unauthorized, not zero buckets", async ({ page }) => {
  await openWallet(page, "unauthorized");
  await expect(page.getByTestId("wallet-home")).toHaveAttribute(
    "data-wallet-view",
    "unauthorized",
  );
  await expect(page.getByText("로그인하면 지갑을 볼 수 있어요.")).toBeVisible();
  await expect(page.getByTestId("bucket-breakdown")).toHaveCount(0);
  await expect(page.getByTestId("app-shell")).toHaveCount(0);
});

test("ready buckets stay server-owned", async ({ page }) => {
  await openWallet(page, "ready");
  await expect(page.getByTestId("wallet-home")).toHaveAttribute(
    "data-wallet-view",
    "ready",
  );
  await expect(page.getByTestId("bucket-breakdown")).toBeVisible();
  await expect(page.getByTestId("wallet-deposit-cta")).toBeVisible();
  await expect(page.getByTestId("wallet-withdraw-profit")).toHaveAttribute(
    "data-default-mode",
    "profit",
  );
  await expect(page.getByText("12.50")).toBeVisible();
  await page.screenshot({
    path: "governance/release-master/rel-113-wallet/runtime-ready-1440.png",
    fullPage: false,
  });
  await openWallet(page, "ready", 390, 693);
  await page.screenshot({
    path: "governance/release-master/rel-113-wallet/runtime-ready-390.png",
    fullPage: false,
  });
});

test("authorized exact zero stays the server zero", async ({ page }) => {
  await openWallet(page, "zero");
  await expect(page.getByTestId("wallet-home")).toHaveAttribute(
    "data-wallet-view",
    "ready",
  );
  await expect(page.getByTestId("bucket-liability")).toHaveText(/^\s*0\s/);
  await expect(page.getByText("12.50")).toHaveCount(0);
});

test("loading hangs until buckets arrive", async ({ page }) => {
  await openWallet(page, "hang");
  await expect(page.getByTestId("wallet-home")).toHaveAttribute(
    "data-wallet-view",
    "loading",
  );
  await expect(page.getByTestId("bucket-breakdown")).toHaveCount(0);
});

test("malformed 200 is unavailable, not invented money", async ({ page }) => {
  await openWallet(page, "malformed");
  await expect(page.getByTestId("wallet-home")).toHaveAttribute(
    "data-wallet-view",
    "unavailable",
  );
  await expect(page.getByTestId("bucket-breakdown")).toHaveCount(0);
});

test("5xx is unavailable, not zero buckets", async ({ page }) => {
  await openWallet(page, "error");
  await expect(page.getByTestId("wallet-home")).toHaveAttribute(
    "data-wallet-view",
    "unavailable",
  );
  await expect(page.getByTestId("bucket-breakdown")).toHaveCount(0);
});

test("network failure is unavailable", async ({ page }) => {
  await openWallet(page, "network");
  await expect(page.getByTestId("wallet-home")).toHaveAttribute(
    "data-wallet-view",
    "unavailable",
  );
  await expect(page.getByTestId("bucket-breakdown")).toHaveCount(0);
});

test("ready view holds at 768 and 1024", async ({ page }) => {
  for (const width of [768, 1024]) {
    await openWallet(page, "ready", width, 1024);
    await expect(page.getByTestId("wallet-home")).toHaveAttribute(
      "data-wallet-view",
      "ready",
    );
    await expect(page.getByText("12.50")).toBeVisible();
  }
});

test("wallet a11y has no new critical/serious axe violations", async ({
  page,
}) => {
  await openWallet(page, "ready");
  await page.addScriptTag({ path: require.resolve("axe-core") });
  const results = await page.evaluate(async () => {
    return window.axe.run(document, {
      runOnly: { type: "tag", values: ["wcag2a", "wcag2aa"] },
    });
  });
  const blocking = blockingViolations(results);
  expect(blocking, JSON.stringify(blocking.map((v) => v.id))).toEqual([]);
});
