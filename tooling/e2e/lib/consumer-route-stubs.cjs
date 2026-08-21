/**
 * Consumer QA route stubs.
 * 세션 게이트만 결정한다. profit/FX/잔액/참여자/카운트다운을 발명하지 않는다.
 */
"use strict";

const AUTHENTICATED_EMPTY_HOME = {
  viewState: "ready_empty",
  reasonCode: "home.read.empty",
  session: { status: "authenticated" },
  money: null,
  opportunity: null,
  growth: null,
  ledgerTotal: null,
  todayPossibleProfitUsdt: null,
  provenance: {
    todayPossibleProfitUsdt: null,
    ledgerTotal: null,
  },
  domainFsm: null,
};

function json(route, status, body) {
  return route.fulfill({
    status,
    contentType: "application/json",
    body: JSON.stringify(body),
  });
}

async function stubGuestApis(page) {
  await page.route("**/api/v1/**", (route) =>
    json(route, 401, { error: "unauthorized" }),
  );
}

async function stubAuthenticatedEmptyHome(page) {
  await page.route("**/api/v1/**", (route) => {
    const url = route.request().url();
    if (url.includes("/api/v1/me/home-read")) {
      return json(route, 200, AUTHENTICATED_EMPTY_HOME);
    }
    return json(route, 401, { error: "unauthorized" });
  });
}

/** DEV/TEST feed/detail stub. production opportunity truth가 아니다. */
const TEST_OPPORTUNITY_ITEM = {
  id: "qa-rel106-opp",
  assetLabel: "QA 시세 참고 상품",
  status: "available",
  requiredCapitalUsdt: "250.00",
  expectedProfitUsdt: "12.50",
  estimatedDurationSec: 3600,
  bucket: "affordable",
  compareReady: true,
  pricingVersion: 1,
  buyMarketId: "ebay_us",
  buyMarketLabelKo: "이베이",
  sellMarketLabelKo: "국내 판매",
  buyPriceUsdt: "200.00",
  sellPriceUsdt: "212.50",
  grossSpreadUsdt: "12.50",
  marginPct: "5.0",
  assetImageUrl: null,
  assetImageSource: null,
};

function opportunityFeedBody(items) {
  return {
    principalUsdt: "100.00",
    affordableCount: items.filter((item) => item.bucket === "affordable").length,
    nearMissCount: 0,
    items,
  };
}

