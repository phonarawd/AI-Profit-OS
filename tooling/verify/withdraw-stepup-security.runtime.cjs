"use strict";

process.env.JWT_USER_SECRET =
  process.env.JWT_USER_SECRET || "test-withdraw-stepup-secret-32-bytes";
process.env.APP_HOST = process.env.APP_HOST || "app.hiptk.app";

const assert = require("node:assert/strict");
const { createHash, createHmac } = require("node:crypto");
const {
  WithdrawStepUpService,
} = require("../../services/api-nest/dist/wallet/withdraw-stepup.service.js");

function sha256(value) {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function v2Token({ userId, method, challengeId, expiresAtSec }) {
  const secret = process.env.JWT_USER_SECRET;
  const mac = createHmac("sha256", secret)
    .update(`${userId}|${method}|${challengeId}|${expiresAtSec}`)
    .digest("base64url");
  return `v2.${userId}.${method}.${challengeId}.${expiresAtSec}.${mac}`;
}

const userId = "00000000-0000-4000-8000-000000000001";
const challengeId = "00000000-0000-4000-8000-000000000002";

async function main() {

{
  const db = {
    async query(text) {
      throw new Error("DB must not be reached for disabled webauthn: " + text);
    },
  };
  const resend = { provider: "resend", async sendOtp() { return { ok: true }; } };
  const svc = new WithdrawStepUpService(db, resend);
  await assert.rejects(
    () =>
      svc.createChallenge({
        userId,
        method: "webauthn",
        origin: "app.hiptk.app",
      }),
    (err) => err && err.status === 503,
  );
}

{
  let sentTo = "";
  const db = {
    async query(text) {
      if (text.includes("auth_magic_link_challenges")) {
        return { rows: [{ email: "verified@example.com" }] };
      }
      if (text.includes("INSERT INTO public.withdraw_stepup_challenges")) {
        return {
          rows: [{
            id: challengeId,
            user_id: userId,
            method: "email_otp",
            challenge_hash: "x",
            origin: "app.hiptk.app",
            expires_at: new Date(Date.now() + 60000),
            consumed_at: null,
          }],
        };
      }
      throw new Error("unexpected query: " + text);
    },
  };
  const resend = {
    provider: "resend",
    async sendOtp(input) {
      sentTo = input.to;
      return { ok: true };
    },
  };
  const svc = new WithdrawStepUpService(db, resend);
  await svc.createChallenge({
    userId,
    method: "email_otp",
    origin: "app.hiptk.app",
  });
  assert.equal(sentTo, "verified@example.com");
}

{
  const proof = "123456";
  const db = {
    async query(text) {
      if (text.startsWith("SELECT id, user_id, method")) {
        return {
          rows: [{
            id: challengeId,
            user_id: userId,
            method: "email_otp",
            challenge_hash: sha256(proof),
            origin: "app.hiptk.app",
            expires_at: new Date(Date.now() + 60000),
            consumed_at: null,
          }],
        };
      }
      if (text.includes("UPDATE public.withdraw_stepup_challenges")) {
        return { rows: [] };
      }
      throw new Error("unexpected query: " + text);
    },
  };
  const resend = { provider: "resend", async sendOtp() { return { ok: true }; } };
  const svc = new WithdrawStepUpService(db, resend);
  await assert.rejects(
    () =>
      svc.verifyChallenge({
        userId,
        challengeId,
        method: "email_otp",
        proof,
        origin: "app.hiptk.app",
      }),
    /challenge already consumed/,
  );
}

{
  const db = { async query() { return { rows: [] }; } };
  const resend = { provider: "resend", async sendOtp() { return { ok: true }; } };
  const svc = new WithdrawStepUpService(db, resend);

  const future = Math.floor(Date.now() / 1000) + 30;
  const valid = v2Token({
    userId,
    method: "email_otp",
    challengeId,
    expiresAtSec: future,
  });
  assert.equal(svc.assertStepUpToken({ userId, stepUpToken: valid }).method, "email_otp");

  const expired = v2Token({
    userId,
    method: "email_otp",
    challengeId,
    expiresAtSec: Math.floor(Date.now() / 1000) - 1,
  });
  assert.throws(
    () => svc.assertStepUpToken({ userId, stepUpToken: expired }),
    (err) => err && err.status === 403,
  );

  assert.throws(
    () =>
      svc.assertStepUpToken({
        userId,
        stepUpToken: `v1.${userId}.email_otp.${challengeId}.deadbeef`,
      }),
    (err) => err && err.status === 403,
  );
}

console.log(
  "[verify:withdraw-stepup-security-runtime] PASS (WEBAUTHN_DISABLED · SERVER_EMAIL · ATOMIC_CONSUME · TOKEN_EXPIRY)",
);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
