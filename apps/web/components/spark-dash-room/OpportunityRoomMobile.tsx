"use client";

/**
 * CUX-003 Opportunity Room Mobile.
 * Desktop(OpportunityRoomDesktop)과 동일한 OpportunityRoomModel/Item을 소비한다.
 * Money/duration/participation owner는 재사용만 — 새 owner 생성 0.
 * Home geometry 비종속 — 헤더/하단 탭은 이 파일이 독립 소유한다.
 */

import Link from "next/link";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { SD_ASSETS } from "../spark-dash-home/assets";
import { moneyOrDash, splitUsdtParts } from "../spark-dash-home/format";
import { EbayMark, fallbackMark } from "./OpportunityRoomMedia";
import type { OpportunityRoomItem, OpportunityRoomModel } from "./types";
import "./spark-dash-room.css";
import "./spark-dash-room-mobile.css";

const ROOM_MOBILE_NAV = [
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
    <p className={`sdrm-money${tone ? ` is-${tone}` : ""}`}>
      <span className="amt">{parts.amount}</span>
      {parts.unit ? <span className="unit">{parts.unit}</span> : null}
    </p>
  );
}

function RoomMobileNavIcon({
  icon,
  active,
}: {
  icon: (typeof ROOM_MOBILE_NAV)[number]["icon"];
  active: boolean;
}) {
  if (icon === "more") {
    return (
      <span className={`sdrm-nav-more${active ? " is-active" : ""}`} aria-hidden>
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
    <span className={`sdrm-nav-ico${active ? " is-active" : ""}`} aria-hidden>
      <img src={src} alt="" width={20} height={20} />
    </span>
  );
}

function RoomMobileHeader() {
  return (
    <header className="sdrm-header" data-sdrm="header">
      <Link className="sdrm-back" href="/profits">
        <span aria-hidden>‹</span>
        기회 탐색
      </Link>
      <p className="sdrm-brand">
        퍼뜩
        <img src={SD_ASSETS.headlineSpark} alt="" width={18} height={18} />
      </p>
      <Link className="sdrm-bell" href="/me/inbox" aria-label="알림">
        <img src={SD_ASSETS.headerBell} alt="" width={20} height={20} />
      </Link>
    </header>
  );
}

function RoomMobileTabBar() {
  return (
    <nav className="sdrm-nav" data-sdrm="nav" aria-label="주요 화면">
      {ROOM_MOBILE_NAV.map((item) => {
        const active = item.key === "explore";
        return (
          <Link
            key={item.key}
            className={`sdrm-nav-item${active ? " is-active" : ""}`}
            href={item.href}
            aria-current={active ? "page" : undefined}
          >
            <RoomMobileNavIcon icon={item.icon} active={active} />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

function RoomMobileMessage({ children }: { children: ReactNode }) {
  return <div className="sdrm-message">{children}</div>;
}

function RoomMobileHero({ item }: { item: OpportunityRoomItem }) {
  const url = item.productMediaUrl;
  const [state, setState] = useState<"LOADING" | "AVAILABLE" | "BROKEN">(
    item.mediaState === "AVAILABLE" ? "AVAILABLE" : "LOADING",
  );
  const imgRef = useRef<HTMLImageElement | null>(null);

  useEffect(() => {
    const el = imgRef.current;
    if (!el || !el.complete) return;
    setState(el.naturalWidth > 0 ? "AVAILABLE" : "BROKEN");
  }, [url]);

  const noPhoto =
    item.mediaState === "MISSING" ||
    item.mediaState === "POLICY_UNKNOWN" ||
    !url ||
    state === "BROKEN";
  const mediaAttr = noPhoto
    ? item.mediaState === "POLICY_UNKNOWN"
      ? "POLICY_UNKNOWN"
      : state === "BROKEN"
        ? "BROKEN"
        : "MISSING"
    : state;

  return (
    <div className="sdrm-hero" data-sdrm="hero" data-sdrm-media={mediaAttr}>
      <span className="sdrm-hero-glow" aria-hidden />
      {noPhoto ? (
        <div className="sdrm-hero-mark">
          <span className="sdrm-hero-watermark" aria-hidden>
            {fallbackMark(item.title)}
          </span>
          {item.partnerKind === "ebay" ? (
            <EbayMark />
          ) : item.partner ? (
            <p className="sdrm-hero-mark-partner">{item.partner}</p>
          ) : null}
          <p className="sdrm-hero-mark-title">{item.title}</p>
        </div>
      ) : (
        <>
          {state === "LOADING" ? <span className="sdrm-hero-skel" aria-hidden /> : null}
          <img
            ref={imgRef}
            className="sdrm-hero-shot"
            src={url ?? undefined}
            alt={item.productMediaAlt}
            onLoad={() => setState("AVAILABLE")}
            onError={() => setState("BROKEN")}
          />
        </>
      )}
      <span className="sdrm-hero-floor" aria-hidden />
    </div>
  );
}

function RoomMobileTop({ item }: { item: OpportunityRoomItem }) {
  return (
    <div className="sdrm-top">
      <div className="sdrm-top-row">
        <div className="sdrm-brand-id">
          {item.partnerKind === "ebay" ? (
            <EbayMark />
          ) : item.partner ? (
            <span className="sdrm-partner">{item.partner}</span>
          ) : null}
          {item.partnerKind === "ebay" ? (
            <span className="sdrm-official">공식 파트너</span>
          ) : null}
        </div>
        <p className={`sdrm-status${item.joinable ? " is-on" : ""}`} data-sdrm="status">
          {item.statusLabel}
        </p>
      </div>
      <h1 className="sdrm-title">{item.title}</h1>
      <p className="sdrm-subtitle">{moneyOrDash(item.corridorKo)}</p>
    </div>
  );
}

function RoomMobileCapital({ item }: { item: OpportunityRoomItem }) {
  return (
    <div className="sdrm-capital" data-sdrm="capital">
      <p className="sdrm-k">필요 원금</p>
      {item.capitalUsdt ? (
        <MobileMoneyLine value={`${item.capitalUsdt} USDT`} />
      ) : (
        <p className="sdrm-money is-unavailable">확인할 수 없음</p>
      )}
      {item.capitalKrw ? <p className="sdrm-krw">{item.capitalKrw}</p> : null}
    </div>
  );
}

function RoomMobileKpis({ item }: { item: OpportunityRoomItem }) {
  return (
    <div className="sdrm-kpi-row" data-sdrm="kpi-row">
      <div className="sdrm-kpi">
        <div className="sdrm-kpi-head">
          <span className="lab">예상 수익</span>
        </div>
        <MobileMoneyLine value={item.expectedProfitUsdt} tone="pink" />
        {item.expectedProfitKrw ? <p className="sdrm-kpi-sub">{item.expectedProfitKrw}</p> : null}
      </div>
      <div className="sdrm-kpi">
        <div className="sdrm-kpi-head">
          <span className="lab">수익률</span>
        </div>
        <p className="sdrm-kpi-val">{moneyOrDash(item.ratePct)}</p>
      </div>
      <div className="sdrm-kpi">
        <div className="sdrm-kpi-head">
          <span className="lab">예상 시간</span>
        </div>
        <p className="sdrm-kpi-val" data-sdrm="duration">
          {moneyOrDash(item.durationLabel)}
        </p>
      </div>
    </div>
  );
}

function RoomMobileCompare({ item }: { item: OpportunityRoomItem }) {
  const hasCompare =
    item.buyLabel ||
    item.buyPriceUsdt ||
    item.sellLabel ||
    item.sellPriceUsdt ||
    item.grossSpreadUsdt;
  if (!hasCompare) return null;
  return (
    <section className="sdrm-compare" data-sdrm="compare">
      <h2 className="sdrm-sec-title">구매 ↔ 판매 구조</h2>
      <div className="sdrm-compare-stack">
        <div className="sdrm-compare-side">
          <p className="sdrm-k">구매 기준</p>
          <p className="sdrm-compare-label">{moneyOrDash(item.buyLabel)}</p>
          <p className="sdrm-compare-amt">
            {item.buyPriceUsdt ? `${item.buyPriceUsdt} USDT` : "—"}
          </p>
          {item.buyPriceKrw ? <p className="sdrm-kpi-sub">{item.buyPriceKrw}</p> : null}
        </div>
        {item.grossSpreadUsdt ? (
          <p className="sdrm-compare-chip">↓ 차익 {item.grossSpreadUsdt}</p>
        ) : null}
        <div className="sdrm-compare-side">
          <p className="sdrm-k">판매 기준</p>
          <p className="sdrm-compare-label">{moneyOrDash(item.sellLabel)}</p>
          <p className="sdrm-compare-amt">
            {item.sellPriceUsdt ? `${item.sellPriceUsdt} USDT` : "—"}
          </p>
          {item.sellPriceKrw ? <p className="sdrm-kpi-sub">{item.sellPriceKrw}</p> : null}
        </div>
        <p className="sdrm-compare-note">실제 체결 가격은 참여 시점 기준으로 다시 확인돼요.</p>
      </div>
    </section>
  );
}

function RoomMobileWhy() {
  return (
    <section className="sdrm-why" data-sdrm="why">
      <span className="sdrm-why-mark" aria-hidden>
        <img src={SD_ASSETS.headlineSpark} alt="" width={16} height={16} />
      </span>
      <div>
        <p className="sdrm-why-title">가격 차이 기회</p>
        <p className="sdrm-why-body">
          같은 상품이지만 시장과 판매처마다 다른 가격에 거래돼요. 퍼뜩이 낮은 가격을 찾아 연결해요.
        </p>
      </div>
    </section>
  );
}

function RoomMobileSteps() {
  return (
    <section className="sdrm-steps" data-sdrm="steps">
      <h2 className="sdrm-sec-title">참여 후 순서</h2>
      <ol className="sdrm-step-list">
        <li className="sdrm-step">
          <span className="sdrm-step-n">1</span>
          <div>
            <p className="sdrm-step-t">참여 확정</p>
            <p className="sdrm-step-d">원금이 잠김으로 이동해요</p>
          </div>
        </li>
        <li className="sdrm-step">
          <span className="sdrm-step-n">2</span>
          <div>
            <p className="sdrm-step-t">매칭 진행</p>
            <p className="sdrm-step-d">구매와 판매를 자동으로 연결해요</p>
          </div>
        </li>
        <li className="sdrm-step">
          <span className="sdrm-step-n">3</span>
          <div>
            <p className="sdrm-step-t">정산 반영</p>
            <p className="sdrm-step-d">성공하면 수익이 지갑에 반영돼요</p>
          </div>
        </li>
      </ol>
    </section>
  );
}

export function OpportunityRoomMobile({
  model,
  primaryCta,
  notice,
}: {
  model: OpportunityRoomModel;
  primaryCta?: ReactNode;
  notice?: ReactNode;
}) {
  const item = model.item;
  return (
    <div
      className="sdrm-root"
      data-owner={model.owner}
      data-sdrm="root"
      data-sdrm-state={model.viewState}
    >
      <RoomMobileHeader />
      <div
        className="sdrm-scroll"
        data-sdrm="scroll"
        tabIndex={0}
        aria-label="기회 상세"
      >
        <div className="sdrm-stack">
          {model.viewState === "LOADING" ? (
            <RoomMobileMessage>
              <p>불러오는 중…</p>
            </RoomMobileMessage>
          ) : null}
          {model.viewState === "UNAUTHORIZED" ? (
            <RoomMobileMessage>
              <p>로그인하면 이 기회를 확인할 수 있어요.</p>
            </RoomMobileMessage>
          ) : null}
          {model.viewState === "ERROR" ? (
            <RoomMobileMessage>
              <p>기회를 불러오지 못했어요.</p>
            </RoomMobileMessage>
          ) : null}
          {model.viewState === "EMPTY" ? (
            <RoomMobileMessage>
              <p>이 기회는 이제 없어요.</p>
            </RoomMobileMessage>
          ) : null}
          {model.viewState === "READY" && item ? (
            <>
              <RoomMobileTop item={item} />
              <RoomMobileHero item={item} />
              <RoomMobileCapital item={item} />
              <RoomMobileKpis item={item} />
              <RoomMobileCompare item={item} />
              <RoomMobileWhy />
              <RoomMobileSteps />
            </>
          ) : null}
        </div>
      </div>
      {primaryCta ? (
        <div className="sdrm-cta-bar" data-sdrm="cta-bar">
          {notice}
          {primaryCta}
          {item?.funding && item.suggestDeposit ? (
            <p className="sdrm-cta-hint">부족한 금액 {item.suggestDeposit} USDT</p>
          ) : null}
        </div>
      ) : null}
      <RoomMobileTabBar />
    </div>
  );
}
