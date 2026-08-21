/**
 * REL-109 — Matching / execute (/trades/[id]/execute).
 * 로컬 web 런타임. production URL fallback 0.
 */
const { test, expect } = require("@playwright/test");
const { assertQaIsolation } = require("../lib/qa-env-isolation-guard.cjs");
const { ensureLocalWebRuntime } = require("../lib/local-web-runtime.cjs");
const { stubTradeExecution } = require("../lib/consumer-route-stubs.cjs");
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

async function openExecute(page, mode, width = 1440, height = 1080, query = "") {
  await page.unrouteAll({ behavior: "ignoreErrors" }).catch(() => {});
  await stubTradeExecution(page, mode);
  await page.setViewportSize({ width, height });
  await page.goto(`${runtime.baseUrl}/trades/qa-rel109-trade/execute${query}`, {
    waitUntil: "load",
  });
  await expect(page.getByTestId("trade-execute")).toBeVisible({ timeout: 20000 });
  await hideNextDevChrome(page);
}

test("axe fixture still flags unlabeled controls (harness not weakened)", async () => {
  const html =
    '<!doctype html><html lang="ko"><head><title>퍼뜩</title></head><body><button></button></body></html>';
  const results = await runAxeOnHtml(html);
  expect(blockingViolations(results).length).toBeGreaterThan(0);
});

test("401 is unauthorized, not success", async ({ page }) => {
  await openExecute(page, "unauthorized");
  await expect(page.getByText("로그인하면 이 진행을 확인할 수 있어요.")).toBeVisible();
  await expect(page.getByText("정산이 반영됐어요.")).toHaveCount(0);
  await expect(page.getByTestId("app-shell")).toHaveCount(0);
});

test("running does not show confirmed profit or query-fake success", async ({
  page,
}) => {
  await openExecute(page, "running", 1440, 1080, "?state=success");
  await expect(page.getByTestId("trade-execute")).toHaveAttribute(
    "data-consumer-state",
    "MatchingInProgress",
  );
  await expect(page.getByText("기회를 맞추는 중이에요.")).toBeVisible();
  await expect(page.getByText("정산이 반영됐어요.")).toHaveCount(0);
  await expect(page.getByText("확정 수익")).toHaveCount(0);
  await expect(page.getByText("아직 확정된 수익이 아니에요")).toBeVisible();
  await page.screenshot({
    path: "governance/release-master/rel-109-execute/runtime-running-1440.png",
    fullPage: false,
  });
  await openExecute(page, "running", 390, 693);
  await page.screenshot({
    path: "governance/release-master/rel-109-execute/runtime-running-390.png",
    fullPage: false,
  });
});

test("requeue and safe-stop stay server-backed", async ({ page }) => {
  await openExecute(page, "requeue");
  await expect(page.getByTestId("trade-execute")).toHaveAttribute(
    "data-consumer-state",
    "MatchingRetrying",
  );
  await expect(page.getByText("다시 맞추는 중이에요.")).toBeVisible();
  await page.screenshot({
    path: "governance/release-master/rel-109-execute/runtime-requeue-1440.png",
    fullPage: false,
  });
  await openExecute(page, "requeue", 390, 693);
  await page.screenshot({
    path: "governance/release-master/rel-109-execute/runtime-requeue-390.png",
    fullPage: false,
  });
  await openExecute(page, "safe_stop");
  await expect(page.getByTestId("trade-execute")).toHaveAttribute(
    "data-consumer-state",
    "StoppedSafely",
  );
  await expect(page.getByText("이번엔 맞지 않았어요. 원금은 그대로예요.")).toBeVisible();
  await expect(page.getByText("확정 수익")).toHaveCount(0);
  await page.screenshot({
    path: "governance/release-master/rel-109-execute/runtime-safestop-1440.png",
    fullPage: false,
  });
  await openExecute(page, "safe_stop", 390, 693);
  await page.screenshot({
    path: "governance/release-master/rel-109-execute/runtime-safestop-390.png",
    fullPage: false,
  });
});

test("success without settled profit is not confirmed", async ({ page }) => {
  await openExecute(page, "success_pending");
  await expect(page.getByText("처리 중이에요.")).toBeVisible();
  await expect(page.getByText("확정 수익")).toHaveCount(0);
});

test("settled shows confirmed profit only after owner arrives", async ({
  page,
}) => {
  await openExecute(page, "success", 1440, 1080);
  await expect(page.getByTestId("trade-execute")).toHaveAttribute(
    "data-consumer-state",
    "Settled",
  );
  await expect(page.getByText("정산이 반영됐어요.")).toBeVisible();
  await expect(page.locator("[data-sdr-settled='true']")).toContainText("12.50");
  await page.screenshot({
    path: "governance/release-master/rel-109-execute/runtime-success-1440.png",
    fullPage: false,
  });
  await openExecute(page, "success", 390, 693);
  await page.screenshot({
    path: "governance/release-master/rel-109-execute/runtime-success-390.png",
    fullPage: false,
  });
});

test("failed is failed, not empty success", async ({ page }) => {
  await openExecute(page, "failed");
  await expect(page.getByTestId("trade-execute")).toHaveAttribute(
    "data-consumer-state",
    "Failed",
  );
  await expect(page.getByText("지금은 처리할 수 없어요.")).toBeVisible();
  await expect(page.getByRole("link", { name: "고객지원" })).toBeVisible();
});

test("reduced motion keeps status text", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await openExecute(page, "running");
  await expect(page.getByText("기회를 맞추는 중이에요.")).toBeVisible();
});

test("execute a11y has no new critical/serious axe violations", async ({
  page,
}) => {
  await openExecute(page, "running");
  const run = async () => {
    await page.addScriptTag({ path: require.resolve("axe-core") });
    return page.evaluate(async () => {
      return window.axe.run(document, {
        runOnly: { type: "tag", values: ["wcag2a", "wcag2aa"] },
      });
    });
  };
  const results = await run();
  const blocking = blockingViolations(results);
  expect(blocking, JSON.stringify(blocking.map((v) => v.id))).toEqual([]);
});
