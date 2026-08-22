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
import { asRecordList, readText } from "../../../lib/admin-truth";
import { AdminFetchNote, AdminTruth } from "../../../components/AdminTruth";

const TABS = ["queue", "overview"] as const;
type RiskTab = (typeof TABS)[number];

const QUEUE_LABEL: Record<string, string> = {
  open: "대기",
  acked: "확인됨",
  resolved: "처리됨",
  auto_frozen: "자동 동결",
};

/**
 * Admin §9.1.1 / Money §49.9 — `/admin/risk?tab=queue`
 * Queue SoT = GET /api/v1/admin/risk/queue · freeze = POST .../users/:id/freeze
 */
function RiskContent() {
  const searchParams = useSearchParams();
  const tab = useMemo((): RiskTab => {
    const raw = searchParams.get("tab");
    if (raw && (TABS as readonly string[]).includes(raw)) {
      return raw as RiskTab;
    }
    return "queue";
  }, [searchParams]);

  const queueApi = "/api/v1/admin/risk/queue";
  const freezeApi = "/api/v1/admin/risk/users/:userId/freeze";
  const catalogApi = "/api/v1/admin/risk/catalog";

  const [queue, setQueue] = useState<AdminResult<{
    items?: unknown;
    moneyCircuitOpen?: unknown;
  }> | null>(null);
  const [catalog, setCatalog] = useState<AdminResult<{
    codes?: unknown;
    abuse?: unknown;
    errors?: unknown;
  }> | null>(null);
  const [circuit, setCircuit] = useState<AdminResult<{
    open?: unknown;
    reasonCode?: unknown;
  }> | null>(null);
  const [actionReason, setActionReason] = useState("");
  const [actionNote, setActionNote] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const [q, c, circ] = await Promise.all([
        adminGet<{ items?: unknown; moneyCircuitOpen?: unknown }>(queueApi),
        adminGet<{ codes?: unknown; abuse?: unknown; errors?: unknown }>(
          catalogApi,
        ),
        adminGet<{ open?: unknown; reasonCode?: unknown }>(
          "/api/v1/admin/risk/circuit",
        ),
      ]);
      if (cancelled) return;
      setQueue(q);
      setCatalog(c);
      setCircuit(circ);
    })();
    return () => {
      cancelled = true;
    };
  }, [queueApi, catalogApi]);

  async function reloadQueue() {
    setQueue(await adminGet(queueApi));
    setCircuit(await adminGet("/api/v1/admin/risk/circuit"));
  }

  async function mutate(
    path: string,
    extra?: Record<string, unknown>,
    minReason = 0,
  ) {
    if (minReason > 0 && actionReason.trim().length < minReason) {
      setActionNote(`사유는 ${minReason}자 이상이어야 합니다.`);
      return;
    }
    if (!window.confirm("이 조치를 실행할까요?")) return;
    const res = await adminSend(path, "POST", {
      idempotencyKey: newIdempotencyKey(),
      reason: actionReason.trim() || undefined,
      ...extra,
    });
    setActionNote(res.ok ? "반영했습니다." : "반영하지 못했습니다.");
    if (res.ok) await reloadQueue();
  }

  const items = queue?.ok ? asRecordList(queue.data.items ?? queue.data) : null;
  const codes = catalog?.ok
    ? Array.isArray(catalog.data.codes)
      ? catalog.data.codes.filter((c): c is string => typeof c === "string")
      : null
    : null;

  return (
    <main
      className="p-6 text-lux-text"
      data-admin-risk-tab={tab}
      data-testid="admin-risk"
    >
      <h1 className="text-xl font-semibold">사기·이상 거래 방지</h1>
      <p className="mt-2 text-sm text-lux-text-muted">
        서버 신호만 표시합니다. 없는 점수·심각도는 만들지 않습니다.
      </p>
      <nav
        className="mt-4 flex flex-wrap gap-2 text-sm"
        data-testid="risk-tabs"
      >
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
            {t === "queue" ? "동결 큐" : "개요"}
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
          data-forbid="fake-risk-truth"
        >
          <p className="text-sm text-lux-text-muted">
            룰 신호 · 동결 · 돈 회로 · 잔액은 분개 오너만
          </p>
          <p className="mt-2 text-sm">
            돈 회로{" "}
            {!circuit ? (
              <span className="text-lux-text-muted">불러오는 중</span>
            ) : !circuit.ok ? (
              <AdminFetchNote failure={circuit.failure} />
            ) : (
              <AdminTruth
                value={
                  typeof circuit.data.open === "boolean"
                    ? circuit.data.open
                      ? "열림"
                      : "닫힘"
                    : null
                }
                testId="risk-circuit"
              />
            )}
          </p>
          {circuit?.ok && circuit.data.open === true ? (
            <button
              type="button"
              className="mt-2 rounded bg-lux-elevated px-2 py-1 text-sm"
              onClick={() =>
                void mutate("/api/v1/admin/risk/circuit/close", {}, 10)
              }
            >
              회로 닫기
            </button>
          ) : null}

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
          ) : items == null ? (
            <AdminTruth value={null} testId="risk-queue-list" />
          ) : items.length === 0 ? (
            <p className="mt-3 text-sm text-lux-text-muted" data-testid="risk-queue-empty">
              대기 신호가 없습니다.
            </p>
          ) : (
            <ul className="mt-3 space-y-3" data-testid="risk-queue-list">
              {items.map((item, idx) => {
                const id = readText(item.id);
                const userId = readText(item.userId);
                const queueStatus = readText(item.queueStatus);
                return (
                  <li
                    key={id ?? String(idx)}
                    className="rounded border border-lux-border p-3 text-sm"
                  >
                    <p>
                      규칙 <AdminTruth value={readText(item.ruleCode)} />
                    </p>
                    <p>
                      심각도 <AdminTruth value={readText(item.severity)} />
                    </p>
                    <p>
                      상태{" "}
                      <AdminTruth
                        value={
                          queueStatus
                            ? (QUEUE_LABEL[queueStatus] ?? queueStatus)
                            : null
                        }
                      />
                    </p>
                    <p>
                      회원 <AdminTruth value={userId} />
                    </p>
                    <p>
                      동결 연결{" "}
                      <AdminTruth
                        value={
                          typeof item.freezeLinked === "boolean"
                            ? item.freezeLinked
                              ? "연결됨"
                              : "없음"
                            : null
                        }
                      />
                    </p>
                    {id || userId ? (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {id ? (
                          <>
                            <button
                              type="button"
                              className="rounded px-2 py-1 text-lux-text-muted"
                              onClick={() =>
                                void mutate(
                                  `/api/v1/admin/risk/signals/${id}/ack`,
                                )
                              }
                            >
                              확인
                            </button>
                            <button
                              type="button"
                              className="rounded px-2 py-1 text-lux-text-muted"
                              onClick={() =>
                                void mutate(
                                  `/api/v1/admin/risk/signals/${id}/resolve`,
                                  {},
                                  10,
                                )
                              }
                            >
                              처리
                            </button>
                          </>
                        ) : null}
                        {userId ? (
                          <>
                            <button
                              type="button"
                              className="rounded bg-lux-elevated px-2 py-1"
                              onClick={() =>
                                void mutate(
                                  `/api/v1/admin/risk/users/${userId}/freeze`,
                                  { signalId: id ?? undefined },
                                  10,
                                )
                              }
                            >
                              동결
                            </button>
                            <button
                              type="button"
                              className="rounded px-2 py-1 text-lux-text-muted"
                              onClick={() =>
                                void mutate(
                                  `/api/v1/admin/risk/users/${userId}/unfreeze`,
                                  { signalId: id ?? undefined },
                                )
                              }
                            >
                              해제
                            </button>
                          </>
                        ) : null}
                      </div>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          )}
          {actionNote ? (
            <p className="mt-2 text-sm text-lux-text-muted">{actionNote}</p>
          ) : null}
        </section>
      ) : (
        <section className="mt-6 space-y-3" data-testid="risk-overview-panel">
          <p className="text-sm text-lux-text-muted">
            규칙 목록은 서버 카탈로그만. 임의 점수 없음.
          </p>
          {!catalog ? (
            <p className="text-sm text-lux-text-muted">불러오는 중</p>
          ) : !catalog.ok ? (
            <AdminFetchNote failure={catalog.failure} />
          ) : codes == null ? (
            <AdminTruth value={null} testId="risk-catalog" />
          ) : codes.length === 0 ? (
            <p className="text-sm text-lux-text-muted">규칙이 없습니다.</p>
          ) : (
            <p className="text-sm" data-testid="risk-catalog">
              {codes.join(" · ")}
            </p>
          )}
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
