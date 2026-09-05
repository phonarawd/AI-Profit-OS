"use client";

import { useEffect, useState } from "react";
import { T } from "@aipo/ui/copy/ko";
import { adminGet, type AdminFailure } from "../../../lib/admin-api";
import { AdminFetchNote, AdminTruth } from "../../../components/AdminTruth";

type UserListItem = Record<string, unknown>;

type UserListResponse = {
  items?: UserListItem[];
  totalCount?: unknown;
  totalPages?: unknown;
};

export function UsersListPanel() {
  const [result, setResult] = useState<UserListResponse | null>(null);
  const [failure, setFailure] = useState<AdminFailure | null>(null);

  useEffect(() => {
    let cancelled = false;
    void adminGet<UserListResponse>("/api/v1/admin/users?page=1&pageSize=20").then((res) => {
      if (cancelled) return;
      if (res.ok) setResult(res.data);
      else setFailure(res.failure);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const items = result?.items ?? [];
  const totalCount = typeof result?.totalCount === "number" ? result.totalCount : null;

  return (
    <>
      <section
        className="mt-6 rounded border border-lux-border p-4"
        data-metric="user-list"
        data-truth={totalCount != null ? "available" : "unavailable"}
      >
        <h2 className="text-base font-medium">전체 회원 수</h2>
        <p className="mt-2" data-testid="admin-users-list-total">
          <AdminTruth value={totalCount != null ? String(totalCount) : null} />
        </p>
      </section>

      <section className="mt-6" data-testid="admin-users-table">
        {failure ? (
          <AdminFetchNote failure={failure} />
        ) : items.length === 0 && !result ? (
          <p className="text-sm text-lux-text-muted">{T.admin.state.loading}</p>
        ) : items.length === 0 ? (
          <p className="text-sm text-lux-text-muted">{T.admin.state.empty}</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {items.map((item, idx) => (
              <li key={String(item.id ?? idx)} className="rounded border border-lux-border p-2" data-row="user">
                <a className="underline" href={`/admin/users/${String(item.id ?? "")}`}>
                  {String(item.username ?? item.id ?? "")}
                </a>
                <span className="ml-2 text-lux-text-muted">{String(item.emailMasked ?? "")}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
