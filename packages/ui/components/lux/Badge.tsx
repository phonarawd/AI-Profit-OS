import type { HTMLAttributes, ReactNode } from "react";

export type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  children: ReactNode;
  tone?: "accent" | "principal" | "muted" | "danger" | "warning";
};

const toneClass: Record<NonNullable<BadgeProps["tone"]>, string> = {
  accent: "border-lux-accent/40 text-lux-accent",
  principal: "border-lux-principal/40 text-lux-principal",
  muted: "border-lux-border text-lux-text-muted",
  danger: "border-lux-danger/40 text-lux-danger",
  warning: "border-lux-warning/40 text-lux-warning",
};

export function Badge({
  children,
  tone = "muted",
  className = "",
  ...rest
}: BadgeProps) {
  return (
    <span
      data-testid="lux-badge"
      className={[
        "inline-flex items-center rounded-lux-sm border px-2 py-0.5 text-xs font-medium",
        toneClass[tone],
        className,
      ].join(" ")}
      {...rest}
    >
      {children}
    </span>
  );
}
