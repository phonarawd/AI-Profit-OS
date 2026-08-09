"use client";

import { T } from "../../copy/ko";
import type { WeeklyMarketBriefingModel } from "./trust-types";

export type WeeklyMarketBriefingProps = {
  data?: WeeklyMarketBriefingModel | null;
  toneBand?: "young" | "mid" | "senior";
  className?: string;
};

/**
 * §51.20 Weekly Market Briefing — /me/guide/market-weekly
 * Engine spreadDistribution 읽기만 · 투자 권유 0 · UI 재계산 0
 */
export function WeeklyMarketBriefing({
  data = null,
  toneBand = "mid",
  className = "",
}: WeeklyMarketBriefingProps) {
  const g = T.guide.marketWeekly;
  const dist = data?.spreadDistribution ?? null;
  const hasDist = Boolean(dist?.p10 && dist?.p50 && dist?.p90);

  return (
    <main
      data-testid="weekly-market-briefing"
      data-canon="market-weekly-briefing"
      data-tone-band={toneBand}
      data-investment-advice="false"
      data-engine-read-only="true"
      data-ui-recompute="false"
      className={`space-y-4 text-lux-text ${className}`.trim()}
    >
      <header data-canon-block="headline">
        <h1 className="text-xl font-semibold">{g.title}</h1>
        <p className="mt-1 text-sm text-lux-text-muted">{g.lead}</p>
      </header>

      <p
        data-canon-block="eduPurpose"
        data-testid="market-weekly-edu"
        className="rounded-lux-md border border-lux-border bg-lux-surface p-3 text-sm text-lux-text-muted"
      >
        {g.eduPurpose}
      </p>

      {!hasDist ? (
        <p
          data-testid="market-weekly-empty"
          className="text-sm text-lux-text-muted"
        >
          {g.empty}
        </p>
      ) : toneBand === "senior" ? (
        <ul
          data-testid="market-weekly-senior"
          data-canon-block="spreadLines"
          className="space-y-2 text-sm text-lux-text-muted"
        >
          <li>
            {g.p10Label}: {dist!.p10}
          </li>
          <li>
            {g.p50Label}: {dist!.p50}
          </li>
          <li>
            {g.p90Label}: {dist!.p90}
          </li>
        </ul>
      ) : toneBand === "young" ? (
        <ul
          data-testid="market-weekly-young"
          data-canon-block="spreadBullets"
          className="list-disc space-y-1 pl-5 text-sm text-lux-text-muted"
        >
          <li>
            {g.bulletP50.replace("{v}", dist!.p50)}
          </li>
          <li>
            {g.bulletRange
              .replace("{lo}", dist!.p10)
              .replace("{hi}", dist!.p90)}
          </li>
          <li>{g.bulletWhy}</li>
        </ul>
      ) : (
        <table
          data-testid="market-weekly-mid"
          data-canon-block="spreadTable"
          className="w-full text-left text-sm"
        >
          <thead>
            <tr className="text-lux-text-muted">
              <th className="py-1 font-medium">{g.colBand}</th>
              <th className="py-1 font-medium">{g.colValue}</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="py-1">{g.p10Label}</td>
              <td className="py-1" data-field="p10">
                {dist!.p10}
              </td>
            </tr>
            <tr>
              <td className="py-1">{g.p50Label}</td>
              <td className="py-1" data-field="p50">
                {dist!.p50}
              </td>
            </tr>
            <tr>
              <td className="py-1">{g.p90Label}</td>
              <td className="py-1" data-field="p90">
                {dist!.p90}
              </td>
            </tr>
          </tbody>
        </table>
      )}

      <p
        data-canon-block="disclaimer"
        data-testid="market-weekly-disclaimer"
        className="text-xs text-lux-text-muted"
      >
        {g.disclaimer}
      </p>
    </main>
  );
}
