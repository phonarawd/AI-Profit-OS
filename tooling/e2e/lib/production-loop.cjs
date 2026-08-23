"use strict";

const {
  AUTHENTICATED_EMPTY_HOME,
  TEST_OPPORTUNITY_ITEM,
} = require("./consumer-route-stubs.cjs");

const PRODUCTION_LOOP_TRADE_ID = "qa-rel507-trade";
const PRODUCTION_LOOP_JOURNAL_ID = "qa-rel507-journal";
const PRODUCTION_LOOP_EMAIL = "qa-rel507@example.test";

function productionLoopProfitUsdt() {
  return TEST_OPPORTUNITY_ITEM.expectedProfitUsdt;
}

function qaNestSession() {
  return {
    sessionId: "qa-rel507-session",
    userId: "qa-rel507-user",
    issuer: "ai-profit-os-nest",
    issuedAt: "2026-08-24T00:00:00.000Z",
    expiresAt: "2026-08-24T12:00:00.000Z",
    revoked: false,
    onboardingStage: "B_complete",
  };
}

function json(route, status, body) {
  return route.fulfill({
    status,
    contentType: "application/json",
    body: JSON.stringify(body),
  });
}

function opportunityDetailPath(url) {
  const match = String(url).match(/\/api\/v1\/opportunities\/([^/?#]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

function ledgerJournalId(url) {
  const match = String(url).match(/\/api\/v1\/me\/ledger\/journals\/([^/?#]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

function isTradeListUrl(url) {
  try {
    const pathName = new URL(url).pathname.replace(/\/$/, "");
    return pathName.endsWith("/api/v1/trades");
  } catch {
    return /\/api\/v1\/trades\/?([?#]|$)/.test(url);
  }
}

function isLedgerListUrl(url) {
  try {
    const pathName = new URL(url).pathname.replace(/\/$/, "");
    return pathName.endsWith("/api/v1/me/ledger/journals");
  } catch {
    return /\/api\/v1\/me\/ledger\/journals\/?([?#]|$)/.test(url);
  }
}

function settledTrade() {
  const profit = productionLoopProfitUsdt();
  return {
    tradeId: PRODUCTION_LOOP_TRADE_ID,
    opportunityId: TEST_OPPORTUNITY_ITEM.id,
    pricingVersion: 1,
    status: "success",
    resultCode: "MATCH_SUCCESS",
    stepIndex: 1,
    progressPct: 100,
    expectedProfitUsdt: profit,
    settledProfitUsdt: profit,
    asset: {
      id: "qa-asset",
      label: TEST_OPPORTUNITY_ITEM.assetLabel,
    },
  };
}

function settlementJournal() {
  const profit = productionLoopProfitUsdt();
  return {
    id: PRODUCTION_LOOP_JOURNAL_ID,
    journalType: "settlement",
    createdAt: "2026-08-24T00:10:00.000Z",
    referenceType: "trade",
    referenceId: PRODUCTION_LOOP_TRADE_ID,
    entries: [
      {
        id: "qa-rel507-e1",
        direction: "credit",
        amountUsdt: profit,
        bucket: "profit",
        accountKind: "user_bucket",
      },
    ],
  };
}

async function stubProductionLoop(page) {
  const state = { authed: false };
  await page.route("**/api/v1/**", async (route) => {
    const url = route.request().url();
    const method = route.request().method();
    if (url.includes("/api/v1/auth/magic-link/request") && method === "POST") {
      state.authed = true;
      return json(route, 200, { ok: true });
    }
    if (url.includes("/api/v1/auth/session")) {
      if (!state.authed) {
        return json(route, 401, { error: "unauthorized" });
      }
      return json(route, 200, qaNestSession());
    }
    if (url.includes("/api/v1/auth/")) {
      return json(route, 401, { error: "unauthorized" });
    }
    if (!state.authed) {
      return json(route, 401, { error: "unauthorized" });
    }
    const detailId = opportunityDetailPath(url);
    if (url.includes("/api/v1/me/home-read")) {
      return json(route, 200, AUTHENTICATED_EMPTY_HOME);
    }
    if (url.includes("/api/v1/wallet/buckets")) {
      return json(route, 200, {
        userId: "qa-rel507-user",
        principalUsdt: "100.00",
        profitUsdt: productionLoopProfitUsdt(),
        lockedUsdt: "0.00",
        practiceUsdt: "0.00",
        liabilityUsdt: "0.00",
        asOfLedgerEntryId: "qa-rel507-ledger",
      });
    }
    if (url.includes("/preflight")) {
      return json(route, 200, {
        preflightToken: "pf1_qa_rel507_preflight_token",
        expiresAt: new Date(Date.now() + 300000).toISOString(),
      });
    }
    if (url.includes("/participate")) {
      return json(route, 200, {
        participateRequestId: "qa-rel507-participate",
        tradeId: PRODUCTION_LOOP_TRADE_ID,
        opportunityId: TEST_OPPORTUNITY_ITEM.id,
        pricingVersion: TEST_OPPORTUNITY_ITEM.pricingVersion,
        expectedProfitUsdt: productionLoopProfitUsdt(),
        amountUsdt: TEST_OPPORTUNITY_ITEM.requiredCapitalUsdt,
        reused: false,
      });
    }
    const journalId = ledgerJournalId(url);
    if (journalId) {
      if (journalId !== PRODUCTION_LOOP_JOURNAL_ID) {
        return json(route, 403, { messageKo: "other journal denied" });
      }
      return json(route, 200, settlementJournal());
    }
    if (isLedgerListUrl(url)) {
      return json(route, 200, {
        items: [settlementJournal()],
        total: 1,
        limit: 100,
        offset: 0,
      });
    }
    if (url.includes("/execute-tick") || /\/api\/v1\/trades\/[^/?#]+$/.test(url)) {
      return json(route, 200, settledTrade());
    }
    if (isTradeListUrl(url)) {
      return json(route, 200, { items: [settledTrade()] });
    }
    if (url.includes("/api/v1/opportunities") && !detailId) {
      return json(route, 200, {
        principalUsdt: "100.00",
        affordableCount: 1,
        nearMissCount: 0,
        items: [TEST_OPPORTUNITY_ITEM],
      });
    }
    if (detailId === TEST_OPPORTUNITY_ITEM.id) {
      return json(route, 200, {
        principalUsdt: "100.00",
        item: TEST_OPPORTUNITY_ITEM,
      });
    }
    return json(route, 404, { error: "not_found" });
  });
  return state;
}

function assertNoInventedSuccess(source) {
  const text = String(source || "");
  const fails = [];
  if (text.includes("Math.random()")) fails.push("invented success: Math.random()");
  if (text.includes("999.00") || text.includes("2450")) {
    fails.push("invented success amount");
  }
  return fails;
}

module.exports = {
  PRODUCTION_LOOP_TRADE_ID,
  PRODUCTION_LOOP_JOURNAL_ID,
  PRODUCTION_LOOP_EMAIL,
  productionLoopProfitUsdt,
  qaNestSession,
  stubProductionLoop,
  assertNoInventedSuccess,
};
