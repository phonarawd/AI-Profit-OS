/**
 * Engine §4.2a — opportunity scan projection
 * arbitrageTypeKo · tags.time_sensitive · sellSuccess meta · FX=same card schema
 * CI: verify:arbitrage-type-label
 */

const ARBITRAGE_TYPES = Object.freeze([
  "price",
  "fx",
  "benefit",
  "limited",
  "resale",
]);

/**
 * User-facing labels (오차0 · UI hardcode map FORBIDDEN).
 * @type {Readonly<Record<string, string>>}
 */
const ARBITRAGE_TYPE_LABEL_KO = Object.freeze({
  price: "시세차익",
  fx: "환율차익",
  benefit: "혜택차익",
  limited: "한정차익",
  resale: "리셀차익",
});

/** v1 홈/수익 피드 허용 types (benefit/limited 숨김 · resale KR 제외) */
const V1_FEED_ARBITRAGE_TYPES = Object.freeze(["price", "fx"]);

/** Day-1 default · Admin may override */
const DEFAULT_TIME_SENSITIVE_HORIZON_SEC = 7200;

/** §51.3 · Day-1 rolling window */
const SELL_SUCCESS_WINDOW_DAYS_DEFAULT = 30;

/**
 * FX uses the same OpportunityCard + OpportunityPricing schema (별도 FX 카드 스키마 금지).
 */
const FX_USES_OPPORTUNITY_CARD_SCHEMA = true;
const FX_CARD_SCHEMA_ID = "opportunity-card.v1";
const FORBIDDEN_SEPARATE_FX_SCHEMA_NAMES = Object.freeze([
  "opportunity-fx",
  "fx-opportunity-card",
  "fx-card",
  "opportunity-fx-card",
]);

const OPPORTUNITY_CARD_TAGS = Object.freeze([
  "instant",
  "high_profit",
  "ai_pick",
  "beginner",
  "time_sensitive",
]);

function isArbitrageType(type) {
  return ARBITRAGE_TYPES.includes(type);
}

/**
 * @param {string} arbitrageType
 * @returns {string}
 */
function arbitrageTypeKo(arbitrageType) {
  if (!isArbitrageType(arbitrageType)) {
    throw new Error(`unknown arbitrageType: ${arbitrageType}`);
  }
  return ARBITRAGE_TYPE_LABEL_KO[arbitrageType];
}

function isV1FeedArbitrageType(arbitrageType) {
  return V1_FEED_ARBITRAGE_TYPES.includes(arbitrageType);
}

/**
 * @param {string|Date|number} value
 * @returns {number}
 */
function toEpochMs(value) {
  if (value instanceof Date) return value.getTime();
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const ms = Date.parse(String(value ?? ""));
  return Number.isFinite(ms) ? ms : NaN;
}

/**
 * tags.time_sensitive when staleAt−now ≤ horizon (default 7200s) or force.
 * Display/filter only — NEVER Rule/settlement input.
 *
 * @param {{
 *   staleAt: string|Date|number,
 *   now?: string|Date|number,
 *   forceTimeSensitive?: boolean,
 *   timeSensitiveHorizonSec?: number,
 * }} input
 * @returns {boolean}
 */
function shouldTagTimeSensitive(input) {
  if (input?.forceTimeSensitive === true) return true;
  const horizon = Number(
    input?.timeSensitiveHorizonSec ?? DEFAULT_TIME_SENSITIVE_HORIZON_SEC,
  );
  if (!Number.isFinite(horizon) || horizon < 0) {
    throw new Error("timeSensitiveHorizonSec must be >= 0");
  }
  const staleMs = toEpochMs(input?.staleAt);
  const nowMs = toEpochMs(input?.now ?? Date.now());
  if (!Number.isFinite(staleMs) || !Number.isFinite(nowMs)) return false;
  const remainSec = (staleMs - nowMs) / 1000;
  return remainSec <= horizon;
}

