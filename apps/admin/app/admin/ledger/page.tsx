"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { SearchParamsBoundary } from "@aipo/ui/components/SearchParamsBoundary";
import { adminGet, type AdminResult } from "../../../lib/admin-api";
import { readText } from "../../../lib/admin-truth";
import { AdminFetchNote, AdminTruth } from "../../../components/AdminTruth";

const TABS = ["journal", "recon", "shadow-replay"] as const;
type LedgerTab = (typeof TABS)[number];

const TAB_LABEL: Record<LedgerTab, string> = {
  journal: "분개",
  recon: "대사",
  "shadow-replay": "그림자 재검증",
};

type JournalList = {
  items?: Array<{ id?: unknown; journalType?: unknown; createdAt?: unknown }>;
};

type ReconReport = {
  ok?: unknown;
  mismatches?: unknown;
};

type ShadowLatest = {
  latest?: unknown;
  maxDriftPct?: unknown;
  pass?: unknown;
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

  const [journals, setJournals] = useState<AdminResult<JournalList> | null>(null);
  const [recon, setRecon] = useState<AdminResult<ReconReport> | null>(null);
  const [shadow, setShadow] = useState<AdminResult<ShadowLatest> | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const [j, r, s] = await Promise.all([
        adminGet<JournalList>("/api/v1/admin/ledger/journals"),
        adminGet<ReconReport>("/api/v1/admin/ledger/recon"),
        adminGet<ShadowLatest>("/api/v1/admin/shadow-replay/latest"),
      ]);
      if (cancelled) return;
      setJournals(j);
      setRecon(r);
      setShadow(s);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main className="p-6 text-lux-text" data-testid="admin-ledger">
      <h1 className="text-xl font-semibold">입출금·정산 장부</h1>
      <p className="mt-2 text-sm text-lux-text-muted">읽기 전용 · 화면에서 전표를 고치지 않습니다</p>
      <p className="mt-1 text-xs text-lux-text-muted">
        <a href="/admin/reports/financial" className="underline">
          금융 리포트
        </a>
      </p>

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
        <section className="mt-6 space-y-2">
          <p className="text-sm text-lux-text-muted">이중분개 장부</p>
          {!journals ? (
            <p className="text-sm text-lux-text-muted">불러오는 중</p>
          ) : !journals.ok ? (
            <AdminFetchNote failure={journals.failure} />
          ) : Array.isArray(journals.data.items) &&
            journals.data.items.length === 0 ? (
            <p className="text-sm text-lux-text-muted">전표가 없습니다.</p>
          ) : Array.isArray(journals.data.items) ? (
            <ul className="space-y-2 text-sm">
              {journals.data.items.map((row, idx) => (
                <li
                  key={String(row.id ?? idx)}
                  className="rounded border border-lux-border p-2"
                >
                  <AdminTruth value={readText(row.journalType)} />
                </li>
              ))}
            </ul>
          ) : (
            <AdminTruth value={null} />
          )}
        </section>
      )}

      {tab === "recon" && (
        <section className="mt-6 space-y-2">
          <p className="text-sm text-lux-text-muted">대사 리포트</p>
          {!recon ? (
            <p className="text-sm text-lux-text-muted">불러오는 중</p>
          ) : !recon.ok ? (
            <AdminFetchNote failure={recon.failure} />
          ) : (
            <p className="text-sm">
              결과{" "}
              <AdminTruth
                value={
                  typeof recon.data.ok === "boolean"
                    ? recon.data.ok
                      ? "맞음"
                      : "어긋남"
                    : null
                }
              />
            </p>
          )}
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
          <div className="mt-3 text-sm">
            {!shadow ? (
              <p className="text-lux-text-muted">불러오는 중</p>
            ) : !shadow.ok ? (
              <AdminFetchNote failure={shadow.failure} />
            ) : shadow.data.latest == null ? (
              <p className="text-lux-text-muted">최근 재검증이 없습니다.</p>
            ) : (
              <AdminTruth value="최근 재검증 있음" />
            )}
          </div>
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
