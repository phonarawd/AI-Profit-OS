/**
 * Leftover browser evidence — consumer Chromium.
 * LEFTOVER_BROWSER=1 에서만 Next를 기동한다. CI 기본 실행 0.
 * Firefox/WebKit 설치·Home geometry 변경 0. Production URL fallback 0.
 */
const { test, expect } = require("@playwright/test");
const { assertQaIsolation } = require("../lib/qa-env-isolation-guard.cjs");
const { ensureLocalWebRuntime } = require("../lib/local-web-runtime.cjs");
const {
  stubWithdraw,
  stubDeposit,
  stubHistory,
  HISTORY_JOURNAL_ID,
} = require("../lib/consumer-route-stubs.cjs");
const {
  AXE_SCAN_TARGETS,
  blockingViolations,
} = require("../lib/axe-scan.cjs");

test.describe.configure({ timeout: 180000 });

const ENABLED = process.env.LEFTOVER_BROWSER === "1";
const VIEWPORTS = [
  { width: 390, height: 693 },
  { width: 768, height: 1024 },
  { width: 1024, height: 768 },
  { width: 1440, height: 1080 },
];

let runtime;

function json(route, status, body) {
  return route.fulfill({
    status,
    contentType: "application/json",
    body: JSON.stringify(body),
  });
}

