/**
 * B-FEED-001 — User Opportunity Feed Policy
 * Owns: 참여 성공/진행중 개인 feed 제거 · 재노출(새 Opportunity) · cooldown/diversity · 안정 랭크
 * Does not own: balance-aware 분류 · money · Admin UI(Track D overlay만)
 * CI: verify:user-opportunity-feed-policy
 */

const POLICY_VERSION = "user-opportunity-feed-policy.v1";
const POLICY_OWNER = "engine:B-FEED-001";

const IN_PROGRESS_STATUSES = Object.freeze(["running", "requeue"]);
const SUCCESS_STATUS = "success";
const RETRYABLE_STATUSES = Object.freeze([
  "safe_stop",
  "cancelled",
  "failed",
]);

const EXCLUDE_REASON = Object.freeze({
  PARTICIPATED_ACTIVE: "PARTICIPATED_ACTIVE",
  IDENTITY_COOLDOWN: "IDENTITY_COOLDOWN",
  DIVERSITY_CAP: "DIVERSITY_CAP",
  ALLOCATION_CAP: "ALLOCATION_CAP",
});

/** Day-1: 참여 hide ON · cooldown/diversity/allocation OFF(메커니즘만). Track D overlay로 조절 */
const DEFAULT_USER_OPPORTUNITY_FEED_POLICY = Object.freeze({
  hideSuccess: true,
  hideInProgress: true,
  cooldownSec: 0,
  diversityMaxPerIdentity: 0,
  maxFeedSlots: 0,
});

const ADMIN_CONTROL_POINTER = Object.freeze({
  ownerTrack: "D",
  visibility: "user_opportunity_overrides + hideSuccess/hideInProgress",
  repeat: "새 opportunities.id + cooldownSec",
  frequency: "cooldownSec",
  allocation: "maxFeedSlots",
  segment: "overlay FUTURE — Track D",
  ui: "NOT_THIS_SLICE",
});

function clampInt(value, min, max, fallback) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  const i = Math.trunc(n);
  if (i < min) return min;
  if (i > max) return max;
  return i;
}

/**
 * Identity for cooldown/diversity only — hide 키는 항상 opportunityId.
 * CanonicalProduct가 있으면 그걸 쓰고, 없으면 assetId (Track A 미배선 호환).
 * @param {{ canonicalProductId?: string|null, assetId?: string|null }} input
 */
function feedIdentityKey(input) {
  const row = input && typeof input === "object" ? input : {};
  const cp =
    typeof row.canonicalProductId === "string" ? row.canonicalProductId.trim() : "";
  if (cp) return `cp:${cp}`;
  const assetId = typeof row.assetId === "string" ? row.assetId.trim() : "";
  if (assetId) return `asset:${assetId}`;
  return "";
}

function isInProgressStatus(status) {
  return IN_PROGRESS_STATUSES.includes(String(status || ""));
}

function isSuccessStatus(status) {
  return String(status || "") === SUCCESS_STATUS;
}

function isParticipatedActive(status, policy) {
  const p = policy || DEFAULT_USER_OPPORTUNITY_FEED_POLICY;
  if (p.hideSuccess !== false && isSuccessStatus(status)) return true;
  if (p.hideInProgress !== false && isInProgressStatus(status)) return true;
  return false;
}

/**
 * @param {{ overlay?: object|null }|null|undefined} input
 */
function resolveUserOpportunityFeedPolicy(input) {
  const overlay =
    input && typeof input === "object" && input.overlay && typeof input.overlay === "object"
      ? input.overlay
      : {};
  return {
    hideSuccess: overlay.hideSuccess !== false,
    hideInProgress: overlay.hideInProgress !== false,
    cooldownSec: clampInt(overlay.cooldownSec, 0, 86400 * 30, 0),
    diversityMaxPerIdentity: clampInt(overlay.diversityMaxPerIdentity, 0, 50, 0),
    maxFeedSlots: clampInt(overlay.maxFeedSlots, 0, 200, 0),
  };
}

/**
 * 참여 성공/진행중 → 그 opportunityId만 제거.
 * 같은 identity의 *다른* Opportunity는 cooldown이 있을 때만 잠시 막음.
 * @param {{
 *   candidates: Array<{ id: string, identityKey?: string }>,
 *   participations: Array<{ opportunityId: string, identityKey?: string, status: string, updatedAtMs: number }>,
 *   nowMs: number,
 *   policy?: object,
 * }} input
 */
