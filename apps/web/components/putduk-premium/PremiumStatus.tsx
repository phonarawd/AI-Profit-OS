type PremiumStatusTone = "neutral" | "live" | "success" | "warning" | "danger";

export function PremiumStatus({
  label,
  tone = "neutral",
  live = false,
}: {
  label: string;
  tone?: PremiumStatusTone;
  live?: boolean;
}) {
  return (
    <span
      className="pt-premium-status"
      data-tone={tone}
      data-live={live ? "true" : "false"}
      role="status"
    >
      <span className="pt-premium-status-dot" aria-hidden="true" />
      <span>{label}</span>
    </span>
  );
}
