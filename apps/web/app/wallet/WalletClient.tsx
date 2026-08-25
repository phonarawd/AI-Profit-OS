"use client";

import { type CurrentFxApproxResponse } from "@aipo/sdk/current-fx";
import {
  fetchWalletBuckets,
  type WalletBucketsResponse,
} from "@aipo/sdk/wallet";
import { formatKrwInteger } from "@aipo/ui/components/money";
import { BucketBreakdown } from "@aipo/ui/components/wallet/BucketBreakdown";
import { DemoWalletBanner } from "@aipo/ui/components/wallet/DemoWalletBanner";
import { T } from "@aipo/ui/copy/ko";
import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { quoteKrw } from "../../lib/current-fx-refresh";
import { startFxBackgroundRefresh } from "../../lib/start-fx-background-refresh";
import styles from "./wallet.module.css";

type ViewKind = "loading" | "ready" | "unavailable" | "unauthorized";

function sessionToken(): string | null {
  return null;
}

function isAuthFailure(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : "";
  return msg.includes("wallet_buckets_401") || /unauthorized/i.test(msg);
}

function Shell({ view, children }: { view: ViewKind; children: ReactNode }) {
  return (
    <main className={styles.page} data-testid="wallet-home" data-wallet-view={view}>
      {children}
    </main>
  );
}

export function WalletClient() {
  const [buckets, setBuckets] = useState<WalletBucketsResponse | null>(null);
  const [fx, setFx] = useState<CurrentFxApproxResponse | null>(null);
  const [view, setView] = useState<ViewKind>("loading");

  useEffect(() => {
    const ac = new AbortController();
    void (async () => {
      try {
        const next = await fetchWalletBuckets({ getAccessToken: sessionToken, signal: ac.signal });
        if (ac.signal.aborted) return;
        setBuckets(next);
        setView("ready");
        startFxBackgroundRefresh(
          () => ({
            principalUsdt: next.principalUsdt,
            withdrawableProfitUsdt: next.profitUsdt,
            expectedProfitUsdt: next.lockedUsdt,
            quotes: [
              { id: "locked", amountUsdt: next.lockedUsdt },
              { id: "liability", amountUsdt: next.liabilityUsdt },
            ],
          }),
          (fresh) => setFx(fresh),
          ac.signal,
        );
      } catch (err) {
        if (ac.signal.aborted) return;
        setBuckets(null);
        setView(isAuthFailure(err) ? "unauthorized" : "unavailable");
      }
    })();
    return () => ac.abort();
  }, []);

  if (view === "loading") {
    return (
      <Shell view="loading">
        <h1 className={styles.title}>{T.walletBuckets.pageTitle}</h1>
        <p className={styles.lead}>불러오는 중…</p>
      </Shell>
    );
  }

  if (view === "unauthorized") {
    return (
      <Shell view="unauthorized">
        <h1 className={styles.title}>{T.walletBuckets.pageTitle}</h1>
        <p className={styles.lead}>로그인하면 지갑을 볼 수 있어요.</p>
        <div className={styles.actions}>
          <Link href="/auth/login">로그인</Link>
          <Link className={styles.secondary} href="/">홈으로</Link>
        </div>
      </Shell>
    );
  }

  if (view === "unavailable" || buckets == null) {
    return (
      <Shell view="unavailable">
        <h1 className={styles.title}>{T.walletBuckets.pageTitle}</h1>
        <p className={styles.err}>지갑 잔액을 확인할 수 없음</p>
        <div className={styles.actions}>
          <Link href="/">홈으로</Link>
        </div>
      </Shell>
    );
  }

  return (
    <Shell view="ready">
      <h1 className={styles.title}>{T.walletBuckets.pageTitle}</h1>
      <DemoWalletBanner practiceUsdt={buckets.practiceUsdt} />
      <div className={styles.buckets}>
        <BucketBreakdown
          principalUsdt={buckets.principalUsdt}
          profitUsdt={buckets.profitUsdt}
          lockedUsdt={buckets.lockedUsdt}
          practiceUsdt={buckets.practiceUsdt}
          liabilityUsdt={buckets.liabilityUsdt}
          principalKrw={formatKrwInteger(fx?.principalKrwApprox ?? null)}
          profitKrw={formatKrwInteger(fx?.withdrawableProfitKrwApprox ?? null)}
          lockedKrw={formatKrwInteger(quoteKrw(fx, "locked"))}
          liabilityKrw={formatKrwInteger(quoteKrw(fx, "liability"))}
          krwReady={fx?.krwDisplayAvailable === true}
        />
      </div>
      <div className={styles.actions}>
        <Link href="/wallet/deposit?tab=usdt" data-testid="wallet-deposit-cta">{T.walletBuckets.ctaDeposit}</Link>
        <Link href="/wallet/withdraw?mode=profit" data-testid="wallet-withdraw-profit" data-default-mode="profit">
          {T.walletBuckets.ctaWithdraw}
        </Link>
        <Link className={styles.secondary} href="/wallet/withdraw?mode=principal" data-testid="wallet-withdraw-principal" data-principal-reachable="true">
          {T.withdrawMode.ctaOpenPrincipal}
        </Link>
        <Link className={styles.secondary} href="/wallet/history" data-testid="wallet-history-link">
          {T.walletBuckets.historyLink}
        </Link>
        <Link className={styles.quiet} href="/me/guide/principal">{T.walletBuckets.guideLink}</Link>
      </div>
    </Shell>
  );
}
