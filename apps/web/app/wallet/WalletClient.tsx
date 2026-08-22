"use client";

import {
  fetchWalletBuckets,
  type WalletBucketsResponse,
} from "@aipo/sdk/wallet";
import { BucketBreakdown } from "@aipo/ui/components/wallet/BucketBreakdown";
import { DemoWalletBanner } from "@aipo/ui/components/wallet/DemoWalletBanner";
import { T } from "@aipo/ui/copy/ko";
import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { WalletChrome } from "./WalletChrome";
import styles from "./wallet.module.css";

type ViewKind = "loading" | "ready" | "unavailable" | "unauthorized";

function sessionToken(): string | null {
  return null;
}

function isAuthFailure(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : "";
  return msg.includes("wallet_buckets_401") || /unauthorized/i.test(msg);
}

function Shell({
  view,
  summaryAmount,
  children,
}: {
  view: ViewKind;
  summaryAmount?: string | null;
  children: ReactNode;
}) {
  return (
    <WalletChrome tone="main" summaryAmount={summaryAmount}>
      <main
        className={styles.surface}
        data-testid="wallet-home"
        data-wallet-view={view}
      >
        {children}
      </main>
    </WalletChrome>
  );
}

function Intro() {
  return (
    <div className={styles.intro}>
      <div>
        <p className={styles.eyebrow}>{T.walletBuckets.eyebrow}</p>
        <h1 className={styles.title}>{T.walletBuckets.pageTitle}</h1>
        <p className={styles.lead}>{T.walletBuckets.subtitle}</p>
      </div>
      <p className={styles.badge}>
        <span className={styles.dot} aria-hidden />
        {T.walletBuckets.truthBadge}
      </p>
    </div>
  );
}

