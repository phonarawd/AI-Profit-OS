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
  todayPossibleProfitUsdt?: string | null;
  topOpportunities?: OpportunityCardModel[];
  progress?: HomeRightRailProgress | null;
  className?: string;
};

function countCell(n: number | null | undefined): {
  ready: boolean;
  text: string;
} {
  if (typeof n === "number" && Number.isFinite(n)) {
    return { ready: true, text: String(n) };
  }
  return { ready: false, text: T.home.rightRail.countAbsent };
}

/**
 * HomeRightRail — Contract §6 · C01 COUNT · absent != 0
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
    [T.home.rightRail.statusScan, countCell(p.scan)],
    [T.home.rightRail.statusConfirm, countCell(p.confirm)],
    [T.home.rightRail.statusProgress, countCell(p.progress)],
    [T.home.rightRail.statusSettle, countCell(p.settle)],
  ] as const;

  return (
    <aside
      data-testid="home-right-rail"
      data-canon-block="rightRail"
      aria-label={T.home.rightRail.aria}
      className={["home-right-rail", className].filter(Boolean).join(" ")}
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
          <p
            className="mt-2 text-3xl font-semibold tabular-nums text-lux-text md:text-4xl"
            data-ledger-unit="count"
            data-testid="home-right-rail-total-value"
          >
            {total}
          </p>
        ) : (
          <p className="mt-2 text-sm text-lux-text-muted">
            {T.home.rightRail.totalEmpty}
          </p>
        )}
        {todayPossible ? (
          <p className="mt-2 text-sm tabular-nums text-lux-profit">
            {T.feed.todayPossibleProfitUsdt.replace("{n}", todayPossible)}
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
                    {T.feed.todayPossibleProfitUsdt.replace(
                      "{n}",
                      o.expectedProfitUsdt,
                    )}
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
          {statusRows.map(([label, cell]) => (
            <li
              key={label}
              className="rounded-lux-md bg-lux-bg px-3 py-3 text-center"
              data-fact-state={cell.ready ? "ready" : "absent"}
            >
              <p className="text-xs text-lux-text-muted">{label}</p>
              <p
                className={[
                  "mt-1 text-xl font-semibold tabular-nums",
                  cell.ready ? "text-lux-text" : "text-lux-text-muted",
                ].join(" ")}
              >
                {cell.text}
              </p>
            </li>
          ))}
        </ul>
      </section>
    </aside>
  );
}
