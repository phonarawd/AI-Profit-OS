"use client";

import { T } from "../../copy/ko";

export type BucketBreakdownProps = {
  principalUsdt: string;
  profitUsdt: string;
  lockedUsdt: string;
  practiceUsdt: string;
  liabilityUsdt: string;
  principalKrw?: string | null;
  profitKrw?: string | null;
  lockedKrw?: string | null;
  liabilityKrw?: string | null;
  krwReady?: boolean;
  /** Hide practice row when zero (Money §49.4) */
  hidePracticeWhenZero?: boolean;
};

/**
 * Money §49.4 — wallet home 4-bucket breakdown.
 * Labels = T.walletBuckets · never invent bucket names in JSX.
 */
export function BucketBreakdown({
  principalUsdt,
  profitUsdt,
  lockedUsdt,
  practiceUsdt,
  liabilityUsdt,
  principalKrw = null,
  profitKrw = null,
  lockedKrw = null,
  liabilityKrw = null,
  krwReady = false,
  hidePracticeWhenZero = true,
}: BucketBreakdownProps) {
  const practiceZero =
    practiceUsdt === "0" || practiceUsdt === "0.0" || practiceUsdt === "0.00";
  const showPractice = !(hidePracticeWhenZero && practiceZero);

  const rows: Array<{ key: string; label: string; amount: string; krw: string | null }> = [
    {
      key: "principal",
      label: T.walletBuckets.workingPrincipal,
      amount: principalUsdt,
      krw: principalKrw,
    },
    {
      key: "profit",
      label: T.walletBuckets.withdrawableProfit,
      amount: profitUsdt,
      krw: profitKrw,
    },
    {
      key: "locked",
      label: T.walletBuckets.locked,
      amount: lockedUsdt,
      krw: lockedKrw,
    },
  ];
  if (showPractice) {
    rows.push({
      key: "practice",
      label: T.walletBuckets.practice,
      amount: practiceUsdt,
      krw: null,
    });
  }

  return (
    <section
      data-testid="bucket-breakdown"
      data-liability={liabilityUsdt}
      className="mt-4 space-y-3"
    >
      <div className="flex items-baseline justify-between">
        <span className="text-sm text-lux-text-muted">
          {T.walletBuckets.totalLabel}
        </span>
        <span
          className="text-2xl font-semibold text-lux-text"
          data-testid="bucket-liability"
        >
          {liabilityUsdt}{" "}
          <span className="text-sm font-normal">
            {T.walletBuckets.usdtSuffix}
          </span>
          {krwReady && liabilityKrw ? (
            <span className="mt-1 block text-sm font-normal text-lux-text-muted">
              {T.money.krwApprox.replace("{amount}", liabilityKrw)}
            </span>
          ) : null}
        </span>
      </div>
      <ul className="space-y-2">
        {rows.map((row) => (
          <li
            key={row.key}
            data-bucket={row.key}
            className="flex items-center justify-between text-sm"
          >
            <span className="text-lux-text-muted">
              {row.label}
            </span>
            <span className="text-lux-text">
              {row.amount} {T.walletBuckets.usdtSuffix}
              {krwReady && row.krw ? (
                <span className="mt-1 block text-xs text-lux-text-muted">
                  {T.money.krwApprox.replace("{amount}", row.krw)}
                </span>
              ) : null}
            </span>
          </li>
        ))}
      </ul>
      <p className="text-sm text-lux-text-muted">
        {T.walletBuckets.defaultProfitHint}
      </p>
      <p className="text-sm text-lux-text">
        {T.walletBuckets.principalAlways}
      </p>
    </section>
  );
}
