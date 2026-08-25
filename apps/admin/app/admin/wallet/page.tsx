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

const TABS = ["deposit-settings", "review", "krw-pending", "disputes"] as const;
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
    accountNumber?: unknown;
    accountHolder?: unknown;
    noticeKo?: unknown;
    krwWithdrawFeeKrw?: unknown;
  };
  usdtOnchain?: {
    network?: unknown;
    usdtWithdrawNetworkFeeUsdt?: unknown;
    sweeperPaused?: unknown;
  };
  withdrawGuards?: { minHoldingHours?: unknown };
};

type DepositDraft = {
  bankName: string;
  accountNumber: string;
  accountHolder: string;
  noticeKo: string;
  krwWithdrawFeeKrw: string;
  usdtWithdrawNetworkFeeUsdt: string;
  minHoldingHours: string;
  sweeperPaused: boolean;
};

type KrwItem = {
  id?: unknown;
  depositorName?: unknown;
  payableAmountKrw?: unknown;
  status?: unknown;
};

type DisputeItem = {
  id?: unknown;
  status?: unknown;
  amountUsdt?: unknown;
};

const EMPTY_DRAFT: DepositDraft = {
  bankName: "",
  accountNumber: "",
  accountHolder: "",
  noticeKo: "",
  krwWithdrawFeeKrw: "0",
  usdtWithdrawNetworkFeeUsdt: "1",
  minHoldingHours: "24",
  sweeperPaused: false,
};

function asField(value: unknown, fallback = ""): string {
  if (typeof value === "string") return value;
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return fallback;
}

function toDraft(data: DepositConfig): DepositDraft {
  return {
    bankName: asField(data.krw?.bankName),
    accountNumber: asField(data.krw?.accountNumber),
    accountHolder: asField(data.krw?.accountHolder),
    noticeKo: asField(data.krw?.noticeKo),
    krwWithdrawFeeKrw: asField(data.krw?.krwWithdrawFeeKrw, "0"),
    usdtWithdrawNetworkFeeUsdt: asField(
      data.usdtOnchain?.usdtWithdrawNetworkFeeUsdt,
      "1",
    ),
    minHoldingHours: asField(data.withdrawGuards?.minHoldingHours, "24"),
    sweeperPaused: data.usdtOnchain?.sweeperPaused === true,
  };
}

