/**
 * Money v7.23 R1 · HomeMoneyReadV1
 * schemas/home-money-read.v1.json
 */

export type HomeMoneyReadState = [
  "ready_empty",
  "ready_data",
  "stale",
  "recoverable_error",
  "blocked",
  "unauthorized",
][number];

export type HomeMoneyReadV1 = {
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

export type HomeMoneyReadMapInput = {
  principalUsdt: string;
  settlementCompletedTodayCount: number;
  asOfPrincipalIso: string;
  asOfSettlementIso: string;
  /** when set, overrides derived ready_* state */
  forceState?: HomeMoneyReadState;
  reasonCode?: string;
};
