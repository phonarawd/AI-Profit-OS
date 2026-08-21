/**
 * REL-108 — Participate Confirmation sheet.
 * 로컬 web 런타임. production URL fallback 0.
 * /dev preview = DEV/TEST visual keys only.
 */
const { test, expect } = require("@playwright/test");
const { assertQaIsolation } = require("../lib/qa-env-isolation-guard.cjs");
const { ensureLocalWebRuntime } = require("../lib/local-web-runtime.cjs");
const { stubOpportunityRoom } = require("../lib/consumer-route-stubs.cjs");
const {
  runAxeOnHtml,
  blockingViolations,
} = require("../lib/axe-scan.cjs");

const SHEET_KEYS = [
  ["ready", "PREFLIGHT_READY", ""],
  ["issuing", "PREFLIGHT_ISSUING", ""],
  ["submitting", "SUBMITTING", ""],
  ["accepted", "ACCEPTED", ""],
  ["reused", "REUSED", ""],
  ["preflight_required", "ERROR", "PREFLIGHT_REQUIRED"],
  ["insufficient", "ERROR", "INSUFFICIENT_PRINCIPAL"],
  ["stale", "ERROR", "PRICE_STALE"],
  ["expired", "ERROR", "OPPORTUNITY_EXPIRED"],
  ["blocked", "ERROR", "MATCH_BLOCKED"],
  ["auth", "ERROR", "AUTH_REQUIRED"],
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

async function hideNextDevChrome(page) {
  await page
    .addStyleTag({
      content:
        "nextjs-portal, [data-next-mark-loading], #__next-build-watcher { display: none !important; pointer-events: none !important; }",
    })
    .catch(() => {});
}

async function gotoStable(page, url) {
  for (let i = 0; i < 2; i += 1) {
    try {
      await page.goto(url, { waitUntil: "load" });
      return;
    } catch (err) {
      const msg = String(err && err.message ? err.message : err);
      if (!msg.includes("ERR_ABORTED") || i === 1) throw err;
    }
  }
}

async function openReadySheet(page, opts = {}) {
  await page.unrouteAll({ behavior: "ignoreErrors" }).catch(() => {});
  await stubOpportunityRoom(page, "ready", opts);
  await page.setViewportSize({ width: 1440, height: 1080 });
  await gotoStable(page, `${runtime.baseUrl}/profits/qa-rel106-opp`);
  await expect(page.getByTestId("opportunity-detail")).toHaveAttribute(
    "data-detail-state",
    "ready",
    { timeout: 20000 },
  );
  await hideNextDevChrome(page);
  const cta = page.locator(".sd-desktop-only [data-requires-preflight='true']");
  await expect(cta).toBeEnabled();
  for (let i = 0; i < 2; i += 1) {
    const preflight = page.waitForRequest(
      (req) => req.method() === "POST" && req.url().includes("/preflight"),
      { timeout: 8000 },
    );
    await cta.click({ force: true });
    try {
      await preflight;
      break;
    } catch (err) {
      if (i === 1) throw err;
      await hideNextDevChrome(page);
    }
  }
  const sheet = page.locator("dialog.sdr-sheet");
  await expect(sheet).toHaveAttribute("data-sdr-sheet", "PREFLIGHT_READY", {
    timeout: 10000,
  });
  return sheet;
}

test("axe fixture still flags unlabeled controls (harness not weakened)", async () => {
  const html =
    '<!doctype html><html lang="ko"><head><title>퍼뜩</title></head><body><button></button></body></html>';
  const results = await runAxeOnHtml(html);
  expect(blockingViolations(results).length).toBeGreaterThan(0);
});

test("dev preview keeps all 11 sheet states", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1080 });
  for (const [key, phase, error] of SHEET_KEYS) {
    await gotoStable(
      page,
      `${runtime.baseUrl}/dev/spark-dash-room?sheet=${key}`,
    );
    const sheet = page.locator("dialog.sdr-sheet");
    await expect(sheet).toBeVisible({ timeout: 20000 });
    await expect(sheet).toHaveAttribute("data-sdr-sheet", phase);
    await expect(sheet).toHaveAttribute("data-sdr-sheet-error", error);
    await expect(sheet).not.toHaveAttribute("data-sdr-sheet", "closed");
  }
});