/**
 * @param {string[]|undefined|null} tags
 * @param {Parameters<typeof shouldTagTimeSensitive>[0]} opts
 * @returns {string[]}
 */
function withTimeSensitiveTag(tags, opts) {
  const next = Array.isArray(tags) ? tags.filter((t) => typeof t === "string") : [];
  if (shouldTagTimeSensitive(opts)) {
    if (!next.includes("time_sensitive")) next.push("time_sensitive");
  }
  return next;
}

/**
 * §51.3 HistoricalSpread display meta (Rule 입력 금지).
 *
 * @param {{
 *   sellSuccessRate?: number|null,
 *   sellSuccessWindowDays?: number|null,
 *   sellSuccessAsOf?: string|null,
 * }} input
 * @returns {{
 *   sellSuccessRate?: number,
 *   sellSuccessWindowDays?: number,
 *   sellSuccessAsOf?: string,
 * }}
 */
function projectSellSuccessMeta(input) {
  if (input?.sellSuccessRate == null || Number.isNaN(Number(input.sellSuccessRate))) {
    return {};
  }
  const rate = Number(input.sellSuccessRate);
  if (!(rate >= 0 && rate <= 100)) {
    throw new Error("sellSuccessRate must be 0..100");
  }
  const windowDays = Number(
    input.sellSuccessWindowDays ?? SELL_SUCCESS_WINDOW_DAYS_DEFAULT,
  );
  if (!Number.isInteger(windowDays) || windowDays < 1) {
    throw new Error("sellSuccessWindowDays must be integer >= 1");
  }
  const asOf = input.sellSuccessAsOf
    ? String(input.sellSuccessAsOf)
    : new Date().toISOString();
  if (!Number.isFinite(Date.parse(asOf))) {
    throw new Error("sellSuccessAsOf must be ISO-8601");
  }
  return {
    sellSuccessRate: rate,
    sellSuccessWindowDays: windowDays,
    sellSuccessAsOf: asOf,
  };
}

/**
 * Project §4.2a scan fields onto an opportunity card payload.
 * FX and price share the same field set (별도 FX 스키마 금지).
 *
 * @param {{
 *   arbitrageType: string,
 *   tags?: string[]|null,
 *   staleAt: string|Date|number,
 *   now?: string|Date|number,
 *   forceTimeSensitive?: boolean,
 *   timeSensitiveHorizonSec?: number,
 *   sellSuccessRate?: number|null,
 *   sellSuccessWindowDays?: number|null,
 *   sellSuccessAsOf?: string|null,
 * }} input
 */
function projectOpportunityScanFields(input) {
  const type = String(input?.arbitrageType ?? "");
  if (!isArbitrageType(type)) {
    throw new Error(`unknown arbitrageType: ${type}`);
  }
  const ko = arbitrageTypeKo(type);
  const tags = withTimeSensitiveTag(input.tags, {
    staleAt: input.staleAt,
    now: input.now,
    forceTimeSensitive: input.forceTimeSensitive,
    timeSensitiveHorizonSec: input.timeSensitiveHorizonSec,
  });
  const sell = projectSellSuccessMeta(input);
  return {
    arbitrageType: type,
    arbitrageTypeKo: ko,
    tags,
    ...sell,
  };
}

/**
 * available 공개 가드 — arbitrageTypeKo 필수 · 맵 일치 · v1 피드 type만.
 *
 * @param {{
 *   id?: string,
 *   status?: string,
 *   arbitrageType?: string,
 *   arbitrageTypeKo?: string,
 *   executionMode?: string,
 *   compareReady?: boolean,
 * }} card
 * @returns {{ ok: boolean, fails: string[] }}
 */
