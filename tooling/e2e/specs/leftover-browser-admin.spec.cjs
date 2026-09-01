/**
 * Leftover browser evidence — admin Chromium.
 * LEFTOVER_BROWSER=1 에서만 Admin Next를 기동한다. CI 기본 실행 0.
 * Home geometry 0. Production URL fallback 0. Nest 실기동 0 — page.route stub only.
 */
const { test, expect } = require("@playwright/test");
const { assertQaIsolation } = require("../lib/qa-env-isolation-guard.cjs");
const { ensureLocalAdminRuntime } = require("../lib/local-admin-runtime.cjs");
const { blockingViolations } = require("../lib/axe-scan.cjs");

test.describe.configure({ timeout: 180000 });

const ENABLED = process.env.LEFTOVER_BROWSER === "1";
const CSRF = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";

let runtime;

function json(route, status, body) {
  return route.fulfill({
    status,
    contentType: "application/json",
    body: JSON.stringify(body),
  });
}

const POLICY_BODY = {
  policy: {
    matchStrictness: "standard",
    feed: { nearMissCapUsdt: "50" },
    updatedAt: "2026-08-21T00:00:00.000Z",
  },
  softHard: { softSec: 60, hardSec: 90, membershipUniform: true },
  presets: {
    standard: {
      minProfitUsdt: "1",
      staleAllowanceSec: 30,
      maxRematchCount: 1,
    },
  },
};

const STATS_BODY = {
  day: "2026-08-21",
  denominator: 0,
  observedSuccessRate: null,
  readOnly: true,
};

test.beforeAll(async () => {
  test.skip(!ENABLED, "LEFTOVER_BROWSER=1 leftover Chromium evidence only");
  assertQaIsolation({ purpose: "e2e", databaseUrl: "", projectRef: "" });
  runtime = await ensureLocalAdminRuntime({ timeoutMs: 180000 });
}, { timeout: 180000 });

test.afterAll(async () => {
  if (runtime) await runtime.stop();
});

async function stubAdminCommon(page, opts = {}) {
  const connected = opts.connected !== false;
  await page.route("**/api/v1/**", async (route) => {
    const url = route.request().url();
    const method = route.request().method();
    if (url.includes("/api/v1/admin-session/logout") && method === "POST") {
      return json(route, 200, { ok: true });
    }
    if (url.includes("/api/v1/admin-session") && method === "GET") {
      return json(route, 200, { connected });
    }
    if (url.includes("/api/v1/admin/execution-policy/stats/today")) {
      return json(route, 200, STATS_BODY);
    }
    if (url.includes("/api/v1/admin/execution-policy") && method === "GET") {
      return json(route, 200, POLICY_BODY);
    }
    if (url.includes("/api/v1/admin/execution-policy") && method === "PUT") {
      if (typeof opts.onPolicyPut === "function") {
        return opts.onPolicyPut(route);
      }
      return json(route, 500, { error: "upstream_failed" });
    }
    if (url.includes("/api/v1/admin/wallet/withdraw-intents/") && method === "POST") {
      if (typeof opts.onReviewDecide === "function") {
        return opts.onReviewDecide(route);
      }
      return json(route, 200, { ok: true });
    }
    if (url.includes("/api/v1/admin/wallet/withdraw-intents")) {
      return json(route, 200, {
        items: [
          {
            id: "wd-leftover-65",
            userId: "qa-user",
            mode: "profit",
            amountUsdt: "10.00",
            asset: "USDT",
            destination: "TQAADMINREVIEW65",
            status: "pending_review",
          },
        ],
      });
    }
    if (url.includes("/api/v1/admin/wallet/deposit-config")) {
      return json(route, 200, { configVersion: 1, krw: { bankName: "QA Bank" } });
    }
    if (url.includes("/api/v1/admin/wallet/krw-deposit-requests")) {
      return json(route, 200, { items: [] });
    }
    if (url.includes("/api/v1/admin/wallet/deposit-disputes")) {
      return json(route, 200, { items: [] });
    }
    if (
      url.includes("/api/v1/admin/ai-logs") &&
      !url.includes("/eval") &&
      !url.includes("/coach")
    ) {
      return json(route, 200, {
        items: [
          {
            id: "log-leftover-i3",
            lane: "P",
            answer_preview: "user@example.com leftover",
            created_at: "2026-08-21T00:00:00.000Z",
          },
        ],
      });
    }
    return json(route, 401, { error: "unauthorized" });
  });
}

test("ticket99 logout sends double-submit CSRF header", async ({ page }) => {
  test.skip(!ENABLED, "LEFTOVER_BROWSER=1");
  await page.unrouteAll({ behavior: "ignoreErrors" }).catch(() => {});
  await stubAdminCommon(page, { connected: true });
  await page.context().addCookies([
    {
      name: "aipo_admin_csrf",
      value: CSRF,
      url: runtime.baseUrl,
    },
  ]);
  await page.setViewportSize({ width: 1440, height: 1080 });
  const logoutWait = page.waitForRequest((req) => {
    return req.method() === "POST" && req.url().includes("admin-session/logout");
  });
  await page.goto(runtime.baseUrl + "/admin", { waitUntil: "domcontentloaded" });
  await expect(page.getByTestId("admin-session-bar")).toBeVisible();
  await expect(page.getByRole("button", { name: "연결 끊기" })).toBeVisible();
  await page.getByRole("button", { name: "연결 끊기" }).click();
  const req = await logoutWait;
  expect(req.headers()["x-admin-csrf"]).toBe(CSRF);
});

