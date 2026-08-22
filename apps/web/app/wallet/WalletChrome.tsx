"use client";

import { fetchWalletBuckets } from "@aipo/sdk/wallet";
import { T } from "@aipo/ui/copy/ko";
import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import styles from "./wallet.module.css";

type WalletChromeProps = {
  children: ReactNode;
  tone?: "main" | "paper";
  summaryAmount?: string | null;
};

const SIDE_LINKS = [
  { href: "/", label: "홈", icon: "/wallet-v2/icon-home.svg" },
  { href: "/profits", label: "기회 탐색", icon: "/wallet-v2/icon-search.svg" },
  { href: "/wallet", label: "내 자산", icon: "/wallet-v2/icon-wallet.svg" },
  { href: "/trades", label: "참여 내역", icon: "/wallet-v2/icon-notify.svg" },
  { href: "/wallet/history", label: "정산 내역", icon: "/wallet-v2/icon-notify.svg" },
  { href: "/me/guide/partners", label: "파트너", icon: "/wallet-v2/icon-notify.svg" },
  { href: "/me/inbox", label: "알림", icon: "/wallet-v2/icon-notify.svg" },
  { href: "/me/settings", label: "설정", icon: "/wallet-v2/icon-settings.svg" },
] as const;

const BOTTOM_LINKS = [
  { href: "/", label: "홈", icon: "/wallet-v2/icon-home.svg" },
  { href: "/profits", label: "기회 탐색", icon: "/wallet-v2/icon-search.svg" },
  { href: "/wallet", label: "내 자산", icon: "/wallet-v2/icon-wallet.svg" },
  { href: "/me/inbox", label: "알림", icon: "/wallet-v2/icon-notify.svg" },
  { href: "/me", label: "더보기", icon: "" },
] as const;

function isActive(href: string, current: string): boolean {
  if (href === "/") return current === "/";
  if (href === "/wallet") return current === "/wallet" || current.startsWith("/wallet/");
  return current === href || current.startsWith(`${href}/`);
}

function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <Link href="/" className={compact ? styles.brandLockup : styles.sidebarBrand}>
      <span className={styles.brandWord}>{T.brand.consumer}</span>
      <span className={styles.brandSpark} aria-hidden>
        <img src="/wallet-v2/spark.svg" alt="" width={compact ? 14 : 24} height={compact ? 26 : 44} />
      </span>
    </Link>
  );
}

export function WalletChrome({
  children,
  tone = "main",
  summaryAmount = null,
}: WalletChromeProps) {
  const [fetchedAmount, setFetchedAmount] = useState<string | null>(null);

  useEffect(() => {
    if (summaryAmount && summaryAmount.trim()) return;
    const ac = new AbortController();
    void (async () => {
      try {
        const next = await fetchWalletBuckets({ signal: ac.signal });
        if (!ac.signal.aborted) setFetchedAmount(next.liabilityUsdt);
      } catch {
        if (!ac.signal.aborted) setFetchedAmount(null);
      }
    })();
    return () => ac.abort();
  }, [summaryAmount]);

  const owned = summaryAmount && summaryAmount.trim() ? summaryAmount : fetchedAmount;
  const amount = owned && owned.trim() ? owned : T.walletBuckets.missingAmount;

  return (
    <div className={styles.chrome} data-wallet-chrome="v2">
      <aside className={styles.sidebar} aria-label="바로 가기">
        <Brand />
        <p className={styles.tagline}>Global Opportunity Platform</p>
        <nav className={styles.sideNav}>
          {SIDE_LINKS.map((item) => (
            <Link
              key={item.href + item.label}
              href={item.href}
              className={`${styles.sideLink} ${item.href === "/wallet" ? styles.sideLinkActive : ""}`}
            >
              <img src={item.icon} alt="" width={20} height={20} />
              {item.label}
            </Link>
          ))}
        </nav>
        <div className={styles.quick}>
          <p className={styles.quickLabel}>{T.walletBuckets.sidebarSummary}</p>
          <p className={styles.quickSub}>{T.walletBuckets.sidebarAvailable}</p>
          <p className={styles.quickAmt}>
            {amount} {T.walletBuckets.usdtSuffix}
          </p>
          <p className={styles.quickFx}>{T.walletBuckets.krwPlaceholder}</p>
          <Link className={styles.cta} href="/wallet/deposit?tab=usdt">
            {T.walletBuckets.ctaDeposit}
          </Link>
          <Link className={styles.ctaGhost} href="/wallet/withdraw?mode=profit">
            {T.walletBuckets.ctaWithdraw}
          </Link>
        </div>
        <div className={styles.aiCard}>
          <p className={styles.aiTitle}>{T.walletBuckets.sidebarAiTitle}</p>
          <p className={styles.aiBody}>{T.walletBuckets.sidebarAiBody}</p>
        </div>
      </aside>

      <div className={styles.stage}>
        <header className={styles.mobileBar}>
          <Brand compact />
          <Link className={styles.iconBtn} href="/me/inbox" aria-label="알림">
            <img src="/wallet-v2/icon-bell.svg" alt="" width={22} height={22} />
          </Link>
        </header>
        <header className={styles.desktopHeader}>
          <p className={styles.updateStrip}>
            <img src="/wallet-v2/signal.svg" alt="" width={12} height={20} />
            <span>{T.walletBuckets.headerSafe}</span>
            <Link href="/profits">{T.walletBuckets.headerOpps} ›</Link>
          </p>
          <div className={styles.headerMeta}>
            <Link className={styles.iconBtn} href="/me/inbox" aria-label="알림">
              <img src="/wallet-v2/icon-bell.svg" alt="" width={22} height={22} />
            </Link>
            <Link className={styles.account} href="/me">
              {T.walletBuckets.accountLink}
            </Link>
          </div>
        </header>
        <div className={tone === "paper" ? styles.stagePaper : styles.stageMain}>
          {children}
        </div>
      </div>

      <nav className={styles.bottomNav} aria-label="아래 메뉴">
        {BOTTOM_LINKS.map((item) => {
          const active = isActive(item.href, "/wallet");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`${styles.bottomLink} ${active ? styles.bottomLinkActive : ""}`}
            >
              {item.icon ? (
                <img src={item.icon} alt="" width={20} height={20} />
              ) : (
                <span aria-hidden>•••</span>
              )}
              {item.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
