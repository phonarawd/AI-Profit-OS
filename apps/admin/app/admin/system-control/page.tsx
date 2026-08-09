"use client";

import { useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { SearchParamsBoundary } from "@aipo/ui/components/SearchParamsBoundary";

const TABS = ["circuit", "reserve"] as const;
type SystemTab = (typeof TABS)[number];

const TAB_LABEL: Record<SystemTab, string> = {
  circuit: "긴급 정지",
  reserve: "운영 준비금",
};

/**
 * Admin §9.1.1 · Engine §0.0.4.3
 * `/admin/system-control?tab=reserve` — platform_reserve 목표·audit · 시뮬 S2
 */
function SystemControlContent() {
  const searchParams = useSearchParams();
  const tab = useMemo((): SystemTab => {
    const raw = searchParams.get("tab");
    if (raw === "reserve") return "reserve";
    return "circuit";
  }, [searchParams]);

  const reserveApi = "/api/v1/admin/system-control/reserve";
  const reserveAuditApi = "/api/v1/admin/system-control/reserve/audit";

  return (
    <main
      className="p-6 text-lux-text"
      data-admin-system-control-tab={tab}
    >
      <h1 className="text-xl font-semibold">긴급 정지</h1>
      <nav
        className="mt-4 flex flex-wrap gap-2 text-sm"
        data-testid="system-control-tabs"
      >
        {TABS.map((t) => (
          <a
            key={t}
            href={
              t === "circuit"
                ? "/admin/system-control"
                : `/admin/system-control?tab=${t}`
            }
            data-tab={t}
            className={
              tab === t
                ? "rounded px-2 py-1 bg-lux-elevated text-lux-accent"
                : "rounded px-2 py-1 text-lux-text-muted"
            }
          >
            {TAB_LABEL[t]}
          </a>
        ))}
      </nav>

      {tab === "reserve" ? (
        <section
          className="mt-6 space-y-4"
          data-testid="system-control-reserve-panel"
          data-surface="admin-system-control-reserve"
          data-account-code="ops.platform_reserve_usdt"
          data-get-api={reserveApi}
          data-put-api={reserveApi}
          data-audit-api={reserveAuditApi}
          data-s2-input="true"
        >
          <p className="text-sm text-lux-text-muted">
            Engine §0.0.4.3 · 운영 준비금 목표 · 미설정 시 Growth ON 차단 · 시뮬
            S2 입력
          </p>

          <div
            className="rounded border border-lux-border p-3 space-y-2"
            data-field="targetUsdt"
          >
            <p className="text-sm font-medium">목표 잔액 (USDT)</p>
            <p className="text-xs text-lux-text-muted">
              계정 <code>ops.platform_reserve_usdt</code> · PUT {reserveApi}
            </p>
            <p className="text-xs text-lux-text-muted">
              S2: worstCasePlatformDrain ≤ 목표 × 10%
            </p>
          </div>

          <div
            className="rounded border border-lux-border p-3 text-sm"
            data-field="audit"
          >
            <p className="font-medium">변경 기록</p>
            <p className="mt-1 text-xs text-lux-text-muted">
              GET {reserveAuditApi} · changeReason ≥ 4자
            </p>
          </div>
        </section>
      ) : (
        <section className="mt-6" data-testid="system-control-circuit-panel">
          <p className="mt-2 text-sm text-lux-text-muted">Admin §9.1.1 골격</p>
        </section>
      )}
    </main>
  );
}

export default function Page() {
  return (
    <SearchParamsBoundary>
      <SystemControlContent />
    </SearchParamsBoundary>
  );
}
