/**
 * REL-407 Price Override Engine — 4레이어.
 * Nest/DB 밖에서도 동일 혼용 0 fixture 가 돈다.
 *
 * SOURCE_OBSERVED → OVERRIDE → EFFECTIVE → USER_VISIBLE
 * 유저 화면은 EFFECTIVE 만 읽는다. 관측가를 꾸미거나 덮어쓰지 않는다.
 * EFFECTIVE 공식 = 기존 computeOpportunityPricing (재발명 0).
 */
"use strict";

const path = require("path");
const {
  computeOpportunityPricing,
  DEFAULT_PLATFORM_MARGIN_PCT,
} = require(path.join(
  __dirname,
  "..",
  "market-intelligence",
  "src",
  "pricing-formula.cjs",
));

const PRICE_LAYERS = Object.freeze([
  "SOURCE_OBSERVED",
  "OVERRIDE",
  "EFFECTIVE",
  "USER_VISIBLE",
]);

const PRICE_LAYER_SET = new Set(PRICE_LAYERS);

const REASON_CODES = Object.freeze([
  "SOURCE_STALE",
  "FEED_GAP",
  "MANUAL_COMMERCIAL",
  "RISK_ADJUST",
  "OVERRIDE_CLEAR",
]);

const REASON_CODE_SET = new Set(REASON_CODES);

const SOURCE_ONLY_KEYS = Object.freeze([
  "nativeAmount",
  "nativeCurrency",
  "observedAt",
  "sourceBuyUsdt",
  "sourceSellUsdt",
  "source",
  "externalItemId",
  "adapterId",
]);

const OVERRIDE_ONLY_KEYS = Object.freeze([
  "adminBuyUsdt",
  "adminSellUsdt",
  "adminMarginPct",
  "useAdminOverride",
  "lastAdminEditBy",
  "reasonCode",
  "reason",
]);

const USER_VISIBLE_KEYS = Object.freeze([
  "buyMarketId",
  "buyMarketLabelKo",
  "buyPriceUsdt",
  "sellMarketId",
  "sellMarketLabelKo",
  "sellPriceUsdt",
  "grossSpreadUsdt",
  "costBufferUsdt",
  "platformMarginUsdt",
  "expectedProfitUsdt",
  "compareReady",
  "capitalBand",
  "pricingSource",
]);

const REASON_MIN = 10;

function normalizeLayer(raw) {
  const token = String(raw || "").trim();
  if (!PRICE_LAYER_SET.has(token)) {
    return { ok: false, error: "PRICE_LAYER_UNKNOWN" };
  }
  return { ok: true, layer: token };
}

function requireReason(reason) {
  const text = String(reason || "").trim();
  if (text.length < REASON_MIN) {
    return { ok: false, error: "PRICE_OVERRIDE_REASON_MIN" };
  }
  return { ok: true, reason: text };
}

function requireReasonCode(raw, engaged) {
  const code = String(raw || "").trim();
  if (!REASON_CODE_SET.has(code)) {
    return { ok: false, error: "PRICE_OVERRIDE_REASON_CODE_UNKNOWN" };
  }
  if (engaged === true && code === "OVERRIDE_CLEAR") {
    return { ok: false, error: "PRICE_OVERRIDE_REASON_CODE_MISMATCH" };
  }
  if (engaged !== true && code !== "OVERRIDE_CLEAR") {
    return { ok: false, error: "PRICE_OVERRIDE_REASON_CODE_MISMATCH" };
  }
  return { ok: true, reasonCode: code };
}

function pickKeys(src, keys) {
  /** @type {Record<string, unknown>} */
  const out = {};
  if (!src || typeof src !== "object") return out;
  for (const key of keys) {
    if (Object.prototype.hasOwnProperty.call(src, key) && src[key] != null) {
      out[key] = src[key];
    }
  }
  return out;
}

function hasAnyKey(src, keys) {
  if (!src || typeof src !== "object") return false;
  return keys.some((key) => Object.prototype.hasOwnProperty.call(src, key));
}

/**
 * USER_VISIBLE 이 SOURCE/OVERRIDE 키를 들고 있으면 혼용.
 * @param {unknown} userVisible
 */
function assertNoLayerMix(userVisible) {
  if (!userVisible || typeof userVisible !== "object") {
    return { ok: false, error: "USER_VISIBLE_INVALID" };
  }
  const leaked = [];
  for (const key of SOURCE_ONLY_KEYS) {
    if (Object.prototype.hasOwnProperty.call(userVisible, key)) leaked.push(key);
  }
  for (const key of OVERRIDE_ONLY_KEYS) {
    if (Object.prototype.hasOwnProperty.call(userVisible, key)) leaked.push(key);
  }
  if (leaked.length) {
    return { ok: false, error: "PRICE_LAYER_MIX", leaked };
  }
  return { ok: true };
}

function projectUserVisible(effective) {
  const userVisible = pickKeys(effective, USER_VISIBLE_KEYS);
  const mix = assertNoLayerMix(userVisible);
  if (!mix.ok) return mix;
  return { ok: true, userVisible };
}

