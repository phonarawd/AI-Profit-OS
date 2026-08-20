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

module.exports = {
  AUTHENTICATED_EMPTY_HOME,
  stubGuestApis,
  stubAuthenticatedEmptyHome,
};
