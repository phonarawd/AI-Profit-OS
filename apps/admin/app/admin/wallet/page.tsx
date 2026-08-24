"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { SearchParamsBoundary } from "@aipo/ui/components/SearchParamsBoundary";
import { T } from "@aipo/ui/copy/ko";
import {
  adminGet,
  adminSend,
  newIdempotencyKey,
  type AdminResult,
} from "../../../lib/admin-api";
import {
  formatDateTimeKo,
  formatUsdt,
  maskEmail,
  readAmount,
  readStatusLabel,
  readText,
  statusTone,
} from "../../../lib/admin-truth";
import { useAdminSessionRevision } from "../../../lib/use-admin-session";
import { AdminFetchNote, AdminTruth } from "../../../components/AdminTruth";

const TABS = ["deposit-settings", "review", "krw-pending", "disputes"] as const;
type WalletTab = (typeof TABS)[number];

const TAB_LABEL: Record<WalletTab, string> = {
  "deposit-settings": "입금 설정",
  review: "출금 확인",
  "krw-pending": "원화 입금 확인",
  disputes: "잘못 보낸 입금",
};

const WITHDRAW_STATUSES = [
  "all",
  "auth_ok",
  "ledger_posted",
  "broadcasting",
  "queued",
  "completed",
  "rejected",
  "failed_refund_buckets",
] as const;

type DepositConfig = {
  configVersion?: unknown;
  krw?: {
    bankName?: unknown;
    accountHolder?: unknown;
    noticeKo?: unknown;
    krwWithdrawFeeKrw?: unknown;
  };
  usdtOnchain?: {
    usdtWithdrawNetworkFeeUsdt?: unknown;
    sweeperPaused?: unknown;
  };
  withdrawGuards?: { minHoldingHours?: unknown };
};

type KrwItem = {
  id?: unknown;
  depositorName?: unknown;
  payableAmountKrw?: unknown;
  status?: unknown;
};

type DisputeItem = {
  id?: unknown;
  kind?: unknown;
  status?: unknown;
  amountUsdt?: unknown;
};

type WithdrawItem = {
  id?: unknown;
  userId?: unknown;
  displayName?: unknown;
  email?: unknown;
  mode?: unknown;
  amountUsdt?: unknown;
  asset?: unknown;
  debitProfitUsdt?: unknown;
  debitPrincipalUsdt?: unknown;
  status?: unknown;
  destination?: unknown;
  withdrawFeeUsdt?: unknown;
  stepUpMethod?: unknown;
  kycStatus?: unknown;
  createdAt?: unknown;
  updatedAt?: unknown;
};

type WithdrawList = {
  items?: WithdrawItem[];
  total?: unknown;
  limit?: unknown;
  offset?: unknown;
  nextOffset?: unknown;
  readOnly?: unknown;
};

const MODE_LABEL: Record<string, string> = {
  profit: "수익금",
  principal: "원금",
  combined: "수익금+원금",
};

function maskDestination(value: unknown): string | null {
  const text = readText(value);
  if (!text) return null;
  if (text.length <= 12) return text;
  return `${text.slice(0, 6)}••••${text.slice(-6)}`;
}

