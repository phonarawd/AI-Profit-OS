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
    if (url.includes("/api/v1/wallet/buckets")) {
      return json(route, 200, TEST_WALLET_BUCKETS);
    }
    if (url.includes("/api/v1/me/current-fx/approx")) {
      return json(route, 200, TEST_CURRENT_FX_APPROX);
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

const TEST_CURRENT_FX_APPROX = {
  fxSnapshotId: "qa-fx-snapshot",
  capturedAt: "2026-08-24T00:00:00.000Z",
  principalKrwApprox: "135000",
  withdrawableProfitKrwApprox: "15000",
  expectedProfitKrwApprox: "18750",
};
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
      if (mode === "earnings_mismatch") {
        return json(route, 200, { ...TEST_WALLET_BUCKETS, profitUsdt: "4.00" });
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

const JOURNEY_TRADE_ID = "qa-rel107-trade";

/** DEV/TEST full core loop stub. production money mutation 0. */
async function stubCoreOpportunityJourney(page) {
  await page.route("**/api/v1/**", async (route) => {
    const url = route.request().url();
    const detailId = opportunityDetailPath(url);
    if (url.includes("/api/v1/me/home-read")) {
      return json(route, 200, AUTHENTICATED_EMPTY_HOME);
    }
    if (url.includes("/api/v1/wallet/buckets")) {
      return json(route, 200, TEST_WALLET_BUCKETS);
    }
    if (url.includes("/api/v1/me/current-fx/approx")) {
      return json(route, 200, TEST_CURRENT_FX_APPROX);
    }
    if (url.includes("/preflight")) {
      return json(route, 200, {
        preflightToken: "pf1_qa_journey_preflight_token",
        expiresAt: new Date(Date.now() + 300000).toISOString(),
      });
    }
    if (url.includes("/participate")) {
      return json(route, 200, {
        participateRequestId: "qa-journey-participate",
        tradeId: JOURNEY_TRADE_ID,
        opportunityId: TEST_OPPORTUNITY_ITEM.id,
        pricingVersion: TEST_OPPORTUNITY_ITEM.pricingVersion,
        expectedProfitUsdt: TEST_OPPORTUNITY_ITEM.expectedProfitUsdt,
        amountUsdt: TEST_OPPORTUNITY_ITEM.requiredCapitalUsdt,
        reused: false,
      });
    }
    if (url.includes("/execute-tick") || /\/api\/v1\/trades\/[^/?#]+$/.test(url)) {
      return json(
        route,
        200,
        {
          ...tradeExecutionState("running", {}),
          tradeId: JOURNEY_TRADE_ID,
          opportunityId: TEST_OPPORTUNITY_ITEM.id,
          expectedProfitUsdt: TEST_OPPORTUNITY_ITEM.expectedProfitUsdt,
        },
      );
    }
    if (isTradeListUrl(url)) {
      return json(route, 200, {
        items: [
          {
            ...tradeExecutionState("running", {}),
            tradeId: JOURNEY_TRADE_ID,
            opportunityId: TEST_OPPORTUNITY_ITEM.id,
            expectedProfitUsdt: TEST_OPPORTUNITY_ITEM.expectedProfitUsdt,
          },
        ],
      });
    }
    if (url.includes("/api/v1/opportunities") && !detailId) {
      return json(route, 200, opportunityFeedBody([TEST_OPPORTUNITY_ITEM]));
    }
    if (detailId === TEST_OPPORTUNITY_ITEM.id) {
      return json(route, 200, {
        principalUsdt: "100.00",
        item: TEST_OPPORTUNITY_ITEM,
      });
    }
    if (detailId) {
      return json(route, 404, { error: "not_found" });
    }
    return json(route, 404, { error: "not_found" });
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

const SETTLEMENT_TRADE_ID = "qa-rel112-trade";
const SETTLEMENT_JOURNAL_ID = "qa-rel112-journal";

const TEST_SETTLEMENT_JOURNAL = {
  id: SETTLEMENT_JOURNAL_ID,
  journalType: "settlement",
  createdAt: "2026-08-21T00:00:00.000Z",
  referenceType: "trade",
  referenceId: SETTLEMENT_TRADE_ID,
  entries: [
    {
      id: "qa-rel112-e1",
      direction: "credit",
      amountUsdt: "12.50",
      bucket: "profit",
      accountKind: "user_bucket",
    },
  ],
};

function isLedgerListUrl(url) {
  try {
    const pathName = new URL(url).pathname.replace(/\/$/, "");
    return pathName.endsWith("/api/v1/me/ledger/journals");
  } catch {
    return /\/api\/v1\/me\/ledger\/journals\/?([?#]|$)/.test(url);
  }
}

function ledgerJournalId(url) {
  const match = String(url).match(/\/api\/v1\/me\/ledger\/journals\/([^/?#]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

function tradeIdFromUrl(url) {
  const match = String(url).match(/\/api\/v1\/trades\/([^/?#]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

/** DEV/TEST settlement detail stub. production money mutation 0. */
async function stubSettlement(page, mode) {
  await page.route("**/api/v1/**", (route) => {
    const url = route.request().url();
    const journalId = ledgerJournalId(url);
    if (url.includes("/api/v1/me/home-read")) {
      return json(route, 200, AUTHENTICATED_EMPTY_HOME);
    }
    if (journalId) {
      if (mode === "unauthorized") {
        return json(route, 401, { error: "unauthorized" });
      }
      if (mode === "other") {
        return json(route, 403, { messageKo: "다른 분의 내역은 볼 수 없어요" });
      }
      if (mode === "error") {
        return json(route, 500, { error: "upstream_failed" });
      }
      if (journalId !== SETTLEMENT_JOURNAL_ID) {
        return json(route, 403, { messageKo: "다른 분의 내역은 볼 수 없어요" });
      }
      return json(route, 200, TEST_SETTLEMENT_JOURNAL);
    }
    if (isLedgerListUrl(url)) {
      if (mode === "unauthorized") {
        return json(route, 401, { error: "unauthorized" });
      }
      if (mode === "other") {
        return json(route, 403, { messageKo: "다른 분의 내역은 볼 수 없어요" });
      }
      if (mode === "error") {
        return json(route, 500, { error: "upstream_failed" });
      }
      return json(route, 200, {
        items: [TEST_SETTLEMENT_JOURNAL],
        total: 1,
        limit: 100,
        offset: 0,
      });
    }
    const tradeId = tradeIdFromUrl(url);
    if (tradeId && !url.includes("execute-tick")) {
      if (mode === "unauthorized") {
        return json(route, 401, { error: "unauthorized" });
      }
      if (mode === "other") {
        return json(route, 403, { error: "forbidden" });
      }
      if (mode === "missing") {
        return json(route, 404, { error: "not_found" });
      }
      if (mode === "error") {
        return json(route, 500, { error: "upstream_failed" });
      }
      return json(
        route,
        200,
        {
          ...tradeExecutionState("success", {
            resultCode: "MATCH_SUCCESS",
            settledProfitUsdt: "12.50",
          }),
          tradeId: SETTLEMENT_TRADE_ID,
        },
      );
    }
    return json(route, 401, { error: "unauthorized" });
  });
}

/** DEV/TEST wallet buckets stub. production money mutation 0. */
async function stubWallet(page, mode) {
  await page.route("**/api/v1/**", (route) => {
    const url = route.request().url();
    if (url.includes("/api/v1/me/home-read")) {
      return json(route, 200, AUTHENTICATED_EMPTY_HOME);
    }
    if (url.includes("/api/v1/wallet/buckets")) {
      if (mode === "unauthorized") {
        return json(route, 401, { error: "unauthorized" });
      }
      if (mode === "error") {
        return json(route, 500, { error: "upstream_failed" });
      }
      return json(route, 200, TEST_WALLET_BUCKETS);
    }
    return json(route, 401, { error: "unauthorized" });
  });
}

/** DEV/TEST deposit stub. production money mutation 0. */
async function stubDeposit(page, mode) {
  await page.route("**/api/v1/**", async (route) => {
    const url = route.request().url();
    if (url.includes("/api/v1/me/home-read")) {
      return json(route, 200, AUTHENTICATED_EMPTY_HOME);
    }
    if (url.includes("/api/v1/wallet/buckets")) {
      if (mode === "unauthorized") {
        return json(route, 401, { error: "unauthorized" });
      }
      return json(route, 200, TEST_WALLET_BUCKETS);
    }
    if (url.includes("/api/v1/wallet/my-deposit-address")) {
      if (mode === "unauthorized") {
        return json(route, 401, { error: "unauthorized" });
      }
      if (mode === "usdt_deny") {
        return json(route, 403, { error: "forbidden" });
      }
      if (mode === "error") {
        return json(route, 500, { error: "upstream_failed" });
      }
      return json(route, 200, { trc20Address: "TQADEPOSITADDRESSREL1140000001" });
    }
    if (url.includes("/api/v1/wallet/krw-deposit-instructions")) {
      if (mode === "unauthorized") {
        return json(route, 401, { error: "unauthorized" });
      }
      if (mode === "error") {
        return json(route, 500, { error: "upstream_failed" });
      }
      return json(route, 200, {
        bankName: "QA Bank",
        accountNumber: "QA-000",
        accountHolder: "Peotteok",
        noticeKo: "qa-notice",
      });
    }
    if (url.includes("/api/v1/wallet/krw-deposit-requests")) {
      if (mode === "unauthorized") {
        return json(route, 401, { error: "unauthorized" });
      }
      if (mode === "krw_deny") {
        return json(route, 403, { error: "forbidden" });
      }
      if (mode === "error") {
        return json(route, 500, { error: "upstream_failed" });
      }
      return json(route, 200, {
        status: "pending",
        payableAmountKrw: 10004,
        depositCode: "QA114",
      });
    }
    return json(route, 401, { error: "unauthorized" });
  });
}

/** DEV/TEST withdraw stub. production money mutation 0. */
async function stubWithdraw(page, mode) {
  await page.route("**/api/v1/**", async (route) => {
    const url = route.request().url();
    const method = route.request().method();
    if (url.includes("/api/v1/me/home-read")) {
      return json(route, 200, AUTHENTICATED_EMPTY_HOME);
    }
    if (url.includes("/api/v1/wallet/buckets")) {
      if (mode === "unauthorized") {
        return json(route, 401, { error: "unauthorized" });
      }
      return json(route, 200, TEST_WALLET_BUCKETS);
    }
    if (url.includes("/api/v1/compliance/kyc/status")) {
      if (mode === "unauthorized") {
        return json(route, 401, { error: "unauthorized" });
      }
      if (mode === "error") {
        return json(route, 500, { error: "upstream_failed" });
      }
      return json(route, 200, {
        userId: "qa-withdraw-user",
        kycStatus: "approved",
      });
    }
    if (url.includes("/api/v1/wallet/withdraw/step-up/challenge")) {
      if (mode === "unauthorized") {
        return json(route, 401, { error: "unauthorized" });
      }
      return json(route, 200, {
        challengeId: "ch-rel116",
        method: "pin",
      });
    }
    if (url.includes("/api/v1/wallet/withdraw/step-up/verify")) {
      if (mode === "unauthorized") {
        return json(route, 401, { error: "unauthorized" });
      }
      return json(route, 200, {
        ok: true,
        stepUpToken: "su-rel116",
        method: "pin",
      });
    }
    if (
      method === "POST" &&
      url.includes("/api/v1/wallet/withdraw") &&
      !url.includes("step-up")
    ) {
      if (mode === "unauthorized") {
        return json(route, 401, { error: "unauthorized" });
      }
      if (mode === "usdt_deny" || mode === "krw_deny") {
        return json(route, 403, { error: "forbidden", code: "KYC_WITHDRAW_REQUIRED" });
      }
      if (mode === "error") {
        return json(route, 500, { error: "upstream_failed" });
      }
      return json(route, 200, { status: "accepted" });
    }
    return json(route, 401, { error: "unauthorized" });
  });
}

const HISTORY_JOURNAL_ID = "jn-rel118";

const HISTORY_JOURNAL = {
  id: HISTORY_JOURNAL_ID,
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

/** DEV/TEST ledger history stub. production journal mutation 0. */
async function stubHistory(page, mode) {
  await page.route("**/api/v1/**", async (route) => {
    const url = route.request().url();
    const detail = url.match(/\/api\/v1\/me\/ledger\/journals\/([^/?#]+)/);
    if (detail) {
      if (mode === "unauthorized") {
        return json(route, 401, { error: "unauthorized" });
      }
      if (mode === "other") {
        return json(route, 403, { error: "forbidden" });
      }
      if (mode === "missing") {
        return json(route, 404, { error: "not_found" });
      }
      if (mode === "error") {
        return json(route, 500, { error: "upstream_failed" });
      }
      return json(route, 200, { journal: HISTORY_JOURNAL });
    }
    if (url.includes("/api/v1/me/ledger/journals")) {
      if (mode === "unauthorized") {
        return json(route, 401, { error: "unauthorized" });
      }
      if (mode === "error") {
        return json(route, 500, { error: "upstream_failed" });
      }
      if (mode === "empty") {
        return json(route, 200, { items: [], total: 0, limit: 20, offset: 0 });
      }
      return json(route, 200, {
        items: [HISTORY_JOURNAL],
        total: 21,
        limit: 20,
        offset: 0,
      });
    }
    if (url.includes("/api/v1/me/home-read")) {
      return json(route, 200, AUTHENTICATED_EMPTY_HOME);
    }
    return json(route, 401, { error: "unauthorized" });
  });
}

/** REL-111~119 money-loop journey stub. production mutation 0. */
async function stubMoneyLoop(page) {
  await page.route("**/api/v1/**", async (route) => {
    const url = route.request().url();
    const method = route.request().method();
    if (url.includes("/api/v1/me/home-read")) {
      return json(route, 200, AUTHENTICATED_EMPTY_HOME);
    }
    if (url.includes("/api/v1/wallet/buckets")) {
      return json(route, 200, TEST_WALLET_BUCKETS);
    }
    if (url.includes("/api/v1/wallet/my-deposit-address")) {
      return json(route, 200, { trc20Address: "TQADEPOSITADDRESSREL1140000001" });
    }
    if (url.includes("/api/v1/wallet/krw-deposit-instructions")) {
      return json(route, 200, {
        bankName: "QA Bank",
        accountNumber: "QA-000",
        accountHolder: "Peotteok",
        noticeKo: "qa-notice",
      });
    }
    if (url.includes("/api/v1/wallet/krw-deposit-requests")) {
      return json(route, 200, {
        status: "pending",
        payableAmountKrw: 10004,
        depositCode: "QA114",
      });
    }
    if (url.includes("/api/v1/wallet/withdraw/step-up/challenge")) {
      return json(route, 200, { challengeId: "ch-rel116", method: "pin" });
    }
    if (url.includes("/api/v1/wallet/withdraw/step-up/verify")) {
      return json(route, 200, {
        ok: true,
        stepUpToken: "su-rel116",
        method: "pin",
      });
    }
    if (
      method === "POST" &&
      url.includes("/api/v1/wallet/withdraw") &&
      !url.includes("step-up")
    ) {
      return json(route, 200, { status: "accepted" });
    }
    const detail = url.match(/\/api\/v1\/me\/ledger\/journals\/([^/?#]+)/);
    if (detail) {
      return json(route, 200, { journal: HISTORY_JOURNAL });
    }
    if (url.includes("/api/v1/me/ledger/journals")) {
      return json(route, 200, {
        items: [HISTORY_JOURNAL],
        total: 1,
        limit: 20,
        offset: 0,
      });
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
  stubCoreOpportunityJourney,
  stubTradeExecution,
  stubSettlement,
  stubWallet,
  stubDeposit,
  stubWithdraw,
  stubHistory,
  stubMoneyLoop,
  HISTORY_JOURNAL_ID,
  JOURNEY_TRADE_ID,
  SETTLEMENT_TRADE_ID,
  SETTLEMENT_JOURNAL_ID,
};
