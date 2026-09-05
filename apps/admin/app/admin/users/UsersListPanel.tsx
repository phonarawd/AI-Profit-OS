"use client";

import { useEffect, useState } from "react";
import { T } from "@aipo/ui/copy/ko";
import { adminGet, type AdminFailure } from "../../../lib/admin-api";
import { AdminFetchNote, AdminTruth } from "../../../components/AdminTruth";

type UserListItem = {
  id?: unknown;
  username?: unknown;
  emailMasked?: unknown;
  displayName?: unknown;
  status?: unknown;
  signupMethod?: unknown;
  emailVerified?: unknown;
  createdAt?: unknown;
};

type UserListResponse = {
  items?: UserListItem[];
  totalCount?: unknown;
  totalPages?: unknown;
  page?: unknown;
};

type StatusFilter = "all" | "active" | "banned" | "deleted";
type SignupFilter = "all" | "classic" | "kakao" | "google" | "passkey" | "email_magic";
type OrderFilter = "desc" | "asc";

const PAGE_SIZE = 20;
const SEARCH_DEBOUNCE_MS = 350;

function statusLabel(value: string): string {
  const map = T.admin.usersList;
  if (value === "active") return map.statusActive;
  if (value === "banned") return map.statusBanned;
  if (value === "deleted") return map.statusDeleted;
  return value;
}

function signupMethodLabel(value: string): string {
  const map = T.admin.usersList;
  if (value === "classic") return map.signupClassic;
  if (value === "kakao") return map.signupKakao;
  if (value === "google") return map.signupGoogle;
  if (value === "passkey") return map.signupPasskey;
  if (value === "email_magic") return map.signupEmailMagic;
  return value;
}

function buildQuery(params: Record<string, string | number>): string {
  const usp = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === "" || value == null) continue;
    usp.set(key, String(value));
  }
  return usp.toString();
}

/**
 * Admin members directory list (S1F Section 9.1 backend, PUTDUK continuation
 * session frontend wiring). Real GET /api/v1/admin/users with search/status/
 * signup-method filters, order toggle, and page navigation - every state
 * (loading/empty/error/retry/total count/current page) reflects the live
 * fetch result, never a hardcoded placeholder.
 */