function opportunityDetailPath(url) {
  const match = url.match(/\/api\/v1\/opportunities\/([^/?#]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

async function stubOpportunityFeed(page, mode) {
  await page.route("**/api/v1/**", (route) => {
    const url = route.request().url();
    if (url.includes("/api/v1/me/home-read")) {
      return json(route, 200, AUTHENTICATED_EMPTY_HOME);
    }
    if (url.includes("/api/v1/opportunities") && !opportunityDetailPath(url)) {
      if (mode === "unauthorized") {
        return json(route, 401, { error: "unauthorized" });
      }
      if (mode === "error") {
        return json(route, 500, { error: "upstream_failed" });
      }
      if (mode === "empty") {
        return json(route, 200, opportunityFeedBody([]));
      }
      return json(route, 200, opportunityFeedBody([TEST_OPPORTUNITY_ITEM]));
    }
    return json(route, 401, { error: "unauthorized" });
  });
}

function participateErrorBody(code) {
  return { code, error: code };
}

/** DEV/TEST detail/preflight stub. production money mutation 0. */
async function stubOpportunityRoom(page, mode, opts = {}) {
  await page.route("**/api/v1/**", async (route) => {
    const url = route.request().url();
    const detailId = opportunityDetailPath(url);
    if (url.includes("/api/v1/me/home-read")) {
      return json(route, 200, AUTHENTICATED_EMPTY_HOME);
    }
    if (url.includes("/api/v1/opportunities") && !detailId) {
      if (mode === "unauthorized") {
        return json(route, 401, { error: "unauthorized" });
      }
      if (mode === "error") {
        return json(route, 500, { error: "upstream_failed" });
      }
      if (mode === "empty" || mode === "missing") {
        return json(route, 200, opportunityFeedBody([]));
      }
      return json(route, 200, opportunityFeedBody([TEST_OPPORTUNITY_ITEM]));
    }
    if (detailId) {
      if (url.includes("/preflight")) {
        if (mode === "unauthorized") {
          return json(route, 401, { error: "unauthorized" });
        }
        if (mode === "error") {
          return json(route, 500, { error: "upstream_failed" });
        }
        return json(route, 200, {
          preflightToken: "pf1_qa_rel107_preflight_token",
          expiresAt: new Date(Date.now() + 300000).toISOString(),
        });
      }
      if (url.includes("/participate")) {
        if (mode === "unauthorized") {
          return json(route, 401, { error: "unauthorized" });
        }
        if (mode === "error") {
          return json(route, 500, { error: "upstream_failed" });
        }
        const delayMs = Number(opts.participateDelayMs || 0);
        if (delayMs > 0) {
          await new Promise((resolve) => setTimeout(resolve, delayMs));
        }
        const participateCode = opts.participateCode;
        if (participateCode === "INSUFFICIENT_PRINCIPAL") {
          return json(route, 403, participateErrorBody(participateCode));
        }
        if (participateCode === "PREFLIGHT_REQUIRED") {
          return json(route, 412, participateErrorBody(participateCode));
        }
        if (participateCode === "PRICE_STALE") {
          return json(route, 409, participateErrorBody(participateCode));
        }
        if (participateCode === "OPPORTUNITY_EXPIRED") {
          return json(route, 409, participateErrorBody(participateCode));
        }
        if (participateCode === "MATCH_BLOCKED") {
          return json(route, 403, participateErrorBody(participateCode));
        }
        return json(route, 200, {
          participateRequestId: "qa-rel107-participate",
          tradeId: "qa-rel107-trade",
          opportunityId: TEST_OPPORTUNITY_ITEM.id,
          pricingVersion: TEST_OPPORTUNITY_ITEM.pricingVersion,
          expectedProfitUsdt: TEST_OPPORTUNITY_ITEM.expectedProfitUsdt,
          amountUsdt: TEST_OPPORTUNITY_ITEM.requiredCapitalUsdt,
          reused: opts.reused === true,
        });
      }
      if (mode === "unauthorized") {
        return json(route, 401, { error: "unauthorized" });
      }
      if (mode === "error") {
        return json(route, 500, { error: "upstream_failed" });
      }
      if (mode === "missing" || detailId !== TEST_OPPORTUNITY_ITEM.id) {
        return json(route, 404, { error: "not_found" });
      }
      return json(route, 200, {
        principalUsdt: "100.00",
        item: TEST_OPPORTUNITY_ITEM,
      });
    }
    return json(route, 401, { error: "unauthorized" });
  });
}

function tradeExecutionState(status, extra) {
  return {
    tradeId: "qa-rel109-trade",
    opportunityId: "qa-rel106-opp",
    pricingVersion: 1,
    status,
    resultCode: extra.resultCode,
    stepIndex: extra.stepIndex ?? 1,
    progressPct: extra.progressPct ?? 0,
    logLine: extra.logLine,
    expectedProfitUsdt: extra.expectedProfitUsdt ?? "12.50",
    settledProfitUsdt: extra.settledProfitUsdt,
    asset: {
      id: "qa-asset",
      label: "QA 시세 참고 상품",
    },
  };
}

function isTradeListUrl(url) {
  try {
    const pathName = new URL(url).pathname.replace(/\/$/, "");
    return pathName.endsWith("/api/v1/trades");
  } catch {
    return /\/api\/v1\/trades\/?([?#]|$)/.test(url);
  }
}

const TEST_WALLET_BUCKETS = {
  userId: "qa-user",
  principalUsdt: "100.00",
  profitUsdt: "12.50",
  lockedUsdt: "0.00",
  practiceUsdt: "0.00",
  liabilityUsdt: "0.00",
  asOfLedgerEntryId: "qa-ledger",
};

function testTradeListItems() {
  return [
    { ...tradeExecutionState("running", {}), tradeId: "qa-rel110-running" },
    {
      ...tradeExecutionState("success", {
        resultCode: "MATCH_SUCCESS",
        settledProfitUsdt: "12.50",
      }),
      tradeId: "qa-rel110-settled",
    },
    {
      ...tradeExecutionState("safe_stop", { resultCode: "PRICE_MOVED" }),
      tradeId: "qa-rel110-stop",
    },
  ];
}

/** DEV/TEST trade list stub. production money mutation 0. */
async function stubTradeList(page, mode) {
  await page.route("**/api/v1/**", (route) => {
    const url = route.request().url();
    if (url.includes("/api/v1/me/home-read")) {
      return json(route, 200, AUTHENTICATED_EMPTY_HOME);
    }
    if (url.includes("/api/v1/wallet/buckets")) {
      if (mode === "unauthorized") {
        return json(route, 401, { error: "unauthorized" });
      }
      if (mode === "profit_unavailable") {
        return json(route, 500, { error: "upstream_failed" });
      }
      return json(route, 200, TEST_WALLET_BUCKETS);
    }
    if (isTradeListUrl(url)) {
      if (mode === "unauthorized") {
        return json(route, 401, { error: "unauthorized" });
      }
      if (mode === "error") {
        return json(route, 500, { error: "upstream_failed" });
      }
      if (mode === "empty") {
        return json(route, 200, { items: [] });
      }
      return json(route, 200, { items: testTradeListItems() });
    }
    return json(route, 401, { error: "unauthorized" });
  });
}

/** DEV/TEST execute-tick stub. production money mutation 0. */
async function stubTradeExecution(page, mode) {
  await page.route("**/api/v1/**", (route) => {
    const url = route.request().url();
    if (url.includes("/api/v1/me/home-read")) {
      return json(route, 200, AUTHENTICATED_EMPTY_HOME);
    }
    if (url.includes("/execute-tick") || /\/api\/v1\/trades\/[^/?#]+$/.test(url)) {
      if (mode === "unauthorized") {
        return json(route, 401, { error: "unauthorized" });
      }
      if (mode === "missing") {
        return json(route, 404, { error: "not_found" });
      }
      if (mode === "error") {
        return json(route, 500, { error: "upstream_failed" });
      }
      if (mode === "running") {
        return json(route, 200, tradeExecutionState("running", {}));
      }
      if (mode === "requeue") {
        return json(route, 200, tradeExecutionState("requeue", { resultCode: "REQUEUE" }));
      }
      if (mode === "success_pending") {
        return json(
          route,
          200,
          tradeExecutionState("success", { resultCode: "MATCH_SUCCESS" }),
        );
      }
      if (mode === "success") {
        return json(
          route,
          200,
          tradeExecutionState("success", {
            resultCode: "MATCH_SUCCESS",
            settledProfitUsdt: "12.50",
          }),
        );
      }
      if (mode === "safe_stop") {
        return json(
          route,
          200,
          tradeExecutionState("safe_stop", { resultCode: "PRICE_MOVED" }),
        );
      }
      if (mode === "failed") {
        return json(
          route,
          200,
          tradeExecutionState("failed", { resultCode: "SYSTEM_FAILED" }),
        );
      }
    }
    return json(route, 401, { error: "unauthorized" });
  });
}

module.exports = {
  AUTHENTICATED_EMPTY_HOME,
  TEST_OPPORTUNITY_ITEM,
  stubGuestApis,
  stubAuthenticatedEmptyHome,
  stubOpportunityFeed,
  stubOpportunityRoom,
  stubTradeList,
  stubTradeExecution,
};
