import type { ReactNode } from "react";

export function PremiumMetric({
  label,
  value,
  secondary,
  ariaLabel,
}: {
  label: string;
  value: ReactNode;
  secondary?: ReactNode;
  ariaLabel?: string;
}) {
  return (
    <div className="pt-premium-metric" aria-label={ariaLabel}>
      <span className="pt-premium-metric-label">{label}</span>
      <div className="pt-premium-metric-value">{value}</div>
      {secondary != null ? (
        <div className="pt-premium-metric-secondary">{secondary}</div>
      ) : null}
    </div>
  );
}
