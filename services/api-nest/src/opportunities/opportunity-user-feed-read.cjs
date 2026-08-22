/**
 * OpportunitiesUserService 와 같은 feed/detail 읽기 알고리즘.
 * E2E 가 Nest DI 없이 동일 owner 를 호출한다.
 */
const { createRequire } = require("module");
const { join } = require("path");

const req = createRequire(__filename);
const settlement = req(
  join(__dirname, "..", "..", "..", "engine-rust", "settlement_rule.cjs"),
);
const { projectCapitalProviderUserSurface } = req(
  join(
    __dirname,
    "..",
    "..",
    "..",
    "market-intelligence",
    "src",
    "capital-provider-projection.cjs",
  ),
);
const { withTimeSensitiveTag } = req(
  join(
    __dirname,
    "..",
    "..",
    "..",
    "market-intelligence",
    "src",
    "opportunity-scan.cjs",
  ),
);
const { assetIconForCategory } = req(
  join(
    __dirname,
    "..",
    "..",
    "..",
    "market-intelligence",
    "src",
    "asset-image.cjs",
  ),
);
const { buildBalanceAwareFeed, CLASSIFICATION_OWNER } = req(
  join(
    __dirname,
    "..",
    "..",
    "..",
    "market-intelligence",
    "src",
    "balance-aware-feed.cjs",
  ),
);

function isRowFresh(clock, staleAt) {
  return settlement.isPriceFresh({
    nowMs: clock.nowMs(),
    staleAtMs: new Date(staleAt).getTime(),
    priceStaleMaxSec: settlement.DEFAULT_PRICE_STALE_MAX_SEC,
  });
}

function toFeedCardInput(r) {
  const pricing = r.pricing || {};
  const tags = Array.isArray(r.tags) ? r.tags : [];
  return {
    id: r.id,
    requiredCapitalUsdt: r.required_capital_usdt,
    expectedProfitUsdt: r.expected_profit_usdt,
    compareReady: Boolean(pricing.compareReady),
    capitalBand: r.capital_band,
    aiPick: tags.includes("ai_pick"),
    marginPct:
      pricing.adminMarginPct != null
        ? String(pricing.adminMarginPct)
        : pricing.marginPct != null
          ? String(pricing.marginPct)
          : null,
    status: r.status,
  };
}

function publicPricing(pricing) {
  const next = { ...(pricing || {}) };
  delete next.origin;
  delete next.trackAOpportunityId;
  delete next.canonicalProductId;
  return next;
}

function toUserCard(row, classified, opts) {
  const pricing = row.pricing || {};
  const tags = withTimeSensitiveTag(row.tags, {
    staleAt: row.stale_at,
  });
  const krwRaw = row.expected_profit_krw_approx;
  const expectedProfitKrwApprox =
    krwRaw != null && krwRaw !== "" ? Number(krwRaw) : 0;
  const internal = {
    id: row.id,
    pricingVersion: row.pricing_version,
    pricedAt: new Date(row.priced_at).toISOString(),
    expectedProfitUsdt: classified.expectedProfitUsdt ?? row.expected_profit_usdt,
    expectedProfitKrwApprox: Number.isFinite(expectedProfitKrwApprox)
      ? expectedProfitKrwApprox
      : 0,
    fxSnapshotId: row.fx_snapshot_id,
    estimatedDurationSec: row.estimated_duration_sec,
    aiConfidenceScore: Number(row.ai_confidence_score),
    difficulty: row.difficulty,
    tags,
    requiredCapitalUsdt: classified.requiredCapitalUsdt,
    executionMode: row.execution_mode || "orchestrate",
    executionPlatforms: Array.isArray(row.execution_platforms)
      ? row.execution_platforms
      : [],
    category: row.category,
    assetId: row.asset_id,
    assetLabel: row.asset_label,
    assetImageUrl: row.asset_image_url,
    assetImageSource: row.asset_image_source,
    assetImageAltKo: row.asset_image_alt_ko || row.asset_label,
    assetIcon: assetIconForCategory(row.category),
    arbitrageType: row.arbitrage_type,
    arbitrageTypeKo: row.arbitrage_type_ko,
    staleAt: new Date(row.stale_at).toISOString(),
    status: row.status,
  };
  if (opts && opts.includePricing) {
    internal.pricing = publicPricing(pricing);
  }
  const userCard = projectCapitalProviderUserSurface(internal, {
    audience: "user",
  });
  return {
    ...userCard,
    bucket: classified.bucket,
    suggestDepositUsdt: classified.suggestDepositUsdt,
    compareReady: classified.compareReady,
    capitalBand: classified.capitalBand,
    classificationOwner: classified.classificationOwner || CLASSIFICATION_OWNER,
  };
}

async function getByIdThroughExistingFeed(input) {
  const clock = input.clock;
  const row = input.row;
  if (!row) return { ok: false, reason: "NOT_FOUND", item: null };
  if (!isRowFresh(clock, row.stale_at)) {
    return { ok: false, reason: "STALE", item: null };
  }
  const feed = buildBalanceAwareFeed({
    principalUsdt: input.principalUsdt || "0",
    cards: [toFeedCardInput(row)],
    policyNearMissCapUsdt:
      input.executionPolicy &&
      input.executionPolicy.feed &&
      input.executionPolicy.feed.nearMissCapUsdt
        ? input.executionPolicy.feed.nearMissCapUsdt
        : "50",
  });
  const classified = (feed.items || [])[0];
  if (!classified) return { ok: false, reason: "NOT_CLASSIFIED", item: null };
  return {
    ok: true,
    reason: null,
    item: toUserCard(row, classified, { includePricing: true }),
    principalUsdt: feed.principalUsdt,
    classificationOwner: feed.classificationOwner,
  };
}

module.exports = {
  isRowFresh,
  getByIdThroughExistingFeed,
  DEFAULT_PRICE_STALE_MAX_SEC: settlement.DEFAULT_PRICE_STALE_MAX_SEC,
};
