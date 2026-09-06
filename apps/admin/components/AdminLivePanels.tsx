"use client";

import { useEffect, useState } from "react";
import { T } from "@aipo/ui/copy/ko";
import { adminGet, type AdminFailure, type AdminResult } from "../lib/admin-api";
import { readAmount, readText } from "../lib/admin-truth";
import { AdminFetchNote, AdminTruth } from "./AdminTruth";

export function UserCountTile() {
  const [value, setValue] = useState<string | null>(null);
  const [failure, setFailure] = useState<AdminFailure | null>(null);
  const [reload, setReload] = useState(0);
  useEffect(() => {
    let cancelled = false;
    void adminGet<{ totalCount?: unknown }>("/api/v1/admin/users?page=1&pageSize=1").then(
      (res) => {
        if (cancelled) return;
        if (res.ok && typeof res.data.totalCount === "number") {
          setValue(`${res.data.totalCount}명`);
          setFailure(null);
        } else if (!res.ok) {
          setFailure(res.failure);
        }
      },
    );
    return () => {
      cancelled = true;
    };
  }, [reload]);
  return (
    <article
      className="admin-status-card"
      data-metric="user-count"
      data-truth={value ? "available" : "unavailable"}
    >
      <div className="admin-status-card-header">
        <h2>{T.admin.dashboard.userCount}</h2>
      </div>
      <p className="admin-status-card-value" data-testid="admin-user-count">
        {failure ? (
          <AdminFetchNote failure={failure} onRetry={() => setReload((n) => n + 1)} />
        ) : (
          <AdminTruth value={value} />
        )}
      </p>
      <a className="admin-status-card-link" href="/admin/users">
        {T.admin.dashboard.viewDetails}
      </a>
    </article>
  );
}

export function QueueCountTile({
  title,
  api,
  testId,
  href,
}: {
  title: string;
  api: string;
  testId: string;
  href: string;
}) {
  const [value, setValue] = useState<string | null>(null);
  const [failure, setFailure] = useState<AdminFailure | null>(null);
  const [reload, setReload] = useState(0);
  useEffect(() => {
    let cancelled = false;
    void adminGet<unknown>(api).then((res) => {
      if (cancelled) return;
      if (!res.ok) {
        setFailure(res.failure);
        return;
      }
      const payload = res.data;
      const items = Array.isArray(payload)
        ? payload
        : payload &&
            typeof payload === "object" &&
            Array.isArray((payload as { items?: unknown }).items)
          ? (payload as { items: unknown[] }).items
          : null;
      if (items) {
        setValue(`${items.length}건`);
        setFailure(null);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [api, reload]);
  return (
    <article className="admin-status-card" data-truth={value ? "available" : "unavailable"}>
      <div className="admin-status-card-header">
        <h2>{title}</h2>
      </div>
      <div className="admin-status-card-value" data-testid={testId}>
        {failure ? (
          <AdminFetchNote failure={failure} onRetry={() => setReload((n) => n + 1)} />
        ) : (
          <AdminTruth value={value} />
        )}
      </div>
      <a className="admin-status-card-link" href={href}>
        {T.admin.dashboard.viewDetails}
      </a>
    </article>
  );
}

export function ReconTile() {
  const [value, setValue] = useState<string | null>(null);
  const [failure, setFailure] = useState<AdminFailure | null>(null);
  const [reload, setReload] = useState(0);
  useEffect(() => {
    let cancelled = false;
    void adminGet<{ ok?: unknown }>("/api/v1/admin/ledger/recon").then((res) => {
      if (cancelled) return;
      if (res.ok && typeof res.data.ok === "boolean") {
        setValue(res.data.ok ? "맞음" : "어귳남");
        setFailure(null);
      } else if (!res.ok) setFailure(res.failure);
    });
    return () => {
      cancelled = true;
    };
  }, [reload]);
  return (
    <article className="admin-status-card" data-truth={value ? "available" : "unavailable"}>
      <div className="admin-status-card-header">
        <h2>돈의 기록 맞춰 보기</h2>
      </div>
      <div className="admin-status-card-value" data-testid="admin-recon">
        {failure ? (
          <AdminFetchNote failure={failure} onRetry={() => setReload((n) => n + 1)} />
        ) : (
          <AdminTruth value={value} />
        )}
      </div>
      <a className="admin-status-card-link" href="/admin/ledger?tab=recon">
        {T.admin.dashboard.viewDetails}
      </a>
    </article>
  );
}

export function AuditEventsPanel() {
  const [res, setRes] = useState<AdminResult<{ items?: Array<Record<string, unknown>> }> | null>(
    null,
  );
  useEffect(() => {
    let cancelled = false;
    void adminGet<{ items?: Array<Record<string, unknown>> }>(
      "/api/v1/admin/audit/events",
    ).then((next) => {
      if (!cancelled) setRes(next);
    });
    return () => {
      cancelled = true;
    };
  }, []);
  const items = res?.ok && Array.isArray(res.data.items) ? res.data.items : [];
  return (
    <section className="mt-6" data-testid="audit-records-panel">
      {!res ? (
        <p className="text-sm text-lux-text-muted">{T.admin.state.loading}</p>
      ) : !res.ok ? (
        <AdminFetchNote failure={res.failure} />
      ) : items.length === 0 ? (
        <p className="text-sm text-lux-text-muted" data-testid="audit-empty-records">
          {T.admin.state.empty}
        </p>
      ) : (
        <ul className="space-y-2 text-sm">
          {items.map((row, idx) => (
            <li key={String(row.id ?? idx)} className="rounded border border-lux-border p-2">
              <AdminTruth value={readText(row.action)} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function ReserveLivePanel() {
  const [res, setRes] = useState<AdminResult<Record<string, unknown>> | null>(null);
  useEffect(() => {
    let cancelled = false;
    void adminGet<Record<string, unknown>>("/api/v1/admin/system-control/reserve").then(
      (next) => {
        if (!cancelled) setRes(next);
      },
    );
    return () => {
      cancelled = true;
    };
  }, []);
  return (
    <div className="mt-3 text-sm" data-testid="system-control-reserve-live">
      {!res ? (
        <p className="text-lux-text-muted">{T.admin.state.loading}</p>
      ) : !res.ok ? (
        <AdminFetchNote failure={res.failure} />
      ) : (
        <p>
          <AdminTruth value={readAmount(res.data.targetUsdt) ?? readText(res.data.targetUsdt)} />
        </p>
      )}
    </div>
  );
}

export function ReadOnlyAdminApiPanel({
  api,
  title,
  testId,
}: {
  api: string;
  title: string;
  testId: string;
}) {
  const [res, setRes] = useState<AdminResult<Record<string, unknown>> | null>(null);
  useEffect(() => {
    let cancelled = false;
    void adminGet<Record<string, unknown>>(api).then((next) => {
      if (!cancelled) setRes(next);
    });
    return () => {
      cancelled = true;
    };
  }, [api]);
  return (
    <section className="mt-6 space-y-2" data-testid={testId}>
      <h2 className="text-base font-medium">{title}</h2>
      {!res ? (
        <p className="text-sm text-lux-text-muted">{T.admin.state.loading}</p>
      ) : !res.ok ? (
        <AdminFetchNote failure={res.failure} />
      ) : (
        <p className="text-sm">
          <AdminTruth value="확인됨" />
        </p>
      )}
    </section>
  );
}

export const DASH_COPY = {
  withdrawQ: "출금 확인 대기",
  identityQ: "본인 확인 대기",
  ops: "운영 작업",
  match: "수동 연결",
  source: "가격 출처 상태",
  exportPage: "이 페이지 목록 내려받기",
};