test.beforeAll(async () => {
  test.skip(!ENABLED, "LEFTOVER_BROWSER=1 leftover Chromium evidence only");
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

async function readyUsdtWithdraw(page) {
  await expect(page.getByTestId("withdraw-live-form")).toBeVisible();
  await page.getByTestId("withdraw-amount-input").fill("10");
  await page.getByTestId("withdraw-destination-input").fill("TQAWITHDRAWLEFTOVER93");
  await page.getByTestId("withdraw-step-up-challenge").click();
  await expect(page.getByTestId("withdraw-step-up-panel")).toHaveAttribute(
    "data-challenge-ready",
    "true",
  );
  await page.getByTestId("withdraw-step-up-proof").fill("1234");
  await page.getByTestId("withdraw-step-up-verify").click();
  await expect(page.getByTestId("withdraw-step-up-token-ready")).toBeAttached();
  await page.getByTestId("withdraw-amount-input").fill("10");
  await page.getByTestId("withdraw-destination-input").fill("TQAWITHDRAWLEFTOVER93");
  await expect(page.getByTestId("withdraw-submit")).toBeEnabled();
}

test("ticket93 double-click withdraw posts once and stays uncredited", async ({ page }) => {
  test.skip(!ENABLED, "LEFTOVER_BROWSER=1");
  await page.unrouteAll({ behavior: "ignoreErrors" }).catch(() => {});
  await stubWithdraw(page, "ready");
  let posts = 0;
  const keys = new Set();
  await page.route("**/api/v1/wallet/withdraw", async (route) => {
    const req = route.request();
    if (req.method() !== "POST" || req.url().includes("step-up")) {
      return route.fallback();
    }
    posts += 1;
    const headerKey =
      req.headers()["idempotency-key"] || req.headers()["x-idempotency-key"];
    if (headerKey) keys.add(headerKey);
    const body = req.postDataJSON?.() || {};
    if (body.idempotencyKey) keys.add(String(body.idempotencyKey));
    await new Promise((resolve) => setTimeout(resolve, 700));
    return json(route, 200, { status: "accepted" });
  });
  await page.setViewportSize({ width: 1440, height: 1080 });
  await page.goto(runtime.baseUrl + "/wallet/withdraw/usdt?mode=profit", {
    waitUntil: "load",
  });
  await expect(page.getByTestId("wallet-withdraw-usdt")).toBeVisible({
    timeout: 20000,
  });
  await hideNextDevChrome(page);
  await readyUsdtWithdraw(page);
  const submit = page.getByTestId("withdraw-submit");
  await Promise.all([submit.click(), submit.click(), submit.dblclick()]);
  await expect(page.getByTestId("withdraw-live-form")).toHaveAttribute(
    "data-withdraw-state",
    "accepted",
  );
  await expect(page.getByTestId("withdraw-live-form")).toHaveAttribute(
    "data-credited",
    "false",
  );
  expect(posts).toBe(1);
  expect(keys.size).toBe(1);
  const idem = [...keys][0];
  expect(typeof idem).toBe("string");
  expect(String(idem).trim().length).toBeGreaterThan(0);
});

test("ticket67 KRW safe instructions at leftover viewports", async ({ page }) => {
  test.skip(!ENABLED, "LEFTOVER_BROWSER=1");
  for (const vp of VIEWPORTS) {
    await page.unrouteAll({ behavior: "ignoreErrors" }).catch(() => {});
    await stubDeposit(page, "ready");
    await page.addInitScript(() => {
      window.localStorage.setItem("peotteok_deposit_consult_ack", "1");
    });
    await page.setViewportSize(vp);
    await page.goto(runtime.baseUrl + "/wallet/deposit?tab=krw", {
      waitUntil: "load",
    });
    await expect(page.getByTestId("wallet-deposit-page")).toBeVisible({
      timeout: 20000,
    });
    await expect(page.getByTestId("wallet-deposit-page")).toHaveAttribute(
      "data-krw-instr-state",
      "ready",
      { timeout: 20000 },
    );
    await hideNextDevChrome(page);
    await expect(page.getByTestId("krw-deposit-instructions")).toBeVisible();
    await expect(page.getByTestId("krw-instr-bank")).toHaveText("QA Bank");
    await expect(page.getByTestId("krw-instr-account")).toHaveText("QA-000");
    await expect(page.getByTestId("krw-instr-holder")).toHaveText("Peotteok");
    await expect(page.getByTestId("krw-instr-notice")).toHaveText("qa-notice");
    await expect(page.getByText("입금 완료")).toHaveCount(0);
  }
});

test("ticket94 leftover history detail viewports keep the server slip", async ({
  page,
}) => {
  test.skip(!ENABLED, "LEFTOVER_BROWSER=1");
  for (const vp of [
    { width: 768, height: 1024 },
    { width: 1024, height: 768 },
  ]) {
    await page.unrouteAll({ behavior: "ignoreErrors" }).catch(() => {});
    await stubHistory(page, "ready");
    await page.setViewportSize(vp);
    await page.goto(
      runtime.baseUrl + "/wallet/history/" + HISTORY_JOURNAL_ID,
      { waitUntil: "load" },
    );
    await expect(page.getByTestId("wallet-history-detail")).toBeVisible({
      timeout: 20000,
    });
    await hideNextDevChrome(page);
    await expect(page.getByTestId("wallet-history-detail")).toHaveAttribute(
      "data-history-detail-view",
      "ready",
    );
    await expect(page.getByTestId("history-detail-entries")).toContainText(
      "25.00 USDT",
    );
    await expect(page.getByText("50.00")).toHaveCount(0);
  }
});

function sseChunkOnly() {
  return ["event: chunk", "data: " + JSON.stringify({ text: "partial" }), "", ""].join("\n");
}

function sseTrailingBroken() {
  return [
    "event: chunk",
    "data: " + JSON.stringify({ text: "partial" }),
    "",
    "event: done",
    "data: {",
    "answer",
  ].join("\n");
}

async function stubPeotteokChat(page, chatMode) {
  await page.route("**/api/v1/**", async (route) => {
    const url = route.request().url();
    if (url.includes("/api/v1/auth/session")) {
      return json(route, 200, {
        sessionId: "qa-leftover-session",
        userId: "qa-leftover-user",
        issuer: "ai-profit-os-nest",
        issuedAt: "2026-08-21T00:00:00.000Z",
        expiresAt: "2026-08-22T00:00:00.000Z",
        revoked: false,
        onboardingStage: "B_complete",
      });
    }
    if (url.includes("/api/v1/me/peotteok/chips")) {
      return json(route, 200, { chips: [], toneBand: "mid" });
    }
    if (url.includes("/api/v1/me/peotteok/chat")) {
      if (chatMode === "hang") return;
      if (chatMode === "eof") {
        return route.fulfill({
          status: 200,
          contentType: "text/event-stream",
          body: sseChunkOnly(),
        });
      }
      if (chatMode === "trailing") {
        return route.fulfill({
          status: 200,
          contentType: "text/event-stream",
          body: sseTrailingBroken(),
        });
      }
    }
    return json(route, 401, { error: "unauthorized" });
  });
}

async function openPeotteokReady(page, chatMode) {
  await page.unrouteAll({ behavior: "ignoreErrors" }).catch(() => {});
  await stubPeotteokChat(page, chatMode);
  await page.setViewportSize({ width: 1440, height: 1080 });
  await page.goto(runtime.baseUrl + "/me/peotteok", { waitUntil: "load" });
  await expect(page.getByTestId("peotteok-page")).toBeVisible({ timeout: 20000 });
  await expect(page.getByTestId("peotteok-chat")).toBeVisible();
  await hideNextDevChrome(page);
}

test("ticket96 SSE EOF without done is degraded, not invented success", async ({
  page,
}) => {
  test.skip(!ENABLED, "LEFTOVER_BROWSER=1");
  await openPeotteokReady(page, "eof");
  await page.getByTestId("peotteok-input").fill("안녕");
  await page.getByTestId("peotteok-send").click();
  await expect(page.locator('[data-role="assistant"][data-degraded="1"]')).toBeVisible({
    timeout: 15000,
  });
  await expect(page.getByText("지금은 잠시 바빠요. 조금 뒤 다시 물어봐 주세요.")).toBeVisible();
  await expect(page.getByText("출금 완료")).toHaveCount(0);
  await expect(page.getByText("수익이 확정")).toHaveCount(0);
});

test("ticket96 SSE trailing fragment is degraded, not a done answer", async ({
  page,
}) => {
  test.skip(!ENABLED, "LEFTOVER_BROWSER=1");
  await openPeotteokReady(page, "trailing");
  await page.getByTestId("peotteok-input").fill("안녕");
  await page.getByTestId("peotteok-send").click();
  await expect(page.locator('[data-role="assistant"][data-degraded="1"]')).toBeVisible({
    timeout: 15000,
  });
  await expect(page.getByText("출금 완료")).toHaveCount(0);
});

test("ticket96 hang-then-unmount abort does not invent a done answer", async ({
  page,
}) => {
  test.skip(!ENABLED, "LEFTOVER_BROWSER=1");
  await openPeotteokReady(page, "hang");
  await page.getByTestId("peotteok-input").fill("안녕");
  await page.getByTestId("peotteok-send").click();
  await expect(page.getByTestId("peotteok-send")).toBeDisabled();
  await page.goto(runtime.baseUrl + "/wallet", { waitUntil: "domcontentloaded" });
  await page.unrouteAll({ behavior: "ignoreErrors" }).catch(() => {});
  await stubPeotteokChat(page, "eof");
  await page.goto(runtime.baseUrl + "/me/peotteok", { waitUntil: "load" });
  await expect(page.getByTestId("peotteok-chat")).toBeVisible();
  await expect(page.locator('[data-role="assistant"]')).toHaveCount(0);
  await expect(page.getByText("출금 완료")).toHaveCount(0);
});

test("leftover consumer axe has no new critical/serious", async ({ page }) => {
  test.skip(!ENABLED, "LEFTOVER_BROWSER=1");
  const leftover = [
    { name: "withdraw-usdt-390", path: "/wallet/withdraw/usdt?mode=profit", width: 390, height: 693, stub: "withdraw" },
    { name: "deposit-krw-768", path: "/wallet/deposit?tab=krw", width: 768, height: 1024, stub: "deposit" },
    { name: "history-detail-1024", path: "/wallet/history/" + HISTORY_JOURNAL_ID, width: 1024, height: 768, stub: "history" },
    { name: "peotteok-1440", path: "/me/peotteok", width: 1440, height: 1080, stub: "peotteok" },
  ];
  for (const target of leftover) {
    await page.unrouteAll({ behavior: "ignoreErrors" }).catch(() => {});
    if (target.stub === "withdraw") await stubWithdraw(page, "ready");
    if (target.stub === "deposit") {
      await stubDeposit(page, "ready");
      await page.addInitScript(() => {
        window.localStorage.setItem("peotteok_deposit_consult_ack", "1");
      });
    }
    if (target.stub === "history") await stubHistory(page, "ready");
    if (target.stub === "peotteok") await stubPeotteokChat(page, "eof");
    await page.setViewportSize({ width: target.width, height: target.height });
    await page.goto(runtime.baseUrl + target.path, { waitUntil: "load" });
    await hideNextDevChrome(page);
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

test("official AXE_SCAN_TARGETS browser sweep", async ({ page }) => {
  test.skip(!ENABLED, "LEFTOVER_BROWSER=1");
  test.skip(
    process.env.AXE_BROWSER !== "1",
    "official Home/auth axe is AXE_BROWSER=1",
  );
  const known = require("../fixtures/axe-known-issues.v1.json");
  const allow = new Set(known.homeFreezeAllowlistedIds || []);
  await page.unrouteAll({ behavior: "ignoreErrors" }).catch(() => {});
  for (const target of AXE_SCAN_TARGETS) {
    await page.setViewportSize({
      width: target.width,
      height: target.height,
    });
    await page.goto(runtime.baseUrl + target.route, {
      waitUntil: "domcontentloaded",
    });
    await hideNextDevChrome(page);
    await page.addScriptTag({ path: require.resolve("axe-core") });
    const results = await page.evaluate(async () =>
      window.axe.run({
        runOnly: { type: "tag", values: ["wcag2a", "wcag2aa"] },
      }),
    );
    const blocking = blockingViolations(results).filter((v) => !allow.has(v.id));
    expect(blocking, target.name + " a11y").toEqual([]);
  }
});

test("ticket95 latest intent B remains after late A", async ({ page }) => {
  test.skip(!ENABLED, "LEFTOVER_BROWSER=1");
  const { stubSettings } = require("../lib/account-route-stubs.cjs");
  let stored = {
    userId: "qa-account-user",
    toneBand: "mid",
    fontScale: "md",
    depositPref: "usdt",
    updatedAt: "2026-08-21T00:00:00.000Z",
  };
  let releaseA;
  const first = new Promise((resolve) => {
    releaseA = resolve;
  });
  let puts = 0;
  const bodies = [];
  await page.unrouteAll({ behavior: "ignoreErrors" }).catch(() => {});
  await stubSettings(page, "ready");
  await page.route("**/api/v1/me/ux-prefs**", async (route) => {
    if (route.request().method() !== "PUT") {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(stored),
      });
    }
    puts += 1;
    const body = route.request().postDataJSON() || {};
    bodies.push(body);
    if (puts === 1) {
      await first;
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ...stored, ...body, fontScale: "lg" }),
      });
    }
    stored = { ...stored, ...body };
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(stored),
    });
  });
  await page.setViewportSize({ width: 1440, height: 1080 });
  await page.goto(runtime.baseUrl + "/me/settings", { waitUntil: "load" });
  await expect(page.getByTestId("settings-panel")).toHaveAttribute(
    "data-ux-prefs-view",
    "ready",
  );
  await page.locator("[data-font-scale-option='lg']").click();
  await expect.poll(() => puts, { timeout: 15000 }).toBe(1);
  await page.locator("[data-font-scale-option='xl']").click();
  await expect.poll(() => puts, { timeout: 15000 }).toBe(2);
  releaseA();
  await expect(page.locator("[data-font-scale-confirmed='true']")).toHaveAttribute(
    "data-font-scale-option",
    "xl",
  );
  expect(puts).toBeGreaterThanOrEqual(2);
  expect(bodies[bodies.length - 1].fontScale).toBe("xl");
});
