import Link from "next/link";
import type { ReactNode } from "react";
import { moneyOrDash, splitUsdtParts } from "../spark-dash-home/format";
import { ProfitsShell } from "../spark-dash-profits/ProfitsShell";
import { EbayMark, OpportunityRoomMedia } from "./OpportunityRoomMedia";
import { toRoomShellModel } from "./map-runtime";
import type { OpportunityRoomItem, OpportunityRoomModel } from "./types";
import "./spark-dash-room.css";

function UsdtLine({
  value,
  tone,
}: {
  value: string | null;
  tone?: "pink" | "white";
}) {
  const parts = splitUsdtParts(value);
  return (
    <p className={`sdr-usdt${tone ? ` is-${tone}` : ""}`}>
      <span className="amt">{parts.amount}</span>
      {parts.unit ? <span className="unit">{parts.unit}</span> : null}
    </p>
  );
}

function RoomMessage({ children }: { children: ReactNode }) {
  return <div className="sdr-message">{children}</div>;
}

function RoomHero({
  item,
  primaryCta,
  notice,
}: {
  item: OpportunityRoomItem;
  primaryCta: ReactNode;
  notice: ReactNode;
}) {
  return (
    <section className="sdr-hero" data-sdr="hero">
      <div className="sdr-hero-media">
        <p className="sdr-media-kicker">
          {item.partnerKind === "ebay" ? "eBay 정품" : item.partner || "기회"}
        </p>
        <p className="sdr-media-tag">시세 차익 기회</p>
        <OpportunityRoomMedia item={item} />
      </div>
      <aside className="sdr-facts" data-sdr="facts">
        <div className="sdr-fact">
          <p className="sdr-k">필요 원금</p>
          <UsdtLine value={item.capitalUsdt ? `${item.capitalUsdt} USDT` : null} tone="white" />
          {item.capitalKrw ? <p className="sdr-krw">{item.capitalKrw}</p> : null}
        </div>
        <div className="sdr-fact-div" />
        <div className="sdr-fact">
          <div className="sdr-fact-head">
            <p className="sdr-k">예상 수익</p>
            {item.ratePct ? (
              <span className="sdr-rate">수익률 {item.ratePct}</span>
            ) : null}
          </div>
          <UsdtLine value={item.expectedProfitUsdt} tone="pink" />
          {item.expectedProfitKrw ? (
            <p className="sdr-krw">{item.expectedProfitKrw}</p>
          ) : null}
          <p className="sdr-hint">수수료·예상 비용 반영 후</p>
        </div>
        <div className="sdr-fact-div" />
        <div className="sdr-fact-row">
          <div>
            <p className="sdr-k">예상 시간</p>
            <p className="sdr-duration" data-sdr="duration">
              {moneyOrDash(item.durationLabel)}
            </p>
          </div>
          <p
            className={`sdr-status${item.joinable ? " is-on" : ""}`}
            data-sdr="status"
          >
            <span className="dot" />
            {item.statusLabel}
          </p>
        </div>
        {notice}
        {item.funding && item.suggestDeposit ? (
          <p className="sdr-warn">부족한 금액 {item.suggestDeposit} USDT</p>
        ) : null}
        {primaryCta}
        <p className="sdr-cta-note">참여 전 최종 조건을 다시 확인해요</p>
      </aside>
    </section>
  );
}

function RoomCompare({ item }: { item: OpportunityRoomItem }) {
  const hasCompare =
    item.buyLabel ||
    item.buyPriceUsdt ||
    item.sellLabel ||
    item.sellPriceUsdt ||
    item.grossSpreadUsdt;
  if (!hasCompare) return null;
  return (
    <section className="sdr-compare" data-sdr="compare">
      <div className="sdr-section-head">
        <h2>구매 ↔ 판매 구조</h2>
        <p>이 상품은 이렇게 사고 팔려요</p>
      </div>
      <div className="sdr-compare-row">
        <div className="sdr-price-card">
          <p className="sdr-k">구매 기준</p>
          <p className="sdr-leg">{moneyOrDash(item.buyLabel)}</p>
          <p className="sdr-leg-amt">
            {item.buyPriceUsdt ? `${item.buyPriceUsdt} USDT` : "—"}
          </p>
        </div>
        <div className="sdr-spread">
          <p className="sdr-spread-arrow">→</p>
          {item.grossSpreadUsdt ? (
            <p className="sdr-spread-chip">차익 {item.grossSpreadUsdt}</p>
          ) : null}
        </div>
        <div className="sdr-price-card">
          <p className="sdr-k">판매 기준</p>
          <p className="sdr-leg">{moneyOrDash(item.sellLabel)}</p>
          <p className="sdr-leg-amt">
            {item.sellPriceUsdt ? `${item.sellPriceUsdt} USDT` : "—"}
          </p>
        </div>
      </div>
      <p className="sdr-compare-note">
        실제 체결 가격은 참여 시점 기준으로 다시 확인돼요.
      </p>
    </section>
  );
}

