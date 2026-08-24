"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { SearchParamsBoundary } from "@aipo/ui/components/SearchParamsBoundary";
import { T } from "@aipo/ui/copy/ko";
import { adminGet, type AdminResult } from "../../../lib/admin-api";
import {
  formatDateTimeKo,
  readMoneyRecordLabel,
  readText,
} from "../../../lib/admin-truth";
import { useAdminSessionRevision } from "../../../lib/use-admin-session";
import { AdminFetchNote, AdminTruth } from "../../../components/AdminTruth";

const TABS = ["journal", "recon", "shadow-replay"] as const;
type LedgerTab = (typeof TABS)[number];

const TAB_LABEL: Record<LedgerTab, string> = {
  journal: "돈의 이동 내역",
  recon: "기록 맞춰 보기",
  "shadow-replay": "기록 다시 확인",
};

type JournalItem = {
  id?: unknown;
  journalType?: unknown;
  referenceType?: unknown;
  referenceId?: unknown;
  memo?: unknown;
  fxSnapshotId?: unknown;
  createdBy?: unknown;
  createdAt?: unknown;
  entries?: unknown[];
  reused?: unknown;
};

type JournalList = {
  items?: JournalItem[];
  total?: unknown;
};

type ReconMismatch = {
  code?: unknown;
  detail?: unknown;
  accountId?: unknown;
  journalId?: unknown;
  userId?: unknown;
};

type ReconReport = {
  ok?: unknown;
  checkedAt?: unknown;
  journalsChecked?: unknown;
  accountsChecked?: unknown;
  usersChecked?: unknown;
  mismatches?: ReconMismatch[];
};

type ShadowLatest = {
  latest?: unknown;
  maxDriftPct?: unknown;
  pass?: unknown;
};

