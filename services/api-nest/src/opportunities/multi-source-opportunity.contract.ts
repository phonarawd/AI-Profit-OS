/**
 * Multi-source Opportunity — Nest 소비면.
 * EXECUTABLE 교차 소스 쌍의 in-process Opportunity row만 노출한다.
 * public.opportunities INSERT / promotion persist 는 Track F.
 */

export type MultiSourceOpportunityDecision =
  | "ISSUED"
  | "NOT_ISSUED"
  | "INSUFFICIENT"
  | "CONFLICT"
  | "BLOCKED";

export type MultiSourceOpportunityRow = {
  opportunityId: string;
  canonicalProductId: string;
  assetId: null;
  categoryProfile: string;
  buyListingId: string;
  sellListingId: string;
  expectedProfitUsdt: string;
  expectedProfitKrwApprox: string | null;
  fxSnapshotId: string;
  requiredCapitalUsdt: string;
  status: "available" | "paused";
  pricedAt: string;
  staleAt: string;
  productionPersisted: false;
};

export type MultiSourceOpportunityResult = {
  decision: MultiSourceOpportunityDecision;
  reason: string;
  issued: boolean;
  opportunity: MultiSourceOpportunityRow | null;
  economicsDecision: string;
  listingPromotion: boolean;
  observedPriceUsedAsExecutable: false;
  productionPersisted: false;
  evaluatorVersion: "multi-source-opportunity.v1";
  evaluatedAt: string;
};

type MultiSourceOpportunityRuntime = {
  createMultiSourceOpportunity: (
    left: unknown,
    right: unknown,
    opts?: {
      now?: string;
      fxSnapshot?: unknown;
      buyListingId?: string;
      sellListingId?: string;
    },
  ) => MultiSourceOpportunityResult;
  EVALUATOR_VERSION: "multi-source-opportunity.v1";
  PIPELINE_STATUS: {
    MULTI_SOURCE_OPPORTUNITY_CREATION: "IN_PROCESS_MEMORY";
    PRODUCTION_MULTI_SOURCE_OPPORTUNITY: "NOT_IMPLEMENTED";
  };
  EXECUTABLE_IS_NOT_OPPORTUNITY: true;
  DOES_NOT_INSERT_PRODUCTION_OPPORTUNITY: true;
};

// eslint-disable-next-line @typescript-eslint/no-require-imports
const runtime = require("@aipo/market-intelligence/multi-source-opportunity") as MultiSourceOpportunityRuntime;

export const createMultiSourceOpportunity = runtime.createMultiSourceOpportunity;
export const MULTI_SOURCE_OPPORTUNITY_PIPELINE_STATUS = runtime.PIPELINE_STATUS;
export const EXECUTABLE_IS_NOT_OPPORTUNITY = runtime.EXECUTABLE_IS_NOT_OPPORTUNITY;
export const DOES_NOT_INSERT_PRODUCTION_OPPORTUNITY =
  runtime.DOES_NOT_INSERT_PRODUCTION_OPPORTUNITY;
