import type { HTMLAttributes } from "react";

export type SkeletonProps = HTMLAttributes<HTMLDivElement> & {
  /** Match final layout height to keep CLS=0 */
  height?: string | number;
  aspectRatio?: string;
};

/**
 * Loading placeholder — height/aspect must match final content (PPE Level 0)
 */
export function Skeleton({
  height,
  aspectRatio,
  className = "",
  style,
  ...rest
}: SkeletonProps) {
  return (
    <div
      data-testid="lux-skeleton"
      aria-hidden
      className={[
        "animate-pulse rounded-lux-md bg-lux-elevated",
        className,
      ].join(" ")}
      style={{
        height: typeof height === "number" ? `${height}px` : height,
        aspectRatio,
        ...style,
      }}
      {...rest}
    />
  );
}
