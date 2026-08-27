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

const TEST_PREFS = {
  master: true,
  opportunity: true,
  wallet: true,
  notice: true,
  campaign: true,
  opsMessage: true,
  strategyMatch: true,
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

async function stubSettings(page, mode) {
  await page.route("**/api/v1/**", async (route) => {
    const url = route.request().url();
    const method = route.request().method();
    if (url.includes("/api/v1/auth/session")) {
      if (mode === "unauthorized") {
        return json(route, 401, { error: "unauthorized" });
      }
      if (mode === "error") {
        return json(route, 500, { error: "upstream_failed" });
      }
      return json(route, 200, TEST_SESSION);
    }
    if (url.includes("/api/v1/me/notification-prefs")) {
      if (mode === "unauthorized") {
        return json(route, 401, { error: "unauthorized" });
      }
      if (mode === "error") {
        return json(route, 500, { error: "upstream_failed" });
      }
      if (method === "PUT") {
        return json(route, 200, TEST_PREFS);
      }
      return json(route, 200, TEST_PREFS);
    }
    if (url.includes("/api/v1/auth/logout")) {
      return json(route, 200, { ok: true, revoked: true });
    }
    return json(route, 401, { error: "unauthorized" });
  });
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
  TEST_PREFS,
  TEST_SESSION,
  TEST_KYC_NONE,
  stubInvite,
  stubInbox,
  stubSettings,
  stubAccountHub,
  stubKyc,
};
