"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  variant?: "primary" | "secondary" | "ghost";
};

const variants: Record<NonNullable<ButtonProps["variant"]>, string> = {
  primary: "bg-pd-accent text-pd-bg font-semibold",
  secondary: "border border-pd-border bg-pd-surface text-pd-text",
  ghost: "bg-transparent text-pd-text-muted",
};

/** 주요 터치 버튼 — 최소 약 48px */
export function Button({
  children,
  variant = "secondary",
  className = "",
  type = "button",
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      data-testid="touch-button"
      className={["touch-target rounded-pd-md", variants[variant], className].join(" ")}
      {...rest}
    >
      <span className="touch-target__label">{children}</span>
    </button>
  );
}

export type TouchButtonProps = ButtonProps;
export const TouchButton = Button;
