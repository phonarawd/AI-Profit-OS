/**
 * Engine §51.12 + §51.15 — Adapter Matching Failure KPI
 * Grade mismatch · SKU fail rate · compareReady=false ratio · stale>TTL
 * Simulation S4 input = adapterMatchFailureRate
 * Day-1 yahoo_jp auto-publish = 0
 */

const { evaluateCardListingMatch } = require("./card-match.cjs");
const { evaluateWatchListingMatch } = require("./watch-match.cjs");
const { evaluateBagListingMatch } = require("./bag-match.cjs");

/** §51.15 thresholds (v1 seed) */
const KPI_THRESHOLDS = Object.freeze({
  /** SKU match fail rate >15% / 24h → Admin adapter alert · reduce auto-publish */
  skuMatchFailRateMax: 0.15,
  /** compareReady=false ratio >40% catalog → seed review queue */
  compareReadyFalseRatioMax: 0.4,
  /** rolling window hours */
  windowHours: 24,
  /** Simulation S4: adapterMatchFailureRate ≤ 15% */
  s4AdapterMatchFailureRateMax: 0.15,
});

/** Day-1 auto-publish never uses yahoo_jp (§0.0.1a · §51.15 yahoo0) */
const DAY1_AUTO_PUBLISH_YAHOO_JP = false;

/**
 * @typedef {'sku_exact_fail'|'grade_mismatch'|'fuzzy_alone'|'ok'|'unknown'} MatchFailReason
 */

/**
 * @typedef {object} MatchAttempt
 * @property {string} [adapterId]
 * @property {string} [category]  watch|trading_card|luxury_bag
 * @property {boolean} matched  true ⇒ SKU match success (canAutoPublish)
 * @property {MatchFailReason} [reason]
 * @property {boolean} [gradeMismatch]
 * @property {string|number|Date} [at]  ISO or epoch
 */

/**
 * @param {string|number|Date|null|undefined} v
 * @returns {number}
 */
function toEpochMs(v) {
  if (v == null) return NaN;
  if (typeof v === "number") return v;
  if (v instanceof Date) return v.getTime();
  const t = Date.parse(String(v));
  return Number.isFinite(t) ? t : NaN;
}

/**
 * Clamp rate to [0,1].
 * @param {number} n
 * @param {number} d
 * @returns {number}
 */
function safeRate(n, d) {
  if (!Number.isFinite(n) || !Number.isFinite(d) || d <= 0) return 0;
  const r = n / d;
  if (r < 0) return 0;
  if (r > 1) return 1;
  return r;
}

/**
 * Evaluate a listing→asset SKU match attempt (all verticals + §51.12 grade).
 * @param {{
 *   category: 'watch'|'trading_card'|'luxury_bag'|string,
 *   assetMeta: object,
 *   listingMeta?: object,
 *   listingTitle?: string,
 *   listingCaption?: string,
 *   adapterId?: string,
 *   at?: string,
 * }} input
 * @returns {MatchAttempt & { canAutoPublish: boolean, detail: object }}
 */
function evaluateSkuMatchAttempt(input) {
  const category = String(input.category || "");
  const at = input.at || new Date().toISOString();
  const adapterId = input.adapterId || "ebay";

  let detail;
  if (category === "trading_card") {
    detail = evaluateCardListingMatch({
      assetMeta: input.assetMeta || {},
      listingMeta: input.listingMeta,
      listingTitle: input.listingTitle,
      listingCaption: input.listingCaption,
    });
  } else if (category === "watch") {
    detail = evaluateWatchListingMatch({
      assetMeta: input.assetMeta || {},
      listingMeta: input.listingMeta,
    });
  } else if (category === "luxury_bag") {
    detail = evaluateBagListingMatch({
      assetMeta: input.assetMeta || {},
      listingMeta: input.listingMeta,
    });
  } else {
    return {
      adapterId,
      category,
      matched: false,
      reason: "unknown",
      gradeMismatch: false,
      at,
      canAutoPublish: false,
      detail: { error: "unknown_category" },
    };
  }

  /** @type {MatchFailReason} */
  let reason = "ok";
  if (detail.gradeMismatch) reason = "grade_mismatch";
  else if (detail.fuzzyAloneForbidden) reason = "fuzzy_alone";
  else if (!detail.canAutoPublish) reason = "sku_exact_fail";

  return {
    adapterId,
    category,
    matched: detail.canAutoPublish === true,
    reason,
    gradeMismatch: Boolean(detail.gradeMismatch),
    at,
    canAutoPublish: detail.canAutoPublish === true,
    detail,
  };
}

/**
 * Filter attempts to rolling window (default 24h).
 * @param {MatchAttempt[]} attempts
 * @param {{ now?: number|string|Date, windowHours?: number }} [opts]
 * @returns {MatchAttempt[]}
 */
