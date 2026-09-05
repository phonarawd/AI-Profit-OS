"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { OpportunityCard } from "./OpportunityCard";
import type { ProfitsOpportunity } from "./types";

/**
 * Windowed reveal for the /profits card grid.
 *
 * Performance defect fix (2026-09-04, Owner decision - see
 * governance/runtime-surfaces.v1.json surfaces.profits.knownGaps): the
 * previous Canon implementation virtualized /profits above 20 items
 * (packages/ui/components/opportunity/VirtualOpportunityList.tsx, a single
 * -column list). The live spark-dash-profits/OpportunityGrid.tsx is a
 * responsive multi-column CSS grid, so classic single-axis row/column
 * virtualization would require measuring computed column count at runtime
 * and duplicating the grid's responsive breakpoints in JS. Instead this
 * mounts only a bounded window of cards and grows it via IntersectionObserver
 * as the user scrolls, which bounds DOM node count identically without
 * touching the existing .sdp-grid CSS or its responsive column behaviour.
 *
 * Below VIRTUAL_OPPORTUNITY_THRESHOLD, all items render immediately (no
 * windowing overhead, no layout shift, no observer needed).
 */
export const VIRTUAL_OPPORTUNITY_THRESHOLD = 20;
const PAGE_SIZE = 20;

export function VirtualOpportunityGrid({ items }: { items: ProfitsOpportunity[] }) {
  const windowed = items.length > VIRTUAL_OPPORTUNITY_THRESHOLD;
  const [visibleCount, setVisibleCount] = useState(
    windowed ? PAGE_SIZE : items.length,
  );
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    // Reset window when the underlying feed changes (new search/filter/data).
    setVisibleCount(windowed ? PAGE_SIZE : items.length);
  }, [items, windowed]);

  useEffect(() => {
    if (!windowed) return;
    const sentinel = sentinelRef.current;
    if (!sentinel || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setVisibleCount((prev) => Math.min(items.length, prev + PAGE_SIZE));
        }
      },
      { rootMargin: "600px 0px" },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [windowed, items.length]);

  const visibleItems = useMemo(
    () => items.slice(0, visibleCount),
    [items, visibleCount],
  );

  return (
    <div className="sdp-grid" data-sdp="grid" data-virtual={windowed ? "on" : "off"}>
      {visibleItems.map((item) => (
        <OpportunityCard key={item.id} item={item} />
      ))}
      {windowed && visibleCount < items.length ? (
        <div ref={sentinelRef} data-testid="opportunity-grid-sentinel" aria-hidden />
      ) : null}
    </div>
  );
}
