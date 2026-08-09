/** Engine feature-platform — user/market/opportunity features */

export const FORBIDDEN_FEATURE_KEYS: readonly string[];
export const FORBIDDEN_PICK_KEYS: readonly [
  "sellSuccessRate",
  "successRatePercent",
  "adminOverride",
];
export const FORBIDDEN_TWIN_MONEY_KEYS: readonly [
  "balanceUsdt",
  "expectedProfitUsdt",
  "liveQuote",
];
export const CAPITAL_BANDS: readonly [
  "micro",
  "small",
  "mid",
  "high",
  "whale",
];
export const FEATURE_FORMULA_ID: "feat_ai_pick_v1";

export type UserFeatures = {
  readonly kind: "user";
  readonly userId: string | null;
  readonly preferredCapitalBand: string | null;
  readonly categoryInterest: readonly string[];
  readonly membershipTier: string | null;
  readonly aiPerkFlags: readonly string[];
  readonly hasAiPickBoost: boolean;
  readonly toneBand: string | null;
};

export type MarketFeatures = {
  readonly kind: "market";
  readonly compareReady: boolean;
  readonly capitalBand: string | null;
  readonly arbitrageType: string | null;
  readonly category: string | null;
  readonly freshness01: number;
  readonly adapterFreshness01: number;
  readonly staleAt: string | null;
};

export type OpportunityFeatures = {
  readonly kind: "opportunity";
  readonly opportunityId: string | null;
  readonly expectedProfitUsdt: number | null;
  readonly minProfitUsdt: number;
  readonly profitHeadroom01: number;
  readonly capitalBand: string | null;
  readonly compareReady: boolean;
  readonly pricingVersion: number | null;
};

export type FeatureScalars = {
  readonly freshness01: number;
  readonly adapterFreshness01: number;
  readonly compareReady01: number;
  readonly profitHeadroom01: number;
  readonly capitalBandFit01: number;
  readonly categoryFit01: number;
  readonly aiPickBoost01: number;
};

export type FeatureVector = {
  readonly schema: "feature-vector.v1";
  readonly formulaId: typeof FEATURE_FORMULA_ID;
  readonly opportunityId: string | null;
  readonly userId: string | null;
  readonly scalars: FeatureScalars;
  readonly user: UserFeatures;
  readonly market: MarketFeatures;
  readonly opportunity: OpportunityFeatures;
  readonly capturedAt: string;
  readonly hash: string;
};

export function findForbiddenKeys(
  obj: Record<string, unknown> | null | undefined,
): string[];
export function extractUserFeatures(input?: object): UserFeatures;
export function extractMarketFeatures(input?: object): MarketFeatures;
export function extractOpportunityFeatures(input?: object): OpportunityFeatures;
export function capitalBandFit01(
  preferred: string | null,
  oppBand: string | null,
): number;
export function categoryFit01(
  interests: string[],
  category: string | null,
): number;
export function clamp01(n: number): number;
export function buildFeatureVector(input?: {
  user?: object;
  market?: object;
  opportunity?: object;
  now?: string | Date | number;
}): FeatureVector;
export function hashFeatureVector(vector: object): string;
