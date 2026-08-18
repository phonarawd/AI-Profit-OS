/**
 * HomeMoneyReadV1 — GET /api/v1/me/home-money-read
 * Money v7.23 R1 · schemas/home-money-read.v1.json
 */

export type HomeMoneyReadState =
  | "ready_empty"
  | "ready_data"
  | "stale"
  | "recoverable_error"
  | "blocked"
  | "unauthorized";

export type HomeMoneyReadResponse = {
  principalUsdt: string;
  settlementCompletedTodayCount: number;
  asOf: {
    principalUsdt: string;
    settlementCompletedTodayCount: string;
  };
  source: {
    principalUsdt: "ledger_projection";
    settlementCompletedTodayCount: "settlement_projection";
  };
  state: HomeMoneyReadState;
  reasonCode?: string;
};

export type HomeMoneyReadRequestOpts = {
  apiBase?: string;
  getAccessToken?: () => string | null | Promise<string | null>;
  signal?: AbortSignal;
};
