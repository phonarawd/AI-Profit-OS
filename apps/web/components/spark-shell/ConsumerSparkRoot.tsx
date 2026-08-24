"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { SD_ASSETS } from "../spark-dash-home/assets";
import "./consumer-spark-shell.css";

const NAV = [
  { href: "/", label: "홈", key: "home", icon: SD_ASSETS.iconHome },
  { href: "/profits", label: "기회 탐색", key: "profits", icon: SD_ASSETS.iconExplore },
  { href: "/wallet", label: "내 자산", key: "wallet", icon: SD_ASSETS.iconWallet },
  { href: "/trades", label: "참여 내역", key: "trades", icon: SD_ASSETS.iconExplore },
  { href: "/wallet/history", label: "정산 내역", key: "history", icon: SD_ASSETS.iconWallet },
  { href: "/me/guide/partners", label: "파트너", key: "partners", icon: SD_ASSETS.iconPartner },
  { href: "/me/inbox", label: "알림", key: "inbox", icon: SD_ASSETS.iconBell },
  { href: "/me/settings", label: "설정", key: "settings", icon: SD_ASSETS.iconSettings },
] as const;

const MOBILE_NAV = [
  { href: "/", label: "홈", key: "home", icon: SD_ASSETS.mobileNavHome },
  { href: "/profits", label: "기회", key: "profits", icon: SD_ASSETS.mobileNavExplore },
  { href: "/wallet", label: "자산", key: "wallet", icon: SD_ASSETS.mobileNavWallet },
  { href: "/me/inbox", label: "알림", key: "inbox", icon: SD_ASSETS.mobileNavBell },
] as const;

function activeKey(pathname: string) {
  if (pathname === "/") return "home";
  if (pathname.startsWith("/profits")) return "profits";
  if (pathname.startsWith("/wallet/history")) return "history";
  if (pathname.startsWith("/wallet")) return "wallet";
  if (pathname.startsWith("/trades")) return "trades";
  if (pathname.startsWith("/me/guide/partners")) return "partners";
  if (pathname.startsWith("/me/inbox")) return "inbox";
  if (pathname.startsWith("/me/settings")) return "settings";
  return "more";
}

function isNativeSparkSurface(pathname: string) {
  return pathname === "/" || pathname === "/me" || pathname.startsWith("/profits");
}

function isImmersiveSurface(pathname: string) {
  return (
    pathname.startsWith("/auth/") ||
    pathname === "/onboarding" ||
    pathname === "/ads" ||
    pathname.startsWith("/ads/") ||
    pathname.startsWith("/l/")
  );
}

export function ConsumerSparkRoot({ children }: { children: ReactNode }) {
  const pathname = usePathname() || "/";

  if (isNativeSparkSurface(pathname) || pathname.startsWith("/dev")) {
    return <>{children}</>;
  }

  if (isImmersiveSurface(pathname)) {
    return (
      <div className="csp-immersive" data-spark-surface="immersive" data-spark-route={pathname}>
        {children}
      </div>
    );
  }

  const active = activeKey(pathname);

  return (
    <div className="csp-root" data-testid="consumer-spark-shell" data-spark-route={pathname}>
      <aside className="csp-sidebar" data-testid="consumer-spark-sidebar">
        <Link className="csp-brand" href="/" aria-label="퍼뜩 홈">
          <span className="csp-wordmark">퍼뜩</span>
          <img src={SD_ASSETS.brandSpark} alt="" />
        </Link>
        <p className="csp-tagline">Global Opportunity Platform</p>
        <nav className="csp-nav" aria-label="주요 메뉴">
          {NAV.map((item) => {
            const selected = active === item.key;
            return (
              <Link
                key={item.key}
                href={item.href}
                className="csp-nav-link"
                data-active={selected ? "true" : "false"}
                aria-current={selected ? "page" : undefined}
              >
                <img src={item.icon} alt="" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
        <div className="csp-sidebar-bottom">
          <section className="csp-wallet-card">
            <p className="csp-wallet-title">내 자산 요약</p>
            <p className="csp-wallet-copy">실제 잔액은 내 자산에서 확인하세요.</p>
            <Link className="csp-primary" href="/wallet/deposit">입금하기</Link>
            <Link className="csp-secondary" href="/wallet/withdraw">출금하기</Link>
          </section>
          <Link className="csp-ai-card" href="/me/peotteok">
            <span>
              <strong>퍼뜩 AI</strong>
              <small>지금 필요한 정보를 빠르게 정리해드려요.</small>
            </span>
            <img src={SD_ASSETS.aiOrb} alt="" />
          </Link>
        </div>
      </aside>

      <div className="csp-app">
        <header className="csp-topbar" data-testid="consumer-spark-topbar">
          <div className="csp-update">
            <img src={SD_ASSETS.headerSignal} alt="" />
            <span>새로운 글로벌 기회를 확인해보세요</span>
          </div>
          <div className="csp-top-actions">
            <Link href="/me/inbox" aria-label="알림" className="csp-icon-button">
              <img src={SD_ASSETS.headerBell} alt="" />
            </Link>
            <Link href="/me" className="csp-user-link">회원님</Link>
          </div>
        </header>

        <header className="csp-mobile-header">
          <Link className="csp-mobile-brand" href="/">
            <span>퍼뜩</span>
            <img src={SD_ASSETS.mobileBrandSpark} alt="" />
          </Link>
          <Link href="/me/inbox" aria-label="알림" className="csp-icon-button">
            <img src={SD_ASSETS.mobileBell} alt="" />
          </Link>
        </header>

        <main className="csp-main" data-testid="consumer-spark-content">
          <div className="csp-page-slot">{children}</div>
        </main>

        <nav className="csp-bottom-nav" aria-label="모바일 주요 메뉴">
          {MOBILE_NAV.map((item) => {
            const selected = active === item.key;
            return (
              <Link key={item.key} href={item.href} data-active={selected ? "true" : "false"}>
                <img src={item.icon} alt="" />
                <span>{item.label}</span>
              </Link>
            );
          })}
          <Link href="/me" data-active={active === "more" ? "true" : "false"}>
            <span className="csp-dots" aria-hidden>•••</span>
            <span>더보기</span>
          </Link>
        </nav>
      </div>
    </div>
  );
}