function WalletContent() {
  const searchParams = useSearchParams();
  const sessionRevision = useAdminSessionRevision();
  const tab = useMemo((): WalletTab => {
    const raw = searchParams.get("tab");
    return raw && (TABS as readonly string[]).includes(raw) ? (raw as WalletTab) : "deposit-settings";
  }, [searchParams]);

  const initialWithdrawStatus = searchParams.get("status") ?? "all";
  const [withdrawStatus, setWithdrawStatus] = useState(
    (WITHDRAW_STATUSES as readonly string[]).includes(initialWithdrawStatus) ? initialWithdrawStatus : "all",
  );
  const [withdrawOffset, setWithdrawOffset] = useState(0);

  const disputesApi = "/api/v1/admin/wallet/deposit-disputes";
  const creditApi = "/api/v1/admin/wallet/deposit-disputes/:id/credit";
  const rejectApi = "/api/v1/admin/wallet/deposit-disputes/:id/reject";
  const withdrawApi = `/api/v1/admin/wallet/withdrawals?status=${withdrawStatus}&limit=50&offset=${withdrawOffset}`;

  const [config, setConfig] = useState<AdminResult<DepositConfig> | null>(null);
  const [krw, setKrw] = useState<AdminResult<{ items?: KrwItem[] }> | null>(null);
  const [disputes, setDisputes] = useState<AdminResult<{ items?: DisputeItem[] }> | null>(null);
  const [withdrawals, setWithdrawals] = useState<AdminResult<WithdrawList> | null>(null);
  const [actionNote, setActionNote] = useState<string | null>(null);
  const [creditAmount, setCreditAmount] = useState("");
  const [actionReason, setActionReason] = useState("");

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const [c, k, d] = await Promise.all([
        adminGet<DepositConfig>("/api/v1/admin/wallet/deposit-config"),
        adminGet<{ items?: KrwItem[] }>("/api/v1/admin/wallet/krw-deposit-requests?status=pending"),
        adminGet<{ items?: DisputeItem[] }>(disputesApi),
      ]);
      if (cancelled) return;
      setConfig(c);
      setKrw(k);
      setDisputes(d);
    })();
    return () => {
      cancelled = true;
    };
  }, [disputesApi, sessionRevision]);

  useEffect(() => {
    if (tab !== "review") return;
    let cancelled = false;
    setWithdrawals(null);
    void (async () => {
      const next = await adminGet<WithdrawList>(withdrawApi);
      if (!cancelled) setWithdrawals(next);
    })();
    return () => {
      cancelled = true;
    };
  }, [tab, withdrawApi, sessionRevision]);

  async function decideKrw(id: string, decision: "approve" | "reject") {
    if (decision === "reject" && actionReason.trim().length < 10) {
      setActionNote("거절 사유는 10자 이상이어야 합니다.");
      return;
    }
    if (!window.confirm(decision === "approve" ? "원화 입금을 승인할까요?" : "거절할까요?")) return;
    const path =
      decision === "approve"
        ? `/api/v1/admin/wallet/krw-deposits/${id}/approve`
        : `/api/v1/admin/wallet/krw-deposits/${id}/reject`;
    const res = await adminSend(path, "POST", {
      idempotencyKey: newIdempotencyKey(),
      reason: actionReason.trim(),
    });
    setActionNote(res.ok ? "반영했습니다." : "반영하지 못했습니다.");
    if (res.ok) setKrw(await adminGet("/api/v1/admin/wallet/krw-deposit-requests?status=pending"));
  }

  async function decideDispute(
    event: { preventDefault(): void },
    id: string,
    decision: "credit" | "reject",
  ) {
    event.preventDefault();
    if (actionReason.trim().length < 10) {
      setActionNote("사유는 10자 이상이어야 합니다.");
      return;
    }
    if (decision === "credit" && !readAmount(creditAmount)) {
      setActionNote("넣을 금액을 확인할 수 없습니다.");
      return;
    }
    if (!window.confirm(decision === "credit" ? "잘못 보낸 입금을 반영할까요?" : "이 입금을 반영하지 않을까요?")) return;
    const path =
      decision === "credit"
        ? `/api/v1/admin/wallet/deposit-disputes/${id}/credit`
        : `/api/v1/admin/wallet/deposit-disputes/${id}/reject`;
    const res = await adminSend(path, "POST", {
      idempotencyKey: newIdempotencyKey(),
      reason: actionReason.trim(),
      amountUsdt: decision === "credit" ? creditAmount.trim() : undefined,
    });
    setActionNote(res.ok ? "반영했습니다." : "반영하지 못했습니다.");
    if (res.ok) setDisputes(await adminGet(disputesApi));
  }

  const withdrawItems = withdrawals?.ok && Array.isArray(withdrawals.data.items) ? withdrawals.data.items : null;
  const withdrawTotal = withdrawals?.ok ? Number(withdrawals.data.total ?? 0) : null;
  const withdrawLimit = withdrawals?.ok ? Number(withdrawals.data.limit ?? 50) : 50;
  const withdrawNext = withdrawals?.ok && typeof withdrawals.data.nextOffset === "number" ? withdrawals.data.nextOffset : null;

  return (
    <main className="p-6 text-lux-text" data-admin-wallet-tab={tab} data-testid="admin-wallet-page">
      <p className="admin-eyebrow">돈 운영</p>
      <h1 className="mt-1 text-3xl font-extrabold tracking-tight">{T.admin.navigation.wallet}</h1>
      <p className="mt-2 max-w-3xl text-sm text-lux-text-muted">
        입금 설정, 확인 요청, 출금 진행 상태와 잘못 보낸 입금을 한곳에서 확인합니다. 돈의 실제 이동은 서버의 원장·권한 규칙을 따릅니다.
      </p>

      <nav className="mt-5 flex flex-wrap gap-2 text-sm" data-testid="wallet-tabs" aria-label="입출금 관리 메뉴">
        {TABS.map((t) => (
          <a
            key={t}
            href={`/admin/wallet?tab=${t}`}
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

      {tab === "review" ? (
        <section className="mt-6 rounded-2xl border border-lux-border p-4" data-testid="wallet-review-panel" data-admin-api={withdrawApi}>
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold">출금 진행 현황</h2>
              <p className="mt-1 text-sm text-lux-text-muted">
                본인 확인을 통과한 출금 요청이 원장 반영·전송·완료 과정 중 어디에 있는지 확인합니다. 이 화면은 조회 전용이며 출금 상태를 임의로 바꾸지 않습니다.
              </p>
            </div>
            <label className="admin-toolbar-field" htmlFor="withdraw-status-filter">
              <span>진행 상태</span>
              <select
                id="withdraw-status-filter"
                value={withdrawStatus}
                onChange={(event) => {
                  setWithdrawStatus(event.target.value);
                  setWithdrawOffset(0);
                }}
                className="min-h-11 rounded-xl border px-3 py-2"
              >
                {WITHDRAW_STATUSES.map((value) => (
                  <option key={value} value={value}>
                    {value === "all" ? "전체" : readStatusLabel(value)}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {!withdrawals ? (
            <p className="text-sm text-lux-text-muted">{T.admin.state.loading}</p>
          ) : !withdrawals.ok ? (
            <AdminFetchNote failure={withdrawals.failure} />
          ) : withdrawItems && withdrawItems.length === 0 ? (
            <div className="admin-empty-state"><strong className="text-lux-text">해당 상태의 출금 요청이 없습니다.</strong></div>
          ) : withdrawItems ? (
            <>
              <div className="admin-table-wrap">
                <table className="admin-table" data-testid="wallet-withdrawals-table">
                  <thead>
                    <tr>
                      <th>요청 시각</th>
                      <th>회원</th>
                      <th>금액</th>
                      <th>구성</th>
                      <th>상태</th>
                      <th>본인 확인</th>
                      <th>받는 곳</th>
                      <th>수수료</th>
                      <th>회원 보기</th>
                    </tr>
                  </thead>
                  <tbody>
                    {withdrawItems.map((item, idx) => {
                      const userId = readText(item.userId);
                      const rawStatus = readText(item.status);
                      return (
                        <tr key={readText(item.id) ?? String(idx)}>
                          <td data-label="요청 시각">{formatDateTimeKo(item.createdAt) ?? "—"}</td>
                          <td data-label="회원">
                            <strong>{readText(item.displayName) ?? "이름 미설정"}</strong>
                            <div className="mt-1 text-lux-text-muted">{maskEmail(item.email) ?? "—"}</div>
                          </td>
                          <td data-label="금액"><strong>{formatUsdt(item.amountUsdt) ?? "확인 필요"}</strong></td>
                          <td data-label="구성">{MODE_LABEL[readText(item.mode) ?? ""] ?? readText(item.mode) ?? "—"}</td>
                          <td data-label="상태">
                            <span className="admin-status-chip" data-tone={statusTone(rawStatus)}>{readStatusLabel(rawStatus) ?? "확인 필요"}</span>
                          </td>
                          <td data-label="본인 확인">
                            <span className="admin-status-chip" data-tone={statusTone(item.kycStatus)}>{readStatusLabel(item.kycStatus) ?? "확인 필요"}</span>
                          </td>
                          <td data-label="받는 곳" className="admin-mono">{maskDestination(item.destination) ?? "미설정"}</td>
                          <td data-label="수수료">{formatUsdt(item.withdrawFeeUsdt) ?? "—"}</td>
                          <td data-label="회원 보기">
                            {userId ? <Link className="font-bold text-lux-accent" href={`/admin/users/${userId}`}>상세 보기</Link> : null}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                <p className="text-xs text-lux-text-muted">
                  {withdrawTotal != null ? `${withdrawTotal}건 중 ${withdrawOffset + 1}~${Math.min(withdrawOffset + withdrawItems.length, withdrawTotal)}건` : ""}
                </p>
                <div className="flex gap-2">
                  <button type="button" disabled={withdrawOffset <= 0} onClick={() => setWithdrawOffset(Math.max(0, withdrawOffset - withdrawLimit))} className="rounded-lg px-3 py-2 text-sm disabled:opacity-40">이전</button>
                  <button type="button" disabled={withdrawNext == null} onClick={() => withdrawNext != null && setWithdrawOffset(withdrawNext)} className="rounded-lg px-3 py-2 text-sm disabled:opacity-40">다음</button>
                </div>
              </div>
            </>
          ) : null}
        </section>
      ) : tab === "disputes" ? (
        <section className="mt-6 rounded-2xl border border-lux-border p-4" data-testid="wallet-disputes-panel" data-disputes-api={disputesApi} data-credit-api={creditApi} data-reject-api={rejectApi} data-kind="wrong_chain" data-audit-required="true">
          <h2 className="text-lg font-bold">잘못 보낸 입금 확인</h2>
          <p className="mt-1 text-sm text-lux-text-muted">트론이 아닌 곳으로 보낸 입금이나 확인이 필요한 입금을 처리합니다. 모든 결정은 관리자 기록에 남습니다.</p>
          <div className="admin-toolbar mt-4">
            <label className="admin-toolbar-field flex-1" htmlFor="dispute-reason"><span>결정 사유</span><textarea id="dispute-reason" value={actionReason} onChange={(e) => setActionReason(e.target.value)} className="min-h-20 w-full rounded-xl border px-3 py-2 text-sm" /></label>
            <label className="admin-toolbar-field" htmlFor="dispute-amount"><span>입금 처리 금액 (테더)</span><input id="dispute-amount" value={creditAmount} onChange={(e) => setCreditAmount(e.target.value)} className="min-h-11 rounded-xl border px-3 py-2 text-sm" inputMode="decimal" /></label>
          </div>
          {!disputes ? <p className="mt-3 text-sm text-lux-text-muted">{T.admin.state.loading}</p> : !disputes.ok ? <AdminFetchNote failure={disputes.failure} /> : Array.isArray(disputes.data.items) && disputes.data.items.length === 0 ? <div className="admin-empty-state mt-4">확인할 잘못된 입금이 없습니다.</div> : Array.isArray(disputes.data.items) ? (
            <div className="admin-table-wrap mt-4"><table className="admin-table"><thead><tr><th>상태</th><th>금액</th><th>처리</th></tr></thead><tbody>{disputes.data.items.map((item, idx) => { const id = readText(item.id); return <tr key={id ?? String(idx)}><td data-label="상태"><span className="admin-status-chip" data-tone={statusTone(item.status)}>{readStatusLabel(item.status) ?? "확인 필요"}</span></td><td data-label="금액">{formatUsdt(item.amountUsdt) ?? "확인 필요"}</td><td data-label="처리">{id ? <form className="flex flex-wrap gap-2"><button type="submit" className="rounded-lg px-3 py-2" onClick={(e) => void decideDispute(e, id, "credit")}>입금 처리</button><button type="submit" className="rounded-lg px-3 py-2" data-tone="danger" onClick={(e) => void decideDispute(e, id, "reject")}>거절</button></form> : null}</td></tr>; })}</tbody></table></div>
          ) : <AdminTruth value={null} />}
          {actionNote ? <p className="mt-3 text-sm text-lux-text-muted" role="status">{actionNote}</p> : null}
        </section>
      ) : tab === "deposit-settings" ? (
        <section className="mt-6 rounded-2xl border border-lux-border p-5" data-testid="wallet-deposit-settings-panel">
          <h2 className="text-lg font-bold">입출금 기본 설정</h2>
          {!config ? <p className="mt-3 text-sm text-lux-text-muted">{T.admin.state.loading}</p> : !config.ok ? <AdminFetchNote failure={config.failure} /> : (
            <div className="admin-stat-grid mt-4">
              <div className="admin-stat-card"><p className="admin-stat-label">은행</p><p className="admin-stat-value text-base"><AdminTruth value={readText(config.data.krw?.bankName)} /></p></div>
              <div className="admin-stat-card"><p className="admin-stat-label">예금주</p><p className="admin-stat-value text-base"><AdminTruth value={readText(config.data.krw?.accountHolder)} /></p></div>
              <div className="admin-stat-card"><p className="admin-stat-label">테더 출금 수수료</p><p className="admin-stat-value text-base"><AdminTruth value={formatUsdt(config.data.usdtOnchain?.usdtWithdrawNetworkFeeUsdt)} /></p></div>
              <div className="admin-stat-card"><p className="admin-stat-label">최소 보유 시간</p><p className="admin-stat-value text-base"><AdminTruth value={readText(config.data.withdrawGuards?.minHoldingHours)} /></p></div>
            </div>
          )}
          {config?.ok ? <p className="mt-4 text-sm text-lux-text-muted"><AdminTruth value={readText(config.data.krw?.noticeKo)} /></p> : null}
        </section>
      ) : (
        <section className="mt-6 rounded-2xl border border-lux-border p-4" data-testid="wallet-krw-pending-panel">
          <h2 className="text-lg font-bold">원화 입금 확인</h2>
          <label className="admin-toolbar-field mt-4 max-w-xl" htmlFor="krw-reason"><span>거절 사유</span><textarea id="krw-reason" value={actionReason} onChange={(e) => setActionReason(e.target.value)} className="min-h-20 rounded-xl border px-3 py-2 text-sm" /></label>
          {!krw ? <p className="mt-3 text-sm text-lux-text-muted">{T.admin.state.loading}</p> : !krw.ok ? <AdminFetchNote failure={krw.failure} /> : Array.isArray(krw.data.items) && krw.data.items.length === 0 ? <div className="admin-empty-state mt-4">대기 건이 없습니다.</div> : Array.isArray(krw.data.items) ? (
            <div className="admin-table-wrap mt-4"><table className="admin-table"><thead><tr><th>입금자</th><th>입금 금액</th><th>상태</th><th>처리</th></tr></thead><tbody>{krw.data.items.map((item, idx) => { const id = readText(item.id); return <tr key={id ?? String(idx)}><td data-label="입금자">{readText(item.depositorName) ?? "—"}</td><td data-label="입금 금액">{readText(item.payableAmountKrw) ?? "—"}원</td><td data-label="상태"><span className="admin-status-chip" data-tone={statusTone(item.status)}>{readStatusLabel(item.status) ?? "확인 필요"}</span></td><td data-label="처리">{id ? <div className="flex flex-wrap gap-2"><button type="button" className="rounded-lg px-3 py-2" onClick={() => void decideKrw(id, "approve")}>승인</button><button type="button" className="rounded-lg px-3 py-2" data-tone="danger" onClick={() => void decideKrw(id, "reject")}>거절</button></div> : null}</td></tr>; })}</tbody></table></div>
          ) : <AdminTruth value={null} />}
          {actionNote ? <p className="mt-3 text-sm text-lux-text-muted" role="status">{actionNote}</p> : null}
        </section>
      )}
    </main>
  );
}

export default function Page() {
  return <SearchParamsBoundary><WalletContent /></SearchParamsBoundary>;
}
