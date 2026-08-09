"use client";

import { useMemo } from "react";
import { useSearchParams } from "next/navigation";

const TABS = ["queue", "overview"] as const;
type RiskTab = (typeof TABS)[number];

/**
 * Admin §9.1.1 / Money §49.9 — `/admin/risk?tab=queue`
 * Queue SoT = GET /api/v1/admin/risk/queue · freeze = POST .../users/:id/freeze
 */
// route lock: risk?tab=queue
export default function Page() {
  const searchParams = useSearchParams();
  const tab = useMemo((): RiskTab => {
    const raw = searchParams.get("tab");
    if (raw && (TABS as readonly string[]).includes(raw)) {
      return raw as RiskTab;
    }
    return "queue";
  }, [searchParams]);

  const queueApi = "/api/v1/admin/risk/queue";
  const freezeApi = "/api/v1/admin/risk/users/:userId/freeze";
  const catalogApi = "/api/v1/admin/risk/catalog";

  return (
    <main
      className="p-6 text-[var(--color-lux-text)]"
      data-admin-risk-tab={tab}
    >
      <h1 className="text-xl font-semibold">사기·이상 거래 방지</h1>
      <nav
        className="mt-4 flex flex-wrap gap-2 text-sm"
        data-testid="risk-tabs"
      >
        {TABS.map((t) => (
          <a
            key={t}
            href={`/admin/risk?tab=${t}`}
            data-tab={t}
            className={
              tab === t
                ? "rounded px-2 py-1 bg-[var(--color-lux-elevated)] text-[var(--color-lux-accent)]"
                : "rounded px-2 py-1 text-[var(--color-lux-text-muted)]"
            }
          >
            {t === "queue" ? "동결 큐" : "개요"}
          </a>
        ))}
      </nav>

      {tab === "queue" ? (
        <section
          className="mt-6"
          data-testid="risk-queue-panel"
          data-queue-api={queueApi}
          data-freeze-api={freezeApi}
          data-catalog-api={catalogApi}
          data-p49-rules="P1-P24,E1-E12"
        >
          <p className="text-sm text-[var(--color-lux-text-muted)]">
            §49.9 룰 신호 · freeze 연동 · bucket drift circuit
          </p>
          <p className="mt-2 text-xs text-[var(--color-lux-text-muted)]">
            API: {queueApi}
          </p>
        </section>
      ) : (
        <section className="mt-6" data-testid="risk-overview-panel">
          <p className="text-sm text-[var(--color-lux-text-muted)]">
            Admin §9.1.1 골격 · 큐는 queue 탭
          </p>
        </section>
      )}
    </main>
  );
}
