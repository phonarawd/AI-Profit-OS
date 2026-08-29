"use client";

import { T } from "../../copy/ko";

export type SuccessCtaEmphasis = "profit_withdraw" | "merge";

export type SuccessBucketCtasProps = {
  /** UX flag · default profit_withdraw (§49.4) */
  emphasis?: SuccessCtaEmphasis;
  onMerge?: () => void;
  onLater?: () => void;
};

/**
 * Money §49.4 success receipt 3CTA:
 * 수익만 출금 · 원금에 합치기 · 나중에
 */
export function SuccessBucketCtas({
  emphasis = "profit_withdraw",
  onMerge,
  onLater,
}: SuccessBucketCtasProps) {
  const profitPrimary = emphasis === "profit_withdraw";
  const mergePrimary = emphasis === "merge";

  const primaryCls =
    "rounded-pd-md bg-pd-accent px-4 py-3 text-center text-sm font-semibold text-pd-bg";
  const secondaryCls =
    "rounded-pd-md border border-pd-border px-4 py-3 text-center text-sm text-pd-text";

  return (
    <div
      data-testid="success-bucket-ctas"
      data-cta-count="3"
      data-emphasis={emphasis}
      className="mt-6 flex flex-col gap-2"
    >
      <a
        href="/wallet/withdraw?mode=profit"
        data-testid="cta-success-profit"
        data-cta="profit_withdraw"
        className={profitPrimary ? primaryCls : secondaryCls}
      >
        {T.successBucketCta.ctaProfitOnly}
      </a>
      <button
        type="button"
        data-testid="cta-success-merge"
        data-cta="merge"
        onClick={onMerge}
        className={mergePrimary ? primaryCls : secondaryCls}
      >
        {T.successBucketCta.ctaMerge}
      </button>
      <button
        type="button"
        data-testid="cta-success-later"
        data-cta="later"
        onClick={onLater}
        className={secondaryCls}
      >
        {T.successBucketCta.ctaLater}
      </button>
    </div>
  );
}