function excludeParticipatedFromFeed(input) {
  const policy = resolveUserOpportunityFeedPolicy({
    overlay: input && input.policy,
  });
  const candidates = Array.isArray(input && input.candidates) ? input.candidates : [];
  const participations = Array.isArray(input && input.participations)
    ? input.participations
    : [];
  const nowMs = Number(input && input.nowMs);
  const now = Number.isFinite(nowMs) ? nowMs : 0;

  const hideOpp = new Set();
  const cooldownUntilByIdentity = new Map();

  for (const raw of participations) {
    if (!raw || typeof raw !== "object") continue;
    const opportunityId = String(raw.opportunityId || "").trim();
    if (!opportunityId) continue;
    if (!isParticipatedActive(raw.status, policy)) continue;
    hideOpp.add(opportunityId);
    if (policy.cooldownSec > 0) {
      const identity = String(raw.identityKey || "").trim();
      if (!identity) continue;
      const updatedAtMs = Number(raw.updatedAtMs);
      if (!Number.isFinite(updatedAtMs)) continue;
      const until = updatedAtMs + policy.cooldownSec * 1000;
      const prev = cooldownUntilByIdentity.get(identity) ?? 0;
      if (until > prev) cooldownUntilByIdentity.set(identity, until);
    }
  }

  const eligible = [];
  const excluded = [];
  for (const card of candidates) {
    if (!card || typeof card !== "object") continue;
    const id = String(card.id || "").trim();
    if (!id) continue;
    if (hideOpp.has(id)) {
      excluded.push({ id, reason: EXCLUDE_REASON.PARTICIPATED_ACTIVE });
      continue;
    }
    const identity = String(card.identityKey || "").trim();
    if (policy.cooldownSec > 0 && identity) {
      const until = cooldownUntilByIdentity.get(identity);
      if (until != null && now < until) {
        excluded.push({ id, reason: EXCLUDE_REASON.IDENTITY_COOLDOWN });
        continue;
      }
    }
    eligible.push(card);
  }

  return { items: eligible, excluded, policy };
}

/**
 * 이미 안정 정렬된 목록 위를 걷는다. 난수/셔플 0.
 * diversityMaxPerIdentity=0 · maxFeedSlots=0 → no-op.
 * @param {{
 *   candidates: Array<{ id: string, identityKey?: string }>,
 *   policy?: object,
 * }} input
 */
function applyStableFeedCaps(input) {
  const policy = resolveUserOpportunityFeedPolicy({
    overlay: input && input.policy,
  });
  const candidates = Array.isArray(input && input.candidates) ? input.candidates : [];
  const identityCount = new Map();
  const items = [];
  const excluded = [];

  for (const card of candidates) {
    if (!card || typeof card !== "object") continue;
    const id = String(card.id || "").trim();
    if (!id) continue;
    if (policy.maxFeedSlots > 0 && items.length >= policy.maxFeedSlots) {
      excluded.push({ id, reason: EXCLUDE_REASON.ALLOCATION_CAP });
      continue;
    }
    const identity = String(card.identityKey || "").trim();
    if (policy.diversityMaxPerIdentity > 0 && identity) {
      const n = identityCount.get(identity) ?? 0;
      if (n >= policy.diversityMaxPerIdentity) {
        excluded.push({ id, reason: EXCLUDE_REASON.DIVERSITY_CAP });
        continue;
      }
      identityCount.set(identity, n + 1);
    }
    items.push(card);
  }

  return { items, excluded, policy };
}

/**
 * 테스트/합성용: eligibility 후 caps.
 * listFeed 런타임은 분류 전 exclude → 분류 → caps 순서를 쓴다.
 */
function applyUserOpportunityFeedPolicy(input) {
  const filtered = excludeParticipatedFromFeed(input);
  const capped = applyStableFeedCaps({
    candidates: filtered.items,
    policy: input && input.policy,
  });
  return {
    items: capped.items,
    excluded: filtered.excluded.concat(capped.excluded),
    policy: capped.policy,
  };
}

function recountFeedBuckets(items) {
  const list = Array.isArray(items) ? items : [];
  let affordableCount = 0;
  let nearMissCount = 0;
  let lockedHighCount = 0;
  let topSuggestDepositUsdt = null;
  for (const row of list) {
    if (!row || typeof row !== "object") continue;
    if (row.bucket === "affordable") affordableCount += 1;
    else if (row.bucket === "nearMiss") {
      nearMissCount += 1;
      if (
        topSuggestDepositUsdt == null &&
        row.suggestDepositUsdt != null &&
        String(row.suggestDepositUsdt) !== "0"
      ) {
        topSuggestDepositUsdt = String(row.suggestDepositUsdt);
      }
    } else if (row.bucket === "lockedHigh") lockedHighCount += 1;
  }
  return {
    affordableCount,
    nearMissCount,
    lockedHighCount,
    topSuggestDepositUsdt,
  };
}

module.exports = {
  POLICY_VERSION,
  POLICY_OWNER,
  IN_PROGRESS_STATUSES,
  SUCCESS_STATUS,
  RETRYABLE_STATUSES,
  EXCLUDE_REASON,
  DEFAULT_USER_OPPORTUNITY_FEED_POLICY,
  ADMIN_CONTROL_POINTER,
  feedIdentityKey,
  isInProgressStatus,
  isSuccessStatus,
  isParticipatedActive,
  resolveUserOpportunityFeedPolicy,
  excludeParticipatedFromFeed,
  applyStableFeedCaps,
  applyUserOpportunityFeedPolicy,
  recountFeedBuckets,
};
