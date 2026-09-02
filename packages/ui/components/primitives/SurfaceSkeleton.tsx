"use client";

import type { CSSProperties } from "react";
import { T } from "../../copy/ko";

export type SurfaceSkeletonSlot = "button" | "line" | "title";

export type SurfaceSkeletonProps = {
  slots?: number;
  sizes?: SurfaceSkeletonSlot[];
  testId?: string;
};

const SLOT_STYLE: Record<SurfaceSkeletonSlot, CSSProperties> = {
  button: { height: "2.75rem", width: "100%" },
  line: { height: "1rem", width: "70%" },
  title: { height: "1.5rem", width: "40%" },
};

const hidden: CSSProperties = {
  position: "absolute",
  width: 1,
  height: 1,
  padding: 0,
  margin: -1,
  overflow: "hidden",
  clip: "rect(0, 0, 0, 0)",
  whiteSpace: "nowrap",
  border: 0,
};

/**
 * D-3 구조 유지 skeleton. 퍼센트·완료 약속·lux Skeleton 금지.
 */
export function SurfaceSkeleton({
  slots = 3,
  sizes,
  testId = "surface-skeleton",
}: SurfaceSkeletonProps) {
  const list = sizes ?? Array.from({ length: slots }, () => "button" as const);
  return (
    <div
      style={{ display: "flex", flexDirection: "column", gap: "0.75rem", width: "100%" }}
      data-testid={testId}
      data-canon="surface-skeleton"
      aria-busy="true"
      aria-live="polite"
    >
      <span style={hidden}>{T.common.loading}</span>
      {list.map((size, index) => (
        <span
          key={`${size}-${index}`}
          data-skeleton-slot={size}
          data-size={size}
          style={{
            display: "block",
            borderRadius: "0.75rem",
            background: "color-mix(in srgb, currentColor 12%, transparent)",
            ...SLOT_STYLE[size],
          }}
        />
      ))}
    </div>
  );
}
