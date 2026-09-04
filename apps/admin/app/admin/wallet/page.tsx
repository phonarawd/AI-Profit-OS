"use client";

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
import { readAmount, readStatusLabel, readText } from "../../../lib/admin-truth";
import { AdminFetchNote, AdminTruth } from "../../../components/AdminTruth";

const TABS = [
  "deposit-settings",
  "review",
  "krw-pending",
  "disputes",
] as const;
type WalletTab = (typeof TABS)[number];

const TAB_LABEL: Record<WalletTab, string> = {
  "deposit-settings": "입금 설정",
  review: "출금 확인",
  "krw-pending": "원화 입금 확인",
  disputes: "잘못 보낸 입금",
};

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

type WithdrawReviewItem = {
  id?: unknown;
  userId?: unknown;
  mode?: unknown;
  amountUsdt?: unknown;
  asset?: unknown;
  destination?: unknown;
  status?: unknown;
  requirePrincipalConfirm?: unknown;
};

/**
 * Admin §9.1.1 / Money §41.6·§51.11 — `/admin/wallet?tab=disputes`
 * Disputes SoT = GET /api/v1/admin/wallet/deposit-disputes
 * Decide = POST .../credit | .../reject · audit required
 */
// route lock: wallet?tab=disputes
function WalletContent() {
  const searchParams = useSearchParams();
  const tab = useMemo((): WalletTab => {
    const raw = searchParams.get("tab");
    if (raw && (TABS as readonly string[]).includes(raw)) {
      return raw as WalletTab;
    }
    return "deposit-settings";
  }, [searchParams]);

  const disputesApi = "/api/v1/admin/wallet/deposit-disputes";
  const creditApi = "/api/v1/admin/wallet/deposit-disputes/:id/credit";
  const rejectApi = "/api/v1/admin/wallet/deposit-disputes/:id/reject";
  const reviewApi = "/api/v1/admin/wallet/withdraw-intents";

  const [config, setConfig] = useState<AdminResult<DepositConfig> | null>(null);
  const [krw, setKrw] = useState<AdminResult<{ items?: KrwItem[] }> | null>(null);
  const [disputes, setDisputes] = useState<AdminResult<{ items?: DisputeItem[] }> | null>(
    null,
  );
  const [review, setReview] = useState<AdminResult<{ items?: WithdrawReviewItem[] }> | null>(
    null,
  );
  const [reviewBusyId, setReviewBusyId] = useState<string | null>(null);
  const [actionNote, setActionNote] = useState<string | null>(null);
  const [creditAmount, setCreditAmount] = useState("");
  const [actionReason, setActionReason] = useState("");

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const [c, k, d, w] = await Promise.all([
        adminGet<DepositConfig>("/api/v1/admin/wallet/deposit-config"),
        adminGet<{ items?: KrwItem[] }>(
          "/api/v1/admin/wallet/krw-deposit-requests?status=pending",
        ),
        adminGet<{ items?: DisputeItem[] }>(disputesApi),
        adminGet<{ items?: WithdrawReviewItem[] }>(reviewApi),
      ]);
      if (cancelled) return;
      setConfig(c);
      setKrw(k);
      setDisputes(d);
      setReview(w);
    })();
    return () => {
      cancelled = true;
    };
  }, [disputesApi, reviewApi]);

  async function decideWithdraw(id: string, decision: "approve" | "reject") {
    if (reviewBusyId) return;
    if (decision === "reject" && actionReason.trim().length < 10) {
      setActionNote("거절 사유는 10자 이상이어야 합니다.");
      return;
    }
    if (!window.confirm(decision === "approve" ? "출금을 승인할까요?" : "출금을 거절할까요?")) {
      return;
    }
    setReviewBusyId(id);
    try {
      const path =
        decision === "approve"
          ? `/api/v1/admin/wallet/withdraw-intents/${id}/approve`
          : `/api/v1/admin/wallet/withdraw-intents/${id}/reject`;
      const res = await adminSend(path, "POST", {
        idempotencyKey: newIdempotencyKey(),
        reason: actionReason.trim(),
      });
      setActionNote(res.ok ? "반영했습니다." : "반영하지 못했습니다.");
      if (res.ok) {
        setReview(await adminGet(reviewApi));
      }
    } finally {
      setReviewBusyId(null);
    }
  }

  async function decideKrw(id: string, decision: "approve" | "reject") {
    if (decision === "reject" && actionReason.trim().length < 10) {
      setActionNote("거절 사유는 10자 이상이어야 합니다.");
      return;
    }
    if (!window.confirm(decision === "approve" ? "원화 입금을 승인할까요?" : "거절할까요?")) {
      return;
    }
    const path =
      decision === "approve"
        ? `/api/v1/admin/wallet/krw-deposits/${id}/approve`
        : `/api/v1/admin/wallet/krw-deposits/${id}/reject`;
    const res = await adminSend(path, "POST", {
      idempotencyKey: newIdempotencyKey(),
      reason: actionReason.trim(),
    });
    setActionNote(res.ok ? "반영했습니다." : "반영하지 못했습니다.");
    if (res.ok) {
      setKrw(
        await adminGet("/api/v1/admin/wallet/krw-deposit-requests?status=pending"),
      );
    }
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
    if (!window.confirm(decision === "credit" ? "잘못 보낸 입금을 반영할까요?" : "이 입금을 반영하지 않을까요?")) {
      return;
    }
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
    if (res.ok) {
      setDisputes(await adminGet(disputesApi));
    }
  }

  return (
    <main
      className="p-6 text-lux-text"
      data-admin-wallet-tab={tab}
      data-testid="admin-wallet-page"
    >
      <h1 className="text-xl font-semibold">{T.admin.navigation.wallet}</h1>
      <p className="mt-2 text-sm text-lux-text-muted">
        입금 설정과 확인 요청, 출금 확인, 잘못 보낸 입금을 한곳에서 관리합니다.
      </p>
      <nav
        className="mt-4 flex flex-wrap gap-2 text-sm"
        data-testid="wallet-tabs"
      >
        {TABS.map((t) => (
          <a
            key={t}
            href={`/admin/wallet?tab=${t}`}
            data-tab={t}
            className={
              tab === t
                ? "rounded px-2 py-1 bg-lux-elevated text-lux-accent"
                : "rounded px-2 py-1 text-lux-text-muted"
            }
          >
            {TAB_LABEL[t]}
          </a>
        ))}
      </nav>

      {tab === "disputes" ? (
        <section
          className="mt-6"
          data-testid="wallet-disputes-panel"
          data-disputes-api={disputesApi}
          data-credit-api={creditApi}
          data-reject-api={rejectApi}
          data-kind="wrong_chain"
          data-audit-required="true"
        >
          <p className="text-sm text-lux-text-muted">
            트론이 아닌 곳으로 보낸 입금이나 확인이 필요한 입금을 처리합니다. 모든 결정은 관리자 기록에 남습니다.
          </p>
          <label className="mt-4 block text-sm" htmlFor="dispute-reason">
            결정 사유
          </label>
          <textarea
            id="dispute-reason"
            value={actionReason}
            onChange={(e) => setActionReason(e.target.value)}
            className="mt-1 w-full max-w-md rounded border border-lux-border bg-lux-bg px-2 py-1 text-sm"
          />
          <label className="mt-3 block text-sm" htmlFor="dispute-amount">
            입금 처리할 금액 (테더)
          </label>
          <input
            id="dispute-amount"
            value={creditAmount}
            onChange={(e) => setCreditAmount(e.target.value)}
            className="mt-1 w-full max-w-md rounded border border-lux-border bg-lux-bg px-2 py-1 text-sm"
          />
          {!disputes ? (
            <p className="mt-3 text-sm text-lux-text-muted">{T.admin.state.loading}</p>
          ) : !disputes.ok ? (
            <AdminFetchNote failure={disputes.failure} />
          ) : Array.isArray(disputes.data.items) &&
            disputes.data.items.length === 0 ? (
            <p className="mt-3 text-sm text-lux-text-muted">확인할 잘못된 입금이 없습니다.</p>
          ) : Array.isArray(disputes.data.items) ? (
            <ul className="mt-3 space-y-3">
              {disputes.data.items.map((item, idx) => {
                const id = readText(item.id);
                return (
                  <li
                    key={id ?? String(idx)}
                    className="rounded border border-lux-border p-3 text-sm"
                  >
                    <p>
                      상태 <AdminTruth value={readStatusLabel(item.status)} />
                    </p>
                    <p>
                      금액 <AdminTruth value={readAmount(item.amountUsdt)} />
                    </p>
                    {id ? (
                      <form className="mt-2 flex gap-2">
                        <button
                          type="submit"
                          className="rounded bg-lux-elevated px-2 py-1"
                          onClick={(e) => void decideDispute(e, id, "credit")}
                        >
                          입금 처리
                        </button>
                        <button
                          type="submit"
                          className="rounded px-2 py-1 text-lux-text-muted"
                          data-tone="danger"
                          onClick={(e) => void decideDispute(e, id, "reject")}
                        >
                          거절
                        </button>
                      </form>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          ) : (
            <AdminTruth value={null} />
          )}
          {actionNote ? (
            <p className="mt-2 text-sm text-lux-text-muted" role="status">{actionNote}</p>
          ) : null}
        </section>
      ) : tab === "deposit-settings" ? (
        <section className="mt-6 space-y-2" data-testid="wallet-deposit-settings-panel">
          {!config ? (
            <p className="text-sm text-lux-text-muted">{T.admin.state.loading}</p>
          ) : !config.ok ? (
            <AdminFetchNote failure={config.failure} />
          ) : (
            <>
              <p className="text-sm">
                은행 <AdminTruth value={readText(config.data.krw?.bankName)} />
              </p>
              <p className="text-sm">
                예금주{" "}
                <AdminTruth value={readText(config.data.krw?.accountHolder)} />
              </p>
              <p className="text-sm">
                안내 <AdminTruth value={readText(config.data.krw?.noticeKo)} />
              </p>
              <p className="text-sm">
                테더 출금 수수료{" "}
                <AdminTruth
                  value={readAmount(
                    config.data.usdtOnchain?.usdtWithdrawNetworkFeeUsdt,
                  )}
                />
              </p>
              <p className="text-sm">
                최소 보유 시간{" "}
                <AdminTruth
                  value={readText(config.data.withdrawGuards?.minHoldingHours)}
                />
              </p>
            </>
          )}
        </section>
      ) : tab === "krw-pending" ? (
        <section className="mt-6 space-y-2" data-testid="wallet-krw-pending-panel">
          <label className="block text-sm" htmlFor="krw-reason">
            거절 사유
          </label>
          <textarea
            id="krw-reason"
            value={actionReason}
            onChange={(e) => setActionReason(e.target.value)}
            className="w-full max-w-md rounded border border-lux-border bg-lux-bg px-2 py-1 text-sm"
          />
          {!krw ? (
            <p className="text-sm text-lux-text-muted">{T.admin.state.loading}</p>
          ) : !krw.ok ? (
            <AdminFetchNote failure={krw.failure} />
          ) : Array.isArray(krw.data.items) && krw.data.items.length === 0 ? (
            <p className="text-sm text-lux-text-muted">대기 건이 없습니다.</p>
          ) : Array.isArray(krw.data.items) ? (
            <ul className="space-y-3">
              {krw.data.items.map((item, idx) => {
                const id = readText(item.id);
                return (
                  <li
                    key={id ?? String(idx)}
                    className="rounded border border-lux-border p-3 text-sm"
                  >
                    <p>
                      입금자 <AdminTruth value={readText(item.depositorName)} />
                    </p>
                    <p>
                      입금 금액{" "}
                      <AdminTruth value={readText(item.payableAmountKrw)} />
                    </p>
                    {id ? (
                      <div className="mt-2 flex gap-2">
                        <button
                          type="button"
                          className="rounded bg-lux-elevated px-2 py-1"
                          onClick={() => void decideKrw(id, "approve")}
                        >
                          승인
                        </button>
                        <button
                          type="button"
                          className="rounded px-2 py-1 text-lux-text-muted"
                          data-tone="danger"
                          onClick={() => void decideKrw(id, "reject")}
                        >
                          거절
                        </button>
                      </div>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          ) : (
            <AdminTruth value={null} />
          )}
          {actionNote ? (
            <p className="text-sm text-lux-text-muted" role="status">{actionNote}</p>
          ) : null}
        </section>
      ) : (
        <section
          className="mt-6 space-y-2"
          data-testid="wallet-review-panel"
          data-review-api={reviewApi}
          data-audit-required="true"
        >
          <p className="text-sm text-lux-text-muted">
            사용자 확인이 끝난 출금만 대기열에 올립니다. 승인은 검수 결정이며, 잔액 반영은 다음 단계에서만 합니다.
          </p>
          <label className="block text-sm" htmlFor="withdraw-review-reason">
            거절 사유
          </label>
          <textarea
            id="withdraw-review-reason"
            value={actionReason}
            onChange={(e) => setActionReason(e.target.value)}
            className="w-full max-w-md rounded border border-lux-border bg-lux-bg px-2 py-1 text-sm"
          />
          {!review ? (
            <p className="text-sm text-lux-text-muted">{T.admin.state.loading}</p>
          ) : !review.ok ? (
            <AdminFetchNote failure={review.failure} />
          ) : Array.isArray(review.data.items) && review.data.items.length === 0 ? (
            <p className="text-sm text-lux-text-muted">대기 건이 없습니다.</p>
          ) : Array.isArray(review.data.items) ? (
            <ul className="space-y-3">
              {review.data.items.map((item, idx) => {
                const id = readText(item.id);
                return (
                  <li
                    key={id ?? String(idx)}
                    className="rounded border border-lux-border p-3 text-sm"
                    data-testid="wallet-review-row"
                  >
                    <p>
                      상태 <AdminTruth value={readStatusLabel(item.status)} />
                    </p>
                    <p>
                      방식 <AdminTruth value={readText(item.mode)} />
                    </p>
                    <p>
                      자산 <AdminTruth value={readText(item.asset)} />
                    </p>
                    <p>
                      금액 <AdminTruth value={readAmount(item.amountUsdt)} />
                    </p>
                    <p>
                      받는 곳 <AdminTruth value={readText(item.destination)} />
                    </p>
                    <p>
                      회원 <AdminTruth value={readText(item.userId)} />
                    </p>
                    {id ? (
                      <div className="mt-2 flex gap-2">
                        <button
                          type="button"
                          className="rounded bg-lux-elevated px-2 py-1"
                          disabled={reviewBusyId != null}
                          onClick={() => void decideWithdraw(id, "approve")}
                        >
                          승인
                        </button>
                        <button
                          type="button"
                          className="rounded px-2 py-1 text-lux-text-muted"
                          data-tone="danger"
                          disabled={reviewBusyId != null}
                          onClick={() => void decideWithdraw(id, "reject")}
                        >
                          거절
                        </button>
                      </div>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          ) : (
            <AdminTruth value={null} />
          )}
          {actionNote ? (
            <p className="text-sm text-lux-text-muted" role="status">{actionNote}</p>
          ) : null}
        </section>
      )}
    </main>
  );
}

export default function Page() {
  return (
    <SearchParamsBoundary>
      <WalletContent />
    </SearchParamsBoundary>
  );
}
