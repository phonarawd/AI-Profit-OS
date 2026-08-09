/** Nest AI contracts — Engine ai-feature-platform */

export type AiPickScoreRequest = {
  user?: {
    userId?: string;
    preferredCapitalBand?: string;
    categoryInterest?: string[];
    membershipTier?: string;
    aiPerkFlags?: string[];
    toneBand?: string;
  };
  market?: {
    compareReady?: boolean;
    staleAt?: string;
    capitalBand?: string;
    arbitrageType?: string;
    category?: string;
    adapterFreshness01?: number;
  };
  opportunity?: {
    opportunityId?: string;
    expectedProfitUsdt?: string | number;
    minProfitUsdt?: string | number;
    capitalBand?: string;
    compareReady?: boolean;
    pricingVersion?: number;
  };
  now?: string;
  /** Persist to ai_pick_scores when true */
  persist?: boolean;
};

export type AiEvalRunRequest = {
  modelId: string;
  version: string;
  accuracy?: number;
  piiLeakRate?: number;
  moneyHallucinationRate?: number;
  l3MoneyActionRate?: number;
  /** Must be false / omitted — true rejects */
  autoLearningRequested?: boolean;
  promoteOnPass?: boolean;
};

export type ShadowReplayRunRequest = {
  createdByAdminId?: string;
  runId?: string;
};
