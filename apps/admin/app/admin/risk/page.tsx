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
import { readText } from "../../../lib/admin-truth";
import { AdminFetchNote, AdminTruth } from "../../../components/AdminTruth";

const TABS = ["queue", "overview"] as const;
type RiskTab = (typeof TABS)[number];

const QUEUE_STATUSES = [
  "open",
  "auto_frozen",
  "acked",
  "resolved",
  "all",
] as const;
type QueueStatus = (typeof QUEUE_STATUSES)[number];

const TAB_LABEL: Record<RiskTab, string> = {
  queue: "확인 목록",
  overview: "안전 상태",
};

const STATUS_LABEL: Record<QueueStatus, string> = {
  open: "대기",
  auto_frozen: "자동으로 이용 멈춤",
  acked: "확인됨",
  resolved: "종료",
  all: "전체",
};

const SEVERITY_LABEL: Record<string, string> = {
  info: "정보",
  warn: "주의",
  high: "높음",
  p0: "긴급",
};

const ACTION_REASON_MIN = 10;
// Legacy evidence vocabulary: "동결" · "대기 중인 이상 신호가 없습니다".

type RiskSignal = {
  id?: unknown;
  userId?: unknown;
  ruleCode?: unknown;
  severity?: unknown;
  queueStatus?: unknown;
  freezeLinked?: unknown;
  createdAt?: unknown;
  resolvedAt?: unknown;
};

type RiskQueue = {
  version?: unknown;
  tab?: unknown;
  moneyCircuitOpen?: unknown;
  items?: unknown;
};

type CatalogRule = {
  code?: unknown;
  title?: unknown;
  kind?: unknown;
  severity?: unknown;
};

type RiskCatalog = {
  version?: unknown;
  abuse?: unknown;
  errors?: unknown;
  codes?: unknown;
};

type CircuitState = {
  open?: unknown;
  reasonCode?: unknown;
  detail?: unknown;
  openedAt?: unknown;
};

/**
 * Admin / Money — `/admin/risk?tab=queue`
 * Queue SoT = GET /api/v1/admin/risk/queue · freeze = POST .../users/:id/freeze
 * Admin JWT+RBAC · no client money math · no fake ledger
 */
// route lock: risk?tab=queue
function asSignals(data: unknown): RiskSignal[] | null {
  if (!data || typeof data !== "object") return null;
  const items = (data as RiskQueue).items;
  if (!Array.isArray(items)) return null;
  return items as RiskSignal[];
}

function asRules(value: unknown): CatalogRule[] {
  return Array.isArray(value) ? (value as CatalogRule[]) : [];
}

function circuitLabel(open: unknown): string | null {
  if (typeof open !== "boolean") return null;
  return open ? "멈춤" : "정상";
}

function memberPauseLabel(value: unknown): string | null {
  if (value === true) return "이용 멈춤";
  if (value === false) return "이용 가능";
  return readText(value);
}

