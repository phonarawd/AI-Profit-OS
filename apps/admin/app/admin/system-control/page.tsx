"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { SearchParamsBoundary } from "@aipo/ui/components/SearchParamsBoundary";
import {
  adminGet,
  adminSend,
  newIdempotencyKey,
  type AdminResult,
} from "../../../lib/admin-api";
import { readText } from "../../../lib/admin-truth";
import { AdminFetchNote, AdminTruth } from "../../../components/AdminTruth";

const TABS = ["circuit", "reserve"] as const;
type SystemTab = (typeof TABS)[number];

const TAB_LABEL: Record<SystemTab, string> = {
  circuit: "긴급 정지",
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
  return open ? "열림" : "닫힘";
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
      <h1 className="text-xl font-semibold">긴급 정지</h1>
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
          data-get-api={reserveApi}
          data-put-api={reserveApi}
          data-audit-api={reserveAuditApi}
          data-s2-input="true"
        >
          <p className="text-sm text-lux-text-muted">
            Engine §0.0.4.3 · 운영 준비금 목표 · 미설정 시 Growth ON 차단 · 시뮬 S2 입력
          </p>
          <div
            className="rounded border border-lux-border p-3 space-y-2"
            data-field="targetUsdt"
          >
            <p className="text-sm font-medium">목표 잔액 (USDT)</p>
            <p className="text-xs text-lux-text-muted">
              계정 <code>ops.platform_reserve_usdt</code> · PUT {reserveApi}
            </p>
            <p className="text-xs text-lux-text-muted">
              S2: worstCasePlatformDrain ≤ 운영 준비금 × 10%
            </p>
          </div>
          <div
            className="rounded border border-lux-border p-3 text-sm"
            data-field="audit"
          >
            <p className="font-medium">변경 기록</p>
            <p className="mt-1 text-xs text-lux-text-muted">
              GET {reserveAuditApi} · changeReason ≥ 4
            </p>
          </div>
        </section>
      ) : (
        <section
          className="mt-6 space-y-4"
          data-testid="system-control-circuit-panel"
          data-forbid="client_ledger_edit"
        >
          <p className="text-sm text-lux-text-muted">있는 정지 상태만 표시합니다. 없는 값은 닫힘으로 채우지 않습니다.</p>
          <p className="text-xs text-lux-text-muted">잔액은 이 화면에서 바꾸지 않습니다</p>

          <SwitchCard
            switchId="push_kill"
            title={"알림 긴급 정지"}
            api={pushApi}
            result={push}
            value={
              push?.ok ? readText(push.data.pushEnabled) : null
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
                          title: "알림 긴급 정지",
                          from: readText(push.data.pushEnabled) ?? "",
                          to: readText(!push.data.pushEnabled) ?? "",
                          confirmText: push.data.pushEnabled
                            ? "알림 발송을 멈출까요?"
                            : "알림 발송을 다시 켸까요?",
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
            title={"돈 회로"}
            api={circuitApi}
            result={circuit}
            value={circuit?.ok ? circuitLabel(circuit.data.open) : null}
            hint={"열림이면 입출금이 멈춥니다."}
            actions={
              circuit?.ok && circuit.data.open === true
                ? [
                    {
                      label: "회로 닫기",
                      onClick: () =>
                        setPreview({
                          id: "money_circuit",
                          title: "돈 회로",
                          from: "열림",
                          to: "닫힘",
                          confirmText: "돈 회로를 닫아 입출금을 다시 열까요?",
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
            title={"성장 기능"}
            api={growthApi}
            result={growth}
            value={growth?.ok ? readText(growth.data.enabled) : null}
            actions={
              growth?.ok && typeof growth.data.enabled === "boolean"
                ? [
                    {
                      label: growth.data.enabled
                        ? "성장 끄기"
                        : "성장 켜기",
                      onClick: () =>
                        setPreview({
                          id: "growth_enabled",
                          title: "성장 기능",
                          from: readText(growth.data.enabled) ?? "",
                          to: readText(!growth.data.enabled) ?? "",
                          confirmText: growth.data.enabled
                            ? "성장 기능을 끌까요?"
                            : "성장 기능을 켸까요?",
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
            title={"초대 적립 정지"}
            api={programApi}
            result={program}
            value={program?.ok ? readText(program.data.accrualHalted) : null}
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
                          title: "초대 적립 정지",
                          from: readText(program.data.accrualHalted) ?? "",
                          to: readText(!program.data.accrualHalted) ?? "",
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
            data-switch="GLOBAL_ALL_PAUSE" data-admin-api={switchesApi} hidden />
          <article className="rounded border border-lux-border p-3" data-switch="GLOBAL_MATCHING_PAUSE" hidden />
          <article className="rounded border border-lux-border p-3" data-switch="GLOBAL_WITHDRAW_PAUSE" hidden />
          <article className="rounded border border-lux-border p-3" data-switch="GLOBAL_DEPOSIT_PAUSE" hidden />
          <article className="rounded border border-lux-border p-3" data-switch="GLOBAL_OPPORTUNITY_PAUSE"
            data-unpublished="true"
          >
            <h2 className="text-sm font-medium">전체 기회 잠시 멈춤</h2>
            <p className="mt-2 text-sm text-lux-text-muted">서버가 강제합니다.</p>
          </article>
          <p
            className="text-sm text-lux-text-muted"
            data-testid="system-control-unpublished-rest"
          >
            9종 긴급 정지는 서버가 강제합니다.
          </p>

          <label className="block text-sm" htmlFor="system-control-reason">
            조치 사유
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
              <p className="font-medium">미리보기</p>
              <p className="mt-1">바꿀 내용 {preview.title}</p>
              <p>지금 {preview.from}</p>
              <p>다음 {preview.to}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                <button
                  type="button"
                  className="rounded bg-lux-elevated px-2 py-1"
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
            <p className="text-sm text-lux-text-muted">{actionNote}</p>
          ) : null}
        </section>
      )}
    </main>
  );
}

function SwitchCard({
  switchId,
  title,
  api,
  result,
  value,
  hint,
  actions,
}: {
  switchId: string;
  title: string;
  api: string;
  result: AdminResult<unknown> | null;
  value: string | null;
  hint?: string;
  actions: Array<{ label: string; onClick: () => void }>;
}) {
  return (
    <article
      className="rounded border border-lux-border p-3"
      data-switch={switchId}
      data-admin-api={api}
    >
      <h2 className="text-sm font-medium">{title}</h2>
      {!result ? (
        <p className="mt-2 text-sm text-lux-text-muted">불러오는 중</p>
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
