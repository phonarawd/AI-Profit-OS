/**
 * Engine §0.0.5 — capitalBand enum · seed ratios · filter chip label map.
 * CI: verify:capital-tier-catalog
 */

const { cmpAmount, assertAmount } = require("./money.cjs");

const CAPITAL_BANDS = Object.freeze([
  "micro",
  "small",
  "mid",
  "high",
  "whale",
]);

/** Rank for ≤ maxCapitalBand guards (membership · participate) */
const CAPITAL_BAND_RANK = Object.freeze({
  micro: 0,
  small: 1,
  mid: 2,
  high: 3,
  whale: 4,
});

/** Inclusive lower bounds (USDT decimal strings) */
const BAND_MIN = Object.freeze({
  micro: "10",
  small: "100",
  mid: "1000",
  high: "10000",
  whale: "100000",
});

/**
 * Inclusive upper bounds · whale has no ceiling (null).
 * micro: 10~99 · small: 100~999 · mid: 1000~9999 · high: 10000~99999
 */
const BAND_MAX = Object.freeze({
  micro: "99",
  small: "999",
  mid: "9999",
  high: "99999",
  whale: null,
});

/** User/Admin filter chip labels (ko) — Engine Owns · UI layout Owns=UI §5.3b */
const CAPITAL_BAND_LABEL_KO = Object.freeze({
  micro: "소액(10~)",
  small: "입문(100~)",
  mid: "중급(1천~)",
  high: "고액(1만~)",
  whale: "웨일(10만~)",
});

/** Category filter chips (ko) — keys align Asset category enum */
const CATEGORY_FILTER_CHIPS = Object.freeze([
  Object.freeze({ key: "all", labelKo: "전체", category: null }),
  Object.freeze({ key: "watch", labelKo: "시계", category: "watch" }),
  Object.freeze({
    key: "trading_card",
    labelKo: "카드",
    category: "trading_card",
  }),
  Object.freeze({
    key: "luxury_bag",
    labelKo: "가방",
    category: "luxury_bag",
  }),
]);

/**
 * Capital filter chips (ko).
 * `ultra` = 초고가 · capitalBand ∈ {high, whale} (not a 6th enum value).
 */
const CAPITAL_FILTER_CHIPS = Object.freeze([
  Object.freeze({
    key: "micro",
    labelKo: CAPITAL_BAND_LABEL_KO.micro,
    capitalBands: Object.freeze(["micro"]),
  }),
  Object.freeze({
    key: "small",
    labelKo: CAPITAL_BAND_LABEL_KO.small,
    capitalBands: Object.freeze(["small"]),
  }),
  Object.freeze({
    key: "mid",
    labelKo: CAPITAL_BAND_LABEL_KO.mid,
    capitalBands: Object.freeze(["mid"]),
  }),
  Object.freeze({
    key: "high",
    labelKo: CAPITAL_BAND_LABEL_KO.high,
    capitalBands: Object.freeze(["high"]),
  }),
  Object.freeze({
    key: "whale",
    labelKo: CAPITAL_BAND_LABEL_KO.whale,
    capitalBands: Object.freeze(["whale"]),
  }),
  Object.freeze({
    key: "ultra",
    labelKo: "초고가",
    capitalBands: Object.freeze(["high", "whale"]),
  }),
]);

/**
 * Catalog seed ratio locks (v1 · 오차0).
 * micro+small ≥ 40% · mid ≥ 25% · high+whale ≤ 35%
 */
const SEED_RATIO_LOCK = Object.freeze({
  microSmallMinPct: 40,
  midMinPct: 25,
  highWhaleMaxPct: 35,
});

/** Deposit UX quick amounts (USDT) — both groups always shown */
const DEPOSIT_QUICK_SMALL_USDT = Object.freeze(["10", "50", "100", "500"]);
const DEPOSIT_QUICK_WHALE_USDT = Object.freeze([
  "10000",
  "50000",
  "100000",
  "250000",
  "500000",
]);

const ONBOARDING_LINE_KO =
  "시세가 다른 두 시장의 차이만큼 수익이 나요. 소액부터 시작할 수 있어요.";

function isCapitalBand(id) {
  return CAPITAL_BANDS.includes(id);
}

/**
 * @param {string} requiredCapitalUsdt
 * @returns {'micro'|'small'|'mid'|'high'|'whale'}
 */
function resolveCapitalBand(requiredCapitalUsdt) {
  const c = assertAmount(String(requiredCapitalUsdt), "requiredCapitalUsdt");
  if (cmpAmount(c, BAND_MIN.whale) >= 0) return "whale";
  if (cmpAmount(c, BAND_MIN.high) >= 0) return "high";
  if (cmpAmount(c, BAND_MIN.mid) >= 0) return "mid";
  if (cmpAmount(c, BAND_MIN.small) >= 0) return "small";
  // below micro floor still labeled micro for Admin filter (seed guard elsewhere)
  return "micro";
}