function RoomContext() {
  return (
    <section className="sdr-context" data-sdr="context">
      <div className="sdr-why">
        <p className="sdr-why-mark">↯</p>
        <div>
          <p className="sdr-why-title">가격 차이 기회</p>
          <p className="sdr-why-body">
            같은 상품이 지역과 판매처마다 다른 가격에 거래돼요. 퍼뜩이 낮은 가격을
            찾아 연결해요.
          </p>
        </div>
      </div>
      <div className="sdr-steps">
        <p className="sdr-k">참여 후 순서</p>
        <div className="sdr-step-row">
          <div>
            <span className="sdr-step-n">1</span>
            <p className="sdr-step-t">참여 확정</p>
            <p className="sdr-step-d">원금이 잠김으로 이동해요</p>
          </div>
          <div>
            <span className="sdr-step-n">2</span>
            <p className="sdr-step-t">매칭 진행</p>
            <p className="sdr-step-d">구매와 판매를 자동으로 연결해요</p>
          </div>
          <div>
            <span className="sdr-step-n">3</span>
            <p className="sdr-step-t">정산 반영</p>
            <p className="sdr-step-d">성공하면 수익이 지갑에 반영돼요</p>
          </div>
        </div>
      </div>
    </section>
  );
}

export function OpportunityRoomDesktop({
  model,
  primaryCta,
  notice,
  children,
}: {
  model: OpportunityRoomModel;
  primaryCta?: ReactNode;
  notice?: ReactNode;
  children?: ReactNode;
}) {
  const item = model.item;
  return (
    <ProfitsShell model={toRoomShellModel(model)}>
      <div className="sdr-canvas" data-sdr="root" data-sdr-state={model.viewState}>
        <div className="sdr-stage">
          {model.viewState === "LOADING" ? (
            <RoomMessage>
              <p>불러오는 중…</p>
            </RoomMessage>
          ) : null}
          {model.viewState === "UNAUTHORIZED" ? (
            <RoomMessage>
              <p>로그인하면 이 기회를 확인할 수 있어요.</p>
              {primaryCta}
            </RoomMessage>
          ) : null}
          {model.viewState === "ERROR" ? (
            <RoomMessage>
              <p>기회를 불러오지 못했어요.</p>
              {primaryCta}
            </RoomMessage>
          ) : null}
          {model.viewState === "READY" && item ? (
            <>
              <p className="sdr-crumb">
                <Link href="/profits">← 기회 탐색</Link>
                <span>/</span>
                <span>{item.title}</span>
              </p>
              <div className="sdr-identity">
                <div className="sdr-identity-top">
                  {item.partnerKind === "ebay" ? (
                    <EbayMark />
                  ) : item.partner ? (
                    <span className="sdr-partner">{item.partner}</span>
                  ) : null}
                  {item.partnerKind === "ebay" ? (
                    <span className="sdr-official">공식 파트너</span>
                  ) : null}
                </div>
                <h1 className="sdr-title">{item.title}</h1>
              </div>
              <RoomHero item={item} primaryCta={primaryCta} notice={notice} />
              <RoomCompare item={item} />
              <RoomContext />
            </>
          ) : null}
          {model.viewState === "EMPTY" ? (
            <RoomMessage>
              <p>이 기회는 이제 없어요.</p>
              {primaryCta}
            </RoomMessage>
          ) : null}
        </div>
      </div>
      {children}
    </ProfitsShell>
  );
}
