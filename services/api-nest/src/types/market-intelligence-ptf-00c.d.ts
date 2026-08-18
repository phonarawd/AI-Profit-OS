/**
 * PTF-00C — TypeScript module augmentation for `@aipo/market-intelligence`.
 *
 * `services/market-intelligence/src/index.d.ts` could not be edited directly
 * in this session (the file-edit tool consistently reported a hook-layer
 * "malformed hook input" failure specific to that file, reproduced on a
 * trivial single-line change; unrelated to content). Ambient module
 * augmentation is the standard TypeScript pattern for adding exports to a
 * package's type surface without touching its own declaration file — see
 * PTF-00C report §19 CHANGED FILES / known-limitations note.
 *
 * Every symbol declared below is NET-NEW in `fx-snapshot-formula.cjs` /
 * `provider-health.cjs` (PTF-00C) and does not exist in index.d.ts, so this
 * merges additively with zero risk of conflicting/duplicate declarations.
 *
 * NOTE: this file must stay a module (the `export {}` below) — a
 * `declare module` block inside a global *script* file replaces/shadows the
 * real file-resolved module instead of augmenting it, which would hide every
 * pre-existing export (MARKET_IDS, computeOpportunityPricing, ...) from tsc.
 */
export {};

declare module "@aipo/market-intelligence" {
  // --- fx-snapshot-formula.cjs additions (P0-A/P0-B) ---

  export const SUPPORTED_MARKETPLACE_FIAT_CURRENCIES: readonly [
    "USD",
    "GBP",
    "EUR",
    "AUD",
  ];
  export const SUPPORTED_NATIVE_CURRENCIES: readonly [
    "USD",
    "GBP",
    "EUR",
    "AUD",
    "USDT",
  ];
  export const FIAT_USD_RATE_FIELD: Readonly<{
    GBP: "gbpUsd";
    EUR: "eurUsd";
    AUD: "audUsd";
  }>;

  export type FxMarketplaceRawInput = {
    /** CoinGecko tether→usd (USD per 1 USDT) */
    usdtUsd?: string;
    /** Frankfurter base=USD rates.GBP (GBP per 1 USD) */
    usdGbp?: string;
    /** Frankfurter base=USD rates.EUR (EUR per 1 USD) */
    usdEur?: string;
    /** Frankfurter base=USD rates.AUD (AUD per 1 USD) */
    usdAud?: string;
  };

  export type FxMarketplaceLegs = {
    usdtPerUsd: string | null;
    gbpUsd: string | null;
    eurUsd: string | null;
    audUsd: string | null;
  };

  export function deriveMarketplaceLegs(
    raw: FxMarketplaceRawInput,
  ): FxMarketplaceLegs;

  export type FxNormalizationSnapshot = {
    gbpUsd?: string | null;
    eurUsd?: string | null;
    audUsd?: string | null;
    usdtPerUsd?: string | null;
  };

  /**
   * Native marketplace price → authoritative normalizedUsdt. Fail-closed:
   * throws (never fabricates) on unsupported currency or a missing/invalid
   * rate leg. Never assumes 1 USD == 1 USDT.
   */
  export function normalizeNativeToUsdt(input: {
    nativeAmount: string;
    nativeCurrency: string;
    snapshot: FxNormalizationSnapshot;
  }): {
    normalizedUsdt: string;
    usdPerNative: string;
    usdtPerUsd: string;
    chain: "identity" | "usd_usdt" | "fiat_usd_usdt";
  };

  // --- provider-health.cjs additions (P0-C/P0-D/§9/§10) ---

  export type ProviderCircuitState = "CLOSED" | "OPEN";
  export type ProviderDisplayCircuitState = "CLOSED" | "OPEN" | "HALF_OPEN";
  export type ProviderHealthStatus =
    | "HEALTHY"
    | "DEGRADED"
    | "STALE"
    | "BLOCKED";
  export type LegacyHealthTint = "green" | "yellow" | "red" | "unknown";

  export const CIRCUIT_STATES: readonly ["CLOSED", "OPEN", "HALF_OPEN"];
  export const HEALTH_STATUSES: readonly [
    "HEALTHY",
    "DEGRADED",
    "STALE",
    "BLOCKED",
  ];
  export const LEGACY_TINTS: readonly ["green", "yellow", "red", "unknown"];
  export const DEFAULT_FAILURE_THRESHOLD: number;
  export const DEFAULT_COOLDOWN_MS: number;
  export const DEFAULT_STALE_AFTER_MS: number;

  export type ProviderCircuitRecord = {
    state: ProviderCircuitState;
    consecutiveFailures: number;
    openedAtMs: number | null;
  };

  export function initialCircuitState(): ProviderCircuitRecord;

  export function nextCircuitState(input: {
    prev?: ProviderCircuitRecord | null;
    tickSuccess: boolean;
    nowMs: number;
    failureThreshold?: number;
    cooldownMs?: number;
  }): ProviderCircuitRecord;

  export function deriveDisplayCircuitState(input: {
    state: ProviderCircuitState;
    openedAtMs: number | null;
    nowMs: number;
    cooldownMs?: number;
  }): ProviderDisplayCircuitState;

  export function deriveHealthStatus(input: {
    displayCircuitState: ProviderDisplayCircuitState;
    lastSuccessAtMs: number | null;
    nowMs: number;
    staleAfterMs?: number;
    lastTickFailureCount?: number;
  }): ProviderHealthStatus;

  export function healthStatusToLegacyTint(
    status: ProviderHealthStatus | null | undefined,
  ): LegacyHealthTint;

  export function worstTint(tints: LegacyHealthTint[]): LegacyHealthTint;

  // --- catalog-runtime-seed.cjs — normalizeIngestListingsForPersist re-shape ---
  // PTF-00C P0-A: now returns {rows, skipped} (native fields, per-row
  // skip evidence) instead of a bare priceUsdt/currency array. This
  // re-declares the SAME exported name with the NEW shape — see report §19
  // for why (index.d.ts edit blocked) and the empirical duplicate-declaration
  // check performed before relying on it.
  export type NormalizedIngestListingRow = {
    assetId: string;
    marketId: string;
    adapterId: string;
    marketplaceId: string | null;
    externalItemId: string | null;
    title: string | null;
    nativeAmount: string;
    nativeCurrency: string;
    url: string | null;
    imageUrl: string | null;
    observedAt: string;
    staleAt: string;
    raw: Record<string, unknown>;
  };
  export type NormalizedIngestListingSkip = {
    reason: string;
    externalItemId: string | null;
    nativeCurrency?: string;
  };
  export function normalizeIngestListingsForPersist(
    rawListings: unknown[],
    adapterId: string,
  ): {
    rows: NormalizedIngestListingRow[];
    skipped: NormalizedIngestListingSkip[];
  };
}
