/**
 * Engine §0.0.5.1 — balance-aware feed classification
 * Owns: affordable / nearMiss / lockedHigh · suggestDepositUsdt · nearMissCap resolve · sort
 * Money Owns: principalUsdt ledger read · deposit deeplink
 * Admin Owns: user_opportunity_override · execution-policy feed.nearMissCapUsdt
 * UI Owns: card/CTA copy §5.3a
 * CI: verify:balance-aware-feed
 */

const {
  assertAmount,
  parseAmount,
  formatAmount,
  addAmount,
  subAmount,
  cmpAmount,
  maxAmount,
  mulAmount,
} = require("./money.cjs");

const CLASSIFICATION_OWNER = "engine:§0.0.5.1";
const FEED_BUCKETS = Object.freeze(["affordable", "nearMiss", "lockedHigh"]);
/** Day-1 suggest tick = 1 USDT */
const SUGGEST_TICK_USDT = "1";
/** Day-1 floor when policy.feed.nearMissCapUsdt absent */
const NEAR_MISS_CAP_FLOOR_USDT = "50";
const NEAR_MISS_CAP_PRINCIPAL_PCT = "0.25";
/** Sort rank · lower first */
const BUCKET_RANK = Object.freeze({
  affordable: 0,
  nearMiss: 1,
  lockedHigh: 2,
});

/**
 * ceil_to_tick(amount) — Day-1 tick = 1 USDT · min display 1 when amount > 0
 * @param {string} amountUsdt
 * @param {string} [tickUsdt]
 * @returns {string}
 */
function ceilToTick(amountUsdt, tickUsdt = SUGGEST_TICK_USDT) {
  const n = parseAmount(assertAmount(String(amountUsdt), "amountUsdt"));
  const tick = parseAmount(assertAmount(String(tickUsdt), "tickUsdt"));
  if (tick <= 0n) throw new Error("tickUsdt must be > 0");
  if (n <= 0n) return "0";
  const q = (n + tick - 1n) / tick;
  return formatAmount(q * tick);
}

/**
 * suggestDepositUsdt = ceil_to_tick(requiredCapitalUsdt − principalUsdt)
 * principal ≥ required → 0 (CTA hide)
 * @param {string} requiredCapitalUsdt
 * @param {string} principalUsdt
 * @returns {string}
 */
function computeSuggestDepositUsdt(requiredCapitalUsdt, principalUsdt) {
  const required = assertAmount(String(requiredCapitalUsdt), "requiredCapitalUsdt");
  const principal = assertAmount(String(principalUsdt), "principalUsdt");
  if (cmpAmount(required, principal) <= 0) return "0";
  const gap = subAmount(required, principal);
  const ceiled = ceilToTick(gap, SUGGEST_TICK_USDT);
  // 최소 표시 1
  return cmpAmount(ceiled, "0") <= 0 ? "1" : ceiled;
}

/**
 * nearMissCap Day-1 default = max(50, principalUsdt × 0.25)
 * Policy SSOT = execution-policy.feed.nearMissCapUsdt (absolute USDT when set)
 * @param {string} principalUsdt
 * @param {string|null|undefined} policyNearMissCapUsdt
 * @returns {string}
 */
function resolveNearMissCapUsdt(principalUsdt, policyNearMissCapUsdt) {
  const principal = assertAmount(String(principalUsdt ?? "0"), "principalUsdt");
  if (
    policyNearMissCapUsdt != null &&
    String(policyNearMissCapUsdt).trim() !== ""
  ) {
    return assertAmount(
      String(policyNearMissCapUsdt).trim(),
      "feed.nearMissCapUsdt",
    );
  }
  return maxAmount(
    NEAR_MISS_CAP_FLOOR_USDT,
    mulAmount(principal, NEAR_MISS_CAP_PRINCIPAL_PCT),
  );
}

/**
 * @param {{
 *   principalUsdt: string,
 *   requiredCapitalUsdt: string,
 *   nearMissCapUsdt: string,
 *   forceShow?: boolean,
 * }} input
 * @returns {{
 *   bucket: 'affordable'|'nearMiss'|'lockedHigh',
 *   suggestDepositUsdt: string,
 *   forceShowPromoted: boolean,
 * }}
 */
