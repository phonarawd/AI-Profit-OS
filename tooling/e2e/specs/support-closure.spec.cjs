/**
 * REL-126 — Support (/me/support).
 */
const { test, expect } = require("@playwright/test");
const { assertQaIsolation } = require("../lib/qa-env-isolation-guard.cjs");
const { ensureLocalWebRuntime } = require("../lib/local-web-runtime.cjs");
const { blockingViolations } = require("../lib/axe-scan.cjs");

const DISPUTE_API = "/api/v1/wallet/deposit-disputes";
const VIEWPORTS = [
  { width: 390, height: 844 },
  { width: 768, height: 1024 },
  { width: 1024, height: 768 },
  { width: 1440, height: 1080 },
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

async function openSupport(page, path = "/me/support", width = 1440, height = 1080) {
  await page.unrouteAll({ behavior: "ignoreErrors" }).catch(() => {});
  await page.setViewportSize({ width, height });
  await page.goto(`${runtime.baseUrl}${path}`, { waitUntil: "load" });
  await expect(page.getByTestId("support-page")).toBeVisible({ timeout: 20000 });
  await expect(page.getByTestId("support-page")).toHaveAttribute(
    "data-account-view",
    "ready",
  );
}

async function waitGeneralSurface(page) {
  await expect(page.locator("[data-support-surface='general']")).toBeVisible();
  await expect(page.getByText("바로 연결되는 상담 창은 없어요.")).toBeVisible();
  await expect(page.getByRole("link", { name: /입금이 다른 네트워크로 갔어요/ })).toBeVisible();
}

async function waitWrongChainSurface(page) {
  await expect(page.locator("[data-support-surface='wrong-chain']")).toBeVisible();
  await expect(page.getByTestId("wrong-chain-form")).toBeVisible();
  await expect(page.getByTestId("wrong-chain-tx-hash")).toBeVisible();
  await expect(page.getByTestId("wrong-chain-submit")).toBeVisible();
  await expect(page.getByTestId("support-network-hint")).toBeVisible();
}

async function assertNoOverflow(page) {
  const metrics = await page.evaluate(() => {
    const doc = document.documentElement;
    const nodes = [...document.querySelectorAll("a,button,input")];
    const clipped = nodes.some((el) => {
      const r = el.getBoundingClientRect();
      if (r.width <= 0 || r.height <= 0) return false;
      return r.right > window.innerWidth + 2 || r.left < -2;
    });
    return {
      overflowX: doc.scrollWidth - doc.clientWidth,
      clipped,
    };
  });
  expect(metrics.overflowX).toBeLessThanOrEqual(1);
  expect(metrics.clipped).toBeFalsy();
}

async function assertNoFakeSupport(page) {
  await expect(page.getByText("라이브 채팅")).toHaveCount(0);
  await expect(page.getByText("바로 상담")).toHaveCount(0);
  await expect(page.getByText("0 USDT")).toHaveCount(0);
  await expect(page.getByText("0 KRW")).toHaveCount(0);
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

async function stubDispute(page, status) {
  const captured = { method: "", body: null };
  await page.route(`**${DISPUTE_API}`, async (route) => {
    const request = route.request();
    if (request.method() !== "POST") {
      return route.fallback();
    }
    captured.method = request.method();
    const raw = request.postData() || "{}";
    captured.body = JSON.parse(raw);
    if (status === "ok") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ok: true }),
      });
      return;
    }
    await route.fulfill({
      status: 503,
      contentType: "application/json",
      body: JSON.stringify({ ok: false }),
    });
  });
  return captured;
}

test("general support has no fake live chat", async ({ page }) => {
  await openSupport(page);
  await waitGeneralSurface(page);
  await assertNoFakeSupport(page);
  await page.screenshot({
    path: "governance/release-master/rel-126-support/runtime-ready-1440.png",
    fullPage: false,
  });
  await openSupport(page, "/me/support", 390, 693);
  await waitGeneralSurface(page);
  await page.screenshot({
    path: "governance/release-master/rel-126-support/runtime-ready-390.png",
    fullPage: false,
  });
});

test("wrong-chain entry keeps the deposit-dispute form", async ({ page }) => {
  await openSupport(
    page,
    "/me/support?category=deposit&kind=wrong_chain",
  );
  await waitWrongChainSurface(page);
  await expect(page.getByTestId("wrong-chain-submit")).toBeVisible();
});

test("wrong-chain POST contract succeeds only after res.ok", async ({ page }) => {
  await openSupport(page, "/me/support?category=deposit&kind=wrong_chain");
  await waitWrongChainSurface(page);
  const captured = await stubDispute(page, "ok");
  await page.getByTestId("wrong-chain-tx-hash").fill("  qa-wrong-chain-hash-001  ");
  await page.getByTestId("wrong-chain-submit").click();
  await expect(page.locator('[data-toast-code="DEPOSIT_DISPUTE_SUBMITTED"]')).toBeVisible();
  expect(captured.method).toBe("POST");
  expect(captured.body).toEqual({
    kind: "wrong_chain",
    linkedTxHash: "qa-wrong-chain-hash-001",
    idempotencyKey: expect.stringMatching(/\S+/),
  });
  expect(captured.body.usdt).toBeUndefined();
  expect(captured.body.krw).toBeUndefined();
  expect(captured.body.fx).toBeUndefined();
  expect(captured.body.amount).toBeUndefined();
});

test("wrong-chain failed request stays unavailable", async ({ page }) => {
  await openSupport(page, "/me/support?category=deposit&kind=wrong_chain");
  await waitWrongChainSurface(page);
  await stubDispute(page, "fail");
  await page.getByTestId("wrong-chain-tx-hash").fill("qa-wrong-chain-hash-fail");
  await page.getByTestId("wrong-chain-submit").click();
  await expect(page.getByText("지금은 신청을 보낼 수 없음")).toBeVisible();
  await expect(page.locator('[data-toast-code="DEPOSIT_DISPUTE_SUBMITTED"]')).toHaveCount(0);
});

test("support a11y has no new critical/serious axe violations", async ({
  page,
}) => {
  await openSupport(page);
  await waitGeneralSurface(page);
  await runAxe(page);
});

test("wrong-chain a11y has no new critical/serious axe violations", async ({
  page,
}) => {
  await openSupport(page, "/me/support?category=deposit&kind=wrong_chain");
  await waitWrongChainSurface(page);
  await runAxe(page);
});

for (const vp of VIEWPORTS) {
  test(`support responsive ${vp.width}`, async ({ page }) => {
    await openSupport(page, "/me/support", vp.width, vp.height);
    await waitGeneralSurface(page);
    await assertNoOverflow(page);
    await assertNoFakeSupport(page);
    await expect(page.getByRole("link", { name: /이용 안내/ })).toBeVisible();
    await expect(page.getByRole("link", { name: /약관과 정보/ })).toBeVisible();

    await openSupport(
      page,
      "/me/support?category=deposit&kind=wrong_chain",
      vp.width,
      vp.height,
    );
    await waitWrongChainSurface(page);
    await assertNoOverflow(page);
    await assertNoFakeSupport(page);
    const inputBox = await page.getByTestId("wrong-chain-tx-hash").boundingBox();
    const submitBox = await page.getByTestId("wrong-chain-submit").boundingBox();
    expect(inputBox).toBeTruthy();
    expect(submitBox).toBeTruthy();
    expect(inputBox.height).toBeGreaterThanOrEqual(40);
    expect(submitBox.height).toBeGreaterThanOrEqual(48);
  });
}