function filterAttemptsInWindow(attempts, opts = {}) {
  const nowMs = toEpochMs(opts.now ?? Date.now());
  const hours = opts.windowHours ?? KPI_THRESHOLDS.windowHours;
  const windowMs = hours * 3600_000;
  const list = Array.isArray(attempts) ? attempts : [];
  return list.filter((a) => {
    const t = toEpochMs(a.at ?? nowMs);
    if (!Number.isFinite(t) || !Number.isFinite(nowMs)) return true;
    return nowMs - t <= windowMs && t <= nowMs + 60_000;
  });
}

/**
 * SKU match fail rate in window (§51.15).
 * Fail = !matched (includes gradeMismatch · fuzzyAlone · exact fail).
 * @param {MatchAttempt[]} attempts
 * @param {{ now?: number|string|Date, windowHours?: number, adapterId?: string }} [opts]
 * @returns {{ rate: number, attempts: number, failures: number, gradeMismatchCount: number }}
 */
function computeSkuMatchFailureRate(attempts, opts = {}) {
  let windowed = filterAttemptsInWindow(attempts, opts);
  if (opts.adapterId) {
    windowed = windowed.filter(
      (a) => !a.adapterId || a.adapterId === opts.adapterId,
    );
  }
  const attemptsN = windowed.length;
  let failures = 0;
  let gradeMismatchCount = 0;
  for (const a of windowed) {
    if (a.matched !== true) failures += 1;
    if (a.gradeMismatch === true || a.reason === "grade_mismatch") {
      gradeMismatchCount += 1;
    }
  }
  return {
    rate: safeRate(failures, attemptsN),
    attempts: attemptsN,
    failures,
    gradeMismatchCount,
  };
}

/**
 * compareReady=false ratio over catalog/opportunity sample.
 * @param {Array<{ compareReady?: boolean }>} items
 * @returns {{ rate: number, total: number, falseCount: number }}
 */
function computeCompareReadyFalseRatio(items) {
  const list = Array.isArray(items) ? items : [];
  const total = list.length;
  let falseCount = 0;
  for (const it of list) {
    if (it.compareReady !== true) falseCount += 1;
  }
  return {
    rate: safeRate(falseCount, total),
    total,
    falseCount,
  };
}

/**
 * Stale listing >TTL (§51.15) — listing.staleAt < now.
 * @param {Array<{ adapterId?: string, staleAt?: string|Date|number, id?: string }>} listings
 * @param {{ now?: number|string|Date }} [opts]
 * @returns {{
 *   staleCount: number,
 *   byAdapter: Record<string, number>,
 *   staleListingIds: string[],
 *   anyAdapterRed: boolean,
 * }}
 */
function evaluateStaleListings(listings, opts = {}) {
  const nowMs = toEpochMs(opts.now ?? Date.now());
  const list = Array.isArray(listings) ? listings : [];
  /** @type {Record<string, number>} */
  const byAdapter = {};
  /** @type {string[]} */
  const staleListingIds = [];
  let staleCount = 0;
  for (const L of list) {
    const staleMs = toEpochMs(L.staleAt);
    if (!Number.isFinite(staleMs) || !Number.isFinite(nowMs)) continue;
    if (staleMs < nowMs) {
      staleCount += 1;
      const aid = String(L.adapterId || "unknown");
      byAdapter[aid] = (byAdapter[aid] || 0) + 1;
      if (L.id) staleListingIds.push(String(L.id));
    }
  }
  return {
    staleCount,
    byAdapter,
    staleListingIds,
    anyAdapterRed: staleCount > 0,
  };
}

/**
 * @typedef {object} AdapterKpiAlert
 * @property {'sku_match_fail'|'compare_ready_false'|'stale_listing'} kind
 * @property {string} messageKo
 * @property {'yellow'|'red'} severity
 * @property {string} [adapterId]
 */

/**
 * Full §51.15 evaluation → rates · alerts · auto-publish · S4 input.
 * @param {{
 *   attempts?: MatchAttempt[],
 *   catalog?: Array<{ compareReady?: boolean }>,
 *   listings?: Array<{ adapterId?: string, staleAt?: string|Date|number, id?: string }>,
 *   adapterId?: string,
 *   now?: number|string|Date,
 * }} input
 */
