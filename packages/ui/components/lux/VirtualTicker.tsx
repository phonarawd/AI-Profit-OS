"use client";

import { VirtualList } from "./VirtualList";

export const VIRTUAL_TICKER_THRESHOLD = 50;
export const TICKER_ROW_ESTIMATE_PX = 28;

export type VirtualTickerRow = {
  id: string;
  text: string;
};

export type VirtualTickerProps = {
  rows: VirtualTickerRow[];
  threshold?: number;
  className?: string;
  /** Max visible viewport height */
  height?: number | string;
};

/**
 * 홈 지급 ticker virtualizer — §29.1 Law 4 · threshold >50
 */
export function VirtualTicker({
  rows,
  threshold = VIRTUAL_TICKER_THRESHOLD,
  className = "",
  height = 96,
}: VirtualTickerProps) {
  if (rows.length === 0) return null;

  if (rows.length <= threshold) {
    return (
      <ul
        className={[
          "flex max-h-24 flex-col gap-1 overflow-y-auto text-sm text-lux-text-muted",
          className,
        ]
          .filter(Boolean)
          .join(" ")}
        data-testid="virtual-ticker"
        data-virtual="off"
      >
        {rows.map((row) => (
          <li key={row.id} data-testid="ticker-row" className="truncate lux-motion-any">
            {row.text}
          </li>
        ))}
      </ul>
    );
  }

  return (
    <VirtualList
      items={rows}
      getItemKey={(r) => r.id}
      estimateSize={TICKER_ROW_ESTIMATE_PX}
      overscan={3}
      height={height}
      className={["text-sm text-lux-text-muted", className]
        .filter(Boolean)
        .join(" ")}
      testId="virtual-ticker"
      renderItem={(row) => (
        <div data-testid="ticker-row" className="truncate lux-motion-any leading-7">
          {row.text}
        </div>
      )}
    />
  );
}
