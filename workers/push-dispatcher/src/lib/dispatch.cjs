/**
 * REL-020 — Push dispatch SSOT (Worker HTTP + Nest in-process + verify).
 * kill이 꺼져 있으면 send 경로에 절대 들어가지 않는다.
 */
"use strict";

function isPushEnabled(value) {
  return value === true || value === "true";
}

function normalizeSubscription(raw) {
  if (!raw || typeof raw !== "object") return null;
  const endpoint = String(raw.endpoint || "").trim();
  const keys = raw.keys && typeof raw.keys === "object" ? raw.keys : raw;
  const p256dh = String(keys.p256dh || raw.p256dh || "").trim();
  const auth = String(keys.auth || raw.auth || "").trim();
  if (!endpoint.startsWith("https://") || p256dh.length < 8 || auth.length < 8) {
    return null;
  }
  return { endpoint, p256dh, auth };
}

function dispatchPush(input, hooks) {
  const send =
    hooks && typeof hooks.sendWebPush === "function" ? hooks.sendWebPush : null;

  if (!isPushEnabled(input && input.pushEnabled)) {
    return {
      ok: false,
      status: "killed",
      sent: 0,
      sendAttempted: false,
    };
  }

  const sub = normalizeSubscription(input && input.subscription);
  if (!sub) {
    return {
      ok: false,
      status: "invalid_subscription",
      sent: 0,
      sendAttempted: false,
    };
  }

  const vapid = (input && input.vapid) || {};
  const hasVapid = Boolean(vapid.publicKey && vapid.privateKey);
  if (!hasVapid) {
    return {
      ok: false,
      status: "accepted_unconfigured",
      sent: 0,
      sendAttempted: false,
    };
  }

  if (input && input.dryRun === true) {
    return {
      ok: true,
      status: "dry_run",
      sent: 0,
      wouldSend: 1,
      sendAttempted: false,
    };
  }

  if (!send) {
    return {
      ok: false,
      status: "accepted_unconfigured",
      sent: 0,
      sendAttempted: false,
    };
  }

  const delivered = send({
    subscription: sub,
    payload: (input && input.payload) || {},
    vapid,
  });
  const ok = Boolean(delivered && delivered.ok === true);
  return {
    ok,
    status: ok ? "sent" : "send_failed",
    sent: ok ? 1 : 0,
    sendAttempted: true,
  };
}

function readAuthHeader(request) {
  const headers = request && request.headers;
  if (!headers) return "";
  if (typeof headers.get === "function") {
    return String(headers.get("authorization") || headers.get("Authorization") || "");
  }
  return String(headers.authorization || headers.Authorization || "");
}

async function readJsonBody(request) {
  if (!request) return {};
  if (typeof request.json === "function") {
    return request.json();
  }
  if (request.body && typeof request.body === "object") {
    return request.body;
  }
  return {};
}

async function handleDispatcherRequest(request, env, hooks) {
  const url = new URL(request.url, "http://push-dispatcher.local");
  if (url.pathname === "/health") {
    return {
      statusCode: 200,
      body: {
        ok: true,
        service: (env && env.SERVICE) || "push-dispatcher",
        phase: (env && env.PHASE) || "0",
        pushEnabled: isPushEnabled(env && env.PUSH_ENABLED),
      },
    };
  }

  if (request.method !== "POST" || url.pathname !== "/dispatch") {
    return {
      statusCode: request.method === "POST" ? 404 : 405,
      body: { ok: false, status: "not_found" },
    };
  }

  const expected = String((env && env.PUSH_DISPATCH_TOKEN) || "");
  if (!expected || readAuthHeader(request) !== `Bearer ${expected}`) {
    return {
      statusCode: 401,
      body: { ok: false, status: "unauthorized", sent: 0, sendAttempted: false },
    };
  }

  let body;
  try {
    body = await readJsonBody(request);
  } catch {
    return {
      statusCode: 400,
      body: { ok: false, status: "invalid_json", sent: 0, sendAttempted: false },
    };
  }

  const result = dispatchPush(
    {
      ...(body && typeof body === "object" ? body : {}),
      pushEnabled:
        isPushEnabled(env && env.PUSH_ENABLED) &&
        isPushEnabled(body && body.pushEnabled),
      vapid: {
        publicKey: env && env.VAPID_PUBLIC_KEY,
        privateKey: env && env.VAPID_PRIVATE_KEY,
        subject: (env && env.VAPID_SUBJECT) || "mailto:ops@localhost",
      },
    },
    hooks,
  );

  let statusCode = 200;
  if (result.status === "killed") statusCode = 409;
  if (result.status === "invalid_subscription") statusCode = 400;
  return { statusCode, body: result };
}

function planEmit(input) {
  if (!isPushEnabled(input && input.pushEnabled)) {
    return { status: "killed", sent: 0, enqueue: false };
  }
  const count = Number(input && input.subscriptionCount);
  if (!Number.isFinite(count) || count < 1) {
    return { status: "no_subscription", sent: 0, enqueue: false };
  }
  return { status: "enqueue", sent: 0, enqueue: true };
}

module.exports = {
  isPushEnabled,
  normalizeSubscription,
  dispatchPush,
  handleDispatcherRequest,
  planEmit,
};
