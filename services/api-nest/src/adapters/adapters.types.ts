/** Engine §0.0 · §51.15 · Admin /admin/adapters health + matching KPI contract */

export type AdapterRole = "listing" | "catalog_ref" | "fx";

export type AdapterHealthStatus = "green" | "yellow" | "red" | "unknown";

export type AdapterKpiAlertKind =
  | "sku_match_fail"
  | "compare_ready_false"
  | "stale_listing";

export interface AdapterKpiAlert {
  kind: AdapterKpiAlertKind;
  messageKo: string;
  severity: "yellow" | "red";
  adapterId?: string;
}

export interface AdapterMatchAttemptBody {
  adapterId?: string;
  category?: string;
  matched: boolean;
  reason?: string;
  gradeMismatch?: boolean;
  at?: string;
}

/**
 * PTF-00C §8/§9 — always-report heartbeat evidence per marketplace, even on
 * total failure/zero-listing ticks. `errorClass` never carries upstream
 * credentials/response bodies — classification labels only.
 */
export interface AdapterMarketplaceHeartbeat {
  marketplaceId: string;
  attempted: number;
  successCount: number;
  failureCount: number;
  errorClass?: string | null;
}

export interface AdapterHealthRow {
  adapterId: string;
  worker: string;
  role: AdapterRole;
  status: AdapterHealthStatus;
  phase: "1";
  /** Day-1 auto-publish uses this adapter as listing leg */
  day1AutoPublish: boolean;
  officialPartner: boolean;
  listingLegPhase?: "Day-1" | "Phase1+";
  lastIngestAt: string | null;
  lastError: string | null;
  listingLeg: boolean;
  marketplaceIds?: string[];
  observationCount24h: number;
  /** §51.15 SKU match fail rate in 24h window · null when no attempts yet */
  skuMatchFailureRate: number | null;
  /** §51.12 grade mismatch count in window */
  gradeMismatchCount: number;
  /** Active KPI alerts for this adapter row */
  alerts: AdapterKpiAlert[];
  /** §51.15 >15% → reduce auto-publish */
  reduceAutoPublish: boolean;
  cacheHintSec: number;
  labelKo: string;
  /**
   * PTF-00C §9/§10 — durable circuit/health signal (provider_runtime_health).
   * Additive: `status` (green/yellow/red/unknown) stays the compat tint and
   * already folds this in (worst-wins) — these are the unambiguous detail.
   */
  circuitState?: "CLOSED" | "OPEN" | "HALF_OPEN";
  healthStatus?: "HEALTHY" | "DEGRADED" | "STALE" | "BLOCKED";
  marketplaceHealth?: Array<{
    marketplaceId: string;
    circuitState: "CLOSED" | "OPEN" | "HALF_OPEN";
    healthStatus: "HEALTHY" | "DEGRADED" | "STALE" | "BLOCKED";
    attemptedCount: number;
    successCount: number;
    failureCount: number;
    lastSuccessAt: string | null;
    lastFailureAt: string | null;
    lastErrorClass: string | null;
    /** PTF-00C-R1 §5 — always "NONE"; see ProviderHealthSnapshot docstring. */
    upstreamGating?: "NONE";
  }>;
}

export interface AdapterMatchingKpiResponse {
  skuMatchFailureRate: number;
  skuAttempts: number;
  skuFailures: number;
  gradeMismatchCount: number;
  compareReadyFalseRatio: number;
  compareReadyFalseCount: number;
  catalogTotal: number;
  /** §51.4 SimulationReport.adapterMatchFailureRate (S4 선행) */
  adapterMatchFailureRate: number;
  windowHours: 24;
  thresholds: {
    skuMatchFailRateMax: 0.15;
    compareReadyFalseRatioMax: 0.4;
    windowHours: 24;
    s4AdapterMatchFailureRateMax: 0.15;
  };
  alerts: AdapterKpiAlert[];
  reduceAutoPublish: boolean;
  seedReviewQueue: boolean;
  hideStaleOpps: boolean;
  top2Red: boolean;
  day1AutoPublishYahooJp: false;
  s4: {
    pass: boolean;
    threshold: number;
    rate: number;
    failAction: "adapter_alert";
  };
  items: AdapterHealthRow[];
}

export interface AdapterIngestBody {
  adapterId: string;
  worker?: string;
  observedAt?: string;
  role?: AdapterRole;
  dryRun?: boolean;
  marketplaceIds?: string[];
  marketIds?: string[];
  listings?: unknown[];
  catalog?: unknown[];
  observations?: unknown[];
  fx?: Record<string, unknown>;
  listingLegPhase?: string;
  error?: string;
  /** §51.15 match attempt samples (optional) */
  matchAttempts?: AdapterMatchAttemptBody[];
  /** PTF-00C §8 — per-marketplace heartbeat, present even when listings=0/dryRun=false */
  marketplaceHealth?: AdapterMarketplaceHeartbeat[];
  /**
   * PTF-00C-R1 §2 — one id per real scheduled provider tick, shared by
   * EVERY listing batch/ingest call that tick produces. Nest durably
   * claims (providerId, marketplaceId, providerTickId) exactly once so
   * repeated batches/retries/duplicate delivery never double-count health
   * evidence. Omitted = no dedup requested (always applied).
   */
  providerTickId?: string;
  /**
   * PTF-00C-R1 §4/§6 — true when the worker's own tick deadline/budget was
   * exhausted before every configured marketplace×query unit could be
   * attempted. Never silently dropped — surfaces as explicit incomplete
   * evidence rather than a clean success.
   */
  tickIncomplete?: boolean;
}

export interface ListingLegsSummary {
  day1: string;
  pairs: Array<{ buy: string; sell: string; priority: string }>;
  /** Day-1 opportunity auto-publish does not use yahoo_jp */
  day1AutoPublishYahooJp: false;
  phase1Partners: string[];
  forbidden: string[];
}
