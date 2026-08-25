/**
 * REL-115 — KrwDeposit (/wallet/deposit?tab=krw)
 */
const { test, expect } = require("@playwright/test");
const { assertQaIsolation } = require("../lib/qa-env-isolation-guard.cjs");
const { ensureLocalWebRuntime } = require("../lib/local-web-runtime.cjs");
const { stubDeposit } = require("../lib/consumer-route-stubs.cjs");
const { blockingViolations } = require("../lib/axe-scan.cjs");

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

async function stubKrwInstructions(page, mode) {
  await page.route("**/api/v1/wallet/krw-deposit-instructions", (route) => {
    if (mode === "unauthorized") {
      return route.fulfill({
        status: 401,
        contentType: "application/json",
        body: JSON.stringify({ error: "unauthorized" }),
      });
    }
    if (mode === "not_ready") {
      return route.fulfill({
        status: 404,
        contentType: "application/json",
        body: JSON.stringify({ error: "KRW_DEPOSIT_ACCOUNT_NOT_READY" }),
      });
    }
    if (mode === "error") {
      return route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({ error: "upstream_failed" }),
      });
    }
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        configVersion: 7,
        bankName: "QA테스트은행",
        accountNumber: "000-000-000000",
        accountHolder: "퍼뜩 QA",
        noticeKo: "QA 전용 계좌 fixture이며 운영 계좌가 아닙니다.",
        updatedAt: "2026-08-25T00:00:00.000Z",
      }),
    });
  });
}

async function openKrw(
  page,
  mode,
  width = 1440,
  height = 1080,
  instructionMode = "ready",
) {
  await page.unrouteAll({ behavior: "ignoreErrors" }).catch(() => {});
  await stubDeposit(page, mode);
  await stubKrwInstructions(page, instructionMode);
  await page.addInitScript(() => {
    window.localStorage.setItem("peotteok_deposit_consult_ack", "1");
  });
  await page.setViewportSize({ width, height });
  await page.goto(`${runtime.baseUrl}/wallet/deposit?tab=krw`, {
    waitUntil: "load",
  });
  await expect(page.getByTestId("wallet-deposit-page")).toBeVisible({
    timeout: 20000,
  });
  await hideNextDevChrome(page);
}

test("KRW shows persisted account instructions before allowing a request", async ({ page }) => {
  await openKrw(page, "ready");
  await expect(page.getByTestId("wallet-deposit-page")).toHaveAttribute(
    "data-krw-instructions-state",
    "ready",
  );
  await expect(page.getByTestId("krw-deposit-instructions")).toBeVisible();
  await expect(page.getByTestId("krw-bank-name")).toContainText("QA테스트은행");
  await expect(page.getByTestId("krw-account-number")).toHaveText("000-000-000000");
  await expect(page.getByTestId("krw-account-holder")).toContainText("퍼뜩 QA");
  await expect(page.getByTestId("krw-account-notice")).toContainText("운영 계좌가 아닙니다");
  await expect(page.getByTestId("deposit-continue")).toBeEnabled();

  await page.getByTestId("krw-account-copy").click();
  await expect(page.getByTestId("krw-account-copy")).toHaveText("계좌번호 복사됨");
});

test("KRW happy path is pending, not credited", async ({ page }) => {
  await openKrw(page, "ready");
  await page.getByTestId("krw-depositor-name").fill("홍길동");
  await page.getByTestId("krw-amount").fill("10000");
  await page.getByTestId("deposit-continue").click();
  await expect(page.getByTestId("wallet-deposit-page")).toHaveAttribute(
    "data-krw-state",
    "pending",
  );
  await expect(page.getByTestId("krw-pending")).toBeVisible();
  await expect(page.getByText("잔액에 넣지 않았어요")).toBeVisible();
  await expect(page.getByText("입금 완료")).toHaveCount(0);
  await page.screenshot({
    path: "governance/release-master/rel-115-krw-deposit/runtime-pending-1440.png",
    fullPage: false,
  });

  await openKrw(page, "ready", 390, 693);
  await expect(page.getByTestId("krw-deposit-instructions")).toBeVisible();
  const metrics = await page.evaluate(() => ({
    width: window.innerWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  expect(metrics.scrollWidth).toBeLessThanOrEqual(metrics.width + 2);
  await page.getByTestId("krw-depositor-name").fill("홍길동");
  await page.getByTestId("krw-amount").fill("10000");
  await page.getByTestId("deposit-continue").click();
  await expect(page.getByTestId("krw-pending")).toBeVisible();
  await page.screenshot({
    path: "governance/release-master/rel-115-krw-deposit/runtime-pending-390.png",
    fullPage: false,
  });
});

test("KRW account not persisted fails closed and cannot be submitted", async ({ page }) => {
  let requestPosts = 0;
  await openKrw(page, "ready", 1440, 1080, "not_ready");
  page.on("request", (request) => {
    if (
      request.method() === "POST" &&
      request.url().includes("/api/v1/wallet/krw-deposit-requests")
    ) {
      requestPosts += 1;
    }
  });

  await expect(page.getByTestId("wallet-deposit-page")).toHaveAttribute(
    "data-krw-instructions-state",
    "not_ready",
  );
  await expect(page.getByTestId("krw-account-not-ready")).toBeVisible();
  await expect(page.getByTestId("krw-deposit-instructions")).toHaveCount(0);
  await expect(page.getByTestId("deposit-continue")).toBeDisabled();
  expect(requestPosts).toBe(0);
});

test("KRW deny is not a fake success", async ({ page }) => {
  await openKrw(page, "krw_deny");
  await page.getByTestId("krw-depositor-name").fill("홍길동");
  await page.getByTestId("krw-amount").fill("10000");
  await page.getByTestId("deposit-continue").click();
  await expect(page.getByTestId("wallet-deposit-page")).toHaveAttribute(
    "data-krw-state",
    "denied",
  );
  await expect(page.getByText("지금은 원화 입금을 신청할 수 없어요.")).toBeVisible();
});

test("KRW deposit a11y has no new critical/serious", async ({ page }) => {
  await openKrw(page, "ready");
  await page.addScriptTag({ path: require.resolve("axe-core") });
  const results = await page.evaluate(async () =>
    window.axe.run(document, {
      runOnly: { type: "tag", values: ["wcag2a", "wcag2aa"] },
    }),
  );
  const blocking = blockingViolations(results);
  expect(
    blocking.map((v) => ({
      id: v.id,
      nodes: v.nodes.map((n) => ({
        target: n.target,
        html: String(n.html || "").slice(0, 160),
      })),
    })),
  ).toEqual([]);
});
