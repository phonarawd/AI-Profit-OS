"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { SearchParamsBoundary } from "@aipo/ui/components/SearchParamsBoundary";
import {
  adminGet,
  adminSend,
  type AdminResult,
} from "../../../lib/admin-api";
import { asRecordList, readText } from "../../../lib/admin-truth";
import { AdminFetchNote, AdminTruth } from "../../../components/AdminTruth";

const TABS = ["circuit", "reserve"] as const;
type SystemTab = (typeof TABS)[number];

const TAB_LABEL: Record<SystemTab, string> = {
  circuit: "긴급 정지",
  reserve: "운영 준비금",
};

const PUSH_SOURCE_LABEL: Record<string, string> = {
  env: "환경값",
  memory: "이 서버",
  db: "저장값",
  default: "기본값",
};

const PUSH_API = "/api/v1/admin/system-control/push";
const CIRCUIT_API = "/api/v1/admin/risk/circuit";
const RESERVE_API = "/api/v1/admin/system-control/reserve";
const RESERVE_AUDIT_API = "/api/v1/admin/system-control/reserve/audit";
const SWITCH_CATALOG_API = "/api/v1/admin/system-control/switches";

type PushState = {
  pushEnabled?: unknown;
  source?: unknown;
};

type CircuitState = {
  open?: unknown;
  reasonCode?: unknown;
};

type ReserveState = {
  accountCode?: unknown;
  targetUsdt?: unknown;
  isSet?: unknown;
  balanceUsdt?: unknown;
  changeReason?: unknown;
  updatedAt?: unknown;
};

/**
 * Admin §9.1.1 · REL-213
 * `/admin/system-control` — existing push/reserve/circuit owners only.
 * REL-406 9종 카탈로그가 없으면 unavailable. money circuit 직접 편집 0.
 */
