/**
 * 실USDT/실KRW는 출금 broadcast에서만 나간다.
 * 관측 잔액이 없거나 오래됐거나 부족하면 전송하지 않는다.
 */
import { cmpAmount, parseAmount } from "../ledger/ledger.money";

export type TreasurySolvencyInput = {
  requestedAmount: string;
  treasuryObserved: string | null;
  sourceFresh: boolean;
};

export type TreasurySolvencyCode =
  | "TREASURY_BALANCE_UNKNOWN"
  | "TREASURY_STALE"
  | "TREASURY_INSUFFICIENT";

export type TreasurySolvencyResult =
  | { ok: true }
  | { ok: false; code: TreasurySolvencyCode };

export function assertTreasurySolvencyForBroadcast(
  input: TreasurySolvencyInput,
): TreasurySolvencyResult {
  const observed = input.treasuryObserved;
  if (observed == null || observed === "") {
    return { ok: false, code: "TREASURY_BALANCE_UNKNOWN" };
  }
  parseAmount(observed);
  parseAmount(input.requestedAmount);
  if (!input.sourceFresh) {
    return { ok: false, code: "TREASURY_STALE" };
  }
  if (cmpAmount(observed, input.requestedAmount) < 0) {
    return { ok: false, code: "TREASURY_INSUFFICIENT" };
  }
  return { ok: true };
}

export function assertCanBroadcast(input: TreasurySolvencyInput & {
  signerBound: boolean;
}): TreasurySolvencyResult | { ok: false; code: "WITHDRAW_BROADCAST_NOT_BOUND" } {
  const solvency = assertTreasurySolvencyForBroadcast(input);
  if (!solvency.ok) return solvency;
  if (!input.signerBound) {
    return { ok: false, code: "WITHDRAW_BROADCAST_NOT_BOUND" };
  }
  return { ok: true };
}
