/**
 * Engine §0.0.5.1 override merge · Admin §9.8.9 schema SSOT
 * schemas/user-opportunity-override.v1.json
 * FORBIDDEN: ledger credit/debit · RNG · compareReady false→true forge
 */

import type { CapitalBand } from "./opportunities.types";

export const DAY1_MAX_PINS_PER_USER = 10;

export const OVERRIDE_AUDIT = {
  upsert: "admin.user.opportunity_override.upsert",
  delete: "admin.user.opportunity_override.delete",
} as const;

/** RBAC capability · schemas/admin-rbac.v1.json */
export const USER_OPPORTUNITY_OVERRIDE_CAPABILITY =
  "userOpportunityOverride" as const;

export type UserOpportunityOverrideV1 = {
  userId: string;
  opportunityId: string;
  hidden?: boolean;
  forceShow?: boolean;
  pinOrder?: number | null;
  marginPctOverride?: string | null;
  expectedProfitUsdtOverride?: string | null;
  capitalBandForce?: CapitalBand | null;
  reason: string;
  updatedByAdminId: string;
  updatedAt: string;
};

export type OverrideMergeInput = {
  expectedProfitUsdt: string;
  compareReady: boolean;
};

export type OverrideMergeResult = {
  /** hidden → feed exclude */
  excludeFromFeed: boolean;
  forceShow: boolean;
  pinOrder: number | null;
  /** display / participate guard (override wins when set) */
  expectedProfitUsdt: string;
  marginPctOverride: string | null;
  capitalBandForce: CapitalBand | null;
  /** NEVER forged false→true by override */
  compareReady: boolean;
  usedExpectedProfitOverride: boolean;
};

const DECIMAL_RE = /^-?[0-9]+(\.[0-9]+)?$/;
const CAPITAL_BANDS: CapitalBand[] = [
  "micro",
  "small",
  "mid",
  "high",
  "whale",
];

export function assertHiddenForceShowExclusive(
  hidden?: boolean,
  forceShow?: boolean,
): void {
  if (hidden === true && forceShow === true) {
    throw new Error("HIDDEN_FORCE_SHOW_MUTEX");
  }
}

export function assertPinOrder(pinOrder: number | null | undefined): void {
  if (pinOrder == null) return;
  if (!Number.isInteger(pinOrder) || pinOrder < 0) {
    throw new Error("PIN_ORDER_INVALID");
  }
}

export function assertDecimalString(
  value: string | null | undefined,
  code: string,
): void {
  if (value == null || value === "") return;
  if (!DECIMAL_RE.test(value)) throw new Error(code);
}

export function assertCapitalBandForce(
  band: string | null | undefined,
): asserts band is CapitalBand | null | undefined {
  if (band == null || band === "") return;
  if (!CAPITAL_BANDS.includes(band as CapitalBand)) {
    throw new Error("CAPITAL_BAND_FORCE_INVALID");
  }
}

export function assertReason(reason: string): void {
  if (typeof reason !== "string" || reason.trim().length < 10) {
    throw new Error("REASON_MIN_10");
  }
}

/**
 * Merge Admin §9.8.9 override onto a card projection (balance-aware feed precursor).
 * compareReady is never raised false→true here.
 */
export function mergeUserOpportunityOverride(
  base: OverrideMergeInput,
  userOv: UserOpportunityOverrideV1 | null | undefined,
): OverrideMergeResult {
  if (!userOv) {
    return {
      excludeFromFeed: false,
      forceShow: false,
      pinOrder: null,
      expectedProfitUsdt: base.expectedProfitUsdt,
      marginPctOverride: null,
      capitalBandForce: null,
      compareReady: base.compareReady,
      usedExpectedProfitOverride: false,
    };
  }

  assertHiddenForceShowExclusive(userOv.hidden, userOv.forceShow);

  const usedExpectedProfitOverride =
    userOv.expectedProfitUsdtOverride != null &&
    userOv.expectedProfitUsdtOverride !== "";

  return {
    excludeFromFeed: userOv.hidden === true,
    forceShow: userOv.forceShow === true,
    pinOrder: userOv.pinOrder ?? null,
    expectedProfitUsdt: usedExpectedProfitOverride
      ? String(userOv.expectedProfitUsdtOverride)
      : base.expectedProfitUsdt,
    marginPctOverride:
      userOv.marginPctOverride != null && userOv.marginPctOverride !== ""
        ? String(userOv.marginPctOverride)
        : null,
    capitalBandForce: userOv.capitalBandForce ?? null,
    // true→false hide allowed via excludeFromFeed; false→true forge FORBIDDEN
    compareReady: base.compareReady,
    usedExpectedProfitOverride,
  };
}

/** Sort key: pinned first (asc pinOrder), then caller-provided rank */
export function compareFeedPinOrder(
  a: { pinOrder: number | null },
  b: { pinOrder: number | null },
): number {
  const ap = a.pinOrder;
  const bp = b.pinOrder;
  if (ap != null && bp != null) return ap - bp;
  if (ap != null) return -1;
  if (bp != null) return 1;
  return 0;
}

/** Pure RBAC matrix from schemas/admin-rbac.v1 default (guard wires later) */
export function userOpportunityOverrideAccess(
  roleId: "super" | "finance" | "cs" | "risk" | "marketing",
): "none" | "read" | "write" {
  if (roleId === "super" || roleId === "finance") return "write";
  if (roleId === "cs") return "read";
  return "none";
}
