/**
 * Admin adapters HTTP surface · Engine §0.0 · Admin §9.1.1
 * UI = /admin/adapters · nearMissCap UI FORBIDDEN here
 */

export const ADAPTER_ADMIN_ROUTES = {
  list: "adapters",
  get: "adapters/:adapterId",
  listingLegs: "adapters/listing-legs",
  /** §51.15 matching KPI · Simulation S4 선행 */
  matchingKpi: "adapters/matching-kpi",
  simulationS4: "adapters/simulation-s4",
  recordMatchAttempts: "adapters/match-attempts",
  /** §0.10 U15 — unmatched ebay identity review queue (Ops-visible) */
  identityReviewQueue: "adapters/identity-review-queue",
} as const;

export const ADAPTER_INGEST_ROUTES = {
  ingest: "internal/adapters/ingest",
} as const;
