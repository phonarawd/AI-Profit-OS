"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";
import { T } from "../../copy/ko";

export type MotionCTAProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  /** Default = 수익 벌기 (Index §20.2) */
  label?: string;
  children?: ReactNode;
  /** Interaction emphasis — off when reduced-motion / data-tier=b (CSS) */
  pulse?: boolean;
};

/**
 * PART1d MotionCTA — high-contrast press CTA
 * Infinite glow/neon pulse 금지 · hover/focus/active ≤200–300ms
 * Sticky mobile only at call site · PC full-width sticky forbidden (§5.3)
 */
export function MotionCTA({
  label,
  children,
  pulse = true,
  className = "",
  type = "button",
  ...rest
}: MotionCTAProps) {
  const text = children ?? label ?? T.execution.ctaEarn;
  return (
    <button
      type={type}
      data-testid="motion-cta"
      className={[
        "touch-target",
        "rounded-lux-md",
        "bg-lux-accent",
        "px-4",
        "font-semibold",
        "text-lux-bg",
        /* pulse prop = interaction emphasis class (infinite glow 아님) */
        pulse ? "lux-motion-cta lux-motion-any" : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      {...rest}
    >
      <span className="touch-target__label">{text}</span>
    </button>
  );
}
