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

const ICONS = {
  principal: { src: "/wallet-v2/bucket-principal.svg", className: "walletV2BucketPrincipal" },
  profit: { src: "/wallet-v2/bucket-profit.svg", className: "walletV2BucketProfit" },
  locked: { src: "/wallet-v2/bucket-locked.svg", className: "walletV2BucketLocked" },
  practice: { src: "/wallet-v2/bucket-practice.svg", className: "walletV2BucketPractice" },
} as const;

/**
 * Money §49.4 — wallet home 4-bucket breakdown.
 * Labels = T.walletBuckets · presentation = Wallet V2 cards.
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

  const rows: Array<{
    key: keyof typeof ICONS;
    label: string;
    support: string;
    supportShort: string;
    amount: string;
  }> = [
    {
      key: "principal",
      label: T.walletBuckets.workingPrincipal,
      support: T.walletBuckets.workingPrincipalSupport,
      supportShort: T.walletBuckets.workingPrincipalSupportShort,
      amount: principalUsdt,
    },
    {
      key: "profit",
      label: T.walletBuckets.withdrawableProfit,
      support: T.walletBuckets.withdrawableProfitSupport,
      supportShort: T.walletBuckets.withdrawableProfitSupportShort,
      amount: profitUsdt,
    },
    {
      key: "locked",
      label: T.walletBuckets.locked,
      support: T.walletBuckets.lockedSupport,
      supportShort: T.walletBuckets.lockedSupportShort,
      amount: lockedUsdt,
    },
  ];
  if (showPractice) {
    rows.push({
      key: "practice",
      label: T.walletBuckets.practice,
      support: T.walletBuckets.practiceSupport,
      supportShort: T.walletBuckets.practiceSupport,
      amount: practiceUsdt,
    });
  }

  return (
    <section
      data-testid="bucket-breakdown"
      data-liability={liabilityUsdt}
      className="walletV2Buckets"
    >
      {rows.map((row) => (
        <article key={row.key} data-bucket={row.key} className="walletV2Bucket">
          <div className="walletV2BucketLabel">
            <span className={`walletV2BucketIcon ${ICONS[row.key].className}`}>
              <img src={ICONS[row.key].src} alt="" width={15} height={15} />
            </span>
            <span>{row.label}</span>
          </div>
          <p className="walletV2BucketAmount">
            {row.amount} {T.walletBuckets.usdtSuffix}
          </p>
          <p className="walletV2BucketSupport" data-short={row.supportShort}>
            {row.support}
          </p>
        </article>
      ))}
    </section>
  );
}
