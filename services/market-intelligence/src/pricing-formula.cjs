/**
 * Engine §0.0.4.1 — opportunity pricing formula (single SSOT).
 * CI: verify:pricing-formula · tolerance ±0.000001 USDT
 */

const {
  addAmount,
  subAmount,
  mulAmount,
  maxAmount,
  cmpAmount,
  assertAmount,
  absDiff,
  withinTolerance,
} = require("./money.cjs");
const { feeBucket, isMarketId, marketLabelKo } = require("./markets.cjs");
const { assertNotForbidden } = require("./forbidden.cjs");
const { isAllowedLegPair } = require("./pipeline.cjs");
const { resolveCapitalBand } = require("./capital-band.cjs");

/** Day-1 defaults · Admin fee 표 may override ebay/admin pct */
const DEFAULT_FEE_PCT = Object.freeze({
  ebay: "0.135",
  admin: "0",
});

const DEFAULT_RISK_BUFFER_PCT = "0.05";
const DEFAULT_MIN_RISK_BUFFER_USDT = "1";
const DEFAULT_PLATFORM_MARGIN_PCT = "0.10";

/**
 * @param {string} marketId
 * @param {{ ebay?: string, admin?: string }} [feePct]
 */
function feePctForMarket(marketId, feePct = DEFAULT_FEE_PCT) {
  assertNotForbidden({ marketId });
  if (!isMarketId(marketId)) throw new Error(`unknown marketId: ${marketId}`);
  const bucket = feeBucket(marketId);
  const pct = feePct[bucket] ?? DEFAULT_FEE_PCT[bucket];
  return assertAmount(String(pct), `feePct.${bucket}`);
}

/**
 * @typedef {object} PricingInput
 * @property {string} buyMarketId
 * @property {string} buyPriceUsdt
 * @property {string} sellMarketId
 * @property {string} sellPriceUsdt
 * @property {string} [platformMarginPct] global default when adminMarginPct absent
 * @property {string} [adminMarginPct] per-opportunity override (priority)
 * @property {string} [riskBufferPct]
 * @property {string} [minRiskBufferUsdt]
 * @property {{ ebay?: string, admin?: string }} [feePct]
 * @property {string} [requiredCapitalUsdt] for capitalBand (defaults to buyPriceUsdt)
 * @property {boolean} [useAdminOverride]
 * @property {'adapter'|'admin'|'blended'} [pricingSource]
 * @property {boolean} [gradeMismatch] → compareReady false
 * @property {boolean} [imageMissing] → compareReady false
 * @property {boolean} [legsFresh] default true
 */

/**
 * @param {PricingInput} input
 */