test("ready sheet shows required capital and does not fake success", async ({
  page,
}) => {
  const sheet = await openReadySheet(page);
  await expect(sheet).toContainText("250.00");
  await expect(sheet).toContainText("시세가 움직이면 안전하게 멈출 수 있어요");
  await expect(sheet).not.toHaveAttribute("data-sdr-sheet", "ACCEPTED");
  await expect(page).toHaveURL(/\/profits\/qa-rel106-opp/);
  await page.screenshot({
    path: "governance/release-master/rel-108-sheet/runtime-ready-1440.png",
    fullPage: false,
  });
});

test("insufficient principal is a failure state, not success", async ({
  page,
}) => {
  const sheet = await openReadySheet(page, {
    participateCode: "INSUFFICIENT_PRINCIPAL",
  });
  await sheet.getByRole("button", { name: "수익 벌기" }).click();
  await expect(sheet).toHaveAttribute("data-sdr-sheet", "ERROR");
  await expect(sheet).toHaveAttribute(
    "data-sdr-sheet-error",
    "INSUFFICIENT_PRINCIPAL",
  );
  await expect(sheet.getByRole("link", { name: "입금하기" })).toBeVisible();
  await expect(page).toHaveURL(/\/profits\/qa-rel106-opp/);
  await page.screenshot({
    path: "governance/release-master/rel-108-sheet/runtime-insufficient-1440.png",
    fullPage: false,
  });
});

test("preflight required is a failure state, not closed", async ({ page }) => {
  const sheet = await openReadySheet(page, {
    participateCode: "PREFLIGHT_REQUIRED",
  });
  await sheet.getByRole("button", { name: "수익 벌기" }).click();
  await expect(sheet).toHaveAttribute("data-sdr-sheet", "ERROR");
  await expect(sheet).toHaveAttribute(
    "data-sdr-sheet-error",
    "PREFLIGHT_REQUIRED",
  );
  await expect(sheet.getByRole("button", { name: "다시 확인" })).toBeVisible();
  await expect(sheet).not.toHaveAttribute("data-sdr-sheet", "closed");
});

test("animation does not reach accepted before participate returns", async ({
  page,
}) => {
  const sheet = await openReadySheet(page, { participateDelayMs: 800 });
  const participate = page.waitForRequest(
    (req) => req.method() === "POST" && req.url().includes("/participate"),
  );
  await sheet.getByRole("button", { name: "수익 벌기" }).click();
  await participate;
  await expect(sheet).toHaveAttribute("data-sdr-sheet", "SUBMITTING");
  await expect(sheet).not.toHaveAttribute("data-sdr-sheet", "ACCEPTED");
  await expect(page).toHaveURL(/\/trades\/qa-rel107-trade\/execute/, {
    timeout: 10000,
  });
});

test("ready sheet a11y has no new critical/serious axe violations", async ({
  page,
}) => {
  const sheet = await openReadySheet(page);
  await expect(sheet).toBeVisible();
  const run = async () => {
    await page.addScriptTag({ path: require.resolve("axe-core") });
    return page.evaluate(async () => {
      return window.axe.run(document, {
        runOnly: { type: "tag", values: ["wcag2a", "wcag2aa"] },
      });
    });
  };
  let results;
  try {
    results = await run();
  } catch (err) {
    const msg = String(err && err.message ? err.message : err);
    if (!msg.includes("Execution context was destroyed")) throw err;
    await page.waitForLoadState("domcontentloaded");
    results = await run();
  }
  const blocking = blockingViolations(results);
  expect(blocking, JSON.stringify(blocking.map((v) => v.id))).toEqual([]);
});
