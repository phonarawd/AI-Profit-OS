"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { SearchParamsBoundary } from "@aipo/ui/components/SearchParamsBoundary";
import { TaxDisclaimerBlock } from "@aipo/ui/components/trust";
import { T } from "@aipo/ui/copy/ko";
import { adminGet, type AdminResult } from "../../../lib/admin-api";
import { formatUsdt, readText } from "../../../lib/admin-truth";
import { useAdminSessionRevision } from "../../../lib/use-admin-session";
import { AdminFetchNote, AdminTruth } from "../../../components/AdminTruth";

const TABS = [
  "simulation",
  "referral",
  "notices",
  "campaigns",
  "missions",
  "share",
  "content",
  "deposit",
  "whale",
  "ticker",
  "partners",
] as const;
type GrowthTab = (typeof TABS)[number];

const ACTIVE_TABS = ["simulation", "referral", "content"] as const;
const PLANNED_TABS = TABS.filter(
  (tab): tab is Exclude<GrowthTab, (typeof ACTIVE_TABS)[number]> =>
    !(ACTIVE_TABS as readonly string[]).includes(tab),
);

function enabledLabel(value: unknown): string | null {
  if (value === true) return "사용 중";
  if (value === false) return "멈춤";
  return readText(value);
}

const TAB_LABEL: Record<GrowthTab, string> = {
  simulation: "시작 전 점검",
  referral: "친구 초대",
  notices: "공지",
  campaigns: "행사",
  missions: "혜택 받는 할 일",
  share: "공유 안내",
  content: "안내 문구",
  deposit: "입금 안내",
  whale: "고액 회원",
  ticker: "활동 소식",
  partners: "공식 가격 제공처",
};

const SIM_GATES = [
  {
    id: "S1",
    label: "화면 표시 정확도",
    rule: "회원 화면의 금액과 안내가 실제 정보와 모두 같아야 합니다",
    fail: "회원에게 공개하지 않음",
  },
  {
    id: "S2",
    label: "운영 준비금 확인",
    rule: "한 번의 최대 지출이 운영 준비금의 10% 이하여야 합니다",
    fail: "관리자에게 알림",
  },
  {
    id: "S3",
    label: "수익을 실제로 지급할 수 있는지",
    rule: "지급 가능 점수가 85점 이상이어야 합니다",
    fail: "회원 화면에 표시하지 않음",
  },
  {
    id: "S4",
    label: "상품을 연결하지 못한 비율",
    rule: "연결하지 못한 상품이 15% 이하여야 합니다",
    fail: "가격 확인 알림",
  },
] as const;

