"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { T } from "@aipo/ui/copy/ko";
import { adminGet, type AdminFailure } from "../../lib/admin-api";
import { useAdminSessionRevision } from "../../lib/use-admin-session";
import { AdminFetchNote, AdminTruth } from "../../components/AdminTruth";

type PushState = { pushEnabled?: unknown };
type CircuitState = { open?: unknown };
type QueueState = { items?: unknown; moneyCircuitOpen?: unknown };
type CountState = { items?: unknown; total?: unknown };

type Tile =
  | { value: string | null; note?: string; tone?: "good" | "warning" }
  | { failure: AdminFailure };

function countItems(value: unknown): number | null {
  return Array.isArray(value) ? value.length : null;
}

function asCountTile(count: number | null, emptyNote: string, activeNote: string): Tile {
  if (count == null) return { value: null };
  return {
    value: `${count}건`,
    tone: count > 0 ? "warning" : "good",
    note: count > 0 ? activeNote : emptyNote,
  };
}

export default function Page() {
  const sessionRevision = useAdminSessionRevision();
  const [userCount, setUserCount] = useState<Tile | null>(null);
  const [riskQueue, setRiskQueue] = useState<Tile | null>(null);
  const [kycQueue, setKycQueue] = useState<Tile | null>(null);
  const [withdrawQueue, setWithdrawQueue] = useState<Tile | null>(null);
  const [supportQueue, setSupportQueue] = useState<Tile | null>(null);
  const [push, setPush] = useState<Tile | null>(null);
  const [circuit, setCircuit] = useState<Tile | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const [usersRes, riskRes, kycRes, withdrawRes, supportRes, pushRes, circuitRes] = await Promise.all([
        adminGet<CountState>("/api/v1/admin/users?limit=1&offset=0"),
        adminGet<QueueState>("/api/v1/admin/risk/queue"),
        adminGet<CountState>("/api/v1/admin/compliance/kyc?status=pending"),
        adminGet<CountState>("/api/v1/admin/wallet/withdrawals?status=auth_ok&limit=1&offset=0"),
        adminGet<CountState>("/api/v1/admin/wallet/deposit-disputes"),
        adminGet<PushState>("/api/v1/admin/system-control/push"),
        adminGet<CircuitState>("/api/v1/admin/risk/circuit"),
      ]);
      if (cancelled) return;

      setUserCount(
        usersRes.ok
          ? {
              value: typeof usersRes.data.total === "number" ? `${usersRes.data.total}명` : null,
              tone: "good",
              note: "회원 검색과 상세 확인이 가능합니다.",
            }
          : { failure: usersRes.failure },
      );
      setRiskQueue(
        riskRes.ok
          ? asCountTile(countItems(riskRes.data.items), "지금 확인할 의심 거래가 없습니다.", "의심 거래를 우선 확인해 주세요.")
          : { failure: riskRes.failure },
      );
      setKycQueue(
        kycRes.ok
          ? asCountTile(countItems(kycRes.data.items), "대기 중인 본인 확인이 없습니다.", "본인 확인 요청이 기다리고 있습니다.")
          : { failure: kycRes.failure },
      );
      setWithdrawQueue(
        withdrawRes.ok
          ? asCountTile(
              typeof withdrawRes.data.total === "number" ? withdrawRes.data.total : null,
              "확인할 출금 요청이 없습니다.",
              "본인 확인을 마친 출금 요청을 확인해 주세요.",
            )
          : { failure: withdrawRes.failure },
      );
      setSupportQueue(
        supportRes.ok
          ? asCountTile(countItems(supportRes.data.items), "확인할 입금 문의가 없습니다.", "입금 확인 문의가 기다리고 있습니다.")
          : { failure: supportRes.failure },
      );
      setPush(
        pushRes.ok
          ? typeof pushRes.data.pushEnabled === "boolean"
            ? {
                value: pushRes.data.pushEnabled ? T.admin.dashboard.on : T.admin.dashboard.off,
                tone: pushRes.data.pushEnabled ? "good" : "warning",
                note: pushRes.data.pushEnabled ? "알림 보내기가 정상입니다." : "알림 보내기가 멈춰 있습니다.",
              }
            : { value: null }
          : { failure: pushRes.failure },
      );
      setCircuit(
        circuitRes.ok
          ? typeof circuitRes.data.open === "boolean"
            ? {
                value: circuitRes.data.open ? T.admin.dashboard.paused : T.admin.dashboard.normal,
                tone: circuitRes.data.open ? "warning" : "good",
                note: circuitRes.data.open ? "돈 관련 흐름이 멈춰 있습니다." : "돈 관련 흐름이 정상입니다.",
              }
            : { value: null }
          : { failure: circuitRes.failure },
      );
    })();
    return () => {
      cancelled = true;
    };
  }, [sessionRevision]);

  return (
    <main className="p-6" data-testid="admin-dashboard">
      <header className="admin-dashboard-intro">
        <p className="admin-eyebrow">{T.admin.dashboard.eyebrow}</p>
        <h1>{T.admin.dashboard.title}</h1>
        <p>{T.admin.dashboard.description}</p>
        <p className="mt-2 text-xs text-lux-text-muted" data-truth="unavailable">
          정보를 불러오지 못한 값은 숫자 0으로 꾸미지 않고 “확인할 수 없음”으로 표시합니다.
        </p>
      </header>

      <section className="mt-6 rounded-2xl border border-lux-border p-4" aria-labelledby="admin-priority-title">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 id="admin-priority-title" className="text-lg font-bold">지금 먼저 확인할 일</h2>
            <p className="mt-1 text-sm text-lux-text-muted">실제 대기 건만 보여 드립니다. 없는 숫자를 0으로 꾸미지 않습니다.</p>
          </div>
          <span className="admin-status-chip" data-tone="good">실시간 운영 보기</span>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <ActionCard title="의심 거래" tile={riskQueue} href="/admin/risk?tab=queue" />
          <ActionCard title="본인 확인" tile={kycQueue} href="/admin/compliance?tab=kyc" />
          <ActionCard title="출금 확인" tile={withdrawQueue} href="/admin/wallet?tab=review" />
          <ActionCard title="입금 문의" tile={supportQueue} href="/admin/support?tab=queue" />
        </div>
      </section>

      <h2 className="mt-7 text-lg font-bold">서비스 상태</h2>
      <section className="admin-stat-grid mt-3" aria-label="서비스 상태">
        <div data-metric="user-count">
          <StatusCard title="전체 회원" tile={userCount} href="/admin/users" />
        </div>
        <StatusCard title="알림 보내기" tile={push} href="/admin/system-control" />
        <StatusCard title="돈 흐름" tile={circuit} href="/admin/risk?tab=overview" />
        <div className="admin-stat-card">
          <p className="admin-stat-label">운영 원칙</p>
          <p className="admin-stat-value text-base">확인된 정보만 표시</p>
          <p className="mt-2 text-xs text-lux-text-muted">준비되지 않은 값은 임의 숫자로 채우지 않습니다.</p>
        </div>
      </section>
    </main>
  );
}