function computeOpportunityPricing(input) {
  assertNotForbidden({ marketId: input.buyMarketId });
  assertNotForbidden({ marketId: input.sellMarketId });

  if (!isAllowedLegPair(input)) {
    throw new Error("illegal pricing leg pair");
  }

  const buyPriceUsdt = assertAmount(input.buyPriceUsdt, "buyPriceUsdt");
  const sellPriceUsdt = assertAmount(input.sellPriceUsdt, "sellPriceUsdt");
  if (cmpAmount(buyPriceUsdt, "0") < 0 || cmpAmount(sellPriceUsdt, "0") < 0) {
    throw new Error("prices must be >= 0");
  }

  const feePct = {
    ebay: input.feePct?.ebay ?? DEFAULT_FEE_PCT.ebay,
    admin: input.feePct?.admin ?? DEFAULT_FEE_PCT.admin,
  };
  const riskBufferPct = assertAmount(
    String(input.riskBufferPct ?? DEFAULT_RISK_BUFFER_PCT),
    "riskBufferPct",
  );
  const minRiskBufferUsdt = assertAmount(
    String(input.minRiskBufferUsdt ?? DEFAULT_MIN_RISK_BUFFER_USDT),
    "minRiskBufferUsdt",
  );

  const effectiveMarginPct = assertAmount(
    String(
      input.adminMarginPct != null && input.adminMarginPct !== ""
        ? input.adminMarginPct
        : (input.platformMarginPct ?? DEFAULT_PLATFORM_MARGIN_PCT),
    ),
    "effectiveMarginPct",
  );

  const buyFeePct = feePctForMarket(input.buyMarketId, feePct);
  const sellFeePct = feePctForMarket(input.sellMarketId, feePct);

  const grossSpreadUsdt = subAmount(sellPriceUsdt, buyPriceUsdt);
  const buyLegFeeUsdt = mulAmount(buyPriceUsdt, buyFeePct);
  const sellLegFeeUsdt = mulAmount(sellPriceUsdt, sellFeePct);
  const feesUsdt = addAmount(buyLegFeeUsdt, sellLegFeeUsdt);

  const riskFromPct = mulAmount(grossSpreadUsdt, riskBufferPct);
  // risk buffer floors at min even when spread is small/negative (plan: max(spread×pct, min))
  const riskBufferUsdt =
    cmpAmount(grossSpreadUsdt, "0") <= 0
      ? minRiskBufferUsdt
      : maxAmount(riskFromPct, minRiskBufferUsdt);

  const costBufferUsdt = addAmount(feesUsdt, riskBufferUsdt);
  const afterCost = subAmount(grossSpreadUsdt, costBufferUsdt);
  const platformRaw =
    cmpAmount(afterCost, "0") <= 0
      ? "0"
      : mulAmount(afterCost, effectiveMarginPct);
  const platformMarginUsdt =
    cmpAmount(platformRaw, "0") < 0 ? "0" : platformRaw;
  const expectedProfitUsdt = subAmount(afterCost, platformMarginUsdt);

  const requiredCapitalUsdt = assertAmount(
    String(input.requiredCapitalUsdt ?? buyPriceUsdt),
    "requiredCapitalUsdt",
  );
  const capitalBand = resolveCapitalBand(requiredCapitalUsdt);

  const gradeMismatch = Boolean(input.gradeMismatch);
  const imageMissing = Boolean(input.imageMissing);
  const legsFresh = input.legsFresh !== false;
  const profitOk = cmpAmount(expectedProfitUsdt, "0") > 0;
  const compareReady =
    profitOk &&
    legsFresh &&
    !gradeMismatch &&
    !imageMissing &&
    isAllowedLegPair(input);

  const useAdminOverride = Boolean(input.useAdminOverride);
  let pricingSource = input.pricingSource;
  if (!pricingSource) {
    const buyAdmin = input.buyMarketId === "admin";
    const sellAdmin = input.sellMarketId === "admin";
    if (buyAdmin && sellAdmin) pricingSource = "admin";
    else if (buyAdmin || sellAdmin) pricingSource = "blended";
    else pricingSource = "adapter";
  }

  return {
    buyMarketId: input.buyMarketId,
    buyMarketLabelKo: marketLabelKo(input.buyMarketId),
    buyPriceUsdt,
    sellMarketId: input.sellMarketId,
    sellMarketLabelKo: marketLabelKo(input.sellMarketId),
    sellPriceUsdt,
    grossSpreadUsdt,
    buyLegFeeUsdt,
    sellLegFeeUsdt,
    feesUsdt,
    riskBufferUsdt,
    costBufferUsdt,
    platformMarginUsdt,
    expectedProfitUsdt,
    effectiveMarginPct,
    compareReady,
    capitalBand,
    useAdminOverride,
    pricingSource,
    gradeMismatch,
    imageMissing,
  };
}

module.exports = {
  DEFAULT_FEE_PCT,
  DEFAULT_RISK_BUFFER_PCT,
  DEFAULT_MIN_RISK_BUFFER_USDT,
  DEFAULT_PLATFORM_MARGIN_PCT,
  feePctForMarket,
  computeOpportunityPricing,
  absDiff,
  withinTolerance,
};
