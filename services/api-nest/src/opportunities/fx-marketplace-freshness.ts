/**
 * Marketplace FX freshness authority.
 *
 * A composed snapshot row can be newer than an individual provider leg.
 * Never refresh an old leg merely because another provider produced a new row.
 */
export type MarketplaceFxLeg =
  | "gbpUsd"
  | "eurUsd"
  | "audUsd"
  | "usdtPerUsd";

export type LegProvenance = {
  source: string;
  capturedAt: string;
};

export type RateProvenance = Record<string, LegProvenance>;

export const COINGECKO_MARKETPLACE_TTL_MS = 15 * 60 * 1000;
export const FRANKFURTER_MARKETPLACE_TTL_MS = 6 * 60 * 60 * 1000;

export const FX_OBSERVED_AT_MAX_FUTURE_SKEW_MS = 5 * 60 * 1000;

export type FxObservedAtValidation =
  | { ok: true; observedAt: string; observedMs: number }
  | {
      ok: false;
      reason: "FX_OBSERVED_AT_INVALID" | "FX_OBSERVED_AT_FUTURE";
    };

export function validateFxObservedAt(
  observedAt: string | null | undefined,
  serverNowMs: number,
): FxObservedAtValidation {
  if (typeof observedAt !== "string" || !observedAt.trim()) {
    return { ok: false, reason: "FX_OBSERVED_AT_INVALID" };
  }
  const observedMs = Date.parse(observedAt);
  if (!Number.isFinite(observedMs) || !Number.isFinite(serverNowMs)) {
    return { ok: false, reason: "FX_OBSERVED_AT_INVALID" };
  }
  if (observedMs > serverNowMs + FX_OBSERVED_AT_MAX_FUTURE_SKEW_MS) {
    return { ok: false, reason: "FX_OBSERVED_AT_FUTURE" };
  }
  return {
    ok: true,
    observedAt: new Date(observedMs).toISOString(),
    observedMs,
  };
}

const EXPECTED_SOURCE: Record<MarketplaceFxLeg, "coingecko" | "frankfurter"> = {
  gbpUsd: "frankfurter",
  eurUsd: "frankfurter",
  audUsd: "frankfurter",
  usdtPerUsd: "coingecko",
};

const MAX_AGE_MS: Record<MarketplaceFxLeg, number> = {
  gbpUsd: FRANKFURTER_MARKETPLACE_TTL_MS,
  eurUsd: FRANKFURTER_MARKETPLACE_TTL_MS,
  audUsd: FRANKFURTER_MARKETPLACE_TTL_MS,
  usdtPerUsd: COINGECKO_MARKETPLACE_TTL_MS,
};

export function carryMarketplaceLeg(
  leg: MarketplaceFxLeg,
  value: string | null,
  provenance: RateProvenance | null,
  nowMs: number,
): string | null {
  if (value == null || !Number.isFinite(nowMs)) return null;
  const authority = provenance?.[leg];
  if (!authority || authority.source !== EXPECTED_SOURCE[leg]) return null;
  const capturedMs = Date.parse(authority.capturedAt);
  if (!Number.isFinite(capturedMs) || capturedMs > nowMs) return null;
  return nowMs - capturedMs <= MAX_AGE_MS[leg] ? value : null;
}