function classifyAffordability(input) {
  const principal = assertAmount(String(input.principalUsdt), "principalUsdt");
  const required = assertAmount(
    String(input.requiredCapitalUsdt),
    "requiredCapitalUsdt",
  );
  const cap = assertAmount(String(input.nearMissCapUsdt), "nearMissCapUsdt");
  const forceShow = input.forceShow === true;
  const suggestDepositUsdt = computeSuggestDepositUsdt(required, principal);

  if (cmpAmount(required, principal) <= 0) {
    return {
      bucket: "affordable",
      suggestDepositUsdt: "0",
      forceShowPromoted: false,
    };
  }

  const ceiling = addAmount(principal, cap);
  if (cmpAmount(required, ceiling) <= 0) {
    return {
      bucket: "nearMiss",
      suggestDepositUsdt,
      forceShowPromoted: false,
    };
  }

  // forceShow → 자본 부족이면 nearMiss+suggest (lockedHigh 승격 · compareReady 위조 아님)
  if (forceShow) {
    return {
      bucket: "nearMiss",
      suggestDepositUsdt,
      forceShowPromoted: true,
    };
  }

  return {
    bucket: "lockedHigh",
    suggestDepositUsdt,
    forceShowPromoted: false,
  };
}

/**
 * Home / earn sort lock (§0.0.5.1):
 * 1 pinOrder · 2 affordable(+compareReady/aiPick/margin) · 3 nearMiss · 4 lockedHigh
 * 5 principal=0 → micro/small affordable seed first
 * @param {object} a
 * @param {object} b
 * @param {{ principalUsdt?: string }} [ctx]
 */
function compareBalanceAwareFeedItems(a, b, ctx = {}) {
  const ap = a.pinOrder != null ? Number(a.pinOrder) : null;
  const bp = b.pinOrder != null ? Number(b.pinOrder) : null;
  if (ap != null && bp != null && ap !== bp) return ap - bp;
  if (ap != null && bp == null) return -1;
  if (ap == null && bp != null) return 1;

  const ar = BUCKET_RANK[a.bucket] ?? 99;
  const br = BUCKET_RANK[b.bucket] ?? 99;
  if (ar !== br) return ar - br;

  const principal = String(ctx.principalUsdt ?? "0");
  const zeroBal = cmpAmount(principal, "0") === 0;
  if (zeroBal && a.bucket === "affordable" && b.bucket === "affordable") {
    const aSeed = isMicroSmallBand(a.capitalBand) ? 0 : 1;
    const bSeed = isMicroSmallBand(b.capitalBand) ? 0 : 1;
    if (aSeed !== bSeed) return aSeed - bSeed;
  }

  // affordable: compareReady first · aiPick · margin/profit desc
  if (a.bucket === "affordable" && b.bucket === "affordable") {
    const ac = a.compareReady === true ? 0 : 1;
    const bc = b.compareReady === true ? 0 : 1;
    if (ac !== bc) return ac - bc;
    const aa = a.aiPick === true ? 0 : 1;
    const ba = b.aiPick === true ? 0 : 1;
    if (aa !== ba) return aa - ba;
    const am = Number(a.marginPct ?? a.expectedProfitUsdt ?? 0);
    const bm = Number(b.marginPct ?? b.expectedProfitUsdt ?? 0);
    if (am !== bm) return bm - am;
  }

  return 0;
}

function isMicroSmallBand(band) {
  return band === "micro" || band === "small";
}

/**
 * Project one opportunity into a balance-aware feed card (override flags already resolved).
 * @param {{
 *   id: string,
 *   requiredCapitalUsdt: string,
 *   expectedProfitUsdt?: string,
 *   compareReady?: boolean,
 *   capitalBand?: string|null,
 *   aiPick?: boolean,
 *   marginPct?: string|null,
 *   status?: string,
 *   excludeFromFeed?: boolean,
 *   forceShow?: boolean,
 *   pinOrder?: number|null,
 * }} card
 * @param {{
 *   principalUsdt: string,
 *   nearMissCapUsdt: string,
 * }} ctx
 */
