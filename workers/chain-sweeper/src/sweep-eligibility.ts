/**
 * §43.2 per-deposit eligibility — DETECTED sweep FORBIDDEN · CONFIRMED+grace only.
 */

import {
  MIN_SWEEP_AMOUNT_USDT,
  SWEEP_ELIGIBLE_STATUS,
  SWEEP_FORBIDDEN_STATUSES,
  SWEEP_GRACE_SEC,
} from "./constants";

export type SweepCandidate = {
  depositEventId: string;
  status: string;
  amountUsdt: string;
  /** ISO or epoch ms when ledger credited */
  creditedAt: string | number | Date | null | undefined;
  now?: Date;
  minSweepAmountUsdt?: string;
  graceSec?: number;
};

export type SweepEligibility = {
  eligible: boolean;
  reason:
    | "ok"
    | "status_detected_forbidden"
    | "status_not_confirmed"
    | "already_swept"
    | "grace_pending"
    | "below_min_amount"
    | "invalid_amount"
    | "missing_credited_at";
};

function cmpDecimal(a: string, b: string): number {
  const [ai, af = ""] = a.split(".");
  const [bi, bf = ""] = b.split(".");
  const pad = Math.max(af.length, bf.length);
  const aFull = `${ai}${af.padEnd(pad, "0")}`.replace(/^0+(?=\d)/, "") || "0";
  const bFull = `${bi}${bf.padEnd(pad, "0")}`.replace(/^0+(?=\d)/, "") || "0";
  if (aFull.length !== bFull.length) {
    return aFull.length > bFull.length ? 1 : -1;
  }
  if (aFull === bFull) return 0;
  return aFull > bFull ? 1 : -1;
}

function toMs(v: string | number | Date): number | null {
  if (v instanceof Date) return v.getTime();
  if (typeof v === "number" && Number.isFinite(v)) return v;
  const t = Date.parse(String(v));
  return Number.isFinite(t) ? t : null;
}

/** Pure eligibility — never allows ui_confirmed / seen (DETECTED path). */
export function evaluateSweepEligibility(
  input: SweepCandidate,
): SweepEligibility {
  const status = String(input.status ?? "");

  if (status === "swept") {
    return { eligible: false, reason: "already_swept" };
  }

  if (
    (SWEEP_FORBIDDEN_STATUSES as readonly string[]).includes(status) ||
    status === "ui_confirmed"
  ) {
    return { eligible: false, reason: "status_detected_forbidden" };
  }

  if (status !== SWEEP_ELIGIBLE_STATUS) {
    return { eligible: false, reason: "status_not_confirmed" };
  }

  const amount = String(input.amountUsdt ?? "");
  if (!/^[0-9]+(\.[0-9]+)?$/.test(amount)) {
    return { eligible: false, reason: "invalid_amount" };
  }

  const minAmt = input.minSweepAmountUsdt ?? MIN_SWEEP_AMOUNT_USDT;
  if (cmpDecimal(amount, minAmt) < 0) {
    return { eligible: false, reason: "below_min_amount" };
  }

  if (input.creditedAt == null || input.creditedAt === "") {
    return { eligible: false, reason: "missing_credited_at" };
  }

  const creditedMs = toMs(input.creditedAt);
  if (creditedMs == null) {
    return { eligible: false, reason: "missing_credited_at" };
  }

  const now = input.now ?? new Date();
  const grace = input.graceSec ?? SWEEP_GRACE_SEC;
  if (now.getTime() - creditedMs < grace * 1000) {
    return { eligible: false, reason: "grace_pending" };
  }

  return { eligible: true, reason: "ok" };
}
