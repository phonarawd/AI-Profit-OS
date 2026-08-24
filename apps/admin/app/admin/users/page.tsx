"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { T } from "@aipo/ui/copy/ko";
import { adminGet, type AdminResult } from "../../../lib/admin-api";
import {
  formatDateTimeKo,
  maskEmail,
  maskPhone,
  readStatusLabel,
  readText,
  statusTone,
} from "../../../lib/admin-truth";
import { useAdminSessionRevision } from "../../../lib/use-admin-session";
import { AdminFetchNote, AdminTruth } from "../../../components/AdminTruth";

type UserDirectoryItem = {
  id?: unknown;
  email?: unknown;
  phoneE164?: unknown;
  displayName?: unknown;
  status?: unknown;
  membership?: unknown;
  kycStatus?: unknown;
  matchBlocked?: unknown;
  withdrawApplyBlocked?: unknown;
  lastSeenAt?: unknown;
  createdAt?: unknown;
};

type UserDirectoryResponse = {
  items?: UserDirectoryItem[];
  total?: unknown;
  limit?: unknown;
  offset?: unknown;
  nextOffset?: unknown;
};

const MEMBERSHIP_LABELS: Record<string, string> = {
  sprout: "새싹",
  entry: "입문",
  core: "핵심",
  high: "고액",
  vip: "VIP",
};

function membershipLabel(value: unknown): string | null {
  const raw = readText(value);
  return raw ? (MEMBERSHIP_LABELS[raw] ?? raw) : null;
}

