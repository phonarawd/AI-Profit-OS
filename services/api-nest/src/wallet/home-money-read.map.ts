/**
 * Money v7.23 R1 · pure mapper (no DB · no mutation)
 * Reuses wallet buckets + settlement projection reads only.
 */

import { cmpAmount } from "../ledger/ledger.money";
import type {
  HomeMoneyReadMapInput,
  HomeMoneyReadState,
  HomeMoneyReadV1,
} from "./home-money-read.types";

const FORBIDDEN_RESPONSE_KEYS = [
  "availableUsdt",
  "todayPossible",
  "todayPossibleProfitUsdt",
  "profitUsdt",
  "lockedUsdt",
  "practiceUsdt",
  "liabilityUsdt",
  "ledgerTotal",
] as const;

export function assertHomeMoneyReadForbiddenKeys(
  raw: Record<string, unknown>,
): void {
  for (const key of FORBIDDEN_RESPONSE_KEYS) {
    if (Object.prototype.hasOwnProperty.call(raw, key)) {
      throw new Error(`home-money-read FORBIDDEN key: ${key}`);
    }
  }
}

function deriveState(principalUsdt: string): HomeMoneyReadState {
  // Fact registry: ready_empty = authenticated ∧ principal 집계 0
  return cmpAmount(principalUsdt, "0") > 0 ? "ready_data" : "ready_empty";
}

/**
 * Map existing Money reads → HomeMoneyReadV1.
 * principalUsdt must already be WalletBuckets.principalUsdt (no sum).
 * settlementCompletedTodayCount must already be COUNT (not USDT).
 */
export function mapHomeMoneyReadV1(
  input: HomeMoneyReadMapInput,
): HomeMoneyReadV1 {
  const principalUsdt = String(input.principalUsdt ?? "0");
  const count = Math.max(
    0,
    Math.floor(Number(input.settlementCompletedTodayCount) || 0),
  );
  const state = input.forceState ?? deriveState(principalUsdt);

  const dto: HomeMoneyReadV1 = {
    principalUsdt,
    settlementCompletedTodayCount: count,
    asOf: {
      principalUsdt: input.asOfPrincipalIso,
      settlementCompletedTodayCount: input.asOfSettlementIso,
    },
    source: {
      principalUsdt: "ledger_projection",
      settlementCompletedTodayCount: "settlement_projection",
    },
    state,
  };

  if (input.reasonCode) {
    dto.reasonCode = input.reasonCode;
  }

  assertHomeMoneyReadForbiddenKeys(dto as unknown as Record<string, unknown>);
  return dto;
}
