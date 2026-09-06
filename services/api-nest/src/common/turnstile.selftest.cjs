/**
 * Turnstile hostname / action / 만료 / 재사용 — 네트워크·Nest 없이 검증.
 */
"use strict";

const {
  challengeFresh,
  evaluateSiteverify,
  hashTurnstileToken,
  hostnameAllowed,
  memoryReplayStore,
  resetTurnstileReplayForTests,
} = require("../../turnstile.policy.cjs");

function fail(msg) {
  console.error("[turnstile.selftest] FAIL " + msg);
  process.exit(1);
}

function okJson(over = {}) {
  return {
    success: true,
    hostname: "localhost",
    action: "login",
    challenge_ts: new Date().toISOString(),
    ...over,
  };
}

if (hostnameAllowed("hitpk.app", "production")) fail("hitpk typo must be rejected");
if (!hostnameAllowed("app.hiptk.app", "production")) fail("app.hiptk.app must be allowed");
if (hostnameAllowed("localhost", "production")) fail("localhost not allowed in production");
if (!hostnameAllowed("localhost", "development")) fail("localhost allowed in development");
if (!challengeFresh(new Date().toISOString(), Date.now())) fail("fresh challenge");
if (challengeFresh("1999-01-01T00:00:00.000Z", Date.now())) fail("old challenge");

const nowMs = Date.now();
const failed = evaluateSiteverify({ success: false }, { nodeEnv: "development", nowMs });
if (failed.ok || failed.reason !== "VERIFY_FAILED") fail("siteverify failure");

const host = evaluateSiteverify(okJson({ hostname: "evil.example" }), {
  nodeEnv: "development",
  expectedAction: "login",
  nowMs,
});
if (host.ok || host.reason !== "HOSTNAME_MISMATCH") fail("hostname mismatch");

const action = evaluateSiteverify(okJson({ action: "signup" }), {
  nodeEnv: "development",
  expectedAction: "login",
  nowMs,
});
if (action.ok || action.reason !== "ACTION_MISMATCH") fail("action mismatch");

const expired = evaluateSiteverify(okJson({ challenge_ts: "2010-01-01T00:00:00.000Z" }), {
  nodeEnv: "development",
  expectedAction: "login",
  nowMs,
});
if (expired.ok || expired.reason !== "CHALLENGE_EXPIRED") fail("expired challenge");

const firstJudge = evaluateSiteverify(okJson(), {
  nodeEnv: "development",
  expectedAction: "login",
  nowMs,
});
if (!firstJudge.ok) fail("fresh siteverify should pass");

resetTurnstileReplayForTests();
const replay = memoryReplayStore();
const tokenHash = hashTurnstileToken("same-token");
void replay.consume(tokenHash, 60_000).then(async (ok1) => {
  if (!ok1) fail("first replay consume");
  const ok2 = await replay.consume(tokenHash, 60_000);
  if (ok2) fail("replay must fail");
  console.log("[turnstile.selftest] PASS");
});