export default function Page() {
  const sessionRevision = useAdminSessionRevision();
  const [draft, setDraft] = useState("");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [offset, setOffset] = useState(0);
  const [directory, setDirectory] = useState<AdminResult<UserDirectoryResponse> | null>(null);

  const api = useMemo(() => {
    const qs = new URLSearchParams({ limit: "50", offset: String(offset) });
    if (query) qs.set("q", query);
    if (status !== "all") qs.set("status", status);
    return `/api/v1/admin/users?${qs.toString()}`;
  }, [offset, query, status]);

  useEffect(() => {
    let cancelled = false;
    setDirectory(null);
    void (async () => {
      const next = await adminGet<UserDirectoryResponse>(api);
      if (!cancelled) setDirectory(next);
    })();
    return () => {
      cancelled = true;
    };
  }, [api, sessionRevision]);

  function onSearch(event: FormEvent) {
    event.preventDefault();
    setOffset(0);
    setQuery(draft.trim());
  }

  const items = directory?.ok && Array.isArray(directory.data.items) ? directory.data.items : null;
  const total = directory?.ok ? Number(directory.data.total ?? 0) : null;
  const limit = directory?.ok ? Number(directory.data.limit ?? 50) : 50;
  const nextOffset = directory?.ok && typeof directory.data.nextOffset === "number" ? directory.data.nextOffset : null;

  return (
    <main className="p-6 text-lux-text" data-testid="admin-users" data-admin-api={api}>
      <p className="admin-eyebrow">회원 운영</p>
      <h1 className="mt-1 text-3xl font-extrabold tracking-tight">{T.admin.navigation.users}</h1>
      <p className="mt-2 max-w-3xl text-sm text-lux-text-muted">
        회원 이름, 이메일, 전화번호 또는 회원 번호로 찾고 현재 이용 상태와 본인 확인 상태를 한눈에 확인합니다.
      </p>

      <section className="mt-6 rounded-2xl border border-lux-border p-4">
        <div className="admin-stat-grid">
          <div className="admin-stat-card">
            <p className="admin-stat-label">검색된 회원</p>
            <p className="admin-stat-value" data-testid="admin-users-total">
              {directory?.ok ? `${total ?? 0}명` : <AdminTruth value={null} />}
            </p>
          </div>
          <div className="admin-stat-card">
            <p className="admin-stat-label">현재 화면</p>
            <p className="admin-stat-value">{items ? `${items.length}명` : "—"}</p>
          </div>
          <div className="admin-stat-card">
            <p className="admin-stat-label">검색 조건</p>
            <p className="admin-stat-value text-base">{query || "전체"}</p>
          </div>
          <div className="admin-stat-card">
            <p className="admin-stat-label">이용 상태</p>
            <p className="admin-stat-value text-base">
              {status === "all" ? "전체" : readStatusLabel(status)}
            </p>
          </div>
        </div>
      </section>

      <section className="mt-5 rounded-2xl border border-lux-border p-4">
        <form className="admin-toolbar" onSubmit={onSearch}>
          <label className="admin-toolbar-field flex-1" htmlFor="admin-user-search">
            <span>회원 찾기</span>
            <input
              id="admin-user-search"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              className="min-h-11 w-full rounded-xl border px-3 py-2"
              autoComplete="off"
              placeholder="이름 · 이메일 · 전화번호 · 회원 번호"
            />
          </label>
          <label className="admin-toolbar-field" htmlFor="admin-user-status">
            <span>이용 상태</span>
            <select
              id="admin-user-status"
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setOffset(0);
              }}
              className="min-h-11 rounded-xl border px-3 py-2"
            >
              <option value="all">전체</option>
              <option value="active">사용 중</option>
              <option value="banned">이용 정지</option>
              <option value="deleted">탈퇴 처리</option>
            </select>
          </label>
          <button type="submit" className="min-h-11 rounded-xl px-4 py-2 font-bold">
            검색
          </button>
          {(query || status !== "all") ? (
            <button
              type="button"
              className="min-h-11 rounded-xl px-4 py-2 text-lux-text-muted"
              onClick={() => {
                setDraft("");
                setQuery("");
                setStatus("all");
                setOffset(0);
              }}
            >
              조건 지우기
            </button>
          ) : null}
        </form>
      </section>

      <section className="mt-5 rounded-2xl border border-lux-border p-4">
        {!directory ? (
          <p className="text-sm text-lux-text-muted">{T.admin.state.loading}</p>
        ) : !directory.ok ? (
          <AdminFetchNote failure={directory.failure} />
        ) : items && items.length === 0 ? (
          <div className="admin-empty-state">
            <strong className="text-lux-text">조건에 맞는 회원이 없습니다.</strong>
            <p className="mt-1 text-sm">검색어 또는 이용 상태를 바꿔 다시 확인해 주세요.</p>
          </div>
        ) : items ? (
          <>
            <div className="admin-table-wrap">
              <table className="admin-table" data-testid="admin-users-table">
                <thead>
                  <tr>
                    <th>회원</th>
                    <th>연락처</th>
                    <th>등급</th>
                    <th>본인 확인</th>
                    <th>이용 상태</th>
                    <th>제한</th>
                    <th>최근 로그인</th>
                    <th>가입일</th>
                    <th>보기</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, idx) => {
                    const id = readText(item.id);
                    const userStatus = readText(item.status);
                    const kyc = readText(item.kycStatus) ?? "none";
                    const restrictions = [
                      item.matchBlocked === true ? "수익 진행 제한" : null,
                      item.withdrawApplyBlocked === true ? "출금 신청 제한" : null,
                    ].filter(Boolean);
                    return (
                      <tr key={id ?? String(idx)}>
                        <td data-label="회원">
                          <strong>{readText(item.displayName) ?? "이름 미설정"}</strong>
                          <div className="admin-mono mt-1 text-lux-text-muted">{id ?? "—"}</div>
                        </td>
                        <td data-label="연락처">
                          <div>{maskEmail(item.email) ?? "—"}</div>
                          <div className="mt-1 text-lux-text-muted">{maskPhone(item.phoneE164) ?? "—"}</div>
                        </td>
                        <td data-label="등급">{membershipLabel(item.membership) ?? "기본"}</td>
                        <td data-label="본인 확인">
                          <span className="admin-status-chip" data-tone={statusTone(kyc)}>
                            {readStatusLabel(kyc)}
                          </span>
                        </td>
                        <td data-label="이용 상태">
                          <span className="admin-status-chip" data-tone={statusTone(userStatus)}>
                            {readStatusLabel(userStatus) ?? "확인 필요"}
                          </span>
                        </td>
                        <td data-label="제한">
                          {restrictions.length > 0 ? restrictions.join(" · ") : "없음"}
                        </td>
                        <td data-label="최근 로그인">{formatDateTimeKo(item.lastSeenAt) ?? "기록 없음"}</td>
                        <td data-label="가입일">{formatDateTimeKo(item.createdAt) ?? "—"}</td>
                        <td data-label="보기">
                          {id ? (
                            <Link className="font-bold text-lux-accent" href={`/admin/users/${id}`}>
                              상세 보기
                            </Link>
                          ) : null}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs text-lux-text-muted">
                {total != null ? `${total}명 중 ${offset + 1}~${Math.min(offset + items.length, total)}명` : ""}
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={offset <= 0}
                  className="rounded-lg px-3 py-2 text-sm disabled:opacity-40"
                  onClick={() => setOffset(Math.max(0, offset - limit))}
                >
                  이전
                </button>
                <button
                  type="button"
                  disabled={nextOffset == null}
                  className="rounded-lg px-3 py-2 text-sm disabled:opacity-40"
                  onClick={() => nextOffset != null && setOffset(nextOffset)}
                >
                  다음
                </button>
              </div>
            </div>
          </>
        ) : (
          <AdminTruth value={null} />
        )}
      </section>
    </main>
  );
}
