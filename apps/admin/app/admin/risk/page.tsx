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
  queue: "동결 큐",
  overview: "개요",
};

const STATUS_LABEL: Record<QueueStatus, string> = {
  open: "대기",
  auto_frozen: "자동 동결",
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
  return open ? "열림" : "닫힘";
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
    const reason = requireReason("동결");
    if (!reason) return;
    if (!window.confirm("이 회원을 동결할까요?")) return;
    const res = await adminSend(`/api/v1/admin/risk/users/${userId}/freeze`, "POST", {
      idempotencyKey: newIdempotencyKey(),
      reason,
      signalId: signalId ?? undefined,
    });
    setActionNote(res.ok ? "반영했습니다." : "반영하지 못했습니다.");
    if (res.ok) await refreshQueue();
  }

  async function unfreezeUser(userId: string, signalId: string | null) {
    if (!window.confirm("이 회원의 동결을 해제할까요?")) return;
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
    if (!window.confirm("이 신호를 확인 처리할까요?")) return;
    const res = await adminSend(`/api/v1/admin/risk/signals/${signalId}/ack`, "POST", {
      idempotencyKey: newIdempotencyKey(),
    });
    setActionNote(res.ok ? "반영했습니다." : "반영하지 못했습니다.");
    if (res.ok) await refreshQueue();
  }

  async function resolveSignal(signalId: string) {
    const reason = requireReason("종료");
    if (!reason) return;
    if (!window.confirm("이 신호를 종료할까요?")) return;
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
    const reason = requireReason("회로 닫기");
    if (!reason) return;
    if (!window.confirm("돈 회로를 닫아 머니 작업을 다시 열까요?")) return;
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
      <h1 className="text-xl font-semibold">사기·이상 거래 방지</h1>
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
          <p className="text-sm text-lux-text-muted">§49.9 룰 신호 · freeze 연동 · bucket drift circuit · 잔액은 이 화면에서 바꾸지 않습니다</p>
          <p className="mt-2 text-xs text-lux-text-muted">API: {queueApi}</p>
          {queue?.ok ? (
            <p className="mt-2 text-sm">
              돈 회로{" "}
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
            조치 사유
          </label>
          <textarea
            id="risk-action-reason"
            value={actionReason}
            onChange={(e) => setActionReason(e.target.value)}
            className="mt-1 w-full max-w-md rounded border border-lux-border bg-lux-bg px-2 py-1 text-sm"
          />

          {!queue ? (
            <p className="mt-3 text-sm text-lux-text-muted">불러오는 중</p>
          ) : !queue.ok ? (
            <AdminFetchNote failure={queue.failure} />
          ) : items && items.length === 0 ? (
            <p className="mt-3 text-sm text-lux-text-muted">
              {queueStatus === "open" ? "대기 중인 이상 신호가 없습니다." : "해당 목록이 없습니다."}
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
                    <p>
                      규칙 <AdminTruth value={ruleCode} />
                    </p>
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
                      동결 연결{" "}
                      <AdminTruth value={readText(item.freezeLinked)} />
                    </p>

                    {userId || (signalId && openish) ? (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {userId ? (
                          <>
                            <button
                              type="button"
                              className="rounded bg-lux-elevated px-2 py-1"
                              onClick={() => void freezeUser(userId, signalId)}
                            >
                              동결
                            </button>
                            <button
                              type="button"
                              className="rounded px-2 py-1 text-lux-text-muted"
                              onClick={() => void unfreezeUser(userId, signalId)}
                            >
                              동결 해제
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
                              확인
                            </button>
                            <button
                              type="button"
                              className="rounded px-2 py-1 text-lux-text-muted"
                              onClick={() => void resolveSignal(signalId)}
                            >
                              종료
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
            <p className="mt-2 text-sm text-lux-text-muted">{actionNote}</p>
          ) : null}
        </section>
      ) : (

        <section
          className="mt-6"
          data-testid="risk-overview-panel"
          data-catalog-api={catalogApi}
          data-circuit-api={circuitApi}
        >
          <p className="text-sm text-lux-text-muted">§49.9 카탈로그와 돈 회로 상태 · 큐 조치는 동결 큐 탭</p>
          <p className="mt-2 text-xs text-lux-text-muted">API: {catalogApi}</p>
          <label className="mt-4 block text-sm" htmlFor="risk-circuit-reason">
            회로 닫기 사유
          </label>
          <textarea
            id="risk-circuit-reason"
            value={actionReason}
            onChange={(e) => setActionReason(e.target.value)}
            className="mt-1 w-full max-w-md rounded border border-lux-border bg-lux-bg px-2 py-1 text-sm"
          />
          {!circuit ? (
            <p className="mt-3 text-sm text-lux-text-muted">불러오는 중</p>
          ) : !circuit.ok ? (
            <AdminFetchNote failure={circuit.failure} />
          ) : (
            <div className="mt-3 text-sm">
              <p>
                돈 회로 <AdminTruth value={circuitLabel(circuit.data.open)} />
              </p>
              <p>
                사유 코드{" "}
                <AdminTruth value={readText(circuit.data.reasonCode)} />
              </p>
              <p>
                열림 시각{" "}
                <AdminTruth value={readText(circuit.data.openedAt)} />
              </p>
              {circuit.data.open === true ? (
                <button
                  type="button"
                  className="mt-2 rounded bg-lux-elevated px-2 py-1"
                  onClick={() => void closeCircuit()}
                >
                  회로 닫기
                </button>
              ) : null}
            </div>
          )}

          {!catalog ? (
            <p className="mt-3 text-sm text-lux-text-muted">규칙 불러오는 중</p>
          ) : !catalog.ok ? (
            <AdminFetchNote failure={catalog.failure} />
          ) : abuseRules.length === 0 && errorRules.length === 0 ? (
            <p className="mt-3 text-sm text-lux-text-muted">규칙 목록이 없습니다.</p>
          ) : (
            <div className="mt-4 space-y-3 text-sm">
              <h2 className="font-semibold">남용 규칙</h2>
              <ul className="space-y-1">
                {abuseRules.map((rule, idx) => (
                  <li key={readText(rule.code) ?? `abuse-${idx}`}>
                    <AdminTruth value={readText(rule.code)} />{" "}
                    <AdminTruth value={readText(rule.title)} />
                  </li>
                ))}
              </ul>
              <h2 className="font-semibold">오류 규칙</h2>
              <ul className="space-y-1">
                {errorRules.map((rule, idx) => (
                  <li key={readText(rule.code) ?? `error-${idx}`}>
                    <AdminTruth value={readText(rule.code)} />{" "}
                    <AdminTruth value={readText(rule.title)} />
                  </li>
                ))}
              </ul>
            </div>
          )}
          {actionNote && tab === "overview" ? (
            <p className="mt-2 text-sm text-lux-text-muted">{actionNote}</p>
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
