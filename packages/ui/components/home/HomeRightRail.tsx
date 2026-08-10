"use client";

import { T } from "../../copy/ko";
import { formatUsdt } from "../../lib/format-usdt";
import { ProductImage } from "../product/ProductImage";
import type { OpportunityCardModel } from "../opportunity/opportunity-types";

export type HomeRightRailProgress = {
  scan?: number | null;
  confirm?: number | null;
  progress?: number | null;
  settle?: number | null;
};

export type HomeRightRailProps = {
  totalResultLabel?: string | null;
  totalResultValue?: string | null;
  /** 오늘 가능한 수익 보조 라인 (기존 Fact 재사용 · "실현" 아닌 "가능" 표현 유지) */
  todayPossibleProfitUsdt?: string | null;
  topOpportunities?: OpportunityCardModel[];
  progress?: HomeRightRailProgress | null;
  className?: string;
};

function nOrZero(n: number | null | undefined): number {
  return typeof n === "number" && Number.isFinite(n) ? n : 0;
}

/**
 * HomeRightRail — Contract §6 (v1.3) · desktop always · 0 솔직 · 가짜 체결/성공률% 금지
 * 순서: 누적 결과(anchor, 확대) → Top3(이미지 포함) → 진행 현황(4-스탯, 도넛 아님)
 */
export function HomeRightRail({
  totalResultLabel = null,
  totalResultValue = null,
  todayPossibleProfitUsdt = null,
  topOpportunities = [],
  progress = null,
  className = "",
}: HomeRightRailProps) {
  const total =
    typeof totalResultValue === "string" && totalResultValue.trim()
      ? totalResultValue.trim()
      : null;
  const todayPossible =
    typeof todayPossibleProfitUsdt === "string" &&
    todayPossibleProfitUsdt.trim() &&
    Number(todayPossibleProfitUsdt) > 0
      ? formatUsdt(todayPossibleProfitUsdt)
      : null;
  const tops = Array.isArray(topOpportunities)
    ? topOpportunities.slice(0, 3)
    : [];
  const p = progress ?? {};
  const statusRows = [
    [T.home.rightRail.statusScan, nOrZero(p.scan)],
    [T.home.rightRail.statusConfirm, nOrZero(p.confirm)],
    [T.home.rightRail.statusProgress, nOrZero(p.progress)],
    [T.home.rightRail.statusSettle, nOrZero(p.settle)],
  ] as const;

  return (
    <aside
      data-testid="home-right-rail"
      data-canon-block="rightRail"
      aria-label={T.home.rightRail.aria}
      className={["home-right-rail space-y-4", className]
        .filter(Boolean)
        .join(" ")}
    >
      <section
        data-testid="home-right-rail-total"
        className="rounded-lux-xl border border-lux-border bg-lux-surface p-5 home-money-card"
      >
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm text-lux-text-muted">
            {totalResultLabel?.trim() || T.home.rightRail.totalResult}
          </p>
          <a
            href="/trades"
            className="touch-target text-xs font-medium text-lux-accent"
            data-testid="home-right-rail-total-link"
          >
            {T.common.viewAll}
          </a>
        </div>
        {total ? (
          <p className="mt-2 text-3xl font-semibold tabular-nums text-lux-text md:text-4xl">
            {total}
          </p>
        ) : (
          <p className="mt-2 text-sm text-lux-text-muted">
            {T.home.rightRail.totalEmpty}
          </p>
        )}
        {todayPossible ? (
          <p className="mt-2 text-sm tabular-nums text-lux-profit">
            {T.home.money.todayPossibleLabel} +{todayPossible} USDT
          </p>
        ) : null}
      </section>

      <section
        data-testid="home-right-rail-top"
        className="rounded-lux-xl border border-lux-border bg-lux-surface p-4 home-money-card"
      >
        <p className="text-sm font-semibold text-lux-text">
          {T.home.rightRail.topOpportunities}
        </p>
        {tops.length > 0 ? (
          <ul className="mt-3 space-y-2">
            {tops.map((o) => (
              <li
                key={o.id}
                className="flex items-center gap-3 rounded-lux-md bg-lux-bg p-2"
              >
                <ProductImage
                  src={o.assetImageUrl}
                  alt={o.assetImageAltKo}
                  category={o.category}
                  imageSource={o.assetImageSource}
                  assetIcon={o.assetIcon}
                  variant="thumb"
                  className="h-12 w-12 rounded-lux-sm"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-lux-text">
                    {o.assetLabel}
                  </p>
                  <p className="tabular-nums text-xs text-lux-profit">
                    +{o.expectedProfitUsdt} USDT
                  </p>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-lux-text-muted">
            {T.home.rightRail.topEmpty}
          </p>
        )}
      </section>

      <section
        data-testid="home-right-rail-progress"
        className="rounded-lux-xl border border-lux-border bg-lux-surface p-4 home-money-card"
      >
        <p className="text-sm font-semibold text-lux-text">
          {T.home.rightRail.progressTitle}
        </p>
        <ul className="mt-3 grid grid-cols-2 gap-2">
          {statusRows.map(([label, n]) => (
            <li
              key={label}
              className="rounded-lux-md bg-lux-bg px-3 py-3 text-center"
            >
              <p className="text-xs text-lux-text-muted">{label}</p>
              <p className="mt-1 text-xl font-semibold tabular-nums text-lux-text">
                {n}
              </p>
            </li>
          ))}
        </ul>
      </section>
    </aside>
  );
}
