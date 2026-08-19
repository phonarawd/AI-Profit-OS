/**
 * Listing Promotion Contract — Nest 소비면.
 * Listing→Opportunity 승격 전제만 노출한다.
 * Opportunity row / executable price / availability / fees / FX 를 만들지 않는다.
 */

export type ListingPromotionDecision =
  | "PROMOTABLE"
  | "NOT_PROMOTABLE"
  | "INSUFFICIENT"
  | "CONFLICT"
  | "BLOCKED";

export type ListingPromotionResult = {
  decision: ListingPromotionDecision;
  reason: string;
  leftListingId: string | null;
  rightListingId: string | null;
  leftSource: string | null;
  rightSource: string | null;
  categoryProfile: string;
  canonicalProductId: string | null;
  compatibilityDecision: string;
  compatibilityReason: string;
  sameCanonicalProduct: boolean | null;
  sameVariant: boolean | null;
  tradableEquivalent: boolean;
  listingPromotion: boolean;
  opportunity: false;
  executablePrice: null;
  availability: null;
  feesFx: null;
  observedPriceUsedAsExecutable: false;
  samePhysicalItem: false;
  promoterVersion: "listing-promotion.v1";
  evaluatedAt: string;
};

type ListingPromotionRuntime = {
  evaluateListingPromotion: (
    left: unknown,
    right: unknown,
    opts?: { now?: string },
  ) => ListingPromotionResult;
  PROMOTER_VERSION: "listing-promotion.v1";
  PIPELINE_STATUS: {
    LISTING_PROMOTION: "IN_PROCESS_MEMORY";
    EXECUTABLE_PRICE_AVAIL_FEES_FX: "NOT_IMPLEMENTED";
    MULTI_SOURCE_OPPORTUNITY_CREATION: "NOT_IMPLEMENTED";
  };
  LISTING_PROMOTION_IS_NOT_OPPORTUNITY: true;
  LISTING_PROMOTION_DOES_NOT_COMPUTE_EXECUTABLE_PRICE: true;
};

// eslint-disable-next-line @typescript-eslint/no-require-imports
const runtime = require("@aipo/market-intelligence/listing-promotion") as ListingPromotionRuntime;

export const evaluateListingPromotion = runtime.evaluateListingPromotion;
export const LISTING_PROMOTION_PIPELINE_STATUS = runtime.PIPELINE_STATUS;
export const LISTING_PROMOTION_IS_NOT_OPPORTUNITY =
  runtime.LISTING_PROMOTION_IS_NOT_OPPORTUNITY;
export const LISTING_PROMOTION_DOES_NOT_COMPUTE_EXECUTABLE_PRICE =
  runtime.LISTING_PROMOTION_DOES_NOT_COMPUTE_EXECUTABLE_PRICE;
