"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { SearchParamsBoundary } from "@aipo/ui/components/SearchParamsBoundary";
import { T } from "@aipo/ui/copy/ko";
import { adminGet, type AdminResult } from "../../../lib/admin-api";
import {
  formatDateTimeKo,
  readStatusLabel,
  readText,
  statusTone,
} from "../../../lib/admin-truth";
import { useAdminSessionRevision } from "../../../lib/use-admin-session";
import { AdminFetchNote } from "../../../components/AdminTruth";

const TABS = ["records", "rbac"] as const;
type AuditTab = (typeof TABS)[number];

const TAB_LABEL: Record<AuditTab, string> = {
  records: "바꾼 내용",
  rbac: "관리자 권한",
};

type AuditEvent = {
  id?: unknown;
  actorKey?: unknown;
  actorId?: unknown;
  role?: unknown;
  action?: unknown;
  targetType?: unknown;
  targetId?: unknown;
  occurredAt?: unknown;
  mode?: unknown;
  result?: unknown;
  reason?: unknown;
  idempotencyKey?: unknown;
};

type AuditList = { items?: AuditEvent[] };

const ROLE_LABELS: Record<string, string> = {
  super: "최고관리자",
  finance: "재무",
  cs: "고객지원",
  risk: "리스크",
  marketing: "마케팅",
};

function roleLabel(value: unknown): string {
  const raw = readText(value) ?? "unknown";
  return ROLE_LABELS[raw] ?? raw;
}

function resultLabel(value: unknown): string {
  const raw = readText(value)?.toLowerCase();
  if (!raw) return "확인 필요";
  if (["success", "ok", "allowed", "applied", "completed"].includes(raw)) return "완료";
  if (["denied", "rejected", "failed", "error", "blocked"].includes(raw)) return "거절·실패";
  return readStatusLabel(raw) ?? raw;
}

function resultTone(value: unknown): "good" | "warn" | "danger" | "neutral" {
  const raw = readText(value)?.toLowerCase();
  if (!raw) return "neutral";
  if (["success", "ok", "allowed", "applied", "completed"].includes(raw)) return "good";
  if (["denied", "rejected", "failed", "error", "blocked"].includes(raw)) return "danger";
  return statusTone(raw);
}