function projectBalanceAwareCard(card, ctx) {
  if (card.excludeFromFeed === true) {
    return { excludeFromFeed: true, id: card.id };
  }
  // status gate — available only (paused/etc excluded unless forceShow)
  const status = card.status ?? "available";
  if (status !== "available" && card.forceShow !== true) {
    return { excludeFromFeed: true, id: card.id };
  }

  const classified = classifyAffordability({
    principalUsdt: ctx.principalUsdt,
    requiredCapitalUsdt: card.requiredCapitalUsdt,
    nearMissCapUsdt: ctx.nearMissCapUsdt,
    forceShow: card.forceShow === true,
  });

  return {
    excludeFromFeed: false,
    id: card.id,
    bucket: classified.bucket,
    suggestDepositUsdt: classified.suggestDepositUsdt,
    forceShowPromoted: classified.forceShowPromoted,
    pinOrder: card.pinOrder ?? null,
    compareReady: card.compareReady === true,
    capitalBand: card.capitalBand ?? null,
    aiPick: card.aiPick === true,
    expectedProfitUsdt: card.expectedProfitUsdt ?? null,
    marginPct: card.marginPct ?? null,
    requiredCapitalUsdt: assertAmount(
      String(card.requiredCapitalUsdt),
      "requiredCapitalUsdt",
    ),
    classificationOwner: CLASSIFICATION_OWNER,
  };
}

/**
 * Build sorted feed + Fact counts.
 * Override merge (hidden/forceShow/pinOrder/expectedProfit) must be applied by caller
 * (Nest mergeUserOpportunityOverride) before cards enter here — or pass override flags on cards.
 *
 * @param {{
 *   principalUsdt: string,
 *   cards: Array<object>,
 *   policyNearMissCapUsdt?: string|null,
 * }} input
 */
function buildBalanceAwareFeed(input) {
  const principalUsdt = assertAmount(
    String(input.principalUsdt ?? "0"),
    "principalUsdt",
  );
  const nearMissCapUsdt = resolveNearMissCapUsdt(
    principalUsdt,
    input.policyNearMissCapUsdt,
  );

  const projected = [];
  let hiddenCount = 0;
  for (const card of input.cards || []) {
    const p = projectBalanceAwareCard(card, { principalUsdt, nearMissCapUsdt });
    if (p.excludeFromFeed) {
      hiddenCount += 1;
      continue;
    }
    projected.push(p);
  }

  projected.sort((a, b) =>
    compareBalanceAwareFeedItems(a, b, { principalUsdt }),
  );

  let affordableCount = 0;
  let nearMissCount = 0;
  let lockedHighCount = 0;
  let topSuggestDepositUsdt = null;
  for (const row of projected) {
    if (row.bucket === "affordable") affordableCount += 1;
    else if (row.bucket === "nearMiss") {
      nearMissCount += 1;
      if (
        topSuggestDepositUsdt == null &&
        cmpAmount(row.suggestDepositUsdt, "0") > 0
      ) {
        topSuggestDepositUsdt = row.suggestDepositUsdt;
      }
    } else if (row.bucket === "lockedHigh") lockedHighCount += 1;
  }

  return {
    principalUsdt,
    nearMissCapUsdt,
    classificationOwner: CLASSIFICATION_OWNER,
    items: projected,
    affordableCount,
    nearMissCount,
    lockedHighCount,
    hiddenCount,
    topSuggestDepositUsdt,
  };
}

/**
 * Extract nearMissCap from execution-policy.v1 shape (SSOT path only).
 * @param {object|null|undefined} policy
 * @returns {string|null}
 */
function nearMissCapFromExecutionPolicy(policy) {
  if (!policy || typeof policy !== "object") return null;
  const feed = policy.feed;
  if (!feed || typeof feed !== "object") return null;
  const raw = feed.nearMissCapUsdt;
  if (raw == null || String(raw).trim() === "") return null;
  return assertAmount(String(raw).trim(), "feed.nearMissCapUsdt");
}

module.exports = {
  CLASSIFICATION_OWNER,
  FEED_BUCKETS,
  SUGGEST_TICK_USDT,
  NEAR_MISS_CAP_FLOOR_USDT,
  NEAR_MISS_CAP_PRINCIPAL_PCT,
  BUCKET_RANK,
  ceilToTick,
  computeSuggestDepositUsdt,
  resolveNearMissCapUsdt,
  classifyAffordability,
  compareBalanceAwareFeedItems,
  projectBalanceAwareCard,
  buildBalanceAwareFeed,
  nearMissCapFromExecutionPolicy,
};
