/**
 * Money §49.2a — 퍼뜩 P Fact fields.
 * principalUsdt = WalletBuckets SoT.
 * affordableCount / nearMissCount / topSuggestDepositUsdt = Engine §0.0.5.1 pass-through.
 * NEVER classify opportunities or invent balances here.
 */

export const BALANCE_AWARE_CLASSIFICATION_OWNER = "engine:§0.0.5.1" as const;

export type BalanceAwareFactV1 = {
  principalUsdt: string;
  affordableCount?: number;
  nearMissCount?: number;
  topSuggestDepositUsdt?: string;
  classificationOwner: typeof BALANCE_AWARE_CLASSIFICATION_OWNER;
};

export type ParticipatePrincipalView = {
  /** Participate capital SoT — principal only (§49.2) */
  principalUsdt: string;
  participateCapitalSource: "principal";
};

/** GET /wallet/buckets · participate preflight capital slice */
export function principalForParticipate(buckets: {
  principalUsdt: string;
}): ParticipatePrincipalView {
  return {
    principalUsdt: String(buckets.principalUsdt ?? "0"),
    participateCapitalSource: "principal",
  };
}

/**
 * Build P-lane Fact. Engine counts are optional pass-through — Money never computes them.
 */
export function buildBalanceAwareFact(input: {
  principalUsdt: string;
  affordableCount?: number;
  nearMissCount?: number;
  topSuggestDepositUsdt?: string | null;
}): BalanceAwareFactV1 {
  const fact: BalanceAwareFactV1 = {
    principalUsdt: String(input.principalUsdt ?? "0"),
    classificationOwner: BALANCE_AWARE_CLASSIFICATION_OWNER,
  };
  if (typeof input.affordableCount === "number" && input.affordableCount >= 0) {
    fact.affordableCount = Math.floor(input.affordableCount);
  }
  if (typeof input.nearMissCount === "number" && input.nearMissCount >= 0) {
    fact.nearMissCount = Math.floor(input.nearMissCount);
  }
  const top = input.topSuggestDepositUsdt;
  if (top != null && String(top).trim() !== "" && Number(top) > 0) {
    fact.topSuggestDepositUsdt = String(top).trim();
  }
  return fact;
}
