/**
 * MultiSourceOpportunity → 기존 public.opportunities persist row.
 * 돈/FX/시간은 재계산하지 않는다. 없는 값은 0으로 만들지 않는다.
 */
const {
  EXISTING_OPPORTUNITY_WRITE_PRESENTATION,
} = require("../../../market-intelligence/src/catalog-runtime-seed.cjs");
const {
  projectOpportunityScanFields,
} = require("../../../market-intelligence/src/opportunity-scan.cjs");
const { ORIGIN } = require("./opportunity-write.cjs");

const FIELD_MAP = Object.freeze({
  expectedProfitUsdt: "DIRECT",
  expectedProfitKrwApprox: "DIRECT",
  fxSnapshotId: "DIRECT",
  requiredCapitalUsdt: "DIRECT",
  status: "DIRECT",
  pricedAt: "DIRECT",
  staleAt: "DIRECT",
  pricingVersion: "DIRECT",
  pricingMoney: "DIRECT",
  capitalBand: "DIRECT",
  buyListingId: "DIRECT",
  sellListingId: "DIRECT",
  canonicalProductId: "DIRECT",
  trackAOpportunityId: "DIRECT",
  assetId: "DERIVED_FROM_EXISTING_OWNER",
  category: "DERIVED_FROM_EXISTING_OWNER",
  assetLabel: "DERIVED_FROM_EXISTING_OWNER",
  assetImageUrl: "DERIVED_FROM_EXISTING_OWNER",
  assetImageSource: "DERIVED_FROM_EXISTING_OWNER",
  assetImageAltKo: "DERIVED_FROM_EXISTING_OWNER",
  imageMissing: "DERIVED_FROM_EXISTING_OWNER",
  gradeMismatch: "DERIVED_FROM_EXISTING_OWNER",
  arbitrageType: "DERIVED_FROM_EXISTING_OWNER",
  arbitrageTypeKo: "DERIVED_FROM_EXISTING_OWNER",
  tags: "DERIVED_FROM_EXISTING_OWNER",
  estimatedDurationSec: "DERIVED_FROM_EXISTING_OWNER",
  aiConfidenceScore: "DERIVED_FROM_EXISTING_OWNER",
  difficulty: "DERIVED_FROM_EXISTING_OWNER",
  executionMode: "DERIVED_FROM_EXISTING_OWNER",
  executionPlatforms: "DERIVED_FROM_EXISTING_OWNER",
  riskScore: "OPTIONAL",
  sellSuccessRate: "OPTIONAL",
  sellSuccessWindowDays: "OPTIONAL",
  sellSuccessAsOf: "OPTIONAL",
  inventory: "NOT_AVAILABLE",
  userBalance: "NOT_AVAILABLE",
  availability: "NOT_AVAILABLE",
  expectedSellDays: "NOT_AVAILABLE",
});

function missing(reason, extras) {
  return { ok: false, reason, row: null, fieldMap: FIELD_MAP, ...(extras || {}) };
}

function mapIssuedToOpportunityRow(input) {
  const issued = input && input.issued;
  const asset = input && input.asset;
  if (!issued || issued.issued !== true || !issued.opportunity) {
    return missing("NOT_ISSUED");
  }
  const opp = issued.opportunity;
  if (opp.assetId !== null) {
    return missing("CANONICAL_PRODUCT_EQUALS_ASSET_FORBIDDEN");
  }
  if (!opp.opportunityId || !opp.canonicalProductId) {
    return missing("TRACK_A_IDENTITY_MISSING");
  }
  if (!opp.expectedProfitUsdt || !opp.requiredCapitalUsdt || !opp.fxSnapshotId) {
    return missing("MONEY_FIELDS_MISSING");
  }
  if (!opp.pricing || typeof opp.pricing !== "object") {
    return missing("PRICING_MISSING");
  }
  if (!opp.status) {
    return missing("STATUS_MISSING");
  }
  if (!asset || !asset.assetId || !asset.category || !asset.assetLabel) {
    return missing("EXISTING_ASSET_REQUIRED");
  }
  if (!asset.assetImageUrl) {
    return missing("ASSET_IMAGE_REQUIRED");
  }

  const presentation = EXISTING_OPPORTUNITY_WRITE_PRESENTATION;
  const scan = projectOpportunityScanFields({
    arbitrageType: "price",
    staleAt: opp.staleAt,
    now: Date.parse(opp.pricedAt),
  });

  const pricing = {
    ...opp.pricing,
    origin: ORIGIN.TRACK_A,
    trackAOpportunityId: opp.opportunityId,
    canonicalProductId: opp.canonicalProductId,
  };

  return {
    ok: true,
    reason: null,
    fieldMap: FIELD_MAP,
    row: {
      trackAOpportunityId: opp.opportunityId,
      assetId: asset.assetId,
      pricingVersion: opp.pricingVersion || 1,
      pricedAt: opp.pricedAt,
      expectedProfitUsdt: opp.expectedProfitUsdt,
      expectedProfitKrwApprox: opp.expectedProfitKrwApprox,
      fxSnapshotId: opp.fxSnapshotId,
      estimatedDurationSec: presentation.estimatedDurationSec,
      aiConfidenceScore: presentation.aiConfidenceScore,
      difficulty: presentation.difficulty,
      tags: scan.tags,
      requiredCapitalUsdt: opp.requiredCapitalUsdt,
      executionMode: presentation.executionMode,
      executionPlatforms: presentation.executionPlatforms,
      category: asset.category,
      assetLabel: asset.assetLabel,
      assetImageUrl: asset.assetImageUrl,
      assetImageSource: asset.assetImageSource,
      assetImageAltKo: asset.assetImageAltKo || asset.assetLabel,
      arbitrageType: scan.arbitrageType,
      arbitrageTypeKo: scan.arbitrageTypeKo,
      pricing,
      staleAt: opp.staleAt,
      status: opp.status,
      sellSuccessRate: scan.sellSuccessRate ?? null,
      sellSuccessWindowDays: scan.sellSuccessWindowDays ?? null,
      sellSuccessAsOf: scan.sellSuccessAsOf ?? null,
      riskScore: presentation.riskScore,
      gradeMismatch: pricing.gradeMismatch === true,
      imageMissing: pricing.imageMissing === true,
      capitalBand: opp.capitalBand || pricing.capitalBand || null,
    },
  };
}

module.exports = {
  FIELD_MAP,
  mapIssuedToOpportunityRow,
};
