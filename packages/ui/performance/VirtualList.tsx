"use client";

import { useRef, type ReactNode } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";

export type VirtualListProps<T> = {
  items: T[];
  /** Stable key per row */
  getItemKey: (item: T, index: number) => string;
  estimateSize: number;
  /** Plan §29.1 Law 4 — overscan 3 */
  overscan?: number;
  height: number | string;
  className?: string;
  renderItem: (item: T, index: number) => ReactNode;
  /** data-testid for harness / verify */
  testId?: string;
};

/**
 * TanStack Virtual wrapper — PPE Level 2 · CLS=0 via fixed estimateSize
 */
export function VirtualList<T>({
  items,
  getItemKey,
  estimateSize,
  overscan = 3,
  height,
  className = "",
  renderItem,
  testId = "virtual-list",
}: VirtualListProps<T>) {
  const parentRef = useRef<HTMLDivElement>(null);
  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => estimateSize,
    overscan,
    getItemKey: (index) => getItemKey(items[index]!, index),
  });

  return (
    <div
      ref={parentRef}
      data-testid={testId}
      data-virtual="tanstack"
      data-overscan={String(overscan)}
      className={["overflow-y-auto", className].filter(Boolean).join(" ")}
      style={{ height }}
    >
      <div
        style={{
          height: virtualizer.getTotalSize(),
          width: "100%",
          position: "relative",
        }}
      >
        {virtualizer.getVirtualItems().map((row) => (
          <div
            key={row.key}
            data-index={row.index}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              height: `${row.size}px`,
              transform: `translateY(${row.start}px)`,
            }}
          >
            {renderItem(items[row.index]!, row.index)}
          </div>
        ))}
      </div>
    </div>
  );
}