function AuditContent() {
  const searchParams = useSearchParams();
  const sessionRevision = useAdminSessionRevision();
  const tab = useMemo((): AuditTab => {
    const raw = searchParams.get("tab");
    if (raw === "rbac") return "rbac";
    return "records";
  }, [searchParams]);
  const [records, setRecords] = useState<AdminResult<AuditList> | null>(null);
  const [search, setSearch] = useState("");
  const recordsApi = "/api/v1/admin/audit/events?limit=100";

  useEffect(() => {
    if (tab !== "records") return;
    let cancelled = false;
    setRecords(null);
    void (async () => {
      const next = await adminGet<AuditList>(recordsApi);
      if (!cancelled) setRecords(next);
    })();
    return () => {
      cancelled = true;
    };
  }, [tab, sessionRevision]);

  const items = records?.ok && Array.isArray(records.data.items) ? records.data.items : null;
  const visible = useMemo(() => {
    if (!items) return null;
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter((item) =>
      [item.actorKey, item.role, item.action, item.targetType, item.targetId, item.reason]
        .map((value) => readText(value)?.toLowerCase() ?? "")
        .some((value) => value.includes(q)),
    );
  }, [items, search]);

  return (
    <main
      className="p-6 text-lux-text"
      data-testid="admin-audit-page"
      data-admin-audit-tab={tab}
      data-forbid="audit_delete"
    >
      <p className="admin-eyebrow">운영 추적</p>
      <h1 className="mt-1 text-3xl font-extrabold tracking-tight">{T.admin.navigation.audit}</h1>
      <p className="mt-2 max-w-3xl text-sm text-lux-text-muted">
        어떤 관리자가 언제 무엇을 바꿨고 결과가 어땠는지 확인합니다. 안전을 위해 기록은 이 화면에서 지울 수 없습니다.
      </p>

      <nav className="mt-5 flex flex-wrap gap-2 text-sm" aria-label="관리자 작업 기록 메뉴">
        {TABS.map((t) => (
          <a
            key={t}
            href={t === "records" ? "/admin/audit" : "/admin/audit?tab=rbac"}
            data-tab={t}
            className={
              tab === t
                ? "rounded-xl border border-lux-border bg-lux-elevated px-3 py-2 font-bold text-lux-accent"
                : "rounded-xl border border-transparent px-3 py-2 text-lux-text-muted"
            }
          >
            {TAB_LABEL[t]}
          </a>
        ))}
      </nav>

      {tab === "rbac" ? (
        <section className="mt-6 rounded-2xl border border-lux-border p-5" data-testid="audit-rbac-panel">
          <h2 className="text-lg font-bold">권한은 서버에서 강제로 적용됩니다</h2>
          <p className="mt-2 text-sm text-lux-text-muted">
            화면에서 보이는 버튼과 관계없이 실제 허용 여부는 서버의 관리자 역할·권한 정책이 최종 결정합니다. 알 수 없는 역할이나 분류되지 않은 기능은 자동으로 거절됩니다.
          </p>
          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            {Object.entries(ROLE_LABELS).map(([id, label]) => (
              <div key={id} className="admin-stat-card">
                <p className="admin-stat-label">관리자 역할</p>
                <p className="admin-stat-value text-base">{label}</p>
                <p className="admin-mono mt-2 text-lux-text-muted">{id}</p>
              </div>
            ))}
          </div>
          <p className="mt-4 text-xs text-lux-text-muted">
            상세 권한 변경은 이 화면에서 제공하지 않습니다. 변경 이력과 실제 거절 기록은 ‘바꾼 내용’에서 확인합니다.
          </p>
        </section>
      ) : (
        <section className="mt-6 rounded-2xl border border-lux-border p-4" data-testid="audit-records-panel" data-admin-api={recordsApi}>
          <div className="admin-toolbar mb-4">
            <label className="admin-toolbar-field flex-1" htmlFor="audit-search">
              <span>기록 찾기</span>
              <input
                id="audit-search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="관리자 · 작업 · 대상 · 사유"
                className="min-h-11 w-full rounded-xl border px-3 py-2"
              />
            </label>
            <div className="admin-stat-card min-w-[150px] py-3">
              <p className="admin-stat-label">표시 중</p>
              <p className="admin-stat-value text-base">{visible ? `${visible.length}건` : "—"}</p>
            </div>
          </div>

          {!records ? (
            <p className="text-sm text-lux-text-muted">{T.admin.state.loading}</p>
          ) : !records.ok ? (
            <AdminFetchNote failure={records.failure} />
          ) : visible && visible.length === 0 ? (
            <div className="admin-empty-state" data-testid="audit-empty-records">
              <strong className="text-lux-text">표시할 관리자 기록이 없습니다.</strong>
              <p className="mt-1 text-sm">검색 조건을 지우거나 실제 운영 기록이 쌓인 뒤 다시 확인해 주세요.</p>
            </div>
          ) : visible ? (
            <div className="admin-table-wrap">
              <table className="admin-table" data-testid="audit-records-table">
                <thead>
                  <tr>
                    <th>시각</th>
                    <th>관리자</th>
                    <th>작업</th>
                    <th>대상</th>
                    <th>결과</th>
                    <th>사유</th>
                    <th>모드</th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map((item, idx) => (
                    <tr key={readText(item.id) ?? String(idx)}>
                      <td data-label="시각">{formatDateTimeKo(item.occurredAt) ?? "—"}</td>
                      <td data-label="관리자">
                        <strong>{roleLabel(item.role)}</strong>
                        <div className="admin-mono mt-1 text-lux-text-muted">{readText(item.actorKey) ?? "—"}</div>
                      </td>
                      <td data-label="작업">
                        <span className="admin-mono">{readText(item.action) ?? "—"}</span>
                      </td>
                      <td data-label="대상">
                        <div>{readText(item.targetType) ?? "—"}</div>
                        <div className="admin-mono mt-1 text-lux-text-muted">{readText(item.targetId) ?? "—"}</div>
                      </td>
                      <td data-label="결과">
                        <span className="admin-status-chip" data-tone={resultTone(item.result)}>
                          {resultLabel(item.result)}
                        </span>
                      </td>
                      <td data-label="사유">{readText(item.reason) ?? "기록된 사유 없음"}</td>
                      <td data-label="모드">{readText(item.mode) ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </section>
      )}
    </main>
  );
}

export default function Page() {
  return (
    <SearchParamsBoundary>
      <AuditContent />
    </SearchParamsBoundary>
  );
}
