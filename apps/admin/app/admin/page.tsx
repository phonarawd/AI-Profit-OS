"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { T } from "@aipo/ui/copy/ko";
import { adminGet, type AdminFailure } from "../../lib/admin-api";
import { AdminFetchNote, AdminTruth } from "../../components/AdminTruth";

type PushState = { pushEnabled?: unknown };
type CircuitState = { open?: unknown };
type QueueState = { items?: unknown; moneyCircuitOpen?: unknown };

type Tile =
  | { key: string; value: string | null; note?: string; tone?: "good" | "warning" }
  | { key: string; failure: AdminFailure };

function asQueueCount(value: unknown): string | null {
  if (!Array.isArray(value)) return null;
  return `${value.length}건`;
}

function pushLabel(value: unknown): { value: string | null; tone?: "good" | "warning" } {
  if (typeof value !== "boolean") return { value: null };
  return value
    ? { value: T.admin.dashboard.on, tone: "good" }
    : { value: T.admin.dashboard.off, tone: "warning" };
}

function moneyFlowLabel(value: unknown): { value: string | null; tone?: "good" | "warning" } {
  if (typeof value !== "boolean") return { value: null };
  return value
    ? { value: T.admin.dashboard.paused, tone: "warning" }
    : { value: T.admin.dashboard.normal, tone: "good" };
}

const QUICK_ACTIONS = [
  { href: "/admin/risk?tab=queue", label: T.admin.dashboard.quickActions.suspicious },
  { href: "/admin/compliance?tab=kyc", label: T.admin.dashboard.quickActions.identity },
  { href: "/admin/wallet?tab=review", label: T.admin.dashboard.quickActions.money },
  { href: "/admin/support?tab=queue", label: T.admin.dashboard.quickActions.support },
] as const;

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

      if (pushRes.ok) {
        const pushState = pushLabel(pushRes.data.pushEnabled);
        setPush({ key: "kill-switch", ...pushState });
      } else {
        setPush({ key: "kill-switch", failure: pushRes.failure });
      }

      if (circuitRes.ok) {
        const circuitState = moneyFlowLabel(circuitRes.data.open);
        setCircuit({ key: "circuit", ...circuitState });
      } else {
        setCircuit({ key: "circuit", failure: circuitRes.failure });
      }

      setQueue(
        queueRes.ok
          ? {
              key: "queue",
              value: asQueueCount(queueRes.data.items),
              note:
                typeof queueRes.data.moneyCircuitOpen === "boolean"
                  ? queueRes.data.moneyCircuitOpen
                    ? "수익 진행이 멈춰 있습니다. 먼저 내용을 확인해 주세요."
                    : "수익 진행은 정상입니다."
                  : undefined,
              tone:
                Array.isArray(queueRes.data.items) && queueRes.data.items.length > 0
                  ? "warning"
                  : "good",
            }
          : { key: "queue", failure: queueRes.failure },
      );
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main data-testid="admin-dashboard">
      <header className="admin-dashboard-intro">
        <p className="admin-eyebrow">{T.admin.dashboard.eyebrow}</p>
        <h1>{T.admin.dashboard.title}</h1>
        <p>{T.admin.dashboard.description}</p>
      </header>

      <section className="admin-quick-panel" aria-labelledby="admin-quick-title">
        <div>
          <h2 id="admin-quick-title">{T.admin.dashboard.attentionTitle}</h2>
          <p>{T.admin.dashboard.attentionDescription}</p>
        </div>
        <div className="admin-quick-links">
          {QUICK_ACTIONS.map((action) => (
            <Link className="admin-quick-link" href={action.href} key={action.href}>
              <span>{action.label}</span>
              <span>{T.admin.dashboard.viewDetails}</span>
            </Link>
          ))}
        </div>
      </section>

      <h2 className="admin-dashboard-section-title">{T.admin.dashboard.statusTitle}</h2>
      <section className="admin-dashboard-grid" aria-label={T.admin.dashboard.statusTitle}>
        <article
          className="admin-status-card"
          data-metric="user-count"
          data-truth="unavailable"
        >
          <div className="admin-status-card-header">
            <h2>{T.admin.dashboard.userCount}</h2>
            <span className="admin-state-badge">정보 준비 중</span>
          </div>
          <p className="admin-status-card-value" data-testid="admin-user-count">
            <AdminTruth value={null} />
          </p>
          <p className="sr-only">확인할 수 없음</p>
          <p className="admin-status-card-note">
            {T.admin.dashboard.userCountUnavailable}
          </p>
          <Link className="admin-status-card-link" href="/admin/users">
            {T.admin.dashboard.viewDetails}
          </Link>
        </article>

        <MetricCard
          title={T.admin.dashboard.push}
          tile={push}
          testId="admin-kill-switch"
          api="/api/v1/admin/system-control/push"
          detailHref="/admin/system-control"
        />
        <MetricCard
          title={T.admin.dashboard.moneyFlow}
          tile={circuit}
          testId="admin-circuit"
          api="/api/v1/admin/risk/circuit"
          detailHref="/admin/risk?tab=overview"
        />
        <MetricCard
          title={T.admin.dashboard.queue}
          tile={queue}
          testId="admin-risk-queue"
          api="/api/v1/admin/risk/queue"
          detailHref="/admin/risk?tab=queue"
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
  detailHref,
}: {
  title: string;
  tile: Tile | null;
  testId: string;
  api: string;
  detailHref: string;
}) {
  const stateLabel =
    tile && !("failure" in tile) && tile.tone === "good"
      ? "확인됨"
      : tile && !("failure" in tile) && tile.tone === "warning"
        ? "확인 필요"
        : "정보 확인 중";

  return (
    <article className="admin-status-card" data-admin-api={api}>
      <div className="admin-status-card-header">
        <h2>{title}</h2>
        <span
          className="admin-state-badge"
          data-tone={tile && !("failure" in tile) ? tile.tone : undefined}
        >
          {stateLabel}
        </span>
      </div>
      <div className="admin-status-card-value" data-testid={testId}>
        {!tile ? (
          <span className="admin-truth-unavailable">{T.admin.state.loading}</span>
        ) : "failure" in tile ? (
          <AdminFetchNote failure={tile.failure} />
        ) : (
          <AdminTruth value={tile.value} />
        )}
      </div>
      {tile && !("failure" in tile) && tile.note ? (
        <p className="admin-status-card-note">{tile.note}</p>
      ) : null}
      <Link className="admin-status-card-link" href={detailHref}>
        {T.admin.dashboard.viewDetails}
      </Link>
    </article>
  );
}
