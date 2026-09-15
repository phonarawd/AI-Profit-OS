/**
 * 회원 추가 참여 기회 지급·미사용 회수 (Q07).
 * 일반 cap 편집·등급 정책·사용량 reset과 별도.
 * 유효기간/이월은 구조만 두고 활성화하지 않음.
 * 명시 차단·계정 정지는 지급으로 해제하지 않음.
 */

"use strict";

const path = require("path");
const membership = require(path.join(
  __dirname,
  "..",
  "..",
  "..",
  "market-intelligence",
  "src",
  "membership.cjs",
));

const { readExplicitNonNegativeInt, projectDailyMatchQuota } = membership;

function createBonusGrantStore() {
  return {
    byIdempotency: Object.create(null),
    grants: [],
    nextSeq: 1,
  };
}

function assertPositiveInt(raw, field) {
  const n = readExplicitNonNegativeInt(raw);
  if (n === null || n < 1) {
    const err = new Error(`${field} must be a positive integer`);
    err.code = "INVALID_AMOUNT";
    throw err;
  }
  return n;
}

function assertReason(reason) {
  if (typeof reason !== "string" || reason.trim().length < 10) {
    const err = new Error("reason minLength 10");
    err.code = "REASON_REQUIRED";
    throw err;
  }
  return reason.trim();
}

function assertUserId(userId) {
  const s = String(userId || "");
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      s,
    )
  ) {
    const err = new Error("userId must be uuid");
    err.code = "INVALID_USER";
    throw err;
  }
  return s;
}

function grantBonusMatches(store, input) {
  const userId = assertUserId(input.userId);
  const amount = assertPositiveInt(input.amount, "amount");
  const reason = assertReason(input.reason);
  const actor = String(input.updatedByAdminId || "");
  const idempotencyKey = String(input.idempotencyKey || "").trim();
  if (!idempotencyKey) {
    const err = new Error("idempotencyKey required");
    err.code = "IDEMPOTENCY_REQUIRED";
    throw err;
  }
  const existing = store.byIdempotency[idempotencyKey];
  if (existing) {
    return { grant: existing, replay: true, ledgerMutated: false };
  }
  const grant = {
    grantId: `bmg_${store.nextSeq++}`,
    userId,
    amount,
    used: 0,
    reclaimed: 0,
    status: "active",
    reason,
    updatedByAdminId: actor,
    idempotencyKey,
    at: String(input.at || new Date().toISOString()),
    /** 미승인. 활성화하지 않음. */
    expiresAt: null,
    expiryPolicy: "unspecified_not_activated",
    carryOver: false,
  };
  store.byIdempotency[idempotencyKey] = grant;
  store.grants.push(grant);
  return { grant, replay: false, ledgerMutated: false };
}

function remainingOf(grant) {
  return Math.max(0, grant.amount - grant.used - grant.reclaimed);
}

function listBonusGrants(store, userId) {
  const id = assertUserId(userId);
  return store.grants.filter((g) => g.userId === id).map((g) => ({ ...g }));
}

function projectBonusRemaining(store, userId) {
  const grants = listBonusGrants(store, userId);
  let granted = 0;
  let used = 0;
  let reclaimed = 0;
  let remaining = 0;
  for (const g of grants) {
    if (g.status === "cancelled") continue;
    granted += g.amount;
    used += g.used;
    reclaimed += g.reclaimed;
    remaining += remainingOf(g);
  }
  return { granted, used, reclaimed, remaining, grants };
}

/**
 * 기본 잔여 + 유효 추가 잔여. 기본 한도 하향 초과분에 추가 지급을 흡수하지 않음.
 * cap=0 명시 차단·safety deny는 추가로 해제하지 않음.
 */
function projectEffectiveParticipateQuota(input) {
  const base = projectDailyMatchQuota(input);
  const bonusRemaining = readExplicitNonNegativeInt(input.bonusRemaining);
  const bonus = bonusRemaining === null ? 0 : bonusRemaining;
  const explicitBlock =
    input.explicitParticipateBlock === true ||
    (base.source === "user_override" && base.cap === 0);
  const safetyDeny = input.safetyDeny === true || input.accountFrozen === true;
  const participateRemaining = explicitBlock || safetyDeny
    ? 0
    : base.remaining + bonus;
  return {
    ...base,
    baseCap: base.cap,
    baseUsed: base.used,
    baseRemaining: base.remaining,
    bonusRemaining: bonus,
    participateRemaining,
    blocked: participateRemaining <= 0,
    explicitParticipateBlock: explicitBlock,
    safetyDeny,
    bonusDoesNotLiftSafety: true,
  };
}

function reclaimUnusedBonus(store, input) {
  const userId = assertUserId(input.userId);
  const reason = assertReason(input.reason);
  const amountWanted =
    input.amount == null ? null : assertPositiveInt(input.amount, "amount");
  let left = amountWanted;
  let reclaimed = 0;
  const touched = [];
  for (const g of store.grants) {
    if (g.userId !== userId || g.status !== "active") continue;
    const avail = remainingOf(g);
    if (avail <= 0) continue;
    const take = left == null ? avail : Math.min(avail, left);
    g.reclaimed += take;
    reclaimed += take;
    if (remainingOf(g) === 0) g.status = "reclaimed";
    touched.push({ grantId: g.grantId, take, remaining: remainingOf(g) });
    if (left != null) {
      left -= take;
      if (left <= 0) break;
    }
  }
  return {
    userId,
    reclaimed,
    requested: amountWanted,
    remaining: projectBonusRemaining(store, userId).remaining,
    touched,
    reason,
    usedNotNegated: true,
    tradesNotCancelled: true,
    ledgerMutated: false,
  };
}

/**
 * 마지막 1회 원자 소비 구조. 실 DB FOR UPDATE는 호출하지 않음.
 * 차감 순서(기본 vs 추가)는 미승인이므로 기본 잔여를 먼저 소모하는 초안만.
 */
function consumeParticipateDraft(input) {
  const quota = projectEffectiveParticipateQuota(input);
  const key = String(input.idempotencyKey || "");
  if (!key) {
    const err = new Error("idempotencyKey required");
    err.code = "IDEMPOTENCY_REQUIRED";
    throw err;
  }
  if (quota.blocked) {
    return {
      allowed: false,
      code: quota.safetyDeny
        ? "SAFETY_DENY"
        : quota.explicitParticipateBlock
          ? "DAILY_MATCH_CAP"
          : "DAILY_MATCH_CAP",
      quota,
      durable: false,
    };
  }
  const consumeBase = Math.min(1, quota.baseRemaining);
  const consumeBonus = consumeBase === 1 ? 0 : 1;
  return {
    allowed: true,
    quota,
    consumeBase,
    consumeBonus,
    deductionOrder: "draft_base_then_bonus_unapproved",
    durable: false,
    realDbLock: "BLOCKED",
  };
}

module.exports = {
  createBonusGrantStore,
  grantBonusMatches,
  listBonusGrants,
  projectBonusRemaining,
  projectEffectiveParticipateQuota,
  reclaimUnusedBonus,
  consumeParticipateDraft,
  remainingOf,
};
