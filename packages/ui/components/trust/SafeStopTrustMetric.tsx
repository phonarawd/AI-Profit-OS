"use client";

import { T } from "../../copy/ko";

export type SafeStopTrustMetricProps = {
  /** ledger safe_stop count · demo ❌ */
  count?: number | null;
  className?: string;
};

/**
 * §51.17 Safe Stop Trust Metric — /me · /wallet
 * FOMO 대신 신뢰 역전 · 손해·패배 프레이밍 금지
 */
export function SafeStopTrustMetric({
  count = 0,
  className = "",
}: SafeStopTrustMetricProps) {
  const n = Math.max(0, Number(count) || 0);
  const c = T.trust.safeStopCount;

  return (
    <section
      data-testid="safe-stop-trust-metric"
      data-canon-block="safeStopTrust"
      data-source="ledger"
      data-demo="false"
      data-fail-framing="false"
      className={`rounded-lux-md border border-lux-border bg-lux-surface p-3 text-sm text-lux-text ${className}`.trim()}
    >
      <p className="font-medium">{c.title}</p>
      <p
        className="mt-1 text-lux-text-muted"
        data-field="safeStopCount"
        data-testid="safe-stop-trust-count"
      >
        {c.line.replace("{n}", String(n))}
      </p>
      <p className="mt-1 text-xs text-lux-text-muted">{c.hint}</p>
    </section>
  );
}
