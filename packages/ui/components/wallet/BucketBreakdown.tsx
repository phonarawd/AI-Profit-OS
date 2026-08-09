"use client";

import { T } from "../../copy/ko";

export type BucketBreakdownProps = {
  principalUsdt: string;
  profitUsdt: string;
  lockedUsdt: string;
  practiceUsdt: string;
  liabilityUsdt: string;
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
  hidePracticeWhenZero = true,
}: BucketBreakdownProps) {
  const practiceZero =
    practiceUsdt === "0" || practiceUsdt === "0.0" || practiceUsdt === "0.00";
  const showPractice = !(hidePracticeWhenZero && practiceZero);

  const rows: Array<{ key: string; label: string; amount: string }> = [
    {
      key: "principal",
      label: T.walletBuckets.workingPrincipal,
      amount: principalUsdt,
    },
    {
      key: "profit",
      label: T.walletBuckets.withdrawableProfit,
      amount: profitUsdt,
    },
    {
      key: "locked",
      label: T.walletBuckets.locked,
      amount: lockedUsdt,
    },
  ];
  if (showPractice) {
    rows.push({
      key: "practice",
      label: T.walletBuckets.practice,
      amount: practiceUsdt,
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