export function WalletClient() {
  const [buckets, setBuckets] = useState<WalletBucketsResponse | null>(null);
  const [view, setView] = useState<ViewKind>("loading");

  useEffect(() => {
    const ac = new AbortController();
    void (async () => {
      try {
        const next = await fetchWalletBuckets({
          getAccessToken: sessionToken,
          signal: ac.signal,
        });
        if (ac.signal.aborted) return;
        setBuckets(next);
        setView("ready");
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
        <Intro />
        <p className={styles.lead}>{T.walletBuckets.loadingLead}</p>
      </Shell>
    );
  }

  if (view === "unauthorized") {
    return (
      <Shell view="unauthorized">
        <Intro />
        <p className={styles.lead}>{T.walletBuckets.unauthorizedLead}</p>
        <div className={styles.heroActions}>
          <Link className={styles.cta} href="/auth/login">
            {T.walletBuckets.loginCta}
          </Link>
          <Link className={styles.ctaGhost} href="/">
            {T.common.home}
          </Link>
        </div>
      </Shell>
    );
  }

  if (view === "unavailable" || buckets == null) {
    return (
      <Shell view="unavailable">
        <Intro />
        <p className={styles.err}>{T.walletBuckets.unavailableLead}</p>
        <Link className={styles.ctaSoft} href="/">
          {T.common.home}
        </Link>
      </Shell>
    );
  }

  return (
    <Shell view="ready" summaryAmount={buckets.liabilityUsdt}>
      <Intro />
      <section className={styles.hero}>
        <div>
          <p className={styles.heroLabel}>{T.walletBuckets.totalLabel}</p>
          <p className={styles.heroAmount} data-testid="bucket-liability">
            {buckets.liabilityUsdt} {T.walletBuckets.usdtSuffix}
          </p>
          <p className={styles.heroFx}>{T.walletBuckets.krwUnavailable}</p>
          <p className={styles.assurance}>
            <span className={styles.dot} aria-hidden />
            {T.walletBuckets.assurance}
          </p>
        </div>
        <div className={styles.heroActions}>
          <Link
            className={styles.cta}
            href="/wallet/deposit?tab=usdt"
            data-testid="wallet-deposit-cta"
          >
            {T.walletBuckets.ctaDeposit}
          </Link>
          <Link
            className={styles.ctaGhost}
            href="/wallet/withdraw?mode=profit"
            data-testid="wallet-withdraw-profit"
            data-default-mode="profit"
          >
            {T.walletBuckets.ctaWithdraw}
          </Link>
          <Link
            className={`${styles.guideLink} ${styles.heroHistory}`}
            href="/wallet/history"
            data-testid="wallet-history-link"
          >
            {T.walletBuckets.historyLink} ›
          </Link>
        </div>
      </section>

      <DemoWalletBanner practiceUsdt={buckets.practiceUsdt} />

      <div className={styles.sectionHead}>
        <h2 className={styles.sectionTitle}>{T.walletBuckets.compositionHeading}</h2>
        <p className={styles.sectionNote}>{T.walletBuckets.compositionNote}</p>
      </div>
      <div className={styles.buckets}>
        <BucketBreakdown
          principalUsdt={buckets.principalUsdt}
          profitUsdt={buckets.profitUsdt}
          lockedUsdt={buckets.lockedUsdt}
          practiceUsdt={buckets.practiceUsdt}
          liabilityUsdt={buckets.liabilityUsdt}
        />
      </div>

      <div className={styles.sectionHead}>
        <h2 className={styles.sectionTitle}>{T.walletBuckets.actionHeading}</h2>
        <p className={styles.sectionNote}>{T.walletBuckets.actionNote}</p>
      </div>
      <div className={styles.actionsCol}>
        <Link className={styles.actionRow} href="/wallet/deposit?tab=usdt">
          <span className={styles.actionGlyph} aria-hidden>
            <img src="/wallet-v2/spark.svg" alt="" width={14} height={26} />
          </span>
          <span className={styles.actionCopy}>
            <span className={styles.actionTitle}>{T.walletBuckets.ctaDeposit}</span>
            <span className={styles.actionBody}>{T.walletBuckets.depositBody}</span>
          </span>
          <span className={styles.actionChevron} aria-hidden>
            ›
          </span>
        </Link>
        <Link
          className={styles.actionRow}
          href="/wallet/withdraw?mode=profit"
          data-default-mode="profit"
        >
          <span className={`${styles.actionGlyph} ${styles.actionGlyphWithdraw}`} aria-hidden>
            <img src="/wallet-v2/spark.svg" alt="" width={14} height={26} />
          </span>
          <span className={styles.actionCopy}>
            <span className={styles.actionTitle}>{T.walletBuckets.ctaWithdraw}</span>
            <span className={styles.actionBody}>{T.walletBuckets.withdrawBody}</span>
          </span>
          <span className={styles.actionChevron} aria-hidden>
            ›
          </span>
        </Link>
        <Link className={styles.actionRow} href="/wallet/history">
          <span className={`${styles.actionGlyph} ${styles.actionGlyphHistory}`} aria-hidden>
            <img src="/wallet-v2/spark.svg" alt="" width={14} height={26} />
          </span>
          <span className={styles.actionCopy}>
            <span className={styles.actionTitle}>{T.walletBuckets.historyLink}</span>
            <span className={styles.actionBody}>{T.walletBuckets.historyBody}</span>
          </span>
          <span className={styles.actionChevron} aria-hidden>
            ›
          </span>
        </Link>
      </div>

      <div className={styles.bottomRow}>
        <section className={styles.recentCard}>
          <h2 className={styles.recentTitle}>{T.walletBuckets.recentHeading}</h2>
          <p className={styles.recentBody}>{T.walletBuckets.recentEmpty}</p>
          <Link className={styles.recentLink} href="/wallet/history">
            {T.walletBuckets.recentLink} ›
          </Link>
        </section>
        <section className={styles.guideCard}>
          <h2 className={styles.guideTitle}>{T.principalGuide.pageTitle}</h2>
          <p className={styles.guideBody}>{T.walletBuckets.defaultProfitHint}</p>
          <p className={styles.guideOk}>{T.walletBuckets.principalAlways}</p>
          <Link className={styles.guideLink} href="/me/guide/principal">
            {T.walletBuckets.guideLink} ›
          </Link>
        </section>
      </div>

      <Link
        className={styles.quiet}
        href="/wallet/withdraw?mode=principal"
        data-testid="wallet-withdraw-principal"
        data-principal-reachable="true"
      >
        {T.withdrawMode.ctaOpenPrincipal}
      </Link>
    </Shell>
  );
}
