/**
 * 화면용 고유 리셀러 ID = 기존 users.referral_code 재사용.
 * 인증 토큰으로 쓰지 않는다. 운영 DB backfill 금지.
 */
"use strict";

const AUTH_TOKEN_USES = new Set(["jwt", "session", "password", "csrf", "admin_secret"]);

function normalizeReferralCode(raw) {
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function asResellerId(referralCode) {
  const code = normalizeReferralCode(referralCode);
  return {
    resellerId: code,
    source: "users.referral_code",
  };
}

function assertResellerIdNotAuthToken(use) {
  if (AUTH_TOKEN_USES.has(String(use || ""))) {
    const err = new Error("resellerId is not an auth token");
    err.code = "RESELLER_ID_NOT_AUTH";
    throw err;
  }
  return true;
}

function issueResellerIdOnSignup(input) {
  const existing = normalizeReferralCode(input && input.existing);
  if (existing) {
    return { ok: true, applied: false, reused: true, resellerId: existing };
  }
  const taken = (input && input.taken) || new Set();
  const mint = input && typeof input.mint === "function" ? input.mint : null;
  if (!mint) {
    return { ok: false, applied: false, code: "MINT_REQUIRED" };
  }
  const max = (input && input.maxAttempts) || 8;
  for (let i = 0; i < max; i++) {
    const candidate = mint();
    if (taken.has(candidate)) continue;
    taken.add(candidate);
    return { ok: true, applied: true, reused: false, resellerId: candidate };
  }
  return { ok: false, applied: false, code: "RESELLER_ID_COLLISION" };
}

function classifyUniqueAsReseller(err) {
  if (!err || typeof err !== "object") return false;
  const rec = err;
  if (String(rec.code || "") !== "23505") return false;
  const blob = `${String(rec.constraint || "")} ${String(rec.detail || "")}`;
  return /referral_code/i.test(blob);
}

function createMemoryResellerStore(seed) {
  const byUser = new Map();
  const taken = new Set();
  for (const row of seed || []) {
    if (row.resellerId) {
      byUser.set(row.userId, row.resellerId);
      taken.add(row.resellerId);
    }
  }
  return {
    ready: true,
    kind: "test_memory",
    taken,
    async get(userId) {
      return byUser.get(userId) || null;
    },
    async putIfAbsent(userId, code) {
      const cur = byUser.get(userId);
      if (cur) return cur;
      if (taken.has(code)) {
        const e = new Error("duplicate");
        e.code = "23505";
        e.constraint = "users_referral_code_key";
        throw e;
      }
      taken.add(code);
      byUser.set(userId, code);
      return code;
    },
  };
}

function draftBackfillPlan() {
  return {
    applied: false,
    opsDb: false,
    note: "NULL referral_code 행만 신규 mint. 이미 있는 값은 유지. 운영 적용 금지.",
    targetColumn: "public.users.referral_code",
    displayField: "resellerId",
  };
}

module.exports = {
  normalizeReferralCode,
  asResellerId,
  assertResellerIdNotAuthToken,
  issueResellerIdOnSignup,
  classifyUniqueAsReseller,
  createMemoryResellerStore,
  draftBackfillPlan,
};