function ActionCard({ title, tile, href }: { title: string; tile: Tile | null; href: string }) {
  return (
    <Link href={href} className="admin-stat-card block transition-transform hover:-translate-y-0.5">
      <p className="admin-stat-label">{title}</p>
      <div className="admin-stat-value">
        {!tile ? (
          <span>{T.admin.state.loading}</span>
        ) : "failure" in tile ? (
          <AdminFetchNote failure={tile.failure} />
        ) : (
          <AdminTruth value={tile.value} />
        )}
      </div>
      {tile && !("failure" in tile) && tile.note ? <p className="mt-2 text-xs text-lux-text-muted">{tile.note}</p> : null}
      <span className="mt-3 inline-block text-sm font-bold text-lux-accent">자세히 보기 →</span>
    </Link>
  );
}

function StatusCard({ title, tile, href }: { title: string; tile: Tile | null; href: string }) {
  return (
    <div className="admin-stat-card h-full">
      <div className="flex items-center justify-between gap-2">
        <p className="admin-stat-label">{title}</p>
        {tile && !("failure" in tile) ? (
          <span className="admin-status-chip" data-tone={tile.tone === "warning" ? "warn" : "good"}>
            {tile.tone === "warning" ? "확인 필요" : "정상"}
          </span>
        ) : null}
      </div>
      <div className="admin-stat-value">
        {!tile ? (
          <span>{T.admin.state.loading}</span>
        ) : "failure" in tile ? (
          <AdminFetchNote failure={tile.failure} />
        ) : (
          <AdminTruth value={tile.value} />
        )}
      </div>
      {tile && !("failure" in tile) && tile.note ? <p className="mt-2 text-xs text-lux-text-muted">{tile.note}</p> : null}
      <Link className="mt-3 inline-block text-sm font-bold text-lux-accent" href={href}>자세히 보기</Link>
    </div>
  );
}
