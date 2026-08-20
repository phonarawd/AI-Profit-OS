"use client";

/**
 * CUX-004 /profits Mobile — Opportunity List.
 * Desktop(ProfitsDesktop)과 동일한 ProfitsDesktopModel/ProfitsOpportunity를 소비한다.
 * Money/duration/feed owner는 재사용만 — 새 owner 생성 0.
 * Home geometry 비종속 — 헤더/하단 탭은 이 파일이 독립 소유한다(Room Mobile과 동일 관례).
 * 목록에는 참여 primary CTA 0 — 카드 tap만 `/profits/:id`로 연결한다.
 */

import Link from "next/link";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { SD_ASSETS } from "../spark-dash-home/assets";
import { moneyOrDash, splitUsdtParts } from "../spark-dash-home/format";
import type { ProfitsDesktopModel, ProfitsMediaState, ProfitsOpportunity } from "./types";
import "./spark-dash-profits-mobile.css";

const PROFITS_MOBILE_NAV = [
  { key: "home", label: "홈", href: "/", icon: "home" as const },
  { key: "explore", label: "기회 탐색", href: "/profits", icon: "explore" as const },
  { key: "assets", label: "내 자산", href: "/wallet", icon: "wallet" as const },
  { key: "alerts", label: "알림", href: "/me/inbox", icon: "bell" as const },
  { key: "more", label: "더보기", href: "/me", icon: "more" as const },
];

function MobileMoneyLine({
  value,
  tone,
}: {
  value: string | null;
  tone?: "pink";
}) {
  const parts = splitUsdtParts(value);
  return (
    <p className={`sdpm-money${tone ? ` is-${tone}` : ""}`}>
      <span className="amt">{parts.amount}</span>
      {parts.unit ? <span className="unit">{parts.unit}</span> : null}
    </p>
  );
}

function NavIcon({
  icon,
  active,
}: {
  icon: (typeof PROFITS_MOBILE_NAV)[number]["icon"];
  active: boolean;
}) {
  if (icon === "more") {
    return (
      <span className={`sdpm-nav-more${active ? " is-active" : ""}`} aria-hidden>
        •••
      </span>
    );
  }
  const src =
    icon === "home"
      ? SD_ASSETS.mobileNavHome
      : icon === "explore"
        ? SD_ASSETS.mobileNavExplore
        : icon === "wallet"
          ? SD_ASSETS.mobileNavWallet
          : SD_ASSETS.mobileNavBell;
  return (
    <span className={`sdpm-nav-ico${active ? " is-active" : ""}`} aria-hidden>
      <img src={src} alt="" width={20} height={20} />
    </span>
  );
}

function ProfitsMobileHeader() {
  return (
    <header className="sdpm-header" data-sdpm="header">
      <h1 className="sdpm-title">기회 탐색</h1>
      <Link className="sdpm-bell" href="/me/inbox" aria-label="알림">
        <img src={SD_ASSETS.mobileNavBell} alt="" width={22} height={22} />
      </Link>
    </header>
  );
}

