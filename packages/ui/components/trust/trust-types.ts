/** PART8b §51.16~21 trust surface shared types */

export type ParticipateProofModel = {
  tradeId: string;
  pricingVersion: number;
  buyPriceUsdt: string;
  sellPriceUsdt: string;
  expectedProfitUsdt: string;
  fxSnapshotId: string;
  proofHash: string;
  capturedAt: string;
};

export type CapitalBandId = "micro" | "small" | "mid" | "high" | "whale";

export type CapitalBandJourneyModel = {
  current: CapitalBandId;
  matchSuccessCount: number;
  depositUsdt: string;
};

export type AdapterHealthModel = {
  /** ISO — opportunity.staleAt */
  staleAt?: string | null;
  /** ISO — pricing.lastAdapterSyncAt */
  lastAdapterSyncAt?: string | null;
  compareReady?: boolean;
  sourceCount?: number;
  ctaLockReasonKo?: string | null;
};

export type SpreadDistribution = {
  p10: string;
  p50: string;
  p90: string;
};

export type WeeklyMarketBriefingModel = {
  asOf?: string | null;
  spreadDistribution?: SpreadDistribution | null;
  /** Engine M0.5 run id — display optional */
  runId?: string | null;
};

export type DepositConsultFact = {
  balanceUsdt?: string;
  opportunityPreviewCount?: number;
  toneBand?: "young" | "mid" | "senior";
  fontScale?: "md" | "lg" | "xl";
  depositPref?: "usdt" | "krw";
};
