"use client";

import { useEffect, useRef, useState } from "react";

export type CountUpNumberProps = {
  /** Target display value (already formatted or plain number string) */
  value: number;
  /** Ledger truth only — settlement.completed. Demo ticker must never drive this. */
  source: "settlement.completed";
  /** Duration ms — B-tier shorter; respects prefers-reduced-motion */
  durationMs?: number;
  className?: string;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  /** Accessibility label */
  "aria-label"?: string;
};

/**
 * CountUpNumber — §33.2 · ledger settlement.completed only.
 * Never bind to ticker demo / hybrid presentation amounts.
 */
export function CountUpNumber({
  value,
  source,
  durationMs = 400,
  className = "",
  prefix = "",
  suffix = "",
  decimals = 2,
  "aria-label": ariaLabel,
}: CountUpNumberProps) {
  const [display, setDisplay] = useState(value);
  const fromRef = useRef(value);
  const reduced =
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

  useEffect(() => {
    if (source !== "settlement.completed") return;
    if (reduced || durationMs <= 0) {
      setDisplay(value);
      fromRef.current = value;
      return;
    }
    const from = fromRef.current;
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      const eased = 1 - (1 - t) * (1 - t);
      setDisplay(from + (value - from) * eased);
      if (t < 1) raf = requestAnimationFrame(tick);
      else fromRef.current = value;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, source, durationMs, reduced]);

  const text = `${prefix}${display.toFixed(decimals)}${suffix}`;

  return (
    <span
      data-testid="count-up-number"
      data-countup-source={source}
      className={`tabular-nums ${className}`.trim()}
      aria-label={ariaLabel ?? text}
    >
      {text}
    </span>
  );
}