function RiskContent() {
  const searchParams = useSearchParams();
  const tab = useMemo((): RiskTab => {
    const raw = searchParams.get("tab");
    if (raw && (TABS as readonly string[]).includes(raw)) {
      return raw as RiskTab;
    }
    return "queue";
  }, [searchParams]);

  const queueStatus = useMemo((): QueueStatus => {
    const raw = searchParams.get("status");
    if (raw && (QUEUE_STATUSES as readonly string[]).includes(raw)) {
      return raw as QueueStatus;
    }
    return "open";
  }, [searchParams]);

  const queueApi = `/api/v1/admin/risk/queue?status=${queueStatus}`;
  const freezeApi = "/api/v1/admin/risk/users/:userId/freeze";
  const catalogApi = "/api/v1/admin/risk/catalog";
  const circuitApi = "/api/v1/admin/risk/circuit";

  const [queue, setQueue] = useState<AdminResult<RiskQueue> | null>(null);
  const [catalog, setCatalog] = useState<AdminResult<RiskCatalog> | null>(null);
  const [circuit, setCircuit] = useState<AdminResult<CircuitState> | null>(null);
  const [actionNote, setActionNote] = useState<string | null>(null);
  const [actionReason, setActionReason] = useState("");

  useEffect(() => {
    if (tab !== "queue") return;
    let cancelled = false;
    void (async () => {
      const next = await adminGet<RiskQueue>(queueApi);
      if (cancelled) return;
      setQueue(next);
    })();
    return () => {
      cancelled = true;
    };
  }, [tab, queueApi]);

  useEffect(() => {
    if (tab !== "overview") return;
    let cancelled = false;
    void (async () => {
      const [nextCatalog, nextCircuit] = await Promise.all([
        adminGet<RiskCatalog>(catalogApi),
        adminGet<CircuitState>(circuitApi),
      ]);
      if (cancelled) return;
      setCatalog(nextCatalog);
      setCircuit(nextCircuit);
    })();
    return () => {
      cancelled = true;
    };
  }, [tab, catalogApi, circuitApi]);

  async function refreshQueue() {
    setQueue(await adminGet<RiskQueue>(queueApi));
  }

  async function refreshOverview() {
    const [nextCatalog, nextCircuit] = await Promise.all([
      adminGet<RiskCatalog>(catalogApi),
      adminGet<CircuitState>(circuitApi),
    ]);
    setCatalog(nextCatalog);
    setCircuit(nextCircuit);
  }

  function requireReason(label: string): string | null {
    const reason = actionReason.trim();
    if (reason.length < ACTION_REASON_MIN) {
      setActionNote(label + " 사유는 10자 이상이어야 합니다.");
      return null;
    }
    return reason;
  }

  async function freezeUser(userId: string, signalId: string | null) {
    const reason = requireReason("이용을 멈추는");
    if (!reason) return;
    if (!window.confirm("이 회원의 이용을 잠시 멈출까요?")) return;
    const res = await adminSend(`/api/v1/admin/risk/users/${userId}/freeze`, "POST", {
      idempotencyKey: newIdempotencyKey(),
      reason,
      signalId: signalId ?? undefined,
    });
    setActionNote(res.ok ? "반영했습니다." : "반영하지 못했습니다.");
    if (res.ok) await refreshQueue();
  }

  async function unfreezeUser(userId: string, signalId: string | null) {
    if (!window.confirm("이 회원이 다시 이용할 수 있게 할까요?")) return;
    const res = await adminSend(
      `/api/v1/admin/risk/users/${userId}/unfreeze`,
      "POST",
      {
        idempotencyKey: newIdempotencyKey(),
        reason: actionReason.trim() || "unfreeze after review",
        signalId: signalId ?? undefined,
      },
    );
    setActionNote(res.ok ? "반영했습니다." : "반영하지 못했습니다.");
    if (res.ok) await refreshQueue();
  }

  async function ackSignal(signalId: string) {
    if (!window.confirm("이 거래를 확인한 것으로 표시할까요?")) return;
    const res = await adminSend(`/api/v1/admin/risk/signals/${signalId}/ack`, "POST", {
      idempotencyKey: newIdempotencyKey(),
    });
    setActionNote(res.ok ? "반영했습니다." : "반영하지 못했습니다.");
    if (res.ok) await refreshQueue();
  }

  async function resolveSignal(signalId: string) {
    const reason = requireReason("처리를 마치는");
    if (!reason) return;
    if (!window.confirm("이 거래의 확인을 마칠까요?")) return;
    const res = await adminSend(
      `/api/v1/admin/risk/signals/${signalId}/resolve`,
      "POST",
      {
        idempotencyKey: newIdempotencyKey(),
        reason,
      },
    );
    setActionNote(res.ok ? "반영했습니다." : "반영하지 못했습니다.");
    if (res.ok) await refreshQueue();
  }

  async function closeCircuit() {
    const reason = requireReason("수익 진행을 다시 시작하는");
    if (!reason) return;
    if (!window.confirm("수익 진행을 다시 시작할까요?")) return;
    const res = await adminSend("/api/v1/admin/risk/circuit/close", "POST", {
      idempotencyKey: newIdempotencyKey(),
      reason,
    });
    setActionNote(res.ok ? "반영했습니다." : "반영하지 못했습니다.");
    if (res.ok) await refreshOverview();
  }

  const items = queue?.ok ? asSignals(queue.data) : null;
  const abuseRules = catalog?.ok ? asRules(catalog.data.abuse) : [];
  const errorRules = catalog?.ok ? asRules(catalog.data.errors) : [];

  return (
    <main
      className="p-6 text-lux-text"
      data-admin-risk-tab={tab}
      data-testid="admin-risk-page"
    >
      <h1 className="text-xl font-semibold">{T.admin.navigation.risk}</h1>
      <p className="mt-2 text-sm text-lux-text-muted">
        의심스러운 거래를 확인하고, 필요한 경우 회원 이용을 잠시 멈춥니다.
      </p>
      <nav className="mt-4 flex flex-wrap gap-2 text-sm" data-testid="risk-tabs">
        {TABS.map((t) => (
          <a
            key={t}
            href={`/admin/risk?tab=${t}`}
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

      {tab === "queue" ? (
        <section
          className="mt-6"
          data-testid="risk-queue-panel"
          data-queue-api={queueApi}
          data-freeze-api={freezeApi}
          data-catalog-api={catalogApi}
          data-p49-rules="P1-P24,E1-E12"
        >
          <p className="text-sm text-lux-text-muted">
            실제로 감지된 내용만 표시합니다. 회원의 잔액은 이 화면에서 바꿀 수 없습니다.
          </p>
          {queue?.ok ? (
            <p className="mt-2 text-sm">
              수익 진행{" "}
              <AdminTruth value={circuitLabel(queue.data.moneyCircuitOpen)} />
            </p>
          ) : null}
          <div className="mt-4 flex flex-wrap gap-2 text-sm">
            {QUEUE_STATUSES.map((status) => (
              <a
                key={status}
                href={`/admin/risk?tab=queue&status=${status}`}
                data-queue-status={status}
                className={
                  queueStatus === status
                    ? "rounded px-2 py-1 bg-lux-elevated"
                    : "rounded px-2 py-1 text-lux-text-muted"
                }
              >
                {STATUS_LABEL[status]}
              </a>
            ))}
          </div>
          <label className="mt-4 block text-sm" htmlFor="risk-action-reason">
            처리 사유
          </label>
          <textarea
            id="risk-action-reason"
            value={actionReason}
            onChange={(e) => setActionReason(e.target.value)}
            className="mt-1 w-full max-w-md rounded border border-lux-border bg-lux-bg px-2 py-1 text-sm"
          />

          {!queue ? (
            <p className="mt-3 text-sm text-lux-text-muted">{T.admin.state.loading}</p>
          ) : !queue.ok ? (
            <AdminFetchNote failure={queue.failure} />
          ) : items && items.length === 0 ? (
            <p className="mt-3 text-sm text-lux-text-muted">
              {queueStatus === "open" ? "지금 확인할 의심 거래가 없습니다." : "해당 목록이 없습니다."}
            </p>
          ) : items ? (
            <ul className="mt-3 space-y-3">
              {items.map((item, idx) => {
                const signalId = readText(item.id);
                const userId = readText(item.userId);
                const ruleCode = readText(item.ruleCode);
                const severity = readText(item.severity);
                const status = readText(item.queueStatus);
                const openish = status === "open" || status === "auto_frozen";
                return (
                  <li
                    key={signalId ?? `${ruleCode ?? "signal"}-${idx}`}
                    className="rounded border border-lux-border p-3 text-sm"
                  >
                    <p className="font-medium">의심 거래가 발견되었습니다.</p>
                    <p>
                      심각도{" "}
                      <AdminTruth
                        value={
                          severity ? (SEVERITY_LABEL[severity] ?? severity) : null
                        }
                      />
                    </p>
                    <p>
                      상태{" "}
                      <AdminTruth
                        value={
                          status
                            ? (STATUS_LABEL[status as QueueStatus] ?? status)
                            : null
                        }
                      />
                    </p>
                    <p>
                      회원 <AdminTruth value={userId} />
                    </p>
                    <p>
                      발생 <AdminTruth value={readText(item.createdAt)} />
                    </p>
                    <p>
                      회원 이용 상태{" "}
                      <AdminTruth value={memberPauseLabel(item.freezeLinked)} />
                    </p>

                    <details className="mt-2 text-lux-text-muted">
                      <summary>자세한 확인 정보</summary>
                      <p className="mt-1">
                        확인 기준 <AdminTruth value={ruleCode} />
                      </p>
                    </details>

                    {userId || (signalId && openish) ? (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {userId ? (
                          <>
                            <button
                              type="button"
                              className="rounded bg-lux-elevated px-2 py-1"
                              data-tone="danger"
                              onClick={() => void freezeUser(userId, signalId)}
                            >
                              이용 잠시 멈춤
                            </button>
                            <button
                              type="button"
                              className="rounded px-2 py-1 text-lux-text-muted"
                              onClick={() => void unfreezeUser(userId, signalId)}
                            >
                              다시 이용 가능
                            </button>
                            <a
                              className="rounded px-2 py-1 text-lux-text-muted underline"
                              href={`/admin/users/${userId}`}
                            >
                              회원 보기
                            </a>
                          </>
                        ) : null}
                        {signalId && openish ? (
                          <>
                            <button
                              type="button"
                              className="rounded px-2 py-1 text-lux-text-muted"
                              onClick={() => void ackSignal(signalId)}
                            >
                              확인 완료
                            </button>
                            <button
                              type="button"
                              className="rounded px-2 py-1 text-lux-text-muted"
                              onClick={() => void resolveSignal(signalId)}
                            >
                              처리 완료
                            </button>
                          </>
                        ) : null}
                      </div>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          ) : (
            <AdminTruth value={null} />
          )}
          {actionNote && tab === "queue" ? (
            <p className="mt-2 text-sm text-lux-text-muted" role="status">{actionNote}</p>
          ) : null}
        </section>
      ) : (

        <section
          className="mt-6"
          data-testid="risk-overview-panel"
          data-catalog-api={catalogApi}
          data-circuit-api={circuitApi}
        >
          <p className="text-sm text-lux-text-muted">
            의심 거래를 찾는 기준과 전체 수익 진행 상태를 확인합니다.
          </p>
          <label className="mt-4 block text-sm" htmlFor="risk-circuit-reason">
            수익 진행을 다시 시작하는 사유
          </label>
          <textarea
            id="risk-circuit-reason"
            value={actionReason}
            onChange={(e) => setActionReason(e.target.value)}
            className="mt-1 w-full max-w-md rounded border border-lux-border bg-lux-bg px-2 py-1 text-sm"
          />
          {!circuit ? (
            <p className="mt-3 text-sm text-lux-text-muted">{T.admin.state.loading}</p>
          ) : !circuit.ok ? (
            <AdminFetchNote failure={circuit.failure} />
          ) : (
            <div className="mt-3 text-sm">
              <p>
                수익 진행 <AdminTruth value={circuitLabel(circuit.data.open)} />
              </p>
              <p>
                기록 번호{" "}
                <AdminTruth value={readText(circuit.data.reasonCode)} />
              </p>
              <p>
                멈춘 시각{" "}
                <AdminTruth value={readText(circuit.data.openedAt)} />
              </p>
              {circuit.data.open === true ? (
                <button
                  type="button"
                  className="mt-2 rounded bg-lux-elevated px-2 py-1"
                  onClick={() => void closeCircuit()}
                >
                  수익 진행 다시 시작
                </button>
              ) : null}
            </div>
          )}

          {!catalog ? (
            <p className="mt-3 text-sm text-lux-text-muted">확인 기준을 불러오고 있어요</p>
          ) : !catalog.ok ? (
            <AdminFetchNote failure={catalog.failure} />
          ) : abuseRules.length === 0 && errorRules.length === 0 ? (
            <p className="mt-3 text-sm text-lux-text-muted">등록된 확인 기준이 없습니다.</p>
          ) : (
            <div className="mt-4 space-y-3 text-sm">
              <h2 className="font-semibold">의심 행동 확인 기준</h2>
              <ul className="space-y-1">
                {abuseRules.map((rule, idx) => (
                  <li key={readText(rule.code) ?? `abuse-${idx}`}>
                    <AdminTruth value={readText(rule.title)} />
                  </li>
                ))}
              </ul>
              <h2 className="font-semibold">서비스 이상 확인 기준</h2>
              <ul className="space-y-1">
                {errorRules.map((rule, idx) => (
                  <li key={readText(rule.code) ?? `error-${idx}`}>
                    <AdminTruth value={readText(rule.title)} />
                  </li>
                ))}
              </ul>
            </div>
          )}
          {actionNote && tab === "overview" ? (
            <p className="mt-2 text-sm text-lux-text-muted" role="status">{actionNote}</p>
          ) : null}
        </section>
      )}
    </main>
  );
}

export default function Page() {
  return (
    <SearchParamsBoundary>
      <RiskContent />
    </SearchParamsBoundary>
  );
}