function SystemControlContent() {
  const searchParams = useSearchParams();
  const tab = useMemo((): SystemTab => {
    const raw = searchParams.get("tab");
    if (raw === "reserve") return "reserve";
    return "circuit";
  }, [searchParams]);

  const [push, setPush] = useState<AdminResult<PushState> | null>(null);
  const [circuit, setCircuit] = useState<AdminResult<CircuitState> | null>(null);
  const [switches, setSwitches] = useState<AdminResult<unknown> | null>(null);
  const [reserve, setReserve] = useState<AdminResult<ReserveState> | null>(null);
  const [reserveAudit, setReserveAudit] = useState<AdminResult<unknown> | null>(
    null,
  );
  const [pushReason, setPushReason] = useState("");
  const [reserveTarget, setReserveTarget] = useState("");
  const [reserveReason, setReserveReason] = useState("");
  const [actionNote, setActionNote] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const [p, c, s] = await Promise.all([
        adminGet<PushState>(PUSH_API),
        adminGet<CircuitState>(CIRCUIT_API),
        adminGet<unknown>(SWITCH_CATALOG_API),
      ]);
      if (cancelled) return;
      setPush(p);
      setCircuit(c);
      setSwitches(s);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (tab !== "reserve") return;
    let cancelled = false;
    void (async () => {
      const [r, a] = await Promise.all([
        adminGet<ReserveState>(RESERVE_API),
        adminGet<unknown>(RESERVE_AUDIT_API),
      ]);
      if (cancelled) return;
      setReserve(r);
      setReserveAudit(a);
    })();
    return () => {
      cancelled = true;
    };
  }, [tab]);

  async function applyPush(nextEnabled: boolean) {
    if (pushReason.trim().length < 10) {
      setActionNote("사유는 10자 이상이어야 합니다.");
      return;
    }
    const preview = nextEnabled ? "알림 발송을 켭니다." : "알림 발송을 멈춥니다.";
    if (!window.confirm(`${preview} 적용할까요?`)) return;
    const res = await adminSend<PushState>(PUSH_API, "PUT", {
      pushEnabled: nextEnabled,
      reason: pushReason.trim(),
    });
    setActionNote(res.ok ? "반영했습니다." : "반영하지 못했습니다.");
    if (res.ok) setPush(res);
  }

  async function applyReserve() {
    if (reserveReason.trim().length < 4) {
      setActionNote("변경 사유는 4자 이상이어야 합니다.");
      return;
    }
    const target = reserveTarget.trim();
    if (!target) {
      setActionNote("목표 금액을 서버에 보낼 값이 없습니다.");
      return;
    }
    if (!window.confirm(`운영 준비금 목표를 ${target} USDT로 바꿀까요?`)) {
      return;
    }
    const res = await adminSend<ReserveState>(RESERVE_API, "PUT", {
      targetUsdt: target,
      changeReason: reserveReason.trim(),
    });
    setActionNote(res.ok ? "반영했습니다." : "반영하지 못했습니다.");
    if (res.ok) {
      setReserve(res);
      setReserveAudit(await adminGet(RESERVE_AUDIT_API));
    }
  }

  const reserveItems = reserveAudit?.ok
    ? asRecordList(reserveAudit.data)
    : null;
  const switchItems = switches?.ok ? asRecordList(switches.data) : null;

  return (
    <main
      className="p-6 text-lux-text"
      data-canon="admin-system-control"
      data-testid="admin-system-control"
      data-admin-system-control-tab={tab}
      data-forbid="fake-system-state"
    >
      <h1 className="text-xl font-semibold">긴급 정지</h1>
      <p className="mt-2 text-sm text-lux-text-muted">
        서버가 알려 준 상태만 봅니다. 화면에서 켜짐·정상으로 만들지 않습니다.
      </p>
      <p className="mt-1 text-xs text-lux-text-muted">
        잔액 수정 없음 · 돈 회로 직접 조작 없음
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
                : `/admin/system-control?tab=${t}`
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

      {tab === "circuit" ? (
        <section
          className="mt-6 space-y-6"
          data-testid="system-control-circuit-panel"
        >
          <div
            className="rounded border border-lux-border p-3"
            data-testid="system-control-push"
            data-push-api={PUSH_API}
          >
            <h2 className="text-base font-medium">알림 긴급 정지</h2>
            <p className="mt-1 text-sm text-lux-text-muted">
              서버 알림 발송 스위치. 미리보기 후 확인해야 바뀝니다.
            </p>
            {!push ? (
              <p className="mt-3 text-sm text-lux-text-muted">불러오는 중</p>
            ) : !push.ok ? (
              <AdminFetchNote failure={push.failure} />
            ) : (
              <>
                <p className="mt-3 text-sm">
                  발송{" "}
                  <AdminTruth
                    value={
                      typeof push.data.pushEnabled === "boolean"
                        ? push.data.pushEnabled
                          ? "켜짐"
                          : "꺼짐"
                        : null
                    }
                    testId="system-control-push-state"
                  />
                </p>
                <p className="text-sm">
                  출처{" "}
                  <AdminTruth
                    value={
                      typeof push.data.source === "string"
                        ? (PUSH_SOURCE_LABEL[push.data.source] ??
                          push.data.source)
                        : null
                    }
                  />
                </p>
                <label className="mt-3 block text-sm" htmlFor="push-reason">
                  변경 사유
                </label>
                <textarea
                  id="push-reason"
                  value={pushReason}
                  onChange={(e) => setPushReason(e.target.value)}
                  className="mt-1 w-full max-w-md rounded border border-lux-border bg-lux-bg px-2 py-1 text-sm"
                />
                <div className="mt-2 flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="rounded bg-lux-elevated px-2 py-1 text-sm"
                    data-action="push-disable"
                    onClick={() => void applyPush(false)}
                  >
                    발송 멈추기
                  </button>
                  <button
                    type="button"
                    className="rounded px-2 py-1 text-sm text-lux-text-muted"
                    data-action="push-enable"
                    onClick={() => void applyPush(true)}
                  >
                    발송 켜기
                  </button>
                </div>
              </>
            )}
          </div>

          <div
            className="rounded border border-lux-border p-3"
            data-testid="system-control-circuit-readonly"
            data-circuit-api={CIRCUIT_API}
            data-forbid="money-circuit-edit"
          >
            <h2 className="text-base font-medium">돈 회로</h2>
            <p className="mt-1 text-sm text-lux-text-muted">
              읽기만 합니다. 닫기·열기는 사기·이상 거래 방지에서 합니다.
            </p>
            {!circuit ? (
              <p className="mt-3 text-sm text-lux-text-muted">불러오는 중</p>
            ) : !circuit.ok ? (
              <AdminFetchNote failure={circuit.failure} />
            ) : (
              <>
                <p className="mt-3 text-sm">
                  상태{" "}
                  <AdminTruth
                    value={
                      typeof circuit.data.open === "boolean"
                        ? circuit.data.open
                          ? "열림"
                          : "닫힘"
                        : null
                    }
                    testId="system-control-circuit-state"
                  />
                </p>
                <p className="text-sm">
                  이유 <AdminTruth value={readText(circuit.data.reasonCode)} />
                </p>
              </>
            )}
            <a
              href="/admin/risk?tab=queue"
              className="mt-2 inline-block text-sm text-lux-text-muted underline"
            >
              사기·이상 거래 방지에서 다루기
            </a>
          </div>

          <div
            className="rounded border border-lux-border p-3"
            data-testid="system-control-switch-catalog"
            data-switches-api={SWITCH_CATALOG_API}
            data-forbid="invented-kill-switch"
          >
            <h2 className="text-base font-medium">치명 스위치 목록</h2>
            <p className="mt-1 text-sm text-lux-text-muted">
              서버가 준 목록만 표시합니다. 없는 스위치를 켜짐으로 만들지
              않습니다.
            </p>
            {!switches ? (
              <p className="mt-3 text-sm text-lux-text-muted">불러오는 중</p>
            ) : !switches.ok ? (
              <AdminFetchNote failure={switches.failure} />
            ) : switchItems == null ? (
              <AdminTruth value={null} testId="system-control-switches" />
            ) : switchItems.length === 0 ? (
              <p
                className="mt-3 text-sm text-lux-text-muted"
                data-testid="system-control-switches-empty"
              >
                목록 없음
              </p>
            ) : (
              <ul className="mt-3 space-y-2 text-sm" data-testid="system-control-switches">
                {switchItems.map((row, idx) => (
                  <li key={readText(row.id) ?? String(idx)}>
                    <AdminTruth value={readText(row.id)} />
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      ) : (
        <section
          className="mt-6 space-y-4"
          data-testid="system-control-reserve-panel"
          data-surface="admin-system-control-reserve"
          data-account-code="ops.platform_reserve_usdt"
          data-get-api={RESERVE_API}
          data-put-api={RESERVE_API}
          data-audit-api={RESERVE_AUDIT_API}
          data-s2-input="true"
        >
          <p className="text-sm text-lux-text-muted">
            운영 준비금 목표만 바꿉니다. 장부 잔액을 이 화면에서 고치지
            않습니다.
          </p>
          {!reserve ? (
            <p className="text-sm text-lux-text-muted">불러오는 중</p>
          ) : !reserve.ok ? (
            <AdminFetchNote failure={reserve.failure} />
          ) : (
            <div className="space-y-2 text-sm">
              <p>
                설정{" "}
                <AdminTruth
                  value={
                    typeof reserve.data.isSet === "boolean"
                      ? reserve.data.isSet
                        ? "있음"
                        : "없음"
                      : null
                  }
                  testId="system-control-reserve-set"
                />
              </p>
              <p>
                목표{" "}
                <AdminTruth
                  value={
                    reserve.data.isSet === true
                      ? readText(reserve.data.targetUsdt)
                      : null
                  }
                  testId="system-control-reserve-target"
                />
              </p>
              <p>
                장부 잔액{" "}
                <AdminTruth
                  value={readText(reserve.data.balanceUsdt)}
                  testId="system-control-reserve-balance"
                />
              </p>
              <p>
                최근 사유{" "}
                <AdminTruth value={readText(reserve.data.changeReason)} />
              </p>
              <label className="mt-3 block" htmlFor="reserve-target">
                새 목표 (USDT)
              </label>
              <input
                id="reserve-target"
                value={reserveTarget}
                onChange={(e) => setReserveTarget(e.target.value)}
                className="mt-1 w-full max-w-md rounded border border-lux-border bg-lux-bg px-2 py-1"
              />
              <label className="mt-3 block" htmlFor="reserve-reason">
                변경 사유
              </label>
              <textarea
                id="reserve-reason"
                value={reserveReason}
                onChange={(e) => setReserveReason(e.target.value)}
                className="mt-1 w-full max-w-md rounded border border-lux-border bg-lux-bg px-2 py-1"
              />
              <button
                type="button"
                className="mt-2 rounded bg-lux-elevated px-2 py-1"
                data-action="reserve-put"
                onClick={() => void applyReserve()}
              >
                미리보기 후 적용
              </button>
            </div>
          )}

          <div data-field="audit" data-testid="system-control-reserve-audit">
            <p className="font-medium text-sm">변경 기록</p>
            {!reserveAudit ? (
              <p className="mt-2 text-sm text-lux-text-muted">불러오는 중</p>
            ) : !reserveAudit.ok ? (
              <AdminFetchNote failure={reserveAudit.failure} />
            ) : reserveItems == null ? (
              <AdminTruth value={null} testId="system-control-reserve-audit-list" />
            ) : reserveItems.length === 0 ? (
              <p
                className="mt-2 text-sm text-lux-text-muted"
                data-testid="system-control-reserve-audit-empty"
              >
                기록 없음
              </p>
            ) : (
              <ul
                className="mt-2 space-y-2 text-sm"
                data-testid="system-control-reserve-audit-list"
              >
                {reserveItems.map((row, idx) => (
                  <li
                    key={readText(row.id) ?? String(idx)}
                    className="rounded border border-lux-border p-2"
                  >
                    <p>
                      시각{" "}
                      <AdminTruth
                        value={readText(row.createdAt ?? row.created_at)}
                      />
                    </p>
                    <p>
                      사유{" "}
                      <AdminTruth
                        value={readText(row.changeReason ?? row.change_reason)}
                      />
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      )}

      {actionNote ? (
        <p className="mt-4 text-sm text-lux-text-muted">{actionNote}</p>
      ) : null}
    </main>
  );
}

export default function Page() {
  return (
    <SearchParamsBoundary>
      <SystemControlContent />
    </SearchParamsBoundary>
  );
}
