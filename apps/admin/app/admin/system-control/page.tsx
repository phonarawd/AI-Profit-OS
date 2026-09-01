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
import { AdminFetchNote, AdminTruth } from "../../../components/AdminTruth";

const TABS = ["circuit", "reserve"] as const;
type SystemTab = (typeof TABS)[number];

const TAB_LABEL: Record<SystemTab, string> = {
  circuit: "서비스 멈춤",
  reserve: "운영 준비금",
};

const ACTION_REASON_MIN = 10;

type PushState = { pushEnabled?: unknown };
type CircuitState = { open?: unknown; reasonCode?: unknown; openedAt?: unknown };
type GrowthState = { enabled?: unknown };
type ProgramState = { accrualHalted?: unknown };

type Preview = {
  id: "push_kill" | "money_circuit" | "growth_enabled" | "referral_accrual_halt";
  title: string;
  from: string;
  to: string;
  confirmText: string;
  apply: (reason: string) => Promise<AdminResult<unknown>>;
};

function circuitLabel(open: unknown): string | null {
  if (typeof open !== "boolean") return null;
  return open ? "멈춤" : "정상";
}

function enabledLabel(enabled: unknown): string | null {
  if (typeof enabled !== "boolean") return null;
  return enabled ? "사용 중" : "멈춤";
}

