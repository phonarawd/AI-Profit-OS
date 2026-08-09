"use client";

import { OpportunityCard, type OpportunityCardProps } from "./OpportunityCard";
import type { OpportunityCardModel } from "./opportunity-types";
import { VirtualList } from "../lux/VirtualList";
import { Skeleton } from "../lux/Skeleton";

/** PPE Level 2 · §29.1 Law 4 — virtualize when count > threshold */
export const VIRTUAL_OPPORTUNITY_THRESHOLD = 20;

/** Matches OpportunityCard + gap — skeleton same height (CLS 0) */
export const OPPORTUNITY_CARD_ESTIMATE_PX = 180;

export type VirtualOpportunityListProps = {
  items: OpportunityCardModel[];
  /** Default 20 — below = plain list */
  threshold?: number;
  className?: string;
  /** Viewport height for virtual scroller */
  height?: number | string;
  onEarn?: OpportunityCardProps["onEarn"];
};

/**
 * /profits feed virtualizer — TanStack · overscan 3 · estimateSize token
 */
export function VirtualOpportunityList({
  items,
  threshold = VIRTUAL_OPPORTUNITY_THRESHOLD,
  className = "",
  height = "70vh",
  onEarn,
}: VirtualOpportunityListProps) {
  if (items.length === 0) return null;

  if (items.length <= threshold) {
    return (
      <ul
        className={["space-y-3", className].filter(Boolean).join(" ")}
        data-testid="opportunity-list"
        data-virtual="off"
      >
        {items.map((o) => (
          <li key={o.id}>
            <OpportunityCard opportunity={o} onEarn={onEarn} />
          </li>
        ))}
      </ul>
    );
  }

  return (
    <VirtualList
      items={items}
      getItemKey={(o) => o.id}
      estimateSize={OPPORTUNITY_CARD_ESTIMATE_PX}
      overscan={3}
      height={height}
      className={className}
      testId="opportunity-list"
      renderItem={(o) => (
        <div className="pb-3">
          <OpportunityCard opportunity={o} onEarn={onEarn} />
        </div>
      )}
    />
  );
}

/** Loading rows — same estimate height as virtual cards */
export function VirtualOpportunitySkeleton({ count = 3 }: { count?: number }) {
  return (
    <ul className="space-y-3" data-testid="opportunity-list-skeleton" aria-hidden>
      {Array.from({ length: count }, (_, i) => (
        <li key={i}>
          <Skeleton height={OPPORTUNITY_CARD_ESTIMATE_PX} />
        </li>
      ))}
    </ul>
  );
}
