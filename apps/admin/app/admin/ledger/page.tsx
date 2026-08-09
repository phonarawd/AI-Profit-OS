"use client";

import { useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { SearchParamsBoundary } from "@aipo/ui/components/SearchParamsBoundary";

const TABS = ["journal", "recon", "shadow-replay"] as const;
type LedgerTab = (typeof TABS)[number];

const TAB_LABEL: Record<LedgerTab, string> = {
  journal: "분개",
  recon: "대사",
  "shadow-replay": "그림자 재검증",
};

/**
 * Admin ledger · Engine shadow-replay (drift 0.000%)
 * Canon: admin-ledger-shadow-replay
 */
function LedgerContent() {
  const searchParams = useSearchParams();
  const tab = useMemo((): LedgerTab => {
    const raw = searchParams.get("tab");
    if (raw && (TABS as readonly string[]).includes(raw)) {
      return raw as LedgerTab;
    }
    return "journal";
  }, [searchParams]);

  return (
    <main className="p-6 text-lux-text">
      <h1 className="text-xl font-semibold">입출금·정산 장부</h1>
      <p className="mt-2 text-sm text-lux-text-muted">Admin §9.1.1</p>

      <nav className="mt-4 flex flex-wrap gap-2" aria-label="장부 탭">
        {TABS.map((t) => (
          <a
            key={t}
            href={`/admin/ledger?tab=${t}`}
            data-tab={t}
            className={
              t === tab
                ? "rounded px-3 py-1 text-sm bg-lux-surface-elevated"
                : "rounded px-3 py-1 text-sm text-lux-text-muted"
            }
          >
            {TAB_LABEL[t]}
          </a>
        ))}
      </nav>

      {tab === "journal" && (
        <section className="mt-6">
          <p className="text-sm text-lux-text-muted">이중분개 장부</p>
        </section>
      )}

      {tab === "recon" && (
        <section className="mt-6">
          <p className="text-sm text-lux-text-muted">대사 리포트</p>
        </section>
      )}

      {tab === "shadow-replay" && (
        <section
          className="mt-6"
          data-canon="admin-ledger-shadow-replay"
          data-panel="shadow_replay_gate"
        >
          <h2 className="text-base font-medium">그림자 재검증</h2>
          <p className="mt-1 text-sm text-lux-text-muted">
            maxDriftPct=0 · FAIL=block_settlement · 24시간
          </p>
          <ul className="mt-3 list-disc pl-5 text-sm text-lux-text-muted">
            <li>POST /api/v1/admin/shadow-replay/run</li>
            <li>GET /api/v1/admin/shadow-replay/latest</li>
          </ul>
          <p className="mt-2 text-xs" data-max-drift="0" data-fail-action="block_settlement">
            오차 0.000%만 통과
          </p>
        </section>
      )}
    </main>
  );
}

export default function Page() {
  return (
    <SearchParamsBoundary>
      <LedgerContent />
    </SearchParamsBoundary>
  );
}