export function UsersListPanel() {
  const [page, setPage] = useState(1);
  const [searchDraft, setSearchDraft] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [signupMethod, setSignupMethod] = useState<SignupFilter>("all");
  const [order, setOrder] = useState<OrderFilter>("desc");
  const [reloadToken, setReloadToken] = useState(0);

  const [result, setResult] = useState<UserListResponse | null>(null);
  const [failure, setFailure] = useState<AdminFailure | null>(null);
  const [loading, setLoading] = useState(true);

  // Debounce the free-text search box so every keystroke does not fire a
  // request; committing the search also resets to page 1.
  useEffect(() => {
    const handle = setTimeout(() => {
      setSearch(searchDraft.trim());
      setPage(1);
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(handle);
  }, [searchDraft]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const qs = buildQuery({
      page,
      pageSize: PAGE_SIZE,
      search,
      status,
      signupMethod,
      order,
    });
    void adminGet<UserListResponse>(`/api/v1/admin/users?${qs}`).then((res) => {
      if (cancelled) return;
      setLoading(false);
      if (res.ok) {
        setResult(res.data);
        setFailure(null);
      } else {
        setFailure(res.failure);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [page, search, status, signupMethod, order, reloadToken]);

  const items = result?.items ?? [];
  const totalCount = typeof result?.totalCount === "number" ? result.totalCount : null;
  const totalPages = typeof result?.totalPages === "number" ? result.totalPages : null;
  const copy = T.admin.usersList;

  function withPageReset<T>(setter: (value: T) => void) {
    return (value: T) => {
      setter(value);
      setPage(1);
    };
  }
  const onStatusChange = withPageReset(setStatus);
  const onSignupChange = withPageReset(setSignupMethod);
  const onOrderChange = withPageReset(setOrder);

  function retry() {
    setReloadToken((n) => n + 1);
  }

  return (
    <>
      <section
        className="mt-6 rounded border border-lux-border p-4"
        data-metric="user-list"
        data-truth={totalCount != null ? "available" : "unavailable"}
      >
        <h2 className="text-base font-medium">{copy.totalCountLabel}</h2>
        <p className="mt-2" data-testid="admin-users-list-total">
          <AdminTruth
            value={totalCount != null ? `${totalCount}${copy.countUnit}` : null}
            testId="admin-users-list"
          />
        </p>
      </section>

      <section className="mt-4 flex flex-wrap gap-3" data-testid="admin-users-filters">
        <div>
          <label className="block text-sm" htmlFor="admin-users-search">
            {copy.searchLabel}
          </label>
          <input
            id="admin-users-search"
            value={searchDraft}
            onChange={(e) => setSearchDraft(e.target.value)}
            placeholder={copy.searchPlaceholder}
            autoComplete="off"
            className="mt-1 w-64 rounded border border-lux-border bg-lux-bg px-2 py-1 text-sm"
          />
        </div>
        <div>
          <label className="block text-sm" htmlFor="admin-users-status">
            {copy.statusLabel}
          </label>
          <select
            id="admin-users-status"
            value={status}
            onChange={(e) => onStatusChange(e.target.value as StatusFilter)}
            className="mt-1 rounded border border-lux-border bg-lux-bg px-2 py-1 text-sm"
          >
            <option value="all">{copy.statusAll}</option>
            <option value="active">{copy.statusActive}</option>
            <option value="banned">{copy.statusBanned}</option>
            <option value="deleted">{copy.statusDeleted}</option>
          </select>
        </div>
        <div>
          <label className="block text-sm" htmlFor="admin-users-signup-method">
            {copy.signupMethodLabel}
          </label>
          <select
            id="admin-users-signup-method"
            value={signupMethod}
            onChange={(e) => onSignupChange(e.target.value as SignupFilter)}
            className="mt-1 rounded border border-lux-border bg-lux-bg px-2 py-1 text-sm"
          >
            <option value="all">{copy.signupAll}</option>
            <option value="classic">{copy.signupClassic}</option>
            <option value="kakao">{copy.signupKakao}</option>
            <option value="google">{copy.signupGoogle}</option>
            <option value="passkey">{copy.signupPasskey}</option>
            <option value="email_magic">{copy.signupEmailMagic}</option>
          </select>
        </div>
        <div>
          <label className="block text-sm" htmlFor="admin-users-order">
            {copy.orderLabel}
          </label>
          <select
            id="admin-users-order"
            value={order}
            onChange={(e) => onOrderChange(e.target.value as OrderFilter)}
            className="mt-1 rounded border border-lux-border bg-lux-bg px-2 py-1 text-sm"
          >
            <option value="desc">{copy.orderDesc}</option>
            <option value="asc">{copy.orderAsc}</option>
          </select>
        </div>
      </section>

      <section className="mt-4" data-testid="admin-users-table">
        {loading ? (
          <p className="text-sm text-lux-text-muted">{T.admin.state.loading}</p>
        ) : failure ? (
          <div>
            <AdminFetchNote failure={failure} />
            <button
              type="button"
              onClick={retry}
              className="mt-2 rounded bg-lux-elevated px-2 py-1 text-sm"
            >
              {copy.retry}
            </button>
          </div>
        ) : items.length === 0 ? (
          <p className="text-sm text-lux-text-muted">{T.admin.state.empty}</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {items.map((item, idx) => {
              const id = typeof item.id === "string" ? item.id : String(idx);
              const statusValue = typeof item.status === "string" ? item.status : "";
              const signupValue =
                typeof item.signupMethod === "string" ? item.signupMethod : "";
              const createdAt = typeof item.createdAt === "string" ? item.createdAt : null;
              return (
                <li
                  key={id}
                  className="rounded border border-lux-border p-2"
                  data-row="user"
                  data-status={statusValue}
                  data-signup-method={signupValue}
                >
                  <a className="underline" href={`/admin/users/${id}`}>
                    {String(item.username ?? item.displayName ?? id)}
                  </a>
                  <span className="ml-2 text-lux-text-muted">
                    {String(item.emailMasked ?? "")}
                  </span>
                  <span className="ml-2 text-lux-text-muted">{statusLabel(statusValue)}</span>
                  <span className="ml-2 text-lux-text-muted">
                    {signupMethodLabel(signupValue)}
                  </span>
                  <span className="ml-2 text-lux-text-muted">
                    {item.emailVerified ? copy.emailVerifiedYes : copy.emailVerifiedNo}
                  </span>
                  {createdAt ? (
                    <span className="ml-2 text-lux-text-muted">
                      {new Date(createdAt).toLocaleDateString("ko-KR")}
                    </span>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {!loading && !failure && items.length > 0 ? (
        <section
          className="mt-3 flex items-center gap-3 text-sm"
          data-testid="admin-users-pagination"
        >
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="rounded bg-lux-elevated px-2 py-1 disabled:opacity-40"
          >
            {copy.prevPage}
          </button>
          <span className="text-lux-text-muted">
            {copy.pageLabel} {page}
            {totalPages != null ? ` / ${totalPages}` : ""}
          </span>
          <button
            type="button"
            disabled={totalPages != null ? page >= totalPages : items.length < PAGE_SIZE}
            onClick={() => setPage((p) => p + 1)}
            className="rounded bg-lux-elevated px-2 py-1 disabled:opacity-40"
          >
            {copy.nextPage}
          </button>
        </section>
      ) : null}
    </>
  );
}
