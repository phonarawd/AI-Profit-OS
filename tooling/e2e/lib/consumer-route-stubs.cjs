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

/** DEV/TEST feed stub. production opportunity truth가 아니다. */
const TEST_OPPORTUNITY_ITEM = {
  id: "qa-rel106-opp",
  assetLabel: "QA 시세 참고 상품",
  requiredCapitalUsdt: "250.00",
  expectedProfitUsdt: "12.50",
  estimatedDurationSec: 3600,
  bucket: "affordable",
  buyMarketId: "ebay_us",
  buyMarketLabelKo: "이베이",
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

async function stubOpportunityFeed(page, mode) {
  await page.route("**/api/v1/**", (route) => {
    const url = route.request().url();
    if (url.includes("/api/v1/me/home-read")) {
      return json(route, 200, AUTHENTICATED_EMPTY_HOME);
    }
    if (url.includes("/api/v1/opportunities") && !/\/opportunities\/[^/?]+/.test(url)) {
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

module.exports = {
  AUTHENTICATED_EMPTY_HOME,
  TEST_OPPORTUNITY_ITEM,
  stubGuestApis,
  stubAuthenticatedEmptyHome,
  stubOpportunityFeed,
};