function assertAvailableScanProjection(card) {
  const fails = [];
  const id = String(card?.id ?? "?");
  if (card?.status !== "available") {
    return { ok: true, fails };
  }
  const type = String(card?.arbitrageType ?? "");
  if (!isArbitrageType(type)) {
    fails.push(`${id}: unknown arbitrageType`);
  } else if (!isV1FeedArbitrageType(type)) {
    fails.push(`${id}: arbitrageType ${type} not in v1 feed`);
  }
  const ko = String(card?.arbitrageTypeKo ?? "").trim();
  if (!ko) {
    fails.push(`${id}: arbitrageTypeKo required when status=available`);
  } else if (isArbitrageType(type) && ko !== ARBITRAGE_TYPE_LABEL_KO[type]) {
    fails.push(
      `${id}: arbitrageTypeKo want ${ARBITRAGE_TYPE_LABEL_KO[type]} got ${ko}`,
    );
  }
  if (card?.executionMode != null && card.executionMode !== "orchestrate") {
    fails.push(`${id}: executionMode must be orchestrate`);
  }
  return { ok: fails.length === 0, fails };
}

/**
 * @param {Array<object>} cards
 * @returns {{ ok: boolean, fails: string[], checked: number }}
 */
function assertAvailableCardsArbitrageTypeKo(cards) {
  const list = Array.isArray(cards) ? cards : [];
  /** @type {string[]} */
  const fails = [];
  let checked = 0;
  for (const card of list) {
    if (card?.status !== "available") continue;
    checked += 1;
    const r = assertAvailableScanProjection(card);
    if (!r.ok) fails.push(...r.fails);
  }
  return { ok: fails.length === 0, fails, checked };
}

/**
 * FX must not invent a parallel card schema.
 * @returns {{ ok: boolean, fails: string[] }}
 */
function assertFxUsesSameCardSchema() {
  const fails = [];
  if (FX_USES_OPPORTUNITY_CARD_SCHEMA !== true) {
    fails.push("FX_USES_OPPORTUNITY_CARD_SCHEMA must be true");
  }
  if (FX_CARD_SCHEMA_ID !== "opportunity-card.v1") {
    fails.push("FX_CARD_SCHEMA_ID must be opportunity-card.v1");
  }
  if (!V1_FEED_ARBITRAGE_TYPES.includes("fx")) {
    fails.push("v1 feed must include fx on same OpportunityCard");
  }
  // price + fx projections share identical key set
  const price = projectOpportunityScanFields({
    arbitrageType: "price",
    staleAt: new Date(Date.now() + 3600_000).toISOString(),
    now: Date.now(),
  });
  const fx = projectOpportunityScanFields({
    arbitrageType: "fx",
    staleAt: new Date(Date.now() + 3600_000).toISOString(),
    now: Date.now(),
  });
  const priceKeys = Object.keys(price).sort().join(",");
  const fxKeys = Object.keys(fx).sort().join(",");
  if (priceKeys !== fxKeys) {
    fails.push(`FX projection keys drift vs price: ${fxKeys} ≠ ${priceKeys}`);
  }
  return { ok: fails.length === 0, fails };
}

module.exports = {
  ARBITRAGE_TYPES,
  ARBITRAGE_TYPE_LABEL_KO,
  V1_FEED_ARBITRAGE_TYPES,
  DEFAULT_TIME_SENSITIVE_HORIZON_SEC,
  SELL_SUCCESS_WINDOW_DAYS_DEFAULT,
  FX_USES_OPPORTUNITY_CARD_SCHEMA,
  FX_CARD_SCHEMA_ID,
  FORBIDDEN_SEPARATE_FX_SCHEMA_NAMES,
  OPPORTUNITY_CARD_TAGS,
  isArbitrageType,
  arbitrageTypeKo,
  isV1FeedArbitrageType,
  shouldTagTimeSensitive,
  withTimeSensitiveTag,
  projectSellSuccessMeta,
  projectOpportunityScanFields,
  assertAvailableScanProjection,
  assertAvailableCardsArbitrageTypeKo,
  assertFxUsesSameCardSchema,
};
