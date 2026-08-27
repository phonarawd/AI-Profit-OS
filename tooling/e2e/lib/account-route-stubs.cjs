/**
 * Account Hub QA stubs. production money/auth mutation 0.
 */
"use strict";

function json(route, status, body) {
  return route.fulfill({
    status,
    contentType: "application/json",
    body: JSON.stringify(body),
  });
}

const TEST_REFERRAL_ME = {
  enabled: true,
  rewardsEnabled: false,
  inviteCountUnlimited: true,
  copyOwner: "UI §5.9.1a",
  edges: [{ code: "QA120INVITE", status: "bound" }],
  myBinding: null,
  poolWaitToast: "REFERRAL_POOL_WAIT",
};

const TEST_INBOX = {
  items: [
    {
      id: "qa-inbox-1",
      channel: "notice",
      titleKo: "안내",
      bodyKo: "계정 알림 예시",
      createdAt: "2026-08-21T00:00:00.000Z",
      readAt: null,
      href: "/me/settings",
    },
  ],
};

const TEST_PREF_FLAGS = {
  master: true,
  opportunity: true,
  wallet: true,
  notice: true,
  campaign: true,
  opsMessage: true,
  strategyMatch: true,
};

const TEST_PREFS = {
  userId: "qa-account-user",
  ...TEST_PREF_FLAGS,
};

const TEST_SESSION = {
  sessionId: "qa-account-session",
  userId: "qa-account-user",
  issuer: "ai-profit-os-nest",
  issuedAt: "2026-08-21T00:00:00.000Z",
  expiresAt: "2026-08-22T00:00:00.000Z",
  revoked: false,
  onboardingStage: "B_complete",
};

const TEST_KYC_NONE = {
  userId: "qa-account-user",
  kycStatus: "none",
};

async function stubInvite(page, mode, options = {}) {
  const captured = {
    bindCount: 0,
    bindBodies: [],
    bindHeaders: [],
  };
  const getDelayMs = Number(options.getDelayMs || 0);
  const bindDelayMs = Number(options.bindDelayMs || 0);
  const bindStatus = Number(options.bindStatus || 200);
  const bindNetworkFail = options.bindNetworkFail === true;

  await page.route("**/api/v1/**", async (route) => {
    const url = route.request().url();
    if (url.includes("/api/v1/referral/me")) {
      if (getDelayMs > 0) {
        await new Promise((resolve) => setTimeout(resolve, getDelayMs));
      }
      if (mode === "network") {
        return route.abort("failed");
      }
      if (mode === "unauthorized") {
        return json(route, 401, { error: "unauthorized" });
      }
      if (mode === "unauthorized403") {
        return json(route, 403, { error: "forbidden" });
      }
      if (mode === "error") {
        return json(route, 500, { error: "upstream_failed" });
      }
      if (mode === "disabled") {
        return json(route, 200, { enabled: false });
      }
      if (mode === "readyAbsent") {
        return json(route, 200, { enabled: true });
      }
      if (mode === "alreadyBound") {
        return json(route, 200, {
          ...TEST_REFERRAL_ME,
          myBinding: { code: "QA120BOUND", status: "bound" },
        });
      }
      return json(route, 200, TEST_REFERRAL_ME);
    }
    if (url.includes("/api/v1/referral/bind")) {
      captured.bindCount += 1;
      captured.bindBodies.push(route.request().postData() || "");
      captured.bindHeaders.push(route.request().headers());
      if (bindDelayMs > 0) {
        await new Promise((resolve) => setTimeout(resolve, bindDelayMs));
      }
      if (bindNetworkFail) {
        return route.abort("failed");
      }
      if (bindStatus >= 200 && bindStatus < 300) {
        return json(route, bindStatus, { ok: true });
      }
      return json(route, bindStatus, { error: "bind_failed" });
    }
    return json(route, 401, { error: "unauthorized" });
  });
  return captured;
}

async function stubInbox(page, mode) {
  await page.route("**/api/v1/**", (route) => {
    const url = route.request().url();
    if (url.includes("/api/v1/me/inbox") && !url.includes("notification-prefs")) {
      if (mode === "unauthorized") {
        return json(route, 401, { error: "unauthorized" });
      }
      if (mode === "error") {
        return json(route, 500, { error: "upstream_failed" });
      }
      if (mode === "empty") {
        return json(route, 200, { items: [] });
      }
      return json(route, 200, TEST_INBOX);
    }
    return json(route, 401, { error: "unauthorized" });
  });
}

