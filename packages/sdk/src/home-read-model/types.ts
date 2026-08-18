/**
 * @aipo/sdk/home-read-model — Engine v7.23 R1 HomeReadModelV1
 */

export type HomeViewState = [
  "ready_empty",
  "ready_data",
  "stale",
  "recoverable_error",
  "blocked",
  "unauthorized",
][number];

export type HomeSessionStatus = "guest" | "authenticated" | "expired";

export type HomeReadModelResponse = {
  viewState: HomeViewState;
  reasonCode?: string;
  session: { status: HomeSessionStatus };
  money: {
    principalUsdt: string;
    settlementCompletedTodayCount: number;
    asOf: unknown;
    source: unknown;
    state: string;
    reasonCode?: string;
  } | null;
  opportunity: {
    todayPossibleProfitUsdt: string;
    affordableCount: number;
    nearMissCount: number;
    lockedHighCount: number;
    topSuggestDepositUsdt: string | null;
    itemCount: number;
    asOf: string | null;
    state: string;
    reasonCode?: string;
    provenance: {
      todayPossibleProfitUsdt: {
        provenance: "server_derived";
        derivationId: string;
      };
    };
  } | null;
  growth: {
    tickerMode: string;
    counterMode: string;
    ledgerTotal: number;
    asOf: string | null;
    state: string;
    reasonCode?: string;
  } | null;
  ledgerTotal: number | null;
  todayPossibleProfitUsdt: string | null;
  provenance: {
    todayPossibleProfitUsdt: {
      provenance: "server_derived";
      derivationId: string;
    } | null;
    ledgerTotal: {
      provenance: "server_derived";
      derivationId: string;
    } | null;
  };
  domainFsm: null;
};

export type HomeReadModelRequestOpts = {
  apiBase?: string;
  getAccessToken?: () => Promise<string | null | undefined>;
  signal?: AbortSignal;
};
