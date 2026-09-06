/**
 * §1.4 출금 부채·커버리지. principal+profit만 더하고 locked를 빼는 식은 FAIL.
 * UNRESERVED_USER_LIABILITIES / TREASURY_UNRESERVED_AVAILABLE / UNRESERVED_COVERAGE
 * 레거시 별칭은 같은 값의 동의어다.
 */
import { addAmount, cmpAmount, parseAmount, subAmount } from "../ledger/ledger.money";

/** request=auth_ok · approved=queued · broadcasting · ledger_posted */
export const WITHDRAW_IN_FLIGHT_STATUSES = [
  "auth_ok",
  "queued",
  "broadcasting",
  "ledger_posted",
] as const;

/** A3 운영/테스트 키와 분리. */
export const WITHDRAW_RESERVE_LOCK_KEY = 76090614;

export type WithdrawCoverageBuckets = {
  principalUsdt: string;
  profitUsdt: string;
  lockedUsdt: string;
  pendingRefundUsdt?: string;
  otherReturnableUsdt?: string;
  reservedWithdrawalUsdt: string;
};

export type TreasuryUnreservedInput = {
  treasurySpendableUsdt: string | null;
  treasurySourceFresh: boolean;
  reservedWithdrawalUsdt: string;
  worstCaseFeeUsdt: string;
  safetyBufferUsdt: string;
};

export type UnreservedCoverage =
  | { kind: "n/a"; reason: "zero_liabilities" }
  | { kind: "ratio"; available: string; liabilities: string; atLeastOne: boolean };

export function computeUnreservedUserLiabilities(
  input: WithdrawCoverageBuckets,
): string {
  const pending = input.pendingRefundUsdt ?? "0";
  const other = input.otherReturnableUsdt ?? "0";
  const gross = addAmount(
    addAmount(
      addAmount(addAmount(input.principalUsdt, input.profitUsdt), input.lockedUsdt),
      pending,
    ),
    other,
  );
  return subAmount(gross, input.reservedWithdrawalUsdt);
}

export const computeTotalWithdrawableUserLiabilities =
  computeUnreservedUserLiabilities;

export function computeTreasuryUnreservedAvailable(
  input: TreasuryUnreservedInput,
):
  | { ok: true; value: string }
  | {
      ok: false;
      code:
        | "TREASURY_BALANCE_UNKNOWN"
        | "TREASURY_STALE"
        | "TREASURY_INSUFFICIENT";
    } {
  const observed = input.treasurySpendableUsdt;
  if (observed == null || observed === "") {
    return { ok: false, code: "TREASURY_BALANCE_UNKNOWN" };
  }
  parseAmount(observed);
  if (!input.treasurySourceFresh) {
    return { ok: false, code: "TREASURY_STALE" };
  }
  const after = subAmount(
    subAmount(subAmount(observed, input.reservedWithdrawalUsdt), input.worstCaseFeeUsdt),
    input.safetyBufferUsdt,
  );
  if (cmpAmount(after, "0") < 0) {
    return { ok: false, code: "TREASURY_INSUFFICIENT" };
  }
  return { ok: true, value: after };
}

export const computeWithdrawalTreasuryAvailable =
  computeTreasuryUnreservedAvailable;

export function computeUnreservedCoverage(input: {
  available: string;
  liabilities: string;
}): UnreservedCoverage {
  if (parseAmount(input.liabilities) === 0n) {
    return { kind: "n/a", reason: "zero_liabilities" };
  }
  if (parseAmount(input.liabilities) < 0n) {
    return {
      kind: "ratio",
      available: input.available,
      liabilities: input.liabilities,
      atLeastOne: false,
    };
  }
  return {
    kind: "ratio",
    available: input.available,
    liabilities: input.liabilities,
    atLeastOne: cmpAmount(input.available, input.liabilities) >= 0,
  };
}

export const computeWithdrawalLiquidityCoverage = computeUnreservedCoverage;

export type WithdrawReservationDecision =
  | { ok: true; reservedAfter: string; availableAfter: string; coverage: UnreservedCoverage }
  | {
      ok: false;
      code:
        | "TREASURY_BALANCE_UNKNOWN"
        | "TREASURY_STALE"
        | "TREASURY_INSUFFICIENT"
        | "UNRESERVED_COVERAGE_BELOW_ONE";
    };

export function evaluateWithdrawReservation(input: WithdrawCoverageBuckets &
  TreasuryUnreservedInput & {
    requestAmountUsdt: string;
    requestFeeUsdt: string;
  }): WithdrawReservationDecision {
  const reservedAfter = addAmount(
    input.reservedWithdrawalUsdt,
    input.requestAmountUsdt,
  );
  const feesAfter = addAmount(input.worstCaseFeeUsdt, input.requestFeeUsdt);
  const available = computeTreasuryUnreservedAvailable({
    treasurySpendableUsdt: input.treasurySpendableUsdt,
    treasurySourceFresh: input.treasurySourceFresh,
    reservedWithdrawalUsdt: reservedAfter,
    worstCaseFeeUsdt: feesAfter,
    safetyBufferUsdt: input.safetyBufferUsdt,
  });
  if (!available.ok) return available;

  const liabilitiesAfter = computeUnreservedUserLiabilities({
    ...input,
    reservedWithdrawalUsdt: reservedAfter,
  });
  const coverage = computeUnreservedCoverage({
    available: available.value,
    liabilities: liabilitiesAfter,
  });
  if (coverage.kind === "ratio" && !coverage.atLeastOne) {
    return { ok: false, code: "UNRESERVED_COVERAGE_BELOW_ONE" };
  }
  return {
    ok: true,
    reservedAfter,
    availableAfter: available.value,
    coverage,
  };
}

export function readTreasuryObservation(env: NodeJS.ProcessEnv = process.env): {
  treasurySpendableUsdt: string | null;
  treasurySourceFresh: boolean;
  safetyBufferUsdt: string;
} {
  const observed = (env.AIPO_TREASURY_USDT_OBSERVED ?? "").trim();
  const fresh = env.AIPO_TREASURY_SOURCE_FRESH !== "false";
  const buffer = (env.AIPO_TREASURY_SAFETY_BUFFER_USDT ?? "0").trim() || "0";
  return {
    treasurySpendableUsdt: observed === "" ? null : observed,
    treasurySourceFresh: fresh,
    safetyBufferUsdt: buffer,
  };
}
