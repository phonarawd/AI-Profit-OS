"use client";

import Link from "next/link";
import { BucketBreakdown } from "@aipo/ui/components/wallet/BucketBreakdown";
import { DemoWalletBanner } from "@aipo/ui/components/wallet/DemoWalletBanner";
import { T } from "@aipo/ui/copy/ko";

/**
 * Money §49.4 / §51.7 wallet home — total + 4-bucket breakdown + practice banner.
 * Live balances wire via GET /api/v1/wallet/buckets (auth session todo).
 */
export default function Page() {
  return (
    <main className="p-6 text-lux-text">
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
      <div className="mt-6 flex flex-col gap-2">
        <Link
          href="/wallet/withdraw?mode=profit"
          data-testid="wallet-withdraw-profit"
          data-default-mode="profit"
          className="rounded-lux-md bg-lux-accent px-4 py-3 text-center text-sm font-semibold text-lux-bg"
        >
          {T.withdrawMode.ctaProfitWithdraw}
        </Link>
        <Link
          href="/wallet/withdraw?mode=principal"
          data-testid="wallet-withdraw-principal"
          data-principal-reachable="true"
          className="rounded-lux-md border border-lux-border px-4 py-3 text-center text-sm text-lux-text"
        >
          {T.withdrawMode.ctaOpenPrincipal}
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
