import type { HTMLAttributes, ReactNode } from "react";

export type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  children: ReactNode;
  tone?: "accent" | "principal" | "muted" | "danger" | "warning";
};

const toneClass: Record<NonNullable<BadgeProps["tone"]>, string> = {
  accent: "border-pd-accent/40 text-pd-accent",
  principal: "border-pd-principal/40 text-pd-principal",
  muted: "border-pd-border text-pd-text-muted",
  danger: "border-pd-danger/40 text-pd-danger",
  warning: "border-pd-warning/40 text-pd-warning",
};

export function Badge({
  children,
  tone = "muted",
  className = "",
  ...rest
}: BadgeProps) {
  return (
    <span
      data-testid="pd-badge"
      className={[
        "inline-flex items-center rounded-pd-sm border px-2 py-0.5 text-xs font-medium",
        toneClass[tone],
        className,
      ].join(" ")}
      {...rest}
    >
      {children}
    </span>
  );
}
