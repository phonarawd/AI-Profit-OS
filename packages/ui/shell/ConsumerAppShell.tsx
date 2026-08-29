"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import {
  activeDestinationId,
  desktopSidebarItems,
  isImmersivePath,
  isLockedVisualSurface,
  mobilePrimaryItems,
} from "../navigation/consumer-navigation";
import { PutdukBrand } from "../brand/PutdukBrand";
import "./consumer-app-shell.css";

const ICONS = {
  home: "/spark-dash/icon-home.svg",
  opportunities: "/spark-dash/icon-opportunity.svg",
  assets: "/spark-dash/icon-wallet.svg",
  activity: "/spark-dash/icon-opportunity.svg",
  settlements: "/spark-dash/icon-wallet.svg",
  partners: "/spark-dash/icon-partner.svg",
  inbox: "/spark-dash/icon-bell.svg",
  settings: "/spark-dash/icon-settings.svg",
  profile: "/spark-dash/icon-home.svg",
  mobileHome: "/spark-dash/mobile-icon-home.svg",
  mobileOpportunities: "/spark-dash/mobile-icon-nav-explore.svg",
  mobileAssets: "/spark-dash/mobile-icon-nav-wallet.svg",
  mobileInbox: "/spark-dash/mobile-icon-nav-bell.svg",
  brand: "/spark-dash/brand-spark.svg",
  mobileBrand: "/spark-dash/mobile-brand-spark.svg",
  signal: "/spark-dash/header-signal.svg",
  bell: "/spark-dash/header-bell.svg",
  mobileBell: "/spark-dash/mobile-icon-notification.svg",
  ai: "/spark-dash/ai-orb.svg",
} as const;

export function ConsumerAppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname() || "/";

  if (isLockedVisualSurface(pathname) || pathname.startsWith("/dev")) {
    return <>{children}</>;
  }

  if (isImmersivePath(pathname)) {
    return (
      <div className="csp-immersive" data-spark-surface="immersive" data-spark-route={pathname}>
        {children}
      </div>
    );
  }

  const active = activeDestinationId(pathname);
  const desktop = desktopSidebarItems();
  const mobile = mobilePrimaryItems();

  return (
    <div className="csp-root" data-testid="consumer-spark-shell" data-spark-route={pathname}>
      <aside className="csp-sidebar" data-testid="consumer-spark-sidebar">
        <Link prefetch={false} className="csp-brand" href="/" aria-label="퍼뜩 홈">
          <PutdukBrand size="compact" />
        </Link>
        <nav className="csp-nav" aria-label="홈">
          {desktop.map((item) => {
            const selected = active === item.id;
            return (
              <Link
                prefetch={false}
                key={item.id}
                href={item.href}
                className="csp-nav-link"
                data-active={selected ? "true" : "false"}
                aria-current={selected ? "page" : undefined}
              >
                <img src={ICONS[item.id] ?? ICONS.home} alt="" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
        <div className="csp-sidebar-bottom">
          <section className="csp-wallet-card">
            <p className="csp-wallet-title">내 자산</p>
            <Link prefetch={false} className="csp-primary" href="/wallet/deposit">
              입금하기
            </Link>
            <Link prefetch={false} className="csp-secondary" href="/wallet/withdraw">
              출금하기
            </Link>
          </section>
          <Link prefetch={false} className="csp-ai-card" href="/me/peotteok">
            <span>
              <strong>퍼뜩 AI</strong>
            </span>
            <img src={ICONS.ai} alt="" />
          </Link>
        </div>
      </aside>

      <div className="csp-app">
        <header className="csp-topbar" data-testid="consumer-spark-topbar">
          <div className="csp-update">
            <img src={ICONS.signal} alt="" />
            <span>새로운 글로벌 기회를 확인해보세요</span>
          </div>
          <div className="csp-top-actions">
            <Link prefetch={false} href="/me/inbox" aria-label="알림" className="csp-icon-button">
              <img src={ICONS.bell} alt="" />
            </Link>
            <Link prefetch={false} href="/me" className="csp-user-link">
              회원님
            </Link>
          </div>
        </header>

        <header className="csp-mobile-header">
          <Link prefetch={false} className="csp-mobile-brand" href="/">
            <PutdukBrand size="compact" />
          </Link>
          <Link prefetch={false} href="/me/inbox" aria-label="알림" className="csp-icon-button">
            <img src={ICONS.mobileBell} alt="" />
          </Link>
        </header>

        <main className="csp-main pd-app-main" data-testid="consumer-spark-content">
          <div className="csp-page-slot">{children}</div>
        </main>

        <nav className="csp-bottom-nav" aria-label="더보기">
          {mobile.map((item) => {
            const selected = item.id === "profile" ? active === "profile" || active === "more" : active === item.id;
            const icon =
              item.id === "home"
                ? ICONS.mobileHome
                : item.id === "opportunities"
                  ? ICONS.mobileOpportunities
                  : item.id === "assets"
                    ? ICONS.mobileAssets
                    : item.id === "inbox"
                      ? ICONS.mobileInbox
                      : null;
            return (
              <Link
                prefetch={false}
                key={item.id}
                href={item.href}
                data-active={selected ? "true" : "false"}
              >
                {icon ? <img src={icon} alt="" /> : <span className="csp-dots" aria-hidden>...</span>}
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
