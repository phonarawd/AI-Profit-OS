/**
 * Admin opportunities HTTP surface · Engine §0.0 + Admin §36 · §9.8.9
 * UI = /admin/opportunities · ?tab=assets
 * UI override = /admin/users/:id?tab=opportunities
 */

export const OPPORTUNITY_ADMIN_ROUTES = {
  list: "opportunities",
  get: "opportunities/:id",
  patchPricing: "opportunities/:id/pricing",
  assets: "opportunities/assets",
  assetById: "opportunities/assets/:assetId",
  /** Engine §0.0.6 · R2 public register · source=admin_r2 */
  assetImage: "opportunities/assets/:assetId/image",
  /** Engine §0.0 trading_card vertical seed upsert */
  seedTradingCards: "opportunities/assets/seed/trading-card",
  /** Engine §0.0 luxury_bag vertical seed upsert */
  seedLuxuryBags: "opportunities/assets/seed/luxury-bag",
  /** Engine §0.0 watch vertical seed upsert (PP/AP/Rolex · whale≥100k) */
  seedWatches: "opportunities/assets/seed/watch",
  /** Engine §0.9 E-R6 — remote min catalog ensure (assets+ebay listings+opportunities) */
  catalogRuntimeSeed: "opportunities/catalog/runtime-seed",
  /** Engine §51.12 grade mismatch evaluate (Admin badge input) */
  evaluateGrade: "opportunities/evaluate-grade",
  /** Engine §0.0 luxury_bag brand+model match evaluate */
  evaluateBagMatch: "opportunities/evaluate-bag-match",
  /** Engine §0.0 watch brand+reference match evaluate */
  evaluateWatchMatch: "opportunities/evaluate-watch-match",
  /** Admin §9.8.9 */
  userOverrides: "users/:id/opportunity-overrides",
  userOverrideByOpp: "users/:id/opportunity-overrides/:opportunityId",
} as const;

/** Admin list filter query keys (contract) */
export const OPPORTUNITY_ADMIN_FILTERS = [
  "compareReady",
  "gradeMismatch",
  "image_missing",
  "capitalBand",
  "status",
  "category",
] as const;