function normalizeSource(raw) {
  const src = raw && typeof raw === "object" ? raw : {};
  const buyPriceUsdt =
    src.buyPriceUsdt != null && String(src.buyPriceUsdt) !== ""
      ? String(src.buyPriceUsdt)
      : src.sourceBuyUsdt != null
        ? String(src.sourceBuyUsdt)
        : null;
  const sellPriceUsdt =
    src.sellPriceUsdt != null && String(src.sellPriceUsdt) !== ""
      ? String(src.sellPriceUsdt)
      : src.sourceSellUsdt != null
        ? String(src.sourceSellUsdt)
        : null;
  const available = buyPriceUsdt != null && sellPriceUsdt != null;
  return {
    layer: "SOURCE_OBSERVED",
    available,
    buyMarketId: src.buyMarketId != null ? String(src.buyMarketId) : null,
    sellMarketId: src.sellMarketId != null ? String(src.sellMarketId) : null,
    buyPriceUsdt,
    sellPriceUsdt,
    sourceBuyUsdt: buyPriceUsdt,
    sourceSellUsdt: sellPriceUsdt,
    nativeAmount: src.nativeAmount != null ? String(src.nativeAmount) : null,
    nativeCurrency: src.nativeCurrency != null ? String(src.nativeCurrency) : null,
    observedAt: src.observedAt != null ? String(src.observedAt) : null,
    source: src.source != null ? String(src.source) : "listing",
    externalItemId:
      src.externalItemId != null ? String(src.externalItemId) : null,
  };
}

function normalizeOverride(raw) {
  const src = raw && typeof raw === "object" ? raw : {};
  const engaged = src.engaged === true || src.useAdminOverride === true;
  return {
    layer: "OVERRIDE",
    engaged,
    useAdminOverride: engaged,
    adminBuyUsdt:
      src.adminBuyUsdt != null && String(src.adminBuyUsdt) !== ""
        ? String(src.adminBuyUsdt)
        : null,
    adminSellUsdt:
      src.adminSellUsdt != null && String(src.adminSellUsdt) !== ""
        ? String(src.adminSellUsdt)
        : null,
    adminMarginPct:
      src.adminMarginPct != null && String(src.adminMarginPct) !== ""
        ? String(src.adminMarginPct)
        : null,
    reasonCode: src.reasonCode != null ? String(src.reasonCode) : null,
    lastAdminEditBy:
      src.lastAdminEditBy != null ? String(src.lastAdminEditBy) : null,
  };
}

/**
 * @param {{
 *   sourceObserved?: object,
 *   override?: object,
 *   compute?: {
 *     buyMarketId?: string,
 *     sellMarketId?: string,
 *     requiredCapitalUsdt?: string,
 *     platformMarginPct?: string,
 *     gradeMismatch?: boolean,
 *     imageMissing?: boolean,
 *   },
 * }} input
 */
function resolveLayers(input) {
  const body = input && typeof input === "object" ? input : {};
  const source = normalizeSource(body.sourceObserved);
  const override = normalizeOverride(body.override);
  const compute = body.compute && typeof body.compute === "object"
    ? body.compute
    : {};

  const buyMarketId = String(
    compute.buyMarketId || source.buyMarketId || "",
  );
  const sellMarketId = String(
    compute.sellMarketId || source.sellMarketId || "",
  );
  if (!buyMarketId || !sellMarketId) {
    return { ok: false, error: "PRICE_MARKETS_REQUIRED" };
  }

  let buyPriceUsdt;
  let sellPriceUsdt;
  if (override.engaged) {
    buyPriceUsdt = override.adminBuyUsdt || source.buyPriceUsdt;
    sellPriceUsdt = override.adminSellUsdt || source.sellPriceUsdt;
    if (buyPriceUsdt == null || sellPriceUsdt == null) {
      return { ok: false, error: "OVERRIDE_PRICE_REQUIRED" };
    }
  } else {
    if (!source.available) {
      return { ok: false, error: "SOURCE_UNAVAILABLE" };
    }
    buyPriceUsdt = source.buyPriceUsdt;
    sellPriceUsdt = source.sellPriceUsdt;
  }

  const effective = computeOpportunityPricing({
    buyMarketId,
    sellMarketId,
    buyPriceUsdt,
    sellPriceUsdt,
    platformMarginPct:
      compute.platformMarginPct || DEFAULT_PLATFORM_MARGIN_PCT,
    adminMarginPct: override.adminMarginPct || undefined,
    requiredCapitalUsdt: compute.requiredCapitalUsdt || buyPriceUsdt,
    useAdminOverride: override.engaged,
    gradeMismatch: Boolean(compute.gradeMismatch),
    imageMissing: Boolean(compute.imageMissing),
  });

  const projected = projectUserVisible(effective);
  if (!projected.ok) return projected;

  if (hasAnyKey(projected.userVisible, SOURCE_ONLY_KEYS)) {
    return { ok: false, error: "PRICE_LAYER_MIX" };
  }

  return {
    ok: true,
    SOURCE_OBSERVED: source,
    OVERRIDE: override,
    EFFECTIVE: effective,
    USER_VISIBLE: projected.userVisible,
  };
}

function assertSourceUntouched(before, after) {
  if (!before || !after) return { ok: false, error: "SOURCE_COMPARE_INVALID" };
  const keys = [
    "buyPriceUsdt",
    "sellPriceUsdt",
    "nativeAmount",
    "observedAt",
    "source",
  ];
  for (const key of keys) {
    if (String(before[key] ?? "") !== String(after[key] ?? "")) {
      return { ok: false, error: "SOURCE_MUTATED", key };
    }
  }
  return { ok: true };
}

module.exports = {
  PRICE_LAYERS,
  REASON_CODES,
  SOURCE_ONLY_KEYS,
  OVERRIDE_ONLY_KEYS,
  USER_VISIBLE_KEYS,
  REASON_MIN,
  normalizeLayer,
  requireReason,
  requireReasonCode,
  assertNoLayerMix,
  projectUserVisible,
  normalizeSource,
  normalizeOverride,
  resolveLayers,
  assertSourceUntouched,
  computeOpportunityPricing,
  DEFAULT_PLATFORM_MARGIN_PCT,
};
