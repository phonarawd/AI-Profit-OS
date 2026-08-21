import Link from "next/link";
import type { ReactNode } from "react";
import { SD_ASSETS } from "../spark-dash-home/assets";
import { splitUsdtParts } from "../spark-dash-home/format";
import type { SparkDashNavItem } from "../spark-dash-home/types";
import type { ProfitsDesktopModel } from "./types";

function navIcon(item: SparkDashNavItem) {
  if (item.icon === "home") return <img src={SD_ASSETS.iconHome} alt="" />;
  if (item.icon === "explore") return <img src={SD_ASSETS.iconExplore} alt="" />;
  if (item.icon === "wallet") return <img src={SD_ASSETS.iconWallet} alt="" />;
  if (item.icon === "partner") return <img src={SD_ASSETS.iconPartner} alt="" />;
  if (item.icon === "bell") return <img src={SD_ASSETS.iconBell} alt="" />;
  if (item.icon === "settings") return <img src={SD_ASSETS.iconSettings} alt="" />;
  return (
    <span className={`sd-nav-glyph ${item.icon}`} aria-hidden>
      {item.icon === "receipt" ? <span className="chk" /> : null}
    </span>
  );
}

function MoneyLine({
  value,
  withUnit,
  className,
}: {
  value: string | null;
  withUnit?: boolean;
  className?: string;
}) {
  const parts = splitUsdtParts(value);
  const unit = parts.unit ?? (withUnit && value ? "USDT" : null);
  return (
    <p className={`sd-money-line${className ? ` ${className}` : ""}`}>
      <span className="sd-money-amt">{parts.amount}</span>
      {unit ? <span className="sd-money-unit">{unit}</span> : null}
    </p>
  );
}

export function ProfitsShell({
  model,
  children,
}: {
  model: ProfitsDesktopModel;
  children: ReactNode;
}) {
  return (
    <div
      className="sd-root sdp-root"
      data-owner={model.owner}
      data-sdp="root"
      data-sdp-state={model.viewState}
    >
      <aside className="sd-sidebar">
        <div className="sd-sidebar-top">
          <div className="sd-brand">
            <p className="sd-wordmark">퍼뜩</p>
            <img className="sd-brand-spark" src={SD_ASSETS.brandSpark} alt="" />
          </div>
          <p className="sd-tagline">Global Opportunity Platform</p>
          <p className="sd-primary-label">PRIMARY</p>
          <nav className="sd-nav" aria-label="주요 메뉴">
            {model.nav.map((item) => (
              <Link
                key={item.key}
                href={item.href}
                className={`sd-nav-item${item.key === "explore" ? " is-active" : ""}`}
              >
                {navIcon(item)}
                <span>{item.label}</span>
              </Link>
            ))}
          </nav>
        </div>
        <div className="sd-sidebar-bottom">
          <section className="sd-wallet-quick">
            <p className="lbl">내 자산 요약</p>
            <p className="sub">사용 가능 자산</p>
            <MoneyLine value={model.sidebarBalance.usdt} withUnit className="amt" />
            {model.sidebarBalance.krw ? (
              <p className="sd-krw">{model.sidebarBalance.krw}</p>
            ) : null}
            <Link className="sd-btn-deposit sdp-btn-deposit" href="/wallet/deposit">
              입금하기
            </Link>
            <Link className="sd-btn-withdraw" href="/wallet/withdraw">
              출금하기
            </Link>
          </section>
          <Link className="sd-ai" href="/me/peotteok">
            <div className="sd-ai-copy">
              <p className="title">
                퍼뜩 AI
                <img className="mini" src={SD_ASSETS.miniSpark} alt="" />
              </p>
              <p className="body">
                <span>지금 확인할 수 있는</span>
                <span>기회를 정리하고 있어요.</span>
              </p>
            </div>
            <span className="sd-ai-visual" aria-hidden>
              <img className="glow" src={SD_ASSETS.aiPinkGlow} alt="" />
              <img className="orb" src={SD_ASSETS.aiOrb} alt="" />
              <img className="ring" src={SD_ASSETS.aiRing} alt="" />
              <img className="eye-r" src={SD_ASSETS.aiEyeRight} alt="" />
              <span className="smile" />
            </span>
          </Link>
        </div>
      </aside>

      <main className="sd-main">
        <header className="sd-header">
          <div className="sd-stage sd-header-stage">
            <div className="sd-strip">
              <img src={SD_ASSETS.headerSignal} alt="" />
              <p className="msg">새로운 글로벌 기회가 업데이트됐어요</p>
            </div>
            <div className="sd-header-right">
              <Link className="sd-header-bell" href="/me/inbox" aria-label="알림">
                <img src={SD_ASSETS.headerBell} alt="" />
              </Link>
              <span className="sd-header-div" />
              <span className="sd-profile">
                <span className="sd-avatar-wrap" aria-hidden>
                  <span className="sd-avatar">
                    <img className="face" src={SD_ASSETS.avatarFace} alt="" />
                    <img className="body" src={SD_ASSETS.avatarBody} alt="" />
                  </span>
                  <span className="sd-online" />
                </span>
                <span className="sd-userbox">
                  <p className="sd-user">{model.displayName ?? "회원님"}</p>
                  <p className="sd-level">{model.levelLabel ?? "—"}</p>
                </span>
                <span className="sd-chevron">⌄</span>
              </span>
            </div>
          </div>
        </header>
        {children}
      </main>
    </div>
  );
}