test("ticket95 save rollback rapid intent", async ({ page }) => {
  test.skip(!ENABLED, "LEFTOVER_BROWSER=1");
  let puts = 0;
  await page.unrouteAll({ behavior: "ignoreErrors" }).catch(() => {});
  await stubAdminCommon(page, {
    connected: true,
    onPolicyPut: async (route) => {
      puts += 1;
      await new Promise((resolve) => setTimeout(resolve, 700));
      return json(route, 500, { error: "upstream_failed" });
    },
  });
  page.on("dialog", (dialog) => dialog.accept());
  await page.setViewportSize({ width: 1024, height: 768 });
  await page.goto(runtime.baseUrl + "/admin/execution-policy", {
    waitUntil: "domcontentloaded",
  });
  await expect(page.getByTestId("admin-execution-policy-page")).toBeVisible();
  await expect(page.getByTestId("near-miss-cap-usdt")).toHaveValue("50");
  await page.getByTestId("execution-policy-reason").fill("reason-ok");
  await page.getByTestId("execution-policy-save").dblclick();
  await expect(page.getByRole("status")).toContainText("반영하지 못했습니다.");
  await expect(page.getByText("반영했습니다.")).toHaveCount(0);
  await expect(page.getByTestId("near-miss-cap-usdt")).toHaveValue("50");
  expect(puts).toBe(1);
});

test("ticket65 withdraw review stays a decision queue", async ({ page }) => {
  test.skip(!ENABLED, "LEFTOVER_BROWSER=1");
  let decides = 0;
  await page.unrouteAll({ behavior: "ignoreErrors" }).catch(() => {});
  await stubAdminCommon(page, {
    connected: true,
    onReviewDecide: async (route) => {
      decides += 1;
      await new Promise((resolve) => setTimeout(resolve, 700));
      return json(route, 200, { ok: true });
    },
  });
  page.on("dialog", (dialog) => dialog.accept());
  await page.setViewportSize({ width: 768, height: 1024 });
  await page.goto(runtime.baseUrl + "/admin/wallet?tab=review", {
    waitUntil: "domcontentloaded",
  });
  await expect(page.getByTestId("admin-wallet-page")).toHaveAttribute(
    "data-admin-wallet-tab",
    "review",
  );
  await expect(page.getByTestId("wallet-review-panel")).toBeVisible();
  await expect(page.getByTestId("wallet-review-row")).toContainText("10.00");
  await expect(page.getByText("잔액에 넣었어요")).toHaveCount(0);
  await page.getByRole("button", { name: "승인" }).first().dblclick();
  await expect(page.getByText("반영했습니다.")).toBeVisible();
  expect(decides).toBe(1);
});

test("ticketI3 AI console preview masks mailbox-like leftover", async ({ page }) => {
  test.skip(!ENABLED, "LEFTOVER_BROWSER=1");
  await page.unrouteAll({ behavior: "ignoreErrors" }).catch(() => {});
  await stubAdminCommon(page, { connected: true });
  await page.setViewportSize({ width: 390, height: 693 });
  await page.goto(runtime.baseUrl + "/admin/ai-logs", {
    waitUntil: "domcontentloaded",
  });
  await expect(page.getByTestId("admin-ai-logs-page")).toBeVisible();
  await expect(page.getByTestId("ai-logs-traces-panel")).toBeVisible();
  await expect(page.getByText("[숨김] leftover")).toBeVisible();
  await expect(page.getByText("user@example.com")).toHaveCount(0);
  await expect(page.getByText("출금이나 지급을 실행할 수 없습니다")).toBeVisible();
});

test("leftover admin axe has no new critical/serious", async ({ page }) => {
  test.skip(!ENABLED, "LEFTOVER_BROWSER=1");
  const targets = [
    { name: "wallet-review-768", path: "/admin/wallet?tab=review", width: 768, height: 1024 },
    { name: "execution-policy-1024", path: "/admin/execution-policy", width: 1024, height: 768 },
    { name: "ai-logs-390", path: "/admin/ai-logs", width: 390, height: 693 },
    { name: "admin-home-1440", path: "/admin", width: 1440, height: 1080 },
  ];
  for (const target of targets) {
    await page.unrouteAll({ behavior: "ignoreErrors" }).catch(() => {});
    await stubAdminCommon(page, { connected: true });
    await page.setViewportSize({ width: target.width, height: target.height });
    await page.goto(runtime.baseUrl + target.path, {
      waitUntil: "domcontentloaded",
    });
    await page.addScriptTag({ path: require.resolve("axe-core") });
    const results = await page.evaluate(async () =>
      window.axe.run(document, {
        runOnly: { type: "tag", values: ["wcag2a", "wcag2aa"] },
      }),
    );
    const blocking = blockingViolations(results);
    expect(
      blocking.map((v) => ({ id: v.id, target: target.name })),
      target.name,
    ).toEqual([]);
  }
});
