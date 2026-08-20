/**
 * REL-020 QA 가드 안 1건 — production DB/URL 0.
 * kill이면 sendAttempted 반드시 false.
 */
const {
  assertQaIsolation,
} = require("../e2e/lib/qa-env-isolation-guard.cjs");
const {
  isPushEnabled,
  dispatchPush,
  handleDispatcherRequest,
  planEmit,
} = require("../../workers/push-dispatcher/src/lib/dispatch.cjs");

const VALID_SUB = {
  endpoint: "https://push.example.test/sub/1",
  keys: { p256dh: "p256dh-key-value", auth: "auth-key-value" },
};

function runPushBadgeQaCases() {
  assertQaIsolation({ purpose: "qa", host: "localhost" });

  let sendCalls = 0;
  const hooks = {
    sendWebPush() {
      sendCalls += 1;
      return { ok: true };
    },
  };

  const killed = dispatchPush(
    {
      pushEnabled: false,
      subscription: VALID_SUB,
      vapid: { publicKey: "pub", privateKey: "priv" },
    },
    hooks,
  );

  const envKilled = dispatchPush(
    {
      pushEnabled: "false",
      subscription: VALID_SUB,
      vapid: { publicKey: "pub", privateKey: "priv" },
    },
    hooks,
  );

  const dry = dispatchPush({
    pushEnabled: true,
    subscription: VALID_SUB,
    vapid: { publicKey: "pub", privateKey: "priv" },
    dryRun: true,
  });

  const unconfigured = dispatchPush({
    pushEnabled: true,
    subscription: VALID_SUB,
  });

  const planKilled = planEmit({ pushEnabled: false, subscriptionCount: 2 });
  const planReady = planEmit({ pushEnabled: true, subscriptionCount: 1 });

  return {
    sendCalls,
    killed,
    envKilled,
    dry,
    unconfigured,
    planKilled,
    planReady,
    enabledTrue: isPushEnabled(true),
    enabledFalse: isPushEnabled(false),
  };
}

async function runDispatcherHttpCases() {
  assertQaIsolation({ purpose: "qa", host: "127.0.0.1" });
  const env = {
    SERVICE: "push-dispatcher",
    PHASE: "0",
    PUSH_ENABLED: "true",
    PUSH_DISPATCH_TOKEN: "qa-token",
  };

  const unauth = await handleDispatcherRequest(
    {
      method: "POST",
      url: "http://push-dispatcher.local/dispatch",
      headers: { authorization: "Bearer wrong" },
      body: { pushEnabled: true, subscription: VALID_SUB },
    },
    env,
  );

  const nestKill = await handleDispatcherRequest(
    {
      method: "POST",
      url: "http://push-dispatcher.local/dispatch",
      headers: { authorization: "Bearer qa-token" },
      body: { pushEnabled: false, subscription: VALID_SUB },
    },
    { ...env, VAPID_PUBLIC_KEY: "pub", VAPID_PRIVATE_KEY: "priv" },
  );

  const envKill = await handleDispatcherRequest(
    {
      method: "POST",
      url: "http://push-dispatcher.local/dispatch",
      headers: { authorization: "Bearer qa-token" },
      body: { pushEnabled: true, subscription: VALID_SUB },
    },
    {
      ...env,
      PUSH_ENABLED: "false",
      VAPID_PUBLIC_KEY: "pub",
      VAPID_PRIVATE_KEY: "priv",
    },
  );

  return { unauth, nestKill, envKill };
}

module.exports = {
  VALID_SUB,
  runPushBadgeQaCases,
  runDispatcherHttpCases,
};
