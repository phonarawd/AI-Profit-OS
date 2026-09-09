"use client";

import { useState } from "react";
import { T } from "../../copy/ko";

export type PriceCompareMarginProps = {
  /** Engine §0.0.4 · 저가 시세 (재계산 금지) */
  buyPriceUsdt?: string | null;
  /** Engine §0.0.4 · 고가 시세 */
  sellPriceUsdt?: string | null;
  /** Engine expectedProfitUsdt = 유저 마진 */
  expectedProfitUsdt?: string | null;
  /** Engine platformMarginUsdt */
  platformMarginUsdt?: string | null;
  /** compareReady 가드 · false면 pending 카피만 */
  compareReady?: boolean;
  /**
   * full = 홈/상세/확인/영수증
   * mini = 카드 접힘
   * utility = 랜딩 · 차익/마진 라벨 0
   */
  variant?: "full" | "mini" | "utility";
  /** 접힘 기본 (카드) */
  defaultCollapsed?: boolean;
  className?: string;
};

function fmtUsdt(v: string | null | undefined): string {
  if (v == null || v === "") return "\u2014";
  return `${v} USDT`;
}

/**
 * PriceCompareMargin · UI §5.3 · Engine §0.0.4 pointer
 * 표시·ko 라벨만 · 스프레드/마진 재계산 금지 · FX도 동일 컴포넌트
 *
 * D1 복원 근거 (2026-09-04, REM-D1-6A): 부모 커밋 289a53da(848161ce 삭제 직전)에서
 * 내용을 복원하되, 경로는 packages/ui/components/execution/로 재배치했다.
 * 원래 경로 packages/ui/components/opportunity/PriceCompareMargin.tsx는 계속
 * 삭제 상태로 둔다 — 그 삭제는 OpportunityCard 레벨 "3-badge trust stack"
 * (scan badge · AdapterHealthChip · PriceCompareMargin을 카드에 함께 노출하던 것)의
 * Owner 은퇴 결정이며 governance/runtime-surfaces.v1.json
 * surfaces.home.retiredFeatures에 기록돼 있다. 그 은퇴 결정은
 * ExecutionSuccessReceipt(정산 성공 영수증의 마진 투명성 블록) 안에서의 사용은
 * 다루지 않는다 — packages/ui/canon/surfaces/execution-success.wire.json이 여전히
 * component:"PriceCompareMargin" 전체 필드셋을 요구하고,
 * CONSTITUTION/45_PRICE_COMPARE_MARGIN_UX.md와 Engine plan SSOT(§0.0.4,
 * "삭제 금지" 명시)가 여전히 이를 관장한다. opportunity/ 원래 경로로 되돌리지 않고
 * 재배치함으로써 tooling/verify/margin-compare-surface.cjs의 카드 계열
 * 재도입 가드(deadPath)는 그대로 유지된다.
 */
export function PriceCompareMargin({
  buyPriceUsdt,
  sellPriceUsdt,
  expectedProfitUsdt,
  platformMarginUsdt,
  compareReady = false,
  variant = "full",
  defaultCollapsed = false,
  className = "",
}: PriceCompareMarginProps) {
  const [open, setOpen] = useState(!defaultCollapsed);
  const ready = compareReady === true;

  if (variant === "utility") {
    return (
      <div
        data-testid="price-compare-margin"
        data-variant="utility"
        data-compare-ready={ready ? "1" : "0"}
        className={`text-sm text-lux-text-muted ${className}`.trim()}
      >
        <p>{T.margin.compareMiniUtility}</p>
        {ready ? (
          <p className="mt-1">
            {T.opportunity.labelPriceLow} {fmtUsdt(buyPriceUsdt)} {"\u00b7"}{" "}
            {T.opportunity.labelPriceHigh} {fmtUsdt(sellPriceUsdt)}
          </p>
        ) : (
          <p className="mt-1">{T.margin.comparePending}</p>
        )}
      </div>
    );
  }

  const body = !ready ? (
    <p data-testid="price-compare-pending" className="text-sm text-lux-text-muted">
      {T.margin.comparePending}
    </p>
  ) : (
    <dl
      data-testid="price-compare-ready"
      className="grid grid-cols-2 gap-x-3 gap-y-1 text-sm"
    >
      <dt className="text-lux-text-muted">{T.opportunity.labelPriceLow}</dt>
      <dd data-field="buyPriceUsdt" className="text-right text-lux-text">
        {fmtUsdt(buyPriceUsdt)}
      </dd>
      <dt className="text-lux-text-muted">{T.opportunity.labelPriceHigh}</dt>
      <dd data-field="sellPriceUsdt" className="text-right text-lux-text">
        {fmtUsdt(sellPriceUsdt)}
      </dd>
      {variant === "full" ? (
        <>
          <dt className="text-lux-text-muted">{T.margin.labelUserMargin}</dt>
          <dd
            data-field="expectedProfitUsdt"
            className="text-right font-medium text-lux-accent"
          >
            {fmtUsdt(expectedProfitUsdt)}
          </dd>
          <dt className="text-lux-text-muted">{T.margin.labelPlatformMargin}</dt>
          <dd
            data-field="platformMarginUsdt"
            className="text-right text-lux-text-muted"
          >
            {fmtUsdt(platformMarginUsdt)}
          </dd>
        </>
      ) : (
        <dd className="col-span-2 text-xs text-lux-text-muted">
          {T.margin.compareMini}
        </dd>
      )}
    </dl>
  );

  if (variant === "mini" || defaultCollapsed) {
    return (
      <div
        data-testid="price-compare-margin"
        data-variant={variant}
        data-compare-ready={ready ? "1" : "0"}
        data-collapsed={open ? "0" : "1"}
        className={className}
      >
        <button
          type="button"
          className="text-sm text-lux-accent underline"
          data-testid="price-compare-toggle"
          onClick={() => setOpen((v) => !v)}
        >
          {open ? T.margin.evidenceHide : T.margin.evidenceToggle}
        </button>
        {open ? <div className="mt-2">{body}</div> : null}
      </div>
    );
  }

  return (
    <div
      data-testid="price-compare-margin"
      data-variant="full"
      data-compare-ready={ready ? "1" : "0"}
      className={className}
    >
      <p className="mb-1 text-xs text-lux-text-muted">{T.margin.evidenceToggle}</p>
      {body}
    </div>
  );
}