function evaluateAdapterMatchingKpi(input = {}) {
  const sku = computeSkuMatchFailureRate(input.attempts || [], {
    now: input.now,
    adapterId: input.adapterId,
  });
  const compare = computeCompareReadyFalseRatio(input.catalog || []);
  const stale = evaluateStaleListings(input.listings || [], { now: input.now });

  /** @type {AdapterKpiAlert[]} */
  const alerts = [];

  const skuOver = sku.attempts > 0 && sku.rate > KPI_THRESHOLDS.skuMatchFailRateMax;
  if (skuOver) {
    alerts.push({
      kind: "sku_match_fail",
      severity: "yellow",
      adapterId: input.adapterId,
      messageKo: `SKU 매칭 실패율 ${(sku.rate * 100).toFixed(1)}% (24시간) · 자동 공개 축소`,
    });
  }

  const compareOver =
    compare.total > 0 &&
    compare.rate > KPI_THRESHOLDS.compareReadyFalseRatioMax;
  if (compareOver) {
    alerts.push({
      kind: "compare_ready_false",
      severity: "yellow",
      messageKo: `비교 준비 미달 ${(compare.rate * 100).toFixed(1)}% · 시드 점검 대기열`,
    });
  }

  if (stale.anyAdapterRed) {
    const aids = Object.keys(stale.byAdapter);
    for (const aid of aids) {
      alerts.push({
        kind: "stale_listing",
        severity: "red",
        adapterId: aid,
        messageKo: `만료 시세 ${stale.byAdapter[aid]}건 · 수집기 적색 · 만료 기회 숨김`,
      });
    }
  }

  const reduceAutoPublish = skuOver;
  const seedReviewQueue = compareOver;
  const hideStaleOpps = stale.anyAdapterRed;
  const top2Red = stale.anyAdapterRed;

  /** Simulation S4 field — same as SKU match fail rate when sampled */
  const adapterMatchFailureRate = sku.rate;

  return {
    thresholds: KPI_THRESHOLDS,
    windowHours: KPI_THRESHOLDS.windowHours,
    skuMatchFailureRate: sku.rate,
    skuAttempts: sku.attempts,
    skuFailures: sku.failures,
    gradeMismatchCount: sku.gradeMismatchCount,
    compareReadyFalseRatio: compare.rate,
    compareReadyFalseCount: compare.falseCount,
    catalogTotal: compare.total,
    stale,
    alerts,
    reduceAutoPublish,
    seedReviewQueue,
    hideStaleOpps,
    top2Red,
    /** §51.4 SimulationReport.adapterMatchFailureRate */
    adapterMatchFailureRate,
    day1AutoPublishYahooJp: DAY1_AUTO_PUBLISH_YAHOO_JP,
  };
}

/**
 * Simulation S4 gate (§51.4): adapterMatchFailureRate ≤ 15%.
 * @param {number} adapterMatchFailureRate
 * @returns {{ pass: boolean, threshold: number, rate: number, failAction: 'adapter_alert' }}
 */
function evaluateSimulationS4(adapterMatchFailureRate) {
  const rate = Number(adapterMatchFailureRate);
  const threshold = KPI_THRESHOLDS.s4AdapterMatchFailureRateMax;
  const safe = Number.isFinite(rate) ? Math.min(1, Math.max(0, rate)) : 1;
  return {
    pass: safe <= threshold,
    threshold,
    rate: safe,
    failAction: "adapter_alert",
  };
}

/**
 * Build SimulationReport fragment from KPI eval (S4 선행 입력).
 * @param {ReturnType<typeof evaluateAdapterMatchingKpi>} kpi
 */
function simulationS4InputFromKpi(kpi) {
  const rate = kpi.adapterMatchFailureRate;
  const gate = evaluateSimulationS4(rate);
  return {
    adapterMatchFailureRate: rate,
    s4: gate,
  };
}

/**
 * Health status hint from KPI (does not override ingest error=red).
 * @param {ReturnType<typeof evaluateAdapterMatchingKpi>} kpi
 * @param {string} [adapterId]
 * @returns {'green'|'yellow'|'red'|'unknown'}
 */
function healthStatusFromKpi(kpi, adapterId) {
  const staleForAdapter =
    adapterId && kpi.stale?.byAdapter?.[adapterId]
      ? kpi.stale.byAdapter[adapterId] > 0
      : kpi.stale?.anyAdapterRed;
  if (staleForAdapter) return "red";
  const hasYellow = (kpi.alerts || []).some(
    (a) =>
      a.severity === "yellow" &&
      (!adapterId || !a.adapterId || a.adapterId === adapterId),
  );
  if (hasYellow) return "yellow";
  if ((kpi.skuAttempts || 0) === 0 && (kpi.catalogTotal || 0) === 0) {
    return "unknown";
  }
  return "green";
}

module.exports = {
  KPI_THRESHOLDS,
  DAY1_AUTO_PUBLISH_YAHOO_JP,
  toEpochMs,
  safeRate,
  evaluateSkuMatchAttempt,
  filterAttemptsInWindow,
  computeSkuMatchFailureRate,
  computeCompareReadyFalseRatio,
  evaluateStaleListings,
  evaluateAdapterMatchingKpi,
  evaluateSimulationS4,
  simulationS4InputFromKpi,
  healthStatusFromKpi,
};