async function stubSettings(page, mode, options = {}) {
  const captured = {
    prefsGetCount: 0,
    prefsPutCount: 0,
    prefsPutBodies: [],
    logoutCount: 0,
    deleteCount: 0,
    deleteBodies: [],
  };
  const getDelayMs = Number(options.getDelayMs || 0);
  const putDelayMs = Number(options.putDelayMs || 0);
  const logoutDelayMs = Number(options.logoutDelayMs || 0);
  const deleteDelayMs = Number(options.deleteDelayMs || 0);
  const prefsStatus = Number(options.prefsStatus || 0);
  const putStatus = Number(options.putStatus || 0);
  const logoutStatus = Number(options.logoutStatus || 0);
  const deleteStatus = Number(options.deleteStatus || 0);
  const prefsNetworkFail = options.prefsNetworkFail === true;
  const putNetworkFail = options.putNetworkFail === true;
  const logoutNetworkFail = options.logoutNetworkFail === true;
  const deleteNetworkFail = options.deleteNetworkFail === true;
  const prefsBody = options.prefsBody;
  const prefsRawBody = options.prefsRawBody;
  let sessionRevoked = false;

  await page.route("**/api/v1/**", async (route) => {
    const url = route.request().url();
    const method = route.request().method();
    if (url.includes("/api/v1/auth/session")) {
      if (sessionRevoked) {
        return json(route, 401, { error: "unauthorized" });
      }
      if (mode === "unauthorized") {
        return json(route, 401, { error: "unauthorized" });
      }
      if (mode === "unauthorized403") {
        return json(route, 403, { error: "forbidden" });
      }
      if (mode === "error") {
        return json(route, 500, { error: "upstream_failed" });
      }
      return json(route, 200, TEST_SESSION);
    }
    if (url.includes("/api/v1/me/notification-prefs")) {
      if (method === "PUT") {
        captured.prefsPutCount += 1;
        captured.prefsPutBodies.push(route.request().postData() || "");
        if (putDelayMs > 0) {
          await new Promise((resolve) => setTimeout(resolve, putDelayMs));
        }
        if (putNetworkFail) {
          return route.abort("failed");
        }
        if (putStatus > 0 && putStatus >= 400) {
          return json(route, putStatus, { error: "prefs_put_failed" });
        }
        const sent = route.request().postData();
        let echoed = TEST_PREFS;
        try {
          echoed = { userId: TEST_PREFS.userId, ...JSON.parse(sent || "{}") };
        } catch {
          echoed = TEST_PREFS;
        }
        return json(route, putStatus > 0 ? putStatus : 200, echoed);
      }
      captured.prefsGetCount += 1;
      if (getDelayMs > 0) {
        await new Promise((resolve) => setTimeout(resolve, getDelayMs));
      }
      if (prefsNetworkFail || mode === "prefsNetwork") {
        return route.abort("failed");
      }
      if (mode === "unauthorized") {
        return json(route, 401, { error: "unauthorized" });
      }
      if (mode === "unauthorized403" || prefsStatus === 403) {
        return json(route, 403, { error: "forbidden" });
      }
      if (prefsStatus === 401) {
        return json(route, 401, { error: "unauthorized" });
      }
      if (mode === "error" || mode === "prefsError" || prefsStatus === 500) {
        return json(route, 500, { error: "upstream_failed" });
      }
      if (prefsRawBody !== undefined) {
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: prefsRawBody,
        });
      }
      if (prefsBody !== undefined) {
        if (prefsBody === null) {
          return route.fulfill({
            status: 200,
            contentType: "application/json",
            body: "null",
          });
        }
        return json(route, 200, prefsBody);
      }
      return json(route, 200, options.prefs || TEST_PREFS);
    }
    if (url.includes("/api/v1/auth/logout")) {
      captured.logoutCount += 1;
      if (logoutDelayMs > 0) {
        await new Promise((resolve) => setTimeout(resolve, logoutDelayMs));
      }
      if (logoutNetworkFail) {
        return route.abort("failed");
      }
      if (logoutStatus >= 400) {
        return json(route, logoutStatus, { error: "logout_failed" });
      }
      sessionRevoked = true;
      return json(route, 200, { ok: true, revoked: true });
    }
    if (url.includes("/api/v1/auth/delete-account")) {
      captured.deleteCount += 1;
      captured.deleteBodies.push(route.request().postData() || "");
      if (deleteDelayMs > 0) {
        await new Promise((resolve) => setTimeout(resolve, deleteDelayMs));
      }
      if (deleteNetworkFail) {
        return route.abort("failed");
      }
      if (deleteStatus >= 400) {
        return json(route, deleteStatus, { error: "delete_failed" });
      }
      sessionRevoked = true;
      return json(route, 200, { ok: true });
    }
    return json(route, 401, { error: "unauthorized" });
  });
  return captured;
}

async function stubAccountHub(page, mode) {
  await page.route("**/api/v1/**", (route) => {
    const url = route.request().url();
    if (url.includes("/api/v1/auth/session")) {
      if (mode === "unauthorized") {
        return json(route, 401, { error: "unauthorized" });
      }
      if (mode === "error") {
        return json(route, 500, { error: "upstream_failed" });
      }
      return json(route, 200, TEST_SESSION);
    }
    if (url.includes("/api/v1/auth/logout")) {
      return json(route, 200, { ok: true, revoked: true });
    }
    return json(route, 401, { error: "unauthorized" });
  });
}

async function stubKyc(page, mode) {
  await page.route("**/api/v1/**", (route) => {
    const url = route.request().url();
    if (url.includes("/api/v1/compliance/kyc/status")) {
      if (mode === "unauthorized") {
        return json(route, 401, { error: "unauthorized" });
      }
      if (mode === "error") {
        return json(route, 500, { error: "upstream_failed" });
      }
      if (mode === "pending") {
        return json(route, 200, { kycStatus: "pending" });
      }
      if (mode === "approved") {
        return json(route, 200, { kycStatus: "approved" });
      }
      if (mode === "rejected") {
        return json(route, 200, { kycStatus: "rejected" });
      }
      return json(route, 200, { kycStatus: "none" });
    }
    if (url.includes("/api/v1/compliance/kyc/submit")) {
      return json(route, 200, { ok: true, kycStatus: "pending" });
    }
    return json(route, 401, { error: "unauthorized" });
  });
}

module.exports = {
  TEST_REFERRAL_ME,
  TEST_INBOX,
  TEST_PREF_FLAGS,
  TEST_PREFS,
  TEST_SESSION,
  TEST_KYC_NONE,
  stubInvite,
  stubInbox,
  stubSettings,
  stubAccountHub,
  stubKyc,
};
