/**
 * #94 ledger history matrix. Local web only. Production URL fallback 0.
 */
const { test, expect } = require("@playwright/test");
const { assertQaIsolation } = require("../lib/qa-env-isolation-guard.cjs");
const { ensureLocalWebRuntime } = require("../lib/local-web-runtime.cjs");
const { stubHistory } = require("../lib/consumer-route-stubs.cjs");

test.describe.configure({ timeout: 180000 });

let runtime;

const VALID_JOURNAL = {
  id: "jn-rel118",
  journalType: "deposit_usdt",
  createdAt: "2026-08-21T00:00:00.000Z",
  referenceType: "deposit",
  referenceId: "dep-rel118",
  entries: [
    {
      id: "en-rel118",
      direction: "credit",
      amountUsdt: "25.00",
      bucket: "principal",
      accountKind: "user",
    },
  ],
};

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

async function overlayHistory(page, mode) {
  const list = "**/api/v1/me/ledger/journals**";
  if (mode === "malformed") {
    await page.route(list, (route) => {
      if (route.request().url().match(/\/journals\/[^/?#]+/)) {
        return route.fallback();
      }
      return json(route, 200, {
        items: [
          VALID_JOURNAL,
          {
            ...VALID_JOURNAL,
            id: "jn-bad",
            entries: [
              {
                ...VALID_JOURNAL.entries[0],
                id: "en-bad",
                amountUsdt: "1.",
              },
            ],
          },
        ],
        total: 2,
        limit: 20,
        offset: 0,
      });
    });
    return;
  }
  if (mode === "forbidden") {
    await page.route(list, (route) => json(route, 403, { error: "forbidden" }));
    return;
  }
  if (mode === "missing") {
    await page.route(list, (route) => json(route, 404, { error: "not_found" }));
    return;
  }
  if (mode === "network") {
    await page.route(list, (route) => route.abort("failed"));
  }
}

async function openHistory(page, mode, width = 1440, height = 1080) {
  await page.unrouteAll({ behavior: "ignoreErrors" }).catch(() => {});
  const stubMode =
    mode === "unauthorized" || mode === "empty" || mode === "error"
      ? mode
      : "ready";
  await stubHistory(page, stubMode);
  await overlayHistory(page, mode);
  await page.setViewportSize({ width, height });
  await page.goto(`${runtime.baseUrl}/wallet/history`, { waitUntil: "load" });
  await expect(page.getByTestId("wallet-history")).toBeVisible({
    timeout: 20000,
  });
}

test("valid empty is empty, not unavailable", async ({ page }) => {
  await openHistory(page, "empty");
  await expect(page.getByTestId("wallet-history")).toHaveAttribute(
    "data-history-view",
    "empty",
  );
  await expect(page.getByTestId("wallet-history-empty")).toBeVisible();
});

test("valid decimal journal stays ready", async ({ page }) => {
  await openHistory(page, "ready");
  await expect(page.getByTestId("wallet-history")).toHaveAttribute(
    "data-history-view",
    "ready",
  );
  await expect(page.getByTestId("wallet-history-row")).toContainText("25.00");
});

test("one malformed row poisons the list", async ({ page }) => {
  await openHistory(page, "malformed");
  await expect(page.getByTestId("wallet-history")).toHaveAttribute(
    "data-history-view",
    "unavailable",
  );
  await expect(page.getByTestId("wallet-history-row")).toHaveCount(0);
});

test("401 is unauthorized, not empty", async ({ page }) => {
  await openHistory(page, "unauthorized");
  await expect(page.getByTestId("wallet-history")).toHaveAttribute(
    "data-history-view",
    "unauthorized",
  );
  await expect(page.getByTestId("wallet-history-empty")).toHaveCount(0);
});

test("403 is unavailable", async ({ page }) => {
  await openHistory(page, "forbidden");
  await expect(page.getByTestId("wallet-history")).toHaveAttribute(
    "data-history-view",
    "unavailable",
  );
});

test("404 is unavailable", async ({ page }) => {
  await openHistory(page, "missing");
  await expect(page.getByTestId("wallet-history")).toHaveAttribute(
    "data-history-view",
    "unavailable",
  );
});

test("5xx is unavailable", async ({ page }) => {
  await openHistory(page, "error");
  await expect(page.getByTestId("wallet-history")).toHaveAttribute(
    "data-history-view",
    "unavailable",
  );
});

test("network failure is unavailable", async ({ page }) => {
  await openHistory(page, "network");
  await expect(page.getByTestId("wallet-history")).toHaveAttribute(
    "data-history-view",
    "unavailable",
  );
});
