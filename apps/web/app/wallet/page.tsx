"use client";

import Link from "next/link";
import { SafeStopTrustMetric } from "@aipo/ui/components/trust/SafeStopTrustMetric";
import { BucketBreakdown } from "@aipo/ui/components/wallet/BucketBreakdown";
import { DemoWalletBanner } from "@aipo/ui/components/wallet/DemoWalletBanner";
import { T } from "@aipo/ui/copy/ko";

/**
 * Money §49.4 / §51.7 · UI §5.6 wallet home
 * Live balances wire via GET /api/v1/wallet/buckets (auth session todo).
 */
export default function Page() {
  return (
    <main className="p-6 text-lux-text" data-testid="wallet-home">
      <h1 className="text-xl font-semibold">{T.walletBuckets.pageTitle}</h1>
      {/* Live practiceUsdt from GET /wallet/buckets — hide when 0 via Banner props */}
      <DemoWalletBanner />
      <BucketBreakdown
        principalUsdt="0"
        profitUsdt="0"
        lockedUsdt="0"
        practiceUsdt="0"
        liabilityUsdt="0"
      />
      <SafeStopTrustMetric className="mt-4" count={0} />
      <div className="mt-6 flex flex-col gap-2">
        <Link
          href="/wallet/deposit?tab=usdt"
          data-testid="wallet-deposit-cta"
          className="rounded-lux-md bg-lux-accent px-4 py-3 text-center text-sm font-semibold text-lux-bg"
        >
          {T.walletBuckets.ctaDeposit}
        </Link>
        <Link
          href="/wallet/withdraw?mode=profit"
          data-testid="wallet-withdraw-profit"
          data-default-mode="profit"
          className="rounded-lux-md border border-lux-border px-4 py-3 text-center text-sm font-semibold text-lux-text"
        >
          {T.walletBuckets.ctaWithdraw}
        </Link>
        <Link
          href="/wallet/withdraw?mode=principal"
          data-testid="wallet-withdraw-principal"
          data-principal-reachable="true"
          className="rounded-lux-md border border-lux-border px-4 py-3 text-center text-sm text-lux-text-muted"
        >
          {T.withdrawMode.ctaOpenPrincipal}
        </Link>
        <Link
          href="/wallet/history"
          data-testid="wallet-history-link"
          className="rounded-lux-md border border-dashed border-lux-border px-4 py-3 text-center text-sm text-lux-text"
        >
          {T.walletBuckets.historyLink}
        </Link>
        <Link
          href="/me/guide/principal"
          className="text-center text-sm text-lux-text-muted underline"
        >
          {T.walletBuckets.guideLink}
        </Link>
      </div>
    </main>
  );
}
