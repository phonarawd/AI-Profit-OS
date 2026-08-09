/**
 * Thin re-export of @aipo/market-intelligence for Nest adapters module.
 */
// eslint-disable-next-line @typescript-eslint/no-require-imports
const mi = require("@aipo/market-intelligence") as {
  SIGNUP_READY_ADAPTERS: Array<{
    adapterId: string;
    worker: string;
    role: "listing" | "catalog_ref" | "fx";
    verticals: string[];
    cacheHintSec: number;
  }>;
  SIGNUP_READY_ADAPTER_IDS: readonly string[];
  PARTNER_LISTING_ADAPTERS: Array<{
    adapterId: string;
    worker: string;
    role: "listing";
    verticals: string[];
    cacheHintSec: number;
    listingLegPhase: "Phase1+";
  }>;
  PARTNER_LISTING_ADAPTER_IDS: readonly string[];
  EBAY_MARKETPLACE_IDS: readonly string[];
  DAY1_LEG_PAIRS: Array<{ buy: string; sell: string; priority: string }>;
  assertNotForbidden: (input: {
    marketId?: string;
    adapterId?: string;
    source?: string;
  }) => void;
  isForbiddenAdapterId: (id: string | null | undefined) => boolean;
  isIngestableAdapterId: (adapterId: string) => boolean;
  allDeployAdapters: () => Array<{
    adapterId: string;
    worker: string;
    role: "listing" | "catalog_ref" | "fx";
    verticals: string[];
    cacheHintSec: number;
  }>;
  DAY1_AUTO_PUBLISH_YAHOO_JP: false;
  KPI_THRESHOLDS: {
    skuMatchFailRateMax: number;
    compareReadyFalseRatioMax: number;
    windowHours: number;
    s4AdapterMatchFailureRateMax: number;
  };
  evaluateAdapterMatchingKpi: (input?: {
    attempts?: Array<{
      adapterId?: string;
      matched: boolean;
      gradeMismatch?: boolean;
      reason?: string;
      at?: string | number | Date;
    }>;
    catalog?: Array<{ compareReady?: boolean }>;
    listings?: Array<{
      adapterId?: string;
      staleAt?: string | Date | number;
      id?: string;
    }>;
    adapterId?: string;
    now?: number | string | Date;
  }) => {
    skuMatchFailureRate: number;
    skuAttempts: number;
    skuFailures: number;
    gradeMismatchCount: number;
    compareReadyFalseRatio: number;
    compareReadyFalseCount: number;
    catalogTotal: number;
    adapterMatchFailureRate: number;
    alerts: Array<{
      kind: "sku_match_fail" | "compare_ready_false" | "stale_listing";
      messageKo: string;
      severity: "yellow" | "red";
      adapterId?: string;
    }>;
    reduceAutoPublish: boolean;
    seedReviewQueue: boolean;
    hideStaleOpps: boolean;
    top2Red: boolean;
    day1AutoPublishYahooJp: false;
    stale: {
      staleCount: number;
      byAdapter: Record<string, number>;
      staleListingIds: string[];
      anyAdapterRed: boolean;
    };
  };
  evaluateSimulationS4: (rate: number) => {
    pass: boolean;
    threshold: number;
    rate: number;
    failAction: "adapter_alert";
  };
  simulationS4InputFromKpi: (kpi: {
    adapterMatchFailureRate: number;
  }) => {
    adapterMatchFailureRate: number;
    s4: {
      pass: boolean;
      threshold: number;
      rate: number;
      failAction: "adapter_alert";
    };
  };
  healthStatusFromKpi: (
    kpi: {
      alerts: Array<{
        severity: "yellow" | "red";
        adapterId?: string;
      }>;
      stale?: { byAdapter?: Record<string, number>; anyAdapterRed?: boolean };
      skuAttempts?: number;
      catalogTotal?: number;
    },
    adapterId?: string,
  ) => "green" | "yellow" | "red" | "unknown";
  evaluateSkuMatchAttempt: (input: {
    category: string;
    assetMeta: object;
    listingMeta?: object;
    listingTitle?: string;
    listingCaption?: string;
    adapterId?: string;
    at?: string;
  }) => {
    adapterId: string;
    category: string;
    matched: boolean;
    reason: string;
    gradeMismatch: boolean;
    at: string;
    canAutoPublish: boolean;
  };
};

export const SIGNUP_READY_ADAPTERS = mi.SIGNUP_READY_ADAPTERS;
export const SIGNUP_READY_ADAPTER_IDS = mi.SIGNUP_READY_ADAPTER_IDS;
export const PARTNER_LISTING_ADAPTERS = mi.PARTNER_LISTING_ADAPTERS;
export const PARTNER_LISTING_ADAPTER_IDS = mi.PARTNER_LISTING_ADAPTER_IDS;
export const EBAY_MARKETPLACE_IDS = mi.EBAY_MARKETPLACE_IDS;
export const DAY1_LEG_PAIRS = mi.DAY1_LEG_PAIRS;
export const assertNotForbidden = mi.assertNotForbidden;
export const isForbiddenAdapterId = mi.isForbiddenAdapterId;
export const isIngestableAdapterId = mi.isIngestableAdapterId;
export const allDeployAdapters = mi.allDeployAdapters;
export const DAY1_AUTO_PUBLISH_YAHOO_JP = mi.DAY1_AUTO_PUBLISH_YAHOO_JP;
export const KPI_THRESHOLDS = mi.KPI_THRESHOLDS;
export const evaluateAdapterMatchingKpi = mi.evaluateAdapterMatchingKpi;
export const evaluateSimulationS4 = mi.evaluateSimulationS4;
export const simulationS4InputFromKpi = mi.simulationS4InputFromKpi;
export const healthStatusFromKpi = mi.healthStatusFromKpi;
export const evaluateSkuMatchAttempt = mi.evaluateSkuMatchAttempt;