function GrowthContent() {
  const searchParams = useSearchParams();
  const sessionRevision = useAdminSessionRevision();
  const tab = useMemo((): GrowthTab => {
    const raw = searchParams.get("tab");
    if (raw && (TABS as readonly string[]).includes(raw)) return raw as GrowthTab;
    return "simulation";
  }, [searchParams]);

  const programApi = "/api/v1/admin/growth/referral/program";
  const poolApi = "/api/v1/admin/growth/referral/pool";
  const holdQueueApi = "/api/v1/admin/growth/referral/hold-queue";
  const topUpApi = "/api/v1/admin/growth/referral/pool/top-up";
  const accrualHaltApi = "/api/v1/admin/growth/referral/accrual-halt";
  const simRunApi = "/api/v1/admin/simulation/run";
  const simLatestApi = "/api/v1/admin/simulation/latest";
  const simGrowthGateApi = "/api/v1/admin/simulation/growth-gate";
  const growthEnabledApi = "/api/v1/admin/growth/enabled";

  const [simLatest, setSimLatest] = useState<AdminResult<unknown> | null>(null);
  const [program, setProgram] = useState<AdminResult<unknown> | null>(null);
  const [pool, setPool] = useState<AdminResult<unknown> | null>(null);
  const [hold, setHold] = useState<AdminResult<unknown> | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      if (tab === "simulation") {
        const next = await adminGet<unknown>(simLatestApi);
        if (!cancelled) setSimLatest(next);
        return;
      }
      if (tab === "referral") {
        const [p, o, h] = await Promise.all([
          adminGet<unknown>(programApi),
          adminGet<unknown>(poolApi),
          adminGet<unknown>(holdQueueApi),
        ]);
        if (cancelled) return;
        setProgram(p);
        setPool(o);
        setHold(h);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [programApi, poolApi, holdQueueApi, sessionRevision, simLatestApi, tab]);

  const planned = !(ACTIVE_TABS as readonly string[]).includes(tab);

  return (
    <main className="p-6 text-lux-text" data-admin-growth-tab={tab} data-testid="admin-growth-page">
      <p className="admin-eyebrow">성장·혜택 운영</p>
      <h1 className="mt-1 text-3xl font-extrabold tracking-tight">{T.admin.navigation.growth}</h1>
      <p className="mt-2 max-w-3xl text-sm text-lux-text-muted">
        지금 실제로 운영 가능한 기능과 아직 준비 중인 기능을 명확히 나눕니다. 준비되지 않은 메뉴를 동작하는 기능처럼 보여 주지 않습니다.
      </p>

      <nav className="mt-5 flex flex-wrap gap-2 text-sm" data-testid="growth-tabs" aria-label="실제 운영 가능한 혜택 메뉴">
        {ACTIVE_TABS.map((t) => (
          <a
            key={t}
            href={`/admin/growth?tab=${t}`}
            data-tab={t}
            className={
              tab === t
                ? "rounded-xl border border-lux-border bg-lux-elevated px-3 py-2 font-bold text-lux-accent"
                : "rounded-xl border border-transparent px-3 py-2 text-lux-text-muted"
            }
          >
            {TAB_LABEL[t]}
          </a>
        ))}
      </nav>

      {planned ? (
        <section className="mt-6 rounded-2xl border border-lux-border p-5" data-testid={`growth-${tab}-panel`} data-admin-api="none">
          <span className="admin-status-chip">준비 중</span>
          <h2 className="mt-3 text-lg font-bold">{TAB_LABEL[tab]}</h2>
          <p className="mt-2 text-sm text-lux-text-muted">
            이 기능은 아직 실제 운영 API가 연결되지 않았습니다. 준비되기 전에는 관리자에게 실행 가능한 기능처럼 표시하지 않습니다.
          </p>
          <a href="/admin/growth?tab=simulation" className="mt-4 inline-block font-bold text-lux-accent">실제 운영 메뉴로 돌아가기</a>
        </section>
      ) : tab === "simulation" ? (
        <section className="mt-6 rounded-2xl border border-lux-border p-5" data-testid="growth-simulation-panel" data-surface="admin-growth-simulation" data-run-api={simRunApi} data-latest-api={simLatestApi} data-growth-gate-api={simGrowthGateApi} data-growth-enabled-api={growthEnabledApi}>
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold">혜택·행사 시작 전 안전 점검</h2>
              <p className="mt-1 text-sm text-lux-text-muted">최근 24시간 안의 안전 점검 통과와 운영 준비금 설정이 있어야 시작할 수 있습니다.</p>
            </div>
            {!simLatest ? <span className="admin-status-chip">확인 중</span> : !simLatest.ok ? <span className="admin-status-chip" data-tone="warn">연결 확인 필요</span> : <span className="admin-status-chip" data-tone={(simLatest.data as { pass?: unknown }).pass === true ? "good" : "warn"}>{(simLatest.data as { pass?: unknown }).pass === true ? "최근 점검 통과" : "확인 필요"}</span>}
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {SIM_GATES.map((gate) => (
              <div key={gate.id} data-gate={gate.id} data-field={gate.id === "S4" ? "adapterMatchFailureRate" : undefined} className="admin-stat-card">
                <div className="flex items-center justify-between gap-2"><strong>{gate.label}</strong><span className="admin-status-chip">{gate.id}</span></div>
                <p className="mt-2 text-sm text-lux-text-muted">{gate.rule}</p>
                <p className="mt-2 text-xs text-lux-text-muted">기준 미달 시: {gate.fail}</p>
              </div>
            ))}
          </div>

          {!simLatest ? (
            <p className="mt-4 text-sm text-lux-text-muted">{T.admin.state.loading}</p>
          ) : !simLatest.ok ? (
            <div className="mt-4"><AdminFetchNote failure={simLatest.failure} /></div>
          ) : null}
        </section>
      ) : tab === "referral" ? (
        <section className="mt-6 rounded-2xl border border-lux-border p-5" data-testid="growth-referral-panel" data-program-api={programApi} data-pool-api={poolApi} data-hold-queue-api={holdQueueApi} data-top-up-api={topUpApi} data-accrual-halt-api={accrualHaltApi} data-rewards-enabled-default="false" data-invite-cap-ui="0" data-forbid-monthly-invite-cap="true">
          <h2 className="text-lg font-bold">친구 초대 혜택</h2>
          <p className="mt-1 text-sm text-lux-text-muted">친구 초대 횟수는 제한하지 않습니다. 예산 부족이나 의심 활동이 있으면 혜택 지급만 안전하게 보류합니다.</p>
          {!program ? (
            <p className="mt-4 text-sm text-lux-text-muted">{T.admin.state.loading}</p>
          ) : !program.ok ? (
            <div className="mt-4"><AdminFetchNote failure={program.failure} /></div>
          ) : (
            <div className="admin-stat-grid mt-4">
              <div className="admin-stat-card"><p className="admin-stat-label">초대 혜택</p><p className="admin-stat-value text-base"><AdminTruth value={enabledLabel((program.data as { rewardsEnabled?: unknown }).rewardsEnabled)} /></p></div>
              <div className="admin-stat-card"><p className="admin-stat-label">남은 혜택 예산</p><p className="admin-stat-value text-base"><AdminTruth value={pool?.ok ? formatUsdt((pool.data as { availableUsdt?: unknown }).availableUsdt) : null} /></p></div>
              <div className="admin-stat-card"><p className="admin-stat-label">확인 대기</p><p className="admin-stat-value">{hold?.ok && Array.isArray((hold.data as { items?: unknown[] }).items) ? `${(hold.data as { items: unknown[] }).items.length}건` : "—"}</p></div>
              <div className="admin-stat-card"><p className="admin-stat-label">초대 횟수 제한</p><p className="admin-stat-value text-base">없음</p><p className="mt-2 text-xs text-lux-text-muted">과도한 공유만 별도 안전 규칙으로 막습니다.</p></div>
            </div>
          )}
        </section>
      ) : (
        <section className="mt-6 rounded-2xl border border-lux-border p-5" data-testid="growth-content-panel" data-tax-disclaimer-locked="true" data-admin-override="false">
          <h2 className="text-lg font-bold">{T.admin.contentTab}</h2>
          <p className="mt-1 text-sm text-lux-text-muted">{T.admin.taxDisclaimerLockedHint}</p>
          <div className="mt-4 rounded-2xl border border-lux-border p-4" data-testid="admin-tax-disclaimer-lock" data-editable="false" aria-readonly="true">
            <p className="mb-2 text-sm font-bold text-lux-warning">{T.admin.taxDisclaimerLocked}</p>
            <TaxDisclaimerBlock />
          </div>
        </section>
      )}

      <section className="mt-6 rounded-2xl border border-lux-border p-4" data-testid="growth-planned-features">
        <h2 className="text-base font-bold">추후 연결할 운영 기능</h2>
        <p className="mt-1 text-sm text-lux-text-muted">아래 기능은 현재 실행 메뉴가 아닙니다. 실제 API와 운영 계약이 준비되면 하나씩 활성화합니다.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {PLANNED_TABS.map((item) => <span key={item} className="admin-status-chip">{TAB_LABEL[item]} · 준비 중</span>)}
        </div>
      </section>
    </main>
  );
}

export default function Page() {
  return <SearchParamsBoundary><GrowthContent /></SearchParamsBoundary>;
}