function ProfitsMobileNav() {
  return (
    <nav className="sdpm-nav" data-sdpm="nav" aria-label="주요 화면">
      {PROFITS_MOBILE_NAV.map((item) => {
        const active = item.key === "explore";
        return (
          <Link
            key={item.key}
            className={`sdpm-nav-item${active ? " is-active" : ""}`}
            href={item.href}
            aria-current={active ? "page" : undefined}
          >
            <NavIcon icon={item.icon} active={active} />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

/** 순수 텍스트 span — 이미지 asset을 쓰지 않아 white-bg box 이슈 자체가 발생하지 않는다. */
function EbayMark() {
  return (
    <span className="sdpm-ebay">
      <span className="e">e</span>
      <span className="b">B</span>
      <span className="a">a</span>
      <span className="y">y</span>
    </span>
  );
}

function fallbackMark(title: string): string {
  return title.replace(/[^A-Za-z0-9가-힣]/g, "").slice(0, 1) || "P";
}

function MediaFallback({
  item,
  state,
}: {
  item: ProfitsOpportunity;
  state: Extract<ProfitsMediaState, "MISSING" | "BROKEN" | "POLICY_UNKNOWN">;
}) {
  return (
    <div className="sdpm-media is-mark" data-sdpm="media" data-sdpm-media={state}>
      <span className="sdpm-media-watermark" aria-hidden>
        {fallbackMark(item.title)}
      </span>
      <img className="sdpm-media-bloom" src={SD_ASSETS.energyBloom1} alt="" />
      <img className="sdpm-media-streak" src={SD_ASSETS.energyStreaks} alt="" />
      <img className="sdpm-media-spark" src={SD_ASSETS.sparkMark} alt="" />
      <span className="sdpm-media-floor" aria-hidden />
      <div className="sdpm-media-copy">
        {item.partnerKind === "ebay" ? (
          <EbayMark />
        ) : item.partner ? (
          <p className="sdpm-partner">{item.partner}</p>
        ) : null}
        <p className="sdpm-media-title">{item.title}</p>
      </div>
    </div>
  );
}

function PhotoSlot({ item, url }: { item: ProfitsOpportunity; url: string }) {
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [state, setState] = useState<Extract<ProfitsMediaState, "LOADING" | "AVAILABLE" | "BROKEN">>(
    item.mediaState === "AVAILABLE" ? "AVAILABLE" : "LOADING",
  );

  useEffect(() => {
    const el = imgRef.current;
    if (!el || !el.complete) return;
    setState(el.naturalWidth > 0 ? "AVAILABLE" : "BROKEN");
  }, [url]);

  if (state === "BROKEN") {
    return <MediaFallback item={item} state="BROKEN" />;
  }

  return (
    <div className="sdpm-media is-photo" data-sdpm="media" data-sdpm-media={state}>
      {state === "LOADING" ? <span className="sdpm-media-skel" aria-hidden /> : null}
      <span className="sdpm-media-glow" aria-hidden />
      <img
        ref={imgRef}
        className="sdpm-media-shot"
        src={url}
        alt={item.productMediaAlt}
        onLoad={() => setState("AVAILABLE")}
        onError={() => setState("BROKEN")}
      />
      <span className="sdpm-media-floor" aria-hidden />
    </div>
  );
}

function CardMedia({ item }: { item: ProfitsOpportunity }) {
  const url = item.productMediaUrl;
  if (item.mediaState === "POLICY_UNKNOWN" || item.mediaState === "MISSING" || !url) {
    return (
      <MediaFallback
        item={item}
        state={item.mediaState === "POLICY_UNKNOWN" ? "POLICY_UNKNOWN" : "MISSING"}
      />
    );
  }
  return <PhotoSlot key={url} item={item} url={url} />;
}

function OpportunityCardMobile({ item }: { item: ProfitsOpportunity }) {
  return (
    <Link href={item.href} className="sdpm-card" data-sdpm="card">
      <div className="sdpm-card-top">
        {item.partnerKind === "ebay" ? (
          <EbayMark />
        ) : item.partner ? (
          <span className="sdpm-partner">{item.partner}</span>
        ) : null}
        {item.official === true ? <span className="sdpm-official">공식 파트너</span> : null}
      </div>
      <h3 className="sdpm-card-title">{item.title}</h3>
      <CardMedia item={item} />
      <div className="sdpm-capital" data-sdpm="capital">
        <p className="k">필요 원금</p>
        <MobileMoneyLine value={item.capitalUsdt} />
        {item.capitalKrw ? <p className="krw">{item.capitalKrw}</p> : null}
      </div>
      <div className="sdpm-metrics" data-sdpm="metrics">
        <div className="sdpm-metric-profit">
          <p className="k">예상 수익</p>
          <MobileMoneyLine value={item.expectedProfitUsdt} tone="pink" />
          <div className="sdpm-rate-row">
            {item.ratePct ? <span className="sdpm-rate-chip">수익률 {item.ratePct}</span> : null}
            {item.expectedProfitKrw ? <span className="krw">{item.expectedProfitKrw}</span> : null}
          </div>
        </div>
        <div className="sdpm-metric-duration">
          <p className="k">예상 시간</p>
          <p className="v" data-sdpm="duration">
            {moneyOrDash(item.durationLabel)}
          </p>
        </div>
      </div>
      <div className="sdpm-foot" data-sdpm="foot">
        <span className={`sdpm-status${item.joinable ? " is-on" : ""}`} data-sdpm="status">
          <span className="dot" aria-hidden />
          {item.statusLabel}
        </span>
        <span className="sdpm-more">
          자세히 보기 <span className="chev" aria-hidden>›</span>
        </span>
      </div>
    </Link>
  );
}

function ProfitsMobileEmpty() {
  return (
    <div className="sdpm-empty" data-sdpm="empty">
      <img className="sdpm-empty-icon" src={SD_ASSETS.mobileNavExplore} alt="" width={40} height={40} />
      <p className="sdpm-empty-title">지금 확인할 수 있는 기회가 없어요</p>
      <p className="sdpm-empty-body">
        새로운 기회가 생기면
        <br />
        여기에서 바로 확인할 수 있어요
      </p>
    </div>
  );
}

function ProfitsMobileMessage({ children }: { children: ReactNode }) {
  return <div className="sdpm-message">{children}</div>;
}

function ProfitsMobileSkeleton() {
  return (
    <div className="sdpm-skel-list" aria-busy="true" aria-label="기회를 불러오는 중">
      <div className="sdpm-skel" />
      <div className="sdpm-skel" />
    </div>
  );
}

export function ProfitsMobile({ model }: { model: ProfitsDesktopModel }) {
  return (
    <div
      className="sdpm-root"
      data-owner={model.owner}
      data-sdpm="root"
      data-sdpm-state={model.viewState}
    >
      <ProfitsMobileHeader />
      <div className="sdpm-scroll" data-sdpm="scroll">
        <div className="sdpm-stack">
          {model.viewState === "LOADING" ? <ProfitsMobileSkeleton /> : null}
          {model.viewState === "ERROR" ? (
            <ProfitsMobileMessage>
              <p>기회를 불러오지 못했어요. 잠시 후 다시 확인해 주세요.</p>
            </ProfitsMobileMessage>
          ) : null}
          {model.viewState === "UNAUTHORIZED" ? (
            <ProfitsMobileMessage>
              <p>로그인하면 확인할 수 있는 기회를 보여드려요.</p>
              <Link className="sdpm-empty-link" href="/auth/login">
                로그인
              </Link>
            </ProfitsMobileMessage>
          ) : null}
          {model.viewState === "EMPTY" ? <ProfitsMobileEmpty /> : null}
          {model.viewState === "READY" ? (
            <>
              <div className="sdpm-meta" data-sdpm="meta">
                <span className="lab">확인 가능한 기회</span>
                <span className="count">· {model.items.length}개의 기회</span>
              </div>
              {model.items.map((item) => (
                <OpportunityCardMobile key={item.id} item={item} />
              ))}
            </>
          ) : null}
        </div>
      </div>
      <ProfitsMobileNav />
    </div>
  );
}
