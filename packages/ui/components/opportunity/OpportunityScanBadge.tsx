"use client";

import { Badge } from "../../primitives/Badge";
import { T } from "../../copy/ko";

export type OpportunityScanBadgeProps = {
  /** Engine §4.2a 투영 · UI type→ko 맵 금지 */
  arbitrageTypeKo: string;
  timeSensitive?: boolean;
  className?: string;
};

/**
 * §5.3b · arbitrageTypeKo 뱃지 + (선택) 마감 임박
 */
export function OpportunityScanBadge({
  arbitrageTypeKo,
  timeSensitive = false,
  className = "",
}: OpportunityScanBadgeProps) {
  return (
    <span
      data-testid="opportunity-scan-badge"
      className={`inline-flex flex-wrap items-center gap-1 ${className}`.trim()}
    >
      <Badge tone="accent" data-field="arbitrageTypeKo">
        {arbitrageTypeKo}
      </Badge>
      {timeSensitive ? (
        <Badge tone="warning" data-testid="chip-time-sensitive">
          {T.feed.chipTimeSensitive}
        </Badge>
      ) : null}
    </span>
  );
}
