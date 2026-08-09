"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";

export type TouchButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  variant?: "primary" | "secondary" | "ghost";
};

const variants: Record<NonNullable<TouchButtonProps["variant"]>, string> = {
  primary: "bg-lux-accent text-lux-bg font-semibold",
  secondary: "border border-lux-border bg-lux-surface text-lux-text",
  ghost: "bg-transparent text-lux-text-muted",
};

/** §29.4 TouchButton — min 48px + ellipsis label */
export function TouchButton({
  children,
  variant = "secondary",
  className = "",
  type = "button",
  ...rest
}: TouchButtonProps) {
  return (
    <button
      type={type}
      data-testid="touch-button"
      className={[
        "touch-target rounded-lux-md",
        variants[variant],
        className,
      ].join(" ")}
      {...rest}
    >
      <span className="touch-target__label">{children}</span>
    </button>
  );
}