/**
 * @param {string} band
 */
function capitalBandLabelKo(band) {
  if (!isCapitalBand(band)) throw new Error(`unknown capitalBand: ${band}`);
  return CAPITAL_BAND_LABEL_KO[band];
}

/**
 * opportunity.capitalBand ≤ user.maxCapitalBand
 * @param {string} band
 * @param {string} maxBand
 */
function capitalBandAtMost(band, maxBand) {
  if (!isCapitalBand(band) || !isCapitalBand(maxBand)) {
    throw new Error("capitalBandAtMost: invalid band");
  }
  return CAPITAL_BAND_RANK[band] <= CAPITAL_BAND_RANK[maxBand];
}

/**
 * Normalize counts from array of bands or { capitalBand } rows or band→count map.
 * @param {Record<string, number>|Array<string|{capitalBand?: string}>} input
 * @returns {Record<string, number>}
 */
function tallyCapitalBands(input) {
  /** @type {Record<string, number>} */
  const counts = { micro: 0, small: 0, mid: 0, high: 0, whale: 0 };
  if (Array.isArray(input)) {
    for (const row of input) {
      const band = typeof row === "string" ? row : row?.capitalBand;
      if (!isCapitalBand(band)) {
        throw new Error(`tallyCapitalBands: unknown band ${band}`);
      }
      counts[band] += 1;
    }
    return counts;
  }
  if (input && typeof input === "object") {
    for (const band of CAPITAL_BANDS) {
      const n = Number(input[band] ?? 0);
      if (!Number.isFinite(n) || n < 0 || !Number.isInteger(n)) {
        throw new Error(`tallyCapitalBands: bad count for ${band}`);
      }
      counts[band] = n;
    }
    return counts;
  }
  throw new Error("tallyCapitalBands: expected array or count map");
}

/**
 * Assert v1 catalog seed ratios. Empty catalog → fail (cannot claim ≥40%).
 * @param {Record<string, number>|Array<string|{capitalBand?: string}>} input
 * @returns {{
 *   ok: boolean,
 *   total: number,
 *   counts: Record<string, number>,
 *   ratiosPct: { microSmall: number, mid: number, highWhale: number },
 *   fails: string[]
 * }}
 */
function assertCatalogSeedRatios(input) {
  const counts = tallyCapitalBands(input);
  const total =
    counts.micro + counts.small + counts.mid + counts.high + counts.whale;
  /** @type {string[]} */
  const fails = [];
  if (total <= 0) {
    fails.push("catalog empty — seed ratios undefined");
    return {
      ok: false,
      total: 0,
      counts,
      ratiosPct: { microSmall: 0, mid: 0, highWhale: 0 },
      fails,
    };
  }

  const microSmall = counts.micro + counts.small;
  const mid = counts.mid;
  const highWhale = counts.high + counts.whale;
  const microSmallPct = (microSmall * 100) / total;
  const midPct = (mid * 100) / total;
  const highWhalePct = (highWhale * 100) / total;

  if (microSmallPct + 1e-9 < SEED_RATIO_LOCK.microSmallMinPct) {
    fails.push(
      `micro+small ${microSmallPct.toFixed(2)}% < ${SEED_RATIO_LOCK.microSmallMinPct}%`,
    );
  }
  if (midPct + 1e-9 < SEED_RATIO_LOCK.midMinPct) {
    fails.push(`mid ${midPct.toFixed(2)}% < ${SEED_RATIO_LOCK.midMinPct}%`);
  }
  if (highWhalePct - 1e-9 > SEED_RATIO_LOCK.highWhaleMaxPct) {
    fails.push(
      `high+whale ${highWhalePct.toFixed(2)}% > ${SEED_RATIO_LOCK.highWhaleMaxPct}%`,
    );
  }

  return {
    ok: fails.length === 0,
    total,
    counts,
    ratiosPct: {
      microSmall: microSmallPct,
      mid: midPct,
      highWhale: highWhalePct,
    },
    fails,
  };
}

module.exports = {
  CAPITAL_BANDS,
  CAPITAL_BAND_RANK,
  BAND_MIN,
  BAND_MAX,
  CAPITAL_BAND_LABEL_KO,
  CATEGORY_FILTER_CHIPS,
  CAPITAL_FILTER_CHIPS,
  SEED_RATIO_LOCK,
  DEPOSIT_QUICK_SMALL_USDT,
  DEPOSIT_QUICK_WHALE_USDT,
  ONBOARDING_LINE_KO,
  isCapitalBand,
  resolveCapitalBand,
  capitalBandLabelKo,
  capitalBandAtMost,
  tallyCapitalBands,
  assertCatalogSeedRatios,
};