function SystemControlContent() {
  const searchParams = useSearchParams();
  const tab = useMemo((): SystemTab => {
    const raw = searchParams.get("tab");
    if (raw === "reserve") return "reserve";
    return "circuit";
  }, [searchParams]);

  const pushApi = "/api/v1/admin/system-control/push";
  const circuitApi = "/api/v1/admin/risk/circuit";
  const circuitCloseApi = "/api/v1/admin/risk/circuit/close";
  const growthApi = "/api/v1/admin/growth/enabled";
  const programApi = "/api/v1/admin/growth/referral/program";
  const haltApi = "/api/v1/admin/growth/referral/accrual-halt";
  const switchesApi = "/api/v1/admin/system-control/switches";
  const reserveApi = "/api/v1/admin/system-control/reserve";
  const reserveAuditApi = "/api/v1/admin/system-control/reserve/audit";
  void [switchesApi, reserveApi, reserveAuditApi];

  const [push, setPush] = useState<AdminResult<PushState> | null>(null);
  const [circuit, setCircuit] = useState<AdminResult<CircuitState> | null>(null);
  const [growth, setGrowth] = useState<AdminResult<GrowthState> | null>(null);
  const [program, setProgram] = useState<AdminResult<ProgramState> | null>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [actionReason, setActionReason] = useState("");
  const [actionNote, setActionNote] = useState<string | null>(null);

  async function refreshCircuit() {
    const [nextPush, nextCircuit, nextGrowth, nextProgram] = await Promise.all([
      adminGet<PushState>(pushApi),
      adminGet<CircuitState>(circuitApi),
      adminGet<GrowthState>(growthApi),
      adminGet<ProgramState>(programApi),
    ]);
    setPush(nextPush);
    setCircuit(nextCircuit);
    setGrowth(nextGrowth);
    setProgram(nextProgram);
  }

  useEffect(() => {
    if (tab !== "circuit") return;
    let cancelled = false;
    void (async () => {
      const [nextPush, nextCircuit, nextGrowth, nextProgram] = await Promise.all([
        adminGet<PushState>(pushApi),
        adminGet<CircuitState>(circuitApi),
        adminGet<GrowthState>(growthApi),
        adminGet<ProgramState>(programApi),
      ]);
      if (cancelled) return;
      setPush(nextPush);
      setCircuit(nextCircuit);
      setGrowth(nextGrowth);
      setProgram(nextProgram);
    })();
    return () => {
      cancelled = true;
    };
  }, [tab, pushApi, circuitApi, growthApi, programApi]);

  function requireReason(): string | null {
    const reason = actionReason.trim();
    if (reason.length < ACTION_REASON_MIN) {
      setActionNote("사유는 10자 이상이어야 합니다.");
      return null;
    }
    return reason;
  }

  async function runPreview() {
    if (!preview) return;
    const reason = requireReason();
    if (!reason) return;
    if (!window.confirm(preview.confirmText)) return;
    const res = await preview.apply(reason);
    setActionNote(res.ok ? "반영했습니다." : "반영하지 못했습니다.");
    setPreview(null);
    if (res.ok) await refreshCircuit();
  }

  return (
    <main
      className="p-6 text-lux-text"
      data-admin-system-control-tab={tab}
      data-testid="admin-system-control-page"
    >
      <h1 className="text-xl font-semibold">{T.admin.navigation.systemControl}</h1>
      <p className="mt-2 text-sm text-lux-text-muted">
        문제가 생겼을 때 필요한 기능만 안전하게 멈추고, 확인 후 다시 시작합니다.
      </p>
      <p
        className="mt-2 text-sm text-lux-text-muted"
        data-testid="system-control-release-readout"
        data-forbid="fake_release_complete"
      >
        서비스 반영이 준비됐는지는 이 화면에서 완료로 표시하지 않습니다. 권한 없이
        반영했다고 꾸미지 않습니다.
      </p>
      <nav
        className="mt-4 flex flex-wrap gap-2 text-sm"
        data-testid="system-control-tabs"
      >
        {TABS.map((t) => (
          <a
            key={t}
            href={
              t === "circuit"
                ? "/admin/system-control"
                : "/admin/system-control?tab=reserve"
            }
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

      {tab === "reserve" ? (
        <section
          className="mt-6 space-y-4"
          data-testid="system-control-reserve-panel"
          data-surface="admin-system-control-reserve"
          data-account-code="ops.platform_reserve_usdt"
          data-s2-input="true"
        >
          <p className="text-sm text-lux-text-muted">
            혜택과 행사를 시작하기 전에 반드시 지켜야 할 운영 준비금입니다.
          </p>
          <div
            className="rounded border border-lux-border p-3 space-y-2"
            data-field="targetUsdt"
          >
            <p className="text-sm font-medium">목표 잔액 (테더)</p>
            <p className="text-xs text-lux-text-muted">
              한 번에 예상되는 최대 지출이 운영 준비금의 10%를 넘지 않아야 합니다.
            </p>
          </div>
          <div
            className="rounded border border-lux-border p-3 text-sm"
            data-field="audit"
          >
            <p className="font-medium">변경 기록</p>
            <p className="mt-1 text-xs text-lux-text-muted">
              누가, 언제, 왜 준비금 목표를 바꿨는지 확인합니다.
            </p>
          </div>
        </section>
      ) : (
        <section
          className="mt-6 space-y-4"
          data-testid="system-control-circuit-panel"
          data-forbid="client_ledger_edit"
        >
          <p className="text-sm text-lux-text-muted">실제로 확인된 상태만 표시합니다. 확인하지 못한 상태를 정상으로 꾸미지 않습니다.</p>
          <p className="text-xs text-lux-text-muted">잔액은 이 화면에서 바꾸지 않습니다</p>

          <SwitchCard
            switchId="push_kill"
            title={"알림 보내기"}
            result={push}
            value={
              push?.ok ? enabledLabel(push.data.pushEnabled) : null
            }
            actions={
              push?.ok && typeof push.data.pushEnabled === "boolean"
                ? [
                    {
                      label: push.data.pushEnabled
                        ? "알림 멈추기"
                        : "알림 다시 켜기",
                      onClick: () =>
                        setPreview({
                          id: "push_kill",
                          title: "알림 보내기",
                          from: enabledLabel(push.data.pushEnabled) ?? "",
                          to: enabledLabel(!push.data.pushEnabled) ?? "",
                          confirmText: push.data.pushEnabled
                            ? "알림 발송을 멈출까요?"
                            : "알림 발송을 다시 켤까요?",
                          apply: (reason) =>
                            adminSend(pushApi, "PUT", {
                              pushEnabled: push.data.pushEnabled !== true,
                              reason,
                            }),
                        }),
                    },
                  ]
                : []
            }
          />

          <SwitchCard
            switchId="money_circuit"
            title={"입출금·수익 진행"}
            result={circuit}
            value={circuit?.ok ? circuitLabel(circuit.data.open) : null}
            hint={"멈춤 상태에서는 입출금과 수익 진행을 시작할 수 없습니다."}
            actions={
              circuit?.ok && circuit.data.open === true
                ? [
                    {
                      label: "입출금·수익 진행 다시 시작",
                      onClick: () =>
                        setPreview({
                          id: "money_circuit",
                          title: "입출금·수익 진행",
                          from: "멈춤",
                          to: "정상",
                          confirmText: "입출금과 수익 진행을 다시 시작할까요?",
                          apply: (reason) =>
                            adminSend(circuitCloseApi, "POST", {
                              idempotencyKey: newIdempotencyKey(),
                              reason,
                            }),
                        }),
                    },
                  ]
                : []
            }
          />

          <SwitchCard
            switchId="growth_enabled"
            title={"혜택·행사"}
            result={growth}
            value={growth?.ok ? enabledLabel(growth.data.enabled) : null}
            actions={
              growth?.ok && typeof growth.data.enabled === "boolean"
                ? [
                    {
                      label: growth.data.enabled
                        ? "혜택·행사 멈추기"
                        : "혜택·행사 시작하기",
                      onClick: () =>
                        setPreview({
                          id: "growth_enabled",
                          title: "혜택·행사",
                          from: enabledLabel(growth.data.enabled) ?? "",
                          to: enabledLabel(!growth.data.enabled) ?? "",
                          confirmText: growth.data.enabled
                            ? "혜택과 행사를 멈출까요?"
                            : "혜택과 행사를 시작할까요?",
                          apply: (reason) =>
                            adminSend(growthApi, "PATCH", {
                              enabled: growth.data.enabled !== true,
                              changeReason: reason,
                            }),
                        }),
                    },
                  ]
                : []
            }
          />

          <SwitchCard
            switchId="referral_accrual_halt"
            title={"친구 초대 혜택 지급"}
            result={program}
            value={
              program?.ok && typeof program.data.accrualHalted === "boolean"
                ? program.data.accrualHalted
                  ? "멈춤"
                  : "사용 중"
                : null
            }
            actions={
              program?.ok && typeof program.data.accrualHalted === "boolean"
                ? [
                    {
                      label: program.data.accrualHalted
                        ? "적립 다시 시작"
                        : "적립 멈추기",
                      onClick: () =>
                        setPreview({
                          id: "referral_accrual_halt",
                          title: "친구 초대 혜택 지급",
                          from: program.data.accrualHalted ? "멈춤" : "사용 중",
                          to: program.data.accrualHalted ? "사용 중" : "멈춤",
                          confirmText: program.data.accrualHalted
                            ? "초대 적립을 다시 시작할까요?"
                            : "초대 적립을 멈출까요?",
                          apply: (reason) =>
                            adminSend(haltApi, "POST", {
                              halted: program.data.accrualHalted !== true,
                              changeReason: reason,
                            }),
                        }),
                    },
                  ]
                : []
            }
          />

          <article
            className="rounded border border-lux-border p-3"
            data-switch="GLOBAL_ALL_PAUSE" hidden />
          <article className="rounded border border-lux-border p-3" data-switch="GLOBAL_MATCHING_PAUSE" hidden />
          <article className="rounded border border-lux-border p-3" data-switch="GLOBAL_WITHDRAW_PAUSE" hidden />
          <article className="rounded border border-lux-border p-3" data-switch="GLOBAL_DEPOSIT_PAUSE" hidden />
          <article className="rounded border border-lux-border p-3" data-switch="GLOBAL_OPPORTUNITY_PAUSE"
            data-unpublished="true"
          >
            <h2 className="text-sm font-medium">전체 기회 잠시 멈춤</h2>
            <p className="mt-2 text-sm text-lux-text-muted">모든 회원에게 즉시 적용됩니다.</p>
          </article>
          <p
            className="text-sm text-lux-text-muted"
            data-testid="system-control-unpublished-rest"
          >
            긴급 멈춤은 관련된 모든 기능에 즉시 적용됩니다.
          </p>

          <label className="block text-sm" htmlFor="system-control-reason">
            변경 이유
          </label>
          <textarea
            id="system-control-reason"
            value={actionReason}
            onChange={(e) => setActionReason(e.target.value)}
            className="mt-1 w-full max-w-md rounded border border-lux-border bg-lux-bg px-2 py-1 text-sm"
          />

          {preview ? (
            <div
              className="rounded border border-lux-border p-3 text-sm"
              data-testid="system-control-preview"
              data-preview={preview.id}
            >
              <p className="font-medium">바꾸기 전 확인</p>
              <p className="mt-1">바꿀 내용 {preview.title}</p>
              <p>지금 {preview.from}</p>
              <p>다음 {preview.to}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                <button
                  type="button"
                  className="rounded bg-lux-elevated px-2 py-1"
                  data-tone={preview.to === "멈춤" ? "danger" : "default"}
                  onClick={() => void runPreview()}
                >
                  확인 후 반영
                </button>
                <button
                  type="button"
                  className="rounded px-2 py-1 text-lux-text-muted"
                  onClick={() => setPreview(null)}
                >
                  취소
                </button>
              </div>
            </div>
          ) : (
            <div data-testid="system-control-preview" hidden />
          )}
          {actionNote ? (
            <p className="text-sm text-lux-text-muted" role="status">{actionNote}</p>
          ) : null}
        </section>
      )}
    </main>
  );
}

function SwitchCard({
  switchId,
  title,
  result,
  value,
  hint,
  actions,
}: {
  switchId: string;
  title: string;
  result: AdminResult<unknown> | null;
  value: string | null;
  hint?: string;
  actions: Array<{ label: string; onClick: () => void }>;
}) {
  return (
    <article
      className="rounded border border-lux-border p-3"
      data-switch={switchId}
    >
      <h2 className="text-sm font-medium">{title}</h2>
      {!result ? (
        <p className="mt-2 text-sm text-lux-text-muted">{T.admin.state.loading}</p>
      ) : !result.ok ? (
        <div className="mt-2">
          <AdminFetchNote failure={result.failure} />
        </div>
      ) : (
        <>
          <p className="mt-2 text-sm">
            <AdminTruth value={value} />
          </p>
          {hint ? (
            <p className="mt-1 text-xs text-lux-text-muted">{hint}</p>
          ) : null}
          {actions.map((action) => (
            <button
              key={action.label}
              type="button"
              className="mt-2 mr-2 rounded bg-lux-elevated px-2 py-1 text-sm"
              data-tone={/멈추기|끄기/.test(action.label) ? "danger" : "default"}
              onClick={action.onClick}
            >
              {action.label}
            </button>
          ))}
        </>
      )}
    </article>
  );
}

export default function Page() {
  return (
    <SearchParamsBoundary>
      <SystemControlContent />
    </SearchParamsBoundary>
  );
}
