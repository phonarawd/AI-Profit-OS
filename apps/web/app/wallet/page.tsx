"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  fetchWalletBuckets,
  type WalletBucketsResponse,
} from "@aipo/sdk/wallet";
import { SafeStopTrustMetric } from "@aipo/ui/components/trust/SafeStopTrustMetric";
import { BucketBreakdown } from "@aipo/ui/components/wallet/BucketBreakdown";
import { DemoWalletBanner } from "@aipo/ui/components/wallet/DemoWalletBanner";
import { T } from "@aipo/ui/copy/ko";

const EMPTY_BUCKETS: WalletBucketsResponse = {
  userId: "",
  principalUsdt: "0",
  profitUsdt: "0",
  lockedUsdt: "0",
  practiceUsdt: "0",
  liabilityUsdt: "0",
  asOfLedgerEntryId: "none",
};

/**
 * PART9f — Money §49.4 / §51.7 · UI §5.6 wallet home
 * Live balances = GET /api/v1/wallet/buckets via @aipo/sdk/wallet
 */
export default function Page() {
  const [buckets, setBuckets] = useState<WalletBucketsResponse>(EMPTY_BUCKETS);
  const [sessionExpired, setSessionExpired] = useState(false);

  useEffect(() => {
    const ac = new AbortController();
    let cancelled = false;

    async function load() {
      try {
        const next = await fetchWalletBuckets({ signal: ac.signal });
        if (cancelled) return;
        setBuckets(next);
        setSessionExpired(false);
      } catch (err) {
        if (cancelled) return;
        const msg = err instanceof Error ? err.message : "";
        if (msg.includes("wallet_buckets_401") || /unauthorized/i.test(msg)) {
          setSessionExpired(true);
        }
        setBuckets(EMPTY_BUCKETS);
      }
    }

    void load();
    return () => {
      cancelled = true;
      ac.abort();
    };
  }, []);

  return (
    <main className="p-6 text-lux-text" data-testid="wallet-home">
      <h1 className="text-xl font-semibold">{T.walletBuckets.pageTitle}</h1>
      {sessionExpired ? (
        <p className="mt-2 text-sm text-lux-text-muted" role="status">
          <Link href="/auth/login" className="text-lux-accent underline">
            {T.toast.SESSION_EXPIRED}
          </Link>
        </p>
      ) : null}
      <DemoWalletBanner practiceUsdt={buckets.practiceUsdt} />
      <BucketBreakdown
        principalUsdt={buckets.principalUsdt}
        profitUsdt={buckets.profitUsdt}
        lockedUsdt={buckets.lockedUsdt}
        practiceUsdt={buckets.practiceUsdt}
        liabilityUsdt={buckets.liabilityUsdt}
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