function WalletContent() {
  const searchParams = useSearchParams();
  const tab = useMemo((): WalletTab => {
    const raw = searchParams.get("tab");
    return raw && (TABS as readonly string[]).includes(raw)
      ? (raw as WalletTab)
      : "deposit-settings";
  }, [searchParams]);

  // Admin §9.1.1 / Money §41.6·§51.11 route lock: tab=disputes
  const depositConfigApi = "/api/v1/admin/wallet/deposit-config";
  const disputesApi = "/api/v1/admin/wallet/deposit-disputes";
  const creditApi = "/api/v1/admin/wallet/deposit-disputes/:id/credit";
  const rejectApi = "/api/v1/admin/wallet/deposit-disputes/:id/reject";
  const krwPendingApi = "/api/v1/admin/wallet/krw-deposit-requests?status=pending";

  const [config, setConfig] = useState<AdminResult<DepositConfig> | null>(null);
  const [draft, setDraft] = useState<DepositDraft>(EMPTY_DRAFT);
  const [changeReason, setChangeReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveNote, setSaveNote] = useState<string | null>(null);
  const [krw, setKrw] = useState<AdminResult<{ items?: KrwItem[] }> | null>(null);
  const [disputes, setDisputes] = useState<AdminResult<{ items?: DisputeItem[] }> | null>(
    null,
  );
  const [actionReason, setActionReason] = useState("");
  const [creditAmount, setCreditAmount] = useState("");
  const [actionNote, setActionNote] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const [c, k, d] = await Promise.all([
        adminGet<DepositConfig>(depositConfigApi),
        adminGet<{ items?: KrwItem[] }>(krwPendingApi),
        adminGet<{ items?: DisputeItem[] }>(disputesApi),
      ]);
      if (cancelled) return;
      setConfig(c);
      if (c.ok) setDraft(toDraft(c.data));
      setKrw(k);
      setDisputes(d);
    })();
    return () => {
      cancelled = true;
    };
  }, [depositConfigApi, disputesApi, krwPendingApi]);

  function updateDraft<K extends keyof DepositDraft>(key: K, value: DepositDraft[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  async function saveDepositSettings(event: { preventDefault(): void }) {
    event.preventDefault();
    setSaveNote(null);

    if (!draft.bankName.trim()) return setSaveNote("은행명을 입력해 주세요.");
    if (!draft.accountNumber.trim()) return setSaveNote("입금 계좌번호를 입력해 주세요.");
    if (!draft.accountHolder.trim()) return setSaveNote("예금주를 입력해 주세요.");
    if (changeReason.trim().length < 4) {
      return setSaveNote("변경 사유를 4자 이상 입력해 주세요.");
    }

    const krwFee = Number(draft.krwWithdrawFeeKrw);
    const minHoldingHours = Number(draft.minHoldingHours);
    if (!Number.isInteger(krwFee) || krwFee < 0) {
      return setSaveNote("원화 출금 수수료는 0 이상의 정수여야 합니다.");
    }
    if (!Number.isInteger(minHoldingHours) || minHoldingHours < 0) {
      return setSaveNote("최소 보유 시간은 0 이상의 정수여야 합니다.");
    }
    if (!/^[0-9]+(?:\.[0-9]+)?$/.test(draft.usdtWithdrawNetworkFeeUsdt.trim())) {
      return setSaveNote("테더 출금 수수료를 숫자로 입력해 주세요.");
    }

    if (
      !window.confirm(
        "이 계좌 정보는 실제 사용자의 입금 화면에 표시될 수 있습니다. 저장할까요?",
      )
    ) {
      return;
    }

    setSaving(true);
    const res = await adminSend<DepositConfig>(depositConfigApi, "PATCH", {
      changeReason: changeReason.trim(),
      krw: {
        bankName: draft.bankName.trim(),
        accountNumber: draft.accountNumber.trim(),
        accountHolder: draft.accountHolder.trim(),
        noticeKo: draft.noticeKo.trim(),
        krwWithdrawFeeKrw: krwFee,
      },
      usdtOnchain: {
        usdtWithdrawNetworkFeeUsdt: draft.usdtWithdrawNetworkFeeUsdt.trim(),
        sweeperPaused: draft.sweeperPaused,
      },
      withdrawGuards: { minHoldingHours },
    });
    setSaving(false);

    if (!res.ok) {
      setSaveNote("저장하지 못했습니다. 관리자 권한과 서버 상태를 확인해 주세요.");
      return;
    }
    setConfig(res);
    setDraft(toDraft(res.data));
    setChangeReason("");
    setSaveNote("입금 설정을 저장했습니다. 변경 기록도 함께 남았습니다.");
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
    if (res.ok) setKrw(await adminGet(krwPendingApi));
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
    if (res.ok) setDisputes(await adminGet(disputesApi));
  }

  return (
    <main className="p-6 text-lux-text" data-admin-wallet-tab={tab} data-testid="admin-wallet-page">
      <h1 className="text-xl font-semibold">{T.admin.navigation.wallet}</h1>
      <p className="mt-2 text-sm text-lux-text-muted">
        입금 설정과 확인 요청, 출금 확인, 잘못 보낸 입금을 한곳에서 관리합니다.
      </p>

      <nav className="mt-4 flex flex-wrap gap-2 text-sm" data-testid="wallet-tabs">
        {TABS.map((item) => (
          <a
            key={item}
            href={`/admin/wallet?tab=${item}`}
            data-tab={item}
            className={
              tab === item
                ? "rounded-xl bg-lux-elevated px-3 py-2 text-lux-accent"
                : "rounded-xl px-3 py-2 text-lux-text-muted"
            }
          >
            {TAB_LABEL[item]}
          </a>
        ))}
      </nav>

      {tab === "deposit-settings" ? (
        <section
          className="mt-6 space-y-5"
          data-testid="wallet-deposit-settings-panel"
          data-shared-usdt-address-edit="forbidden"
        >
          {!config ? (
            <p className="text-sm text-lux-text-muted">{T.admin.state.loading}</p>
          ) : !config.ok ? (
            <AdminFetchNote failure={config.failure} />
          ) : (
            <form className="space-y-5" onSubmit={(event) => void saveDepositSettings(event)}>
              <section className="rounded-2xl border border-lux-border bg-lux-elevated/30 p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="text-base font-semibold">원화 입금 계좌</h2>
                    <p className="mt-1 text-sm text-lux-text-muted">
                      사용자가 원화 입금을 선택했을 때 보여줄 실제 계좌 정보입니다.
                    </p>
                  </div>
                  <span className="rounded-full border border-lux-border px-3 py-1 text-xs text-lux-text-muted">
                    설정 버전 {asField(config.data.configVersion, "-")}
                  </span>
                </div>

                <div className="mt-5 grid gap-4 md:grid-cols-2">
                  <label className="text-sm" htmlFor="deposit-bank-name">
                    은행명
                    <input
                      id="deposit-bank-name"
                      data-testid="deposit-bank-name"
                      value={draft.bankName}
                      onChange={(e) => updateDraft("bankName", e.target.value)}
                      className="mt-2 min-h-11 w-full rounded-xl border border-lux-border bg-lux-bg px-3 py-2"
                      placeholder="예: 국민은행"
                    />
                  </label>
                  <label className="text-sm" htmlFor="deposit-account-holder">
                    예금주
                    <input
                      id="deposit-account-holder"
                      data-testid="deposit-account-holder"
                      value={draft.accountHolder}
                      onChange={(e) => updateDraft("accountHolder", e.target.value)}
                      className="mt-2 min-h-11 w-full rounded-xl border border-lux-border bg-lux-bg px-3 py-2"
                      placeholder="예: 주식회사 퍼뜩"
                    />
                  </label>
                </div>

                <label className="mt-4 block text-sm" htmlFor="deposit-account-number">
                  입금 계좌번호
                  <input
                    id="deposit-account-number"
                    data-testid="deposit-account-number"
                    value={draft.accountNumber}
                    onChange={(e) => updateDraft("accountNumber", e.target.value)}
                    inputMode="numeric"
                    className="mt-2 min-h-11 w-full rounded-xl border border-lux-border bg-lux-bg px-3 py-2"
                    placeholder="계좌번호를 입력하세요"
                  />
                </label>

                <label className="mt-4 block text-sm" htmlFor="deposit-notice-ko">
                  사용자에게 보여줄 입금 안내
                  <textarea
                    id="deposit-notice-ko"
                    data-testid="deposit-notice-ko"
                    value={draft.noticeKo}
                    onChange={(e) => updateDraft("noticeKo", e.target.value)}
                    rows={3}
                    className="mt-2 w-full rounded-xl border border-lux-border bg-lux-bg px-3 py-2"
                    placeholder="예: 반드시 본인 명의로 입금해 주세요."
                  />
                </label>
              </section>

              <section className="rounded-2xl border border-lux-border bg-lux-elevated/30 p-5">
                <h2 className="text-base font-semibold">USDT 입금 시스템</h2>
                <p className="mt-1 text-sm text-lux-text-muted">
                  공용 USDT 주소 하나를 직접 입력하는 방식이 아닙니다. 사용자마다 전용 TRC20 입금주소를 자동 배정하며 관리자는 그 주소를 임의로 수정할 수 없습니다.
                </p>

                <dl className="mt-4 grid gap-3 text-sm md:grid-cols-2">
                  <div className="rounded-xl border border-lux-border p-3">
                    <dt className="text-lux-text-muted">네트워크</dt>
                    <dd className="mt-1 font-medium">TRC20</dd>
                  </div>
                  <div className="rounded-xl border border-lux-border p-3">
                    <dt className="text-lux-text-muted">입금주소 방식</dt>
                    <dd className="mt-1 font-medium">사용자별 자동 배정</dd>
                  </div>
                  <div className="rounded-xl border border-lux-border p-3">
                    <dt className="text-lux-text-muted">지갑 보안정보</dt>
                    <dd className="mt-1 font-medium">서버 보안 설정에서 관리</dd>
                  </div>
                  <div className="rounded-xl border border-lux-border p-3">
                    <dt className="text-lux-text-muted">자동 이동</dt>
                    <dd className="mt-1 font-medium">{draft.sweeperPaused ? "일시중지" : "사용"}</dd>
                  </div>
                </dl>

                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <label className="text-sm" htmlFor="usdt-withdraw-fee">
                    테더 출금 네트워크 수수료
                    <input
                      id="usdt-withdraw-fee"
                      data-testid="usdt-withdraw-fee"
                      value={draft.usdtWithdrawNetworkFeeUsdt}
                      onChange={(e) => updateDraft("usdtWithdrawNetworkFeeUsdt", e.target.value)}
                      inputMode="decimal"
                      className="mt-2 min-h-11 w-full rounded-xl border border-lux-border bg-lux-bg px-3 py-2"
                    />
                  </label>
                  <label className="text-sm" htmlFor="krw-withdraw-fee">
                    원화 출금 수수료
                    <input
                      id="krw-withdraw-fee"
                      data-testid="krw-withdraw-fee"
                      value={draft.krwWithdrawFeeKrw}
                      onChange={(e) => updateDraft("krwWithdrawFeeKrw", e.target.value)}
                      inputMode="numeric"
                      className="mt-2 min-h-11 w-full rounded-xl border border-lux-border bg-lux-bg px-3 py-2"
                    />
                  </label>
                </div>

                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <label className="text-sm" htmlFor="min-holding-hours">
                    최소 보유 시간
                    <input
                      id="min-holding-hours"
                      data-testid="min-holding-hours"
                      value={draft.minHoldingHours}
                      onChange={(e) => updateDraft("minHoldingHours", e.target.value)}
                      inputMode="numeric"
                      className="mt-2 min-h-11 w-full rounded-xl border border-lux-border bg-lux-bg px-3 py-2"
                    />
                  </label>
                  <label className="flex min-h-11 items-center gap-3 self-end rounded-xl border border-lux-border px-3 py-2 text-sm">
                    <input
                      type="checkbox"
                      data-testid="sweeper-paused"
                      checked={draft.sweeperPaused}
                      onChange={(e) => updateDraft("sweeperPaused", e.target.checked)}
                    />
                    USDT 자동 이동 일시중지
                  </label>
                </div>

                <p className="mt-4 rounded-xl border border-lux-border px-3 py-3 text-xs text-lux-text-muted">
                  지갑 비밀정보와 주소 생성용 보안정보는 이 화면에 표시하거나 입력하지 않습니다.
                </p>
              </section>

              <section className="rounded-2xl border border-lux-border bg-lux-elevated/30 p-5">
                <label className="text-sm" htmlFor="deposit-change-reason">
                  변경 사유
                  <textarea
                    id="deposit-change-reason"
                    data-testid="deposit-change-reason"
                    value={changeReason}
                    onChange={(e) => setChangeReason(e.target.value)}
                    rows={2}
                    className="mt-2 w-full rounded-xl border border-lux-border bg-lux-bg px-3 py-2"
                    placeholder="예: 운영 입금계좌 변경"
                  />
                </label>
                <p className="mt-2 text-xs text-lux-text-muted">
                  저장하면 관리자 변경 이력에 이전 값과 새 값, 변경 사유가 함께 기록됩니다.
                </p>
                <button
                  type="submit"
                  data-testid="deposit-settings-save"
                  disabled={saving}
                  className="mt-4 min-h-12 rounded-xl bg-lux-accent px-5 py-3 font-semibold text-white disabled:opacity-50"
                >
                  {saving ? "저장 중…" : "입금 설정 저장"}
                </button>
                {saveNote ? (
                  <p className="mt-3 text-sm text-lux-text-muted" role="status">{saveNote}</p>
                ) : null}
              </section>
            </form>
          )}
        </section>
      ) : tab === "krw-pending" ? (
        <section className="mt-6 space-y-3" data-testid="wallet-krw-pending-panel">
          <label className="block text-sm" htmlFor="krw-reason">
            거절 사유
          </label>
          <textarea
            id="krw-reason"
            value={actionReason}
            onChange={(e) => setActionReason(e.target.value)}
            className="w-full max-w-md rounded-xl border border-lux-border bg-lux-bg px-3 py-2 text-sm"
          />
          {!krw ? (
            <p className="text-sm text-lux-text-muted">{T.admin.state.loading}</p>
          ) : !krw.ok ? (
            <AdminFetchNote failure={krw.failure} />
          ) : Array.isArray(krw.data.items) && krw.data.items.length === 0 ? (
            <p className="text-sm text-lux-text-muted">대기 건이 없습니다.</p>
          ) : Array.isArray(krw.data.items) ? (
            <ul className="space-y-3">
              {krw.data.items.map((item, index) => {
                const id = readText(item.id);
                return (
                  <li key={id ?? String(index)} className="rounded-xl border border-lux-border p-3 text-sm">
                    <p>상태 <AdminTruth value={readStatusLabel(item.status)} /></p>
                    <p>입금자 <AdminTruth value={readText(item.depositorName)} /></p>
                    <p>입금 금액 <AdminTruth value={readText(item.payableAmountKrw)} /></p>
                    {id ? (
                      <div className="mt-2 flex gap-2">
                        <button type="button" className="min-h-11 rounded-xl bg-lux-elevated px-3 py-2" onClick={() => void decideKrw(id, "approve")}>승인</button>
                        <button type="button" className="min-h-11 rounded-xl px-3 py-2 text-lux-text-muted" data-tone="danger" onClick={() => void decideKrw(id, "reject")}>거절</button>
                      </div>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          ) : (
            <AdminTruth value={null} />
          )}
          {actionNote ? <p className="text-sm text-lux-text-muted" role="status">{actionNote}</p> : null}
        </section>
      ) : tab === "disputes" ? (
        <section
          className="mt-6"
          data-testid="wallet-disputes-panel"
          data-disputes-api={disputesApi}
          data-credit-api={creditApi}
          data-reject-api={rejectApi}
          data-audit-required="true"
        >
          <p className="text-sm text-lux-text-muted">
            트론이 아닌 곳으로 보낸 입금이나 확인이 필요한 입금을 처리합니다. 모든 결정은 관리자 기록에 남습니다.
          </p>
          <label className="mt-4 block text-sm" htmlFor="dispute-reason">결정 사유</label>
          <textarea id="dispute-reason" value={actionReason} onChange={(e) => setActionReason(e.target.value)} className="mt-1 w-full max-w-md rounded-xl border border-lux-border bg-lux-bg px-3 py-2 text-sm" />
          <label className="mt-3 block text-sm" htmlFor="dispute-amount">입금 처리할 금액 (테더)</label>
          <input id="dispute-amount" value={creditAmount} onChange={(e) => setCreditAmount(e.target.value)} className="mt-1 w-full max-w-md rounded-xl border border-lux-border bg-lux-bg px-3 py-2 text-sm" />
          {!disputes ? (
            <p className="mt-3 text-sm text-lux-text-muted">{T.admin.state.loading}</p>
          ) : !disputes.ok ? (
            <AdminFetchNote failure={disputes.failure} />
          ) : Array.isArray(disputes.data.items) && disputes.data.items.length === 0 ? (
            <p className="mt-3 text-sm text-lux-text-muted">확인할 잘못된 입금이 없습니다.</p>
          ) : Array.isArray(disputes.data.items) ? (
            <ul className="mt-3 space-y-3">
              {disputes.data.items.map((item, index) => {
                const id = readText(item.id);
                return (
                  <li key={id ?? String(index)} className="rounded-xl border border-lux-border p-3 text-sm">
                    <p>상태 <AdminTruth value={readStatusLabel(item.status)} /></p>
                    <p>금액 <AdminTruth value={readAmount(item.amountUsdt)} /></p>
                    {id ? (
                      <form className="mt-2 flex gap-2">
                        <button type="submit" className="min-h-11 rounded-xl bg-lux-elevated px-3 py-2" onClick={(e) => void decideDispute(e, id, "credit")}>입금 처리</button>
                        <button type="submit" className="min-h-11 rounded-xl px-3 py-2 text-lux-text-muted" data-tone="danger" onClick={(e) => void decideDispute(e, id, "reject")}>거절</button>
                      </form>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          ) : (
            <AdminTruth value={null} />
          )}
          {actionNote ? <p className="mt-2 text-sm text-lux-text-muted" role="status">{actionNote}</p> : null}
        </section>
      ) : (
        <section className="mt-6" data-testid={`wallet-${tab}-panel`}>
          <p className="text-sm text-lux-text-muted">출금 확인 목록이 아직 연결되지 않았습니다.</p>
          <AdminTruth value={null} />
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
