"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";
import { T } from "../copy/ko";

export type PrimaryCtaProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  label?: string;
  children?: ReactNode;
  pulse?: boolean;
};

export function PrimaryCta({
  label,
  children,
  pulse = true,
  className = "",
  type = "button",
  ...rest
}: PrimaryCtaProps) {
  const text = children ?? label ?? T.execution.ctaEarn;
  return (
    <button
      type={type}
      data-testid="motion-cta"
      className={[
        "touch-target",
        "rounded-pd-md",
        "bg-pd-accent",
        "px-4",
        "font-semibold",
        "text-pd-bg",
        pulse ? "pd-motion-cta pd-motion-any" : "",
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

export type MotionCTAProps = PrimaryCtaProps;
export const MotionCTA = PrimaryCta;
