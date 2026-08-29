"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { SearchParamsBoundary } from "@aipo/ui/components/SearchParamsBoundary";
import { T } from "@aipo/ui/copy/ko";
import { adminGet, type AdminResult } from "../../../lib/admin-api";
import { readMoneyRecordLabel, readText } from "../../../lib/admin-truth";
import { AdminFetchNote, AdminTruth } from "../../../components/AdminTruth";

const TABS = ["journal", "recon", "shadow-replay"] as const;
type LedgerTab = (typeof TABS)[number];

const TAB_LABEL: Record<LedgerTab, string> = {
  journal: "돈의 이동 내역",
  recon: "기록 맞춰 보기",
  "shadow-replay": "기록 다시 확인",
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
    <main className="p-6 text-pd-text" data-testid="admin-ledger">
      <h1 className="text-xl font-semibold">{T.admin.navigation.ledger}</h1>
      <p className="mt-2 text-sm text-pd-text-muted">
        입금·출금·수익 지급 기록을 확인합니다. 안전을 위해 이 화면에서 기록을 고칠 수 없습니다.
      </p>

      <nav className="mt-4 flex flex-wrap gap-2" aria-label="돈의 이동 기록 메뉴">
        {TABS.map((t) => (
          <a
            key={t}
            href={`/admin/ledger?tab=${t}`}
            data-tab={t}
            className={
              t === tab
                ? "rounded px-3 py-1 text-sm bg-pd-surface-elevated"
                : "rounded px-3 py-1 text-sm text-pd-text-muted"
            }
          >
            {TAB_LABEL[t]}
          </a>
        ))}
      </nav>

      {tab === "journal" && (
        <section className="mt-6 space-y-2">
          <h2 className="text-base font-medium">돈의 이동 내역</h2>
          <p className="text-sm text-pd-text-muted">기록된 순서대로 보여 드립니다.</p>
          {!journals ? (
            <p className="text-sm text-pd-text-muted">{T.admin.state.loading}</p>
          ) : !journals.ok ? (
            <AdminFetchNote failure={journals.failure} />
          ) : Array.isArray(journals.data.items) &&
            journals.data.items.length === 0 ? (
            <p className="text-sm text-pd-text-muted">아직 돈의 이동 기록이 없습니다.</p>
          ) : Array.isArray(journals.data.items) ? (
            <ul className="space-y-2 text-sm">
              {journals.data.items.map((row, idx) => (
                <li
                  key={String(row.id ?? idx)}
                  className="rounded border border-pd-border p-2"
                >
                  <AdminTruth value={readMoneyRecordLabel(row.journalType)} />
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
          <h2 className="text-base font-medium">기록 맞춰 보기</h2>
          <p className="text-sm text-pd-text-muted">서로 연결된 금액 기록이 모두 맞는지 확인합니다.</p>
          {!recon ? (
            <p className="text-sm text-pd-text-muted">{T.admin.state.loading}</p>
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
          <h2 className="text-base font-medium">기록 다시 확인</h2>
          <p className="mt-1 text-sm text-pd-text-muted">
            최근 24시간 기록을 다시 계산해 금액 차이가 없는지 확인합니다.
          </p>
          <p className="mt-2 text-xs" data-max-drift="0" data-fail-action="block_settlement">
            금액 차이가 없어야 정상입니다.
          </p>
          <div className="mt-3 text-sm">
            {!shadow ? (
              <p className="text-pd-text-muted">{T.admin.state.loading}</p>
            ) : !shadow.ok ? (
              <AdminFetchNote failure={shadow.failure} />
            ) : shadow.data.latest == null ? (
              <p className="text-pd-text-muted">아직 다시 확인한 기록이 없습니다.</p>
            ) : (
              <AdminTruth value="최근 확인을 마쳤습니다" />
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