function LedgerContent() {
  const searchParams = useSearchParams();
  const sessionRevision = useAdminSessionRevision();
  const tab = useMemo((): LedgerTab => {
    const raw = searchParams.get("tab");
    if (raw && (TABS as readonly string[]).includes(raw)) return raw as LedgerTab;
    return "journal";
  }, [searchParams]);

  const [userDraft, setUserDraft] = useState("");
  const [userId, setUserId] = useState("");
  const [offset, setOffset] = useState(0);
  const limit = 50;

  const journalApi = useMemo(() => {
    const q = new URLSearchParams({ limit: String(limit), offset: String(offset) });
    if (userId) q.set("userId", userId);
    return `/api/v1/admin/ledger/journals?${q.toString()}`;
  }, [offset, userId]);
  const reconApi = userId
    ? `/api/v1/admin/ledger/recon?userId=${encodeURIComponent(userId)}`
    : "/api/v1/admin/ledger/recon";

  const [journals, setJournals] = useState<AdminResult<JournalList> | null>(null);
  const [recon, setRecon] = useState<AdminResult<ReconReport> | null>(null);
  const [shadow, setShadow] = useState<AdminResult<ShadowLatest> | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      if (tab === "journal") {
        const next = await adminGet<JournalList>(journalApi);
        if (!cancelled) setJournals(next);
        return;
      }
      if (tab === "recon") {
        const next = await adminGet<ReconReport>(reconApi);
        if (!cancelled) setRecon(next);
        return;
      }
      const next = await adminGet<ShadowLatest>("/api/v1/admin/shadow-replay/latest");
      if (!cancelled) setShadow(next);
    })();
    return () => {
      cancelled = true;
    };
  }, [journalApi, reconApi, sessionRevision, tab]);

  function applyUserFilter(event: FormEvent) {
    event.preventDefault();
    setOffset(0);
    setUserId(userDraft.trim());
  }

  const items = journals?.ok && Array.isArray(journals.data.items) ? journals.data.items : null;
  const total = journals?.ok ? Number(journals.data.total ?? 0) : null;
  const mismatches = recon?.ok && Array.isArray(recon.data.mismatches) ? recon.data.mismatches : null;

  return (
    <main className="p-6 text-lux-text" data-testid="admin-ledger">
      <p className="admin-eyebrow">원장 확인</p>
      <h1 className="mt-1 text-3xl font-extrabold tracking-tight">{T.admin.navigation.ledger}</h1>
      <p className="mt-2 max-w-3xl text-sm text-lux-text-muted">
        입금·출금·수익 지급이 원장에 어떻게 기록됐는지 확인합니다. 이 화면은 조회 전용이며 기록을 수정하거나 잔액을 다시 계산하지 않습니다.
      </p>

      <nav className="mt-5 flex flex-wrap gap-2" aria-label="돈의 이동 기록 메뉴">
        {TABS.map((t) => (
          <a
            key={t}
            href={`/admin/ledger?tab=${t}`}
            data-tab={t}
            className={
              t === tab
                ? "rounded-xl border border-lux-border bg-lux-elevated px-3 py-2 text-sm font-bold text-lux-accent"
                : "rounded-xl border border-transparent px-3 py-2 text-sm text-lux-text-muted"
            }
          >
            {TAB_LABEL[t]}
          </a>
        ))}
      </nav>

      {(tab === "journal" || tab === "recon") ? (
        <section className="mt-5 rounded-2xl border border-lux-border p-4">
          <form className="admin-toolbar" onSubmit={applyUserFilter}>
            <label className="admin-toolbar-field flex-1" htmlFor="ledger-user-filter">
              <span>회원 번호로 좁혀 보기</span>
              <input
                id="ledger-user-filter"
                value={userDraft}
                onChange={(event) => setUserDraft(event.target.value)}
                placeholder="회원 번호(UUID) · 비우면 전체"
                className="min-h-11 w-full rounded-xl border px-3 py-2"
              />
            </label>
            <button type="submit" className="min-h-11 rounded-xl px-4 py-2 font-bold">적용</button>
            {userId ? (
              <button
                type="button"
                className="min-h-11 rounded-xl px-4 py-2 text-lux-text-muted"
                onClick={() => {
                  setUserDraft("");
                  setUserId("");
                  setOffset(0);
                }}
              >
                전체 보기
              </button>
            ) : null}
          </form>
        </section>
      ) : null}

      {tab === "journal" && (
        <section className="mt-5 rounded-2xl border border-lux-border p-4" data-admin-api={journalApi}>
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold">돈의 이동 내역</h2>
              <p className="mt-1 text-sm text-lux-text-muted">최근 기록부터 표시합니다. 각 행에서 종류·참조·작성자·시각을 확인할 수 있습니다.</p>
            </div>
            <span className="admin-status-chip">{total == null ? "집계 중" : `총 ${total}건`}</span>
          </div>

          {!journals ? (
            <p className="mt-4 text-sm text-lux-text-muted">{T.admin.state.loading}</p>
          ) : !journals.ok ? (
            <AdminFetchNote failure={journals.failure} />
          ) : items && items.length === 0 ? (
            <div className="admin-empty-state mt-4">아직 표시할 돈의 이동 기록이 없습니다.</div>
          ) : items ? (
            <>
              <div className="admin-table-wrap mt-4">
                <table className="admin-table" data-testid="ledger-journal-table">
                  <thead>
                    <tr>
                      <th>시각</th>
                      <th>종류</th>
                      <th>참조</th>
                      <th>원장 항목</th>
                      <th>작성자</th>
                      <th>메모</th>
                      <th>기록 번호</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((row, idx) => {
                      const id = readText(row.id);
                      return (
                        <tr key={id ?? String(idx)}>
                          <td data-label="시각">{formatDateTimeKo(row.createdAt) ?? "—"}</td>
                          <td data-label="종류"><strong><AdminTruth value={readMoneyRecordLabel(row.journalType)} /></strong></td>
                          <td data-label="참조">
                            <div>{readText(row.referenceType) ?? "없음"}</div>
                            <div className="admin-mono mt-1 text-lux-text-muted">{readText(row.referenceId) ?? "—"}</div>
                          </td>
                          <td data-label="원장 항목">{Array.isArray(row.entries) ? `${row.entries.length}개` : "—"}</td>
                          <td data-label="작성자" className="admin-mono">{readText(row.createdBy) ?? "시스템"}</td>
                          <td data-label="메모">{readText(row.memo) ?? "없음"}</td>
                          <td data-label="기록 번호" className="admin-mono">{id ?? "—"}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                <p className="text-xs text-lux-text-muted">
                  {total != null && items.length > 0 ? `${total}건 중 ${offset + 1}~${Math.min(offset + items.length, total)}건` : ""}
                </p>
                <div className="flex gap-2">
                  <button type="button" disabled={offset <= 0} className="rounded-lg px-3 py-2 text-sm disabled:opacity-40" onClick={() => setOffset(Math.max(0, offset - limit))}>이전</button>
                  <button type="button" disabled={total == null || offset + limit >= total} className="rounded-lg px-3 py-2 text-sm disabled:opacity-40" onClick={() => setOffset(offset + limit)}>다음</button>
                </div>
              </div>
            </>
          ) : <AdminTruth value={null} />}
        </section>
      )}

      {tab === "recon" && (
        <section className="mt-5 rounded-2xl border border-lux-border p-4" data-admin-api={reconApi}>
          <h2 className="text-lg font-bold">기록 맞춰 보기</h2>
          <p className="mt-1 text-sm text-lux-text-muted">원장 합계와 연결 관계가 서로 맞는지 서버가 확인한 결과입니다.</p>
          {!recon ? (
            <p className="mt-4 text-sm text-lux-text-muted">{T.admin.state.loading}</p>
          ) : !recon.ok ? (
            <AdminFetchNote failure={recon.failure} />
          ) : (
            <>
              <div className="admin-stat-grid mt-4">
                <div className="admin-stat-card"><p className="admin-stat-label">결과</p><p className="admin-stat-value text-base">{recon.data.ok === true ? "모두 맞음" : "확인 필요"}</p></div>
                <div className="admin-stat-card"><p className="admin-stat-label">확인한 원장 기록</p><p className="admin-stat-value">{readText(recon.data.journalsChecked) ?? "—"}</p></div>
                <div className="admin-stat-card"><p className="admin-stat-label">확인한 계정</p><p className="admin-stat-value">{readText(recon.data.accountsChecked) ?? "—"}</p></div>
                <div className="admin-stat-card"><p className="admin-stat-label">확인 시각</p><p className="admin-stat-value text-base">{formatDateTimeKo(recon.data.checkedAt) ?? "—"}</p></div>
              </div>
              {mismatches && mismatches.length > 0 ? (
                <div className="admin-table-wrap mt-4">
                  <table className="admin-table"><thead><tr><th>문제 코드</th><th>내용</th><th>회원</th><th>원장 기록</th></tr></thead><tbody>
                    {mismatches.map((item, idx) => (
                      <tr key={`${readText(item.code) ?? "mismatch"}-${idx}`}>
                        <td data-label="문제 코드" className="admin-mono">{readText(item.code) ?? "—"}</td>
                        <td data-label="내용">{readText(item.detail) ?? "—"}</td>
                        <td data-label="회원">{readText(item.userId) ? <Link href={`/admin/users/${readText(item.userId)}`} className="font-bold text-lux-accent">회원 보기</Link> : "—"}</td>
                        <td data-label="원장 기록" className="admin-mono">{readText(item.journalId) ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody></table>
                </div>
              ) : (
                <div className="admin-empty-state mt-4">확인된 어긋남이 없습니다.</div>
              )}
            </>
          )}
        </section>
      )}

      {tab === "shadow-replay" && (
        <section className="mt-5 rounded-2xl border border-lux-border p-4" data-canon="admin-ledger-shadow-replay" data-panel="shadow_replay_gate">
          <h2 className="text-lg font-bold">기록 다시 확인</h2>
          <p className="mt-1 text-sm text-lux-text-muted">최근 기록을 별도로 다시 계산해 실제 결과와 차이가 없는지 확인합니다.</p>
          {!shadow ? (
            <p className="mt-4 text-sm text-lux-text-muted">{T.admin.state.loading}</p>
          ) : !shadow.ok ? (
            <AdminFetchNote failure={shadow.failure} />
          ) : shadow.data.latest == null ? (
            <div className="admin-empty-state mt-4">아직 다시 확인한 기록이 없습니다.</div>
          ) : (
            <div className="admin-stat-grid mt-4">
              <div className="admin-stat-card"><p className="admin-stat-label">재확인 결과</p><p className="admin-stat-value text-base">{shadow.data.pass === true ? "통과" : shadow.data.pass === false ? "확인 필요" : "확인됨"}</p></div>
              <div className="admin-stat-card"><p className="admin-stat-label">최대 차이</p><p className="admin-stat-value">{readText(shadow.data.maxDriftPct) ?? "—"}</p></div>
              <div className="admin-stat-card"><p className="admin-stat-label">허용 기준</p><p className="admin-stat-value">0%</p></div>
              <div className="admin-stat-card"><p className="admin-stat-label">안전 원칙</p><p className="admin-stat-value text-base">차이가 있으면 지급 차단</p></div>
            </div>
          )}
        </section>
      )}
    </main>
  );
}

export default function Page() {
  return <SearchParamsBoundary><LedgerContent /></SearchParamsBoundary>;
}
