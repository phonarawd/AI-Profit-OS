"use client";

import { T } from "../../copy/ko";
import type { AdapterHealthModel } from "./trust-types";

export type AdapterHealthChipProps = {
  health?: AdapterHealthModel | null;
  className?: string;
};

function relativeKo(iso?: string | null): string | null {
  if (!iso) return null;
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return null;
  const diffSec = Math.max(0, Math.floor((Date.now() - t) / 1000));
  if (diffSec < 60) return T.trust.adapterHealth.justNow;
  if (diffSec < 3600) {
    return T.trust.adapterHealth.minutesAgo.replace(
      "{n}",
      String(Math.floor(diffSec / 60)),
    );
  }
  if (diffSec < 86400) {
    return T.trust.adapterHealth.hoursAgo.replace(
      "{n}",
      String(Math.floor(diffSec / 3600)),
    );
  }
  return T.trust.adapterHealth.daysAgo.replace(
    "{n}",
    String(Math.floor(diffSec / 86400)),
  );
}

/**
 * §51.19 Adapter Health — OpportunityCard footer
 * stale → 비교 준비중 + CTA lock reason
 */
export function AdapterHealthChip({
  health = null,
  className = "",
}: AdapterHealthChipProps) {
  const c = T.trust.adapterHealth;
  const syncAt = health?.lastAdapterSyncAt ?? null;
  const relative = relativeKo(syncAt);
  const stale =
    health?.compareReady === false ||
    (health?.staleAt
      ? new Date(health.staleAt).getTime() <= Date.now()
      : false);
  const sources =
    typeof health?.sourceCount === "number" && health.sourceCount > 0
      ? health.sourceCount
      : null;

  return (
    <footer
      data-testid="adapter-health-chip"
      data-canon-block="adapterHealth"
      data-stale={stale ? "1" : "0"}
      data-compare-ready={health?.compareReady === true ? "1" : "0"}
      className={`mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-lux-text-muted ${className}`.trim()}
    >
      {stale ? (
        <span data-testid="adapter-health-pending" className="text-lux-warning">
          {c.comparePending}
        </span>
      ) : relative ? (
        <span data-testid="adapter-health-sync">
          {c.syncRelative.replace("{relative}", relative)}
        </span>
      ) : (
        <span data-testid="adapter-health-sync-unknown">{c.syncUnknown}</span>
      )}
      {sources != null ? (
        <span data-testid="adapter-health-sources">
          {c.sources.replace("{n}", String(sources))}
        </span>
      ) : null}
      {stale && health?.ctaLockReasonKo ? (
        <span
          data-testid="adapter-health-lock-reason"
          className="w-full text-lux-warning"
        >
          {health.ctaLockReasonKo}
        </span>
      ) : null}
    </footer>
  );
}
