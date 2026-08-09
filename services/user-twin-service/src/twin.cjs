/**
 * User Twin — Engine §47.3
 * Slow prefs / behavior only. NEVER cache balanceUsdt · expectedProfitUsdt · live quotes.
 */

"use strict";

const FORBIDDEN_TWIN_MONEY_KEYS = Object.freeze([
  "balanceUsdt",
  "expectedProfitUsdt",
  "liveQuote",
]);

const CAPITAL_BANDS = Object.freeze([
  "micro",
  "small",
  "mid",
  "high",
  "whale",
]);

const TONE_BANDS = Object.freeze(["young", "mid", "senior"]);

const CATEGORIES = Object.freeze(["watch", "trading_card", "luxury_bag"]);

const TWIN_REDIS_PREFIX = "ai:twin:";
const TWIN_REDIS_TTL_SEC = 3600;

/**
 * @param {Record<string, unknown>|null|undefined} obj
 * @returns {string[]}
 */
function findForbiddenMoneyKeys(obj) {
  if (!obj || typeof obj !== "object") return [];
  const hits = [];
  for (const k of FORBIDDEN_TWIN_MONEY_KEYS) {
    if (Object.prototype.hasOwnProperty.call(obj, k)) hits.push(k);
  }
  return hits;
}

/**
 * @param {Record<string, unknown>|null|undefined} obj
 */
function assertNoTwinMoneyKeys(obj) {
  const hits = findForbiddenMoneyKeys(obj);
  if (hits.length) {
    const err = new Error(
      `TWIN_MONEY_CACHE_FORBIDDEN:${hits.join(",")}`,
    );
    err.code = "TWIN_MONEY_CACHE_FORBIDDEN";
    throw err;
  }
}

/**
 * Redis hot key for twin snapshot
 * @param {string} userId
 */
function twinRedisKey(userId) {
  return `${TWIN_REDIS_PREFIX}${String(userId || "").trim()}`;
}

/**
 * Build normalized Twin (schemas/user-twin.v1)
 * @param {object} input
 */
function buildTwin(input = {}) {
  assertNoTwinMoneyKeys(input);
  if (input.payload && typeof input.payload === "object") {
    assertNoTwinMoneyKeys(input.payload);
  }

  const userId = String(input.userId || "").trim();
  if (!userId) {
    throw new Error("TWIN_USER_ID_REQUIRED");
  }

  const preferredCapitalBand = CAPITAL_BANDS.includes(
    input.preferredCapitalBand,
  )
    ? input.preferredCapitalBand
    : null;

  const categoryInterest = Array.isArray(input.categoryInterest)
    ? input.categoryInterest.filter((c) => CATEGORIES.includes(c))
    : [];

  const toneBand = TONE_BANDS.includes(input.toneBand)
    ? input.toneBand
    : null;

  const objectionPatterns = Array.isArray(input.objectionPatterns)
    ? input.objectionPatterns.filter((p) => typeof p === "string").map(String)
    : [];

  const twinSnapshotId =
    input.twinSnapshotId != null
      ? String(input.twinSnapshotId)
      : input.twin_snapshot_id != null
        ? String(input.twin_snapshot_id)
        : `twin_${userId}_${Date.now()}`;

  return Object.freeze({
    schema: "user-twin.v1",
    userId,
    preferredCapitalBand,
    categoryInterest: Object.freeze([...categoryInterest]),
    toneBand,
    objectionPatterns: Object.freeze([...objectionPatterns]),
    twinSnapshotId,
    updatedAt: input.updatedAt || new Date().toISOString(),
  });
}

/**
 * Merge patch onto base Twin (money keys still forbidden)
 * @param {object|null} base
 * @param {object} patch
 */
function patchTwin(base, patch = {}) {
  assertNoTwinMoneyKeys(patch);
  if (patch.payload && typeof patch.payload === "object") {
    assertNoTwinMoneyKeys(patch.payload);
  }
  const merged = {
    ...(base || {}),
    ...patch,
    userId: String(patch.userId || base?.userId || ""),
    categoryInterest:
      patch.categoryInterest !== undefined
        ? patch.categoryInterest
        : base?.categoryInterest,
    objectionPatterns:
      patch.objectionPatterns !== undefined
        ? patch.objectionPatterns
        : base?.objectionPatterns,
    updatedAt: new Date().toISOString(),
  };
  return buildTwin(merged);
}

/**
 * Map Twin → PG ai_user_profile row (payload never holds money Fact)
 * @param {ReturnType<typeof buildTwin>} twin
 */
function toAiUserProfileRow(twin) {
  assertNoTwinMoneyKeys(twin);
  return Object.freeze({
    user_id: twin.userId,
    preferred_capital_band: twin.preferredCapitalBand,
    category_interest: [...twin.categoryInterest],
    tone_band: twin.toneBand,
    objection_patterns: [...twin.objectionPatterns],
    twin_snapshot_id: twin.twinSnapshotId,
    payload: {},
    updated_at: twin.updatedAt,
  });
}

/**
 * Map PG row → Twin
 * @param {object} row
 */
function fromAiUserProfileRow(row) {
  if (!row) return null;
  if (row.payload && typeof row.payload === "object") {
    assertNoTwinMoneyKeys(row.payload);
  }
  return buildTwin({
    userId: row.user_id || row.userId,
    preferredCapitalBand:
      row.preferred_capital_band || row.preferredCapitalBand,
    categoryInterest: row.category_interest || row.categoryInterest,
    toneBand: row.tone_band || row.toneBand,
    objectionPatterns: row.objection_patterns || row.objectionPatterns,
    twinSnapshotId: row.twin_snapshot_id || row.twinSnapshotId,
    updatedAt: row.updated_at || row.updatedAt,
  });
}

/**
 * Twin must never be the source of money/price answers.
 * Call this instead of reading balance/price off the Twin object.
 * @param {object|null|undefined} _twin
 * @param {string} field
 */
function resolveMoneyFromTwin(_twin, field) {
  const f = String(field || "");
  const err = new Error(`TWIN_CANNOT_ANSWER_MONEY:${f || "unknown"}`);
  err.code = "TWIN_CANNOT_ANSWER_MONEY";
  throw err;
}

/**
 * @param {boolean} usedTwinForMoney
 */
function assertTwinNotUsedForMoneyAnswer(usedTwinForMoney) {
  if (usedTwinForMoney) {
    const err = new Error("TWIN_CANNOT_ANSWER_MONEY");
    err.code = "TWIN_CANNOT_ANSWER_MONEY";
    throw err;
  }
}

module.exports = {
  FORBIDDEN_TWIN_MONEY_KEYS,
  CAPITAL_BANDS,
  TONE_BANDS,
  CATEGORIES,
  TWIN_REDIS_PREFIX,
  TWIN_REDIS_TTL_SEC,
  findForbiddenMoneyKeys,
  assertNoTwinMoneyKeys,
  twinRedisKey,
  buildTwin,
  patchTwin,
  toAiUserProfileRow,
  fromAiUserProfileRow,
  resolveMoneyFromTwin,
  assertTwinNotUsedForMoneyAnswer,
};
