"use client";

import { useEffect, useState } from "react";
import { adminGet, type AdminFailure } from "../../lib/admin-api";
import { readText } from "../../lib/admin-truth";
import { AdminFetchNote, AdminTruth } from "../../components/AdminTruth";

type PushState = { pushEnabled?: unknown };
type CircuitState = { open?: unknown };
type QueueState = { items?: unknown; moneyCircuitOpen?: unknown };

type Tile =
  | { key: string; label: string; value: string | null; note?: string }
  | { key: string; label: string; failure: AdminFailure };

function asListLength(value: unknown): string | null {
  if (!Array.isArray(value)) return null;
  return String(value.length);
}

export default function Page() {
  const [push, setPush] = useState<Tile | null>(null);
  const [circuit, setCircuit] = useState<Tile | null>(null);
  const [queue, setQueue] = useState<Tile | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const [pushRes, circuitRes, queueRes] = await Promise.all([
        adminGet<PushState>("/api/v1/admin/system-control/push"),
        adminGet<CircuitState>("/api/v1/admin/risk/circuit"),
        adminGet<QueueState>("/api/v1/admin/risk/queue"),
      ]);
      if (cancelled) return;
      setPush(
        pushRes.ok
          ? {
              key: "kill-switch",
              label: "알림 긴급 정지",
              value: readText(pushRes.data.pushEnabled),
            }
          : { key: "kill-switch", label: "알림 긴급 정지", failure: pushRes.failure },
      );
      setCircuit(
        circuitRes.ok
          ? {
              key: "circuit",
              label: "돈 회로",
              value:
                typeof circuitRes.data.open === "boolean"
                  ? circuitRes.data.open
                    ? "열림"
                    : "닫힘"
                  : null,
            }
          : { key: "circuit", label: "돈 회로", failure: circuitRes.failure },
      );
      setQueue(
        queueRes.ok
          ? {
              key: "queue",
              label: "이상 거래 대기",
              value: asListLength(queueRes.data.items),
              note:
                typeof queueRes.data.moneyCircuitOpen === "boolean"
                  ? queueRes.data.moneyCircuitOpen
                    ? "돈 회로 열림"
                    : "돈 회로 닫힘"
                  : undefined,
            }
          : { key: "queue", label: "이상 거래 대기", failure: queueRes.failure },
      );
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main className="p-6 text-lux-text" data-testid="admin-dashboard">
      <h1 className="text-xl font-semibold">한눈에 보기</h1>
      <p className="mt-2 text-sm text-lux-text-muted">
        있는 운영 상태만 표시합니다. 없는 숫자는 0으로 채우지 않습니다.
      </p>

      <section className="mt-6 grid gap-4 md:grid-cols-2">
        <article
          className="rounded border border-lux-border p-4"
          data-metric="user-count"
          data-truth="unavailable"
        >
          <h2 className="text-sm text-lux-text-muted">회원 수</h2>
          <p className="mt-2 text-lg" data-testid="admin-user-count">
            <AdminTruth value={null} />
          </p>
          <p className="sr-only">확인할 수 없음</p>
          <p className="mt-1 text-xs text-lux-text-muted">
            전체 회원 목록 경로가 없습니다.
          </p>
        </article>

        <MetricCard
          title="알림 긴급 정지"
          tile={push}
          testId="admin-kill-switch"
          api="/api/v1/admin/system-control/push"
        />
        <MetricCard
          title="돈 회로"
          tile={circuit}
          testId="admin-circuit"
          api="/api/v1/admin/risk/circuit"
        />
        <MetricCard
          title="이상 거래 대기"
          tile={queue}
          testId="admin-risk-queue"
          api="/api/v1/admin/risk/queue"
        />
      </section>
    </main>
  );
}

function MetricCard({
  title,
  tile,
  testId,
  api,
}: {
  title: string;
  tile: Tile | null;
  testId: string;
  api: string;
}) {
  return (
    <article
      className="rounded border border-lux-border p-4"
      data-admin-api={api}
    >
      <h2 className="text-sm text-lux-text-muted">{title}</h2>
      <div className="mt-2 text-lg" data-testid={testId}>
        {!tile ? (
          <span className="text-lux-text-muted">불러오는 중</span>
        ) : "failure" in tile ? (
          <AdminFetchNote failure={tile.failure} />
        ) : (
          <>
            <AdminTruth value={tile.value} />
            {tile.note ? (
              <p className="mt-1 text-xs text-lux-text-muted">{tile.note}</p>
            ) : null}
          </>
        )}
      </div>
    </article>
  );
}
