import type { HTMLAttributes } from "react";

export type SkeletonProps = HTMLAttributes<HTMLDivElement> & {
  height?: string | number;
  aspectRatio?: string;
};

export function Skeleton({
  height,
  aspectRatio,
  className = "",
  style,
  ...rest
}: SkeletonProps) {
  return (
    <div
      data-testid="pd-skeleton"
      aria-hidden
      className={["animate-pulse rounded-pd-md bg-pd-elevated", className].join(" ")}
      style={{
        height: typeof height === "number" ? `${height}px` : height,
        aspectRatio,
        ...style,
      }}
      {...rest}
    />
  );
}
