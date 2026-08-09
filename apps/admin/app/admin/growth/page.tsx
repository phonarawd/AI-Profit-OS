"use client";

import { useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { SearchParamsBoundary } from "@aipo/ui/components/SearchParamsBoundary";
import { TaxDisclaimerBlock } from "@aipo/ui/components/trust";
import { T } from "@aipo/ui/copy/ko";

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

const TAB_LABEL: Record<GrowthTab, string> = {
  simulation: "시뮬레이션",
  referral: "초대",
  notices: "공지",
  campaigns: "캠페인",
  missions: "혜택·미션",
  share: "공유 카드",
  content: "G1",
  deposit: "G2",
  whale: "G3",
  ticker: "G4",
  partners: "공식 협력사",
};

const SIM_GATES = [
  {
    id: "S1",
    label: "화면 표시 정확도",
    rule: "uxDisplayAccuracy mismatch = 0",
    fail: "공개 차단",
  },
  {
    id: "S2",
    label: "운영 준비금 한도",
    rule: "worstCasePlatformDrain ≤ platform_reserve × 10%",
    fail: "운영 알림",
  },
  {
    id: "S3",
    label: "지급 가능 점수",
    rule: "payoutFeasibilityScore ≥ 0.85",
    fail: "피드 숨김",
  },
  {
    id: "S4",
    label: "시세 매칭 실패율",
    rule: "adapterMatchFailureRate ≤ 15%",
    fail: "수집기 알림",
  },
] as const;

/**
 * Admin §35.6 / Engine §51.4 — `/admin/growth?tab=simulation`
 * Money §51.5 — `/admin/growth?tab=referral`
 * FORBIDDEN: 월간 초대 인원캡 입력칸 (capPerReferrerMonth)
 */
function GrowthContent() {
  const searchParams = useSearchParams();
  const tab = useMemo((): GrowthTab => {
    const raw = searchParams.get("tab");
    if (raw && (TABS as readonly string[]).includes(raw)) {
      return raw as GrowthTab;
    }
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

  return (
    <main
      className="p-6 text-lux-text"
      data-admin-growth-tab={tab}
    >
      <h1 className="text-xl font-semibold">이벤트·프로모션</h1>
      <nav
        className="mt-4 flex flex-wrap gap-2 text-sm"
        data-testid="growth-tabs"
      >
        {TABS.map((t) => (
          <a
            key={t}
            href={`/admin/growth?tab=${t}`}
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

      {tab === "simulation" ? (
        <section
          className="mt-6 space-y-4"
          data-testid="growth-simulation-panel"
          data-surface="admin-growth-simulation"
          data-run-api={simRunApi}
          data-latest-api={simLatestApi}
          data-growth-gate-api={simGrowthGateApi}
          data-growth-enabled-api={growthEnabledApi}
        >
          <p className="text-sm text-lux-text-muted">
            Engine §51.4 M0.5 · S1~S4 KPI 입력 · Growth ON은 최근 PASS 24시간 이내 +
            운영 준비금 설정 필수
          </p>

          <div
            className="rounded border border-lux-border p-3 space-y-2"
            data-field="gates"
          >
            <p className="text-sm font-medium">통과 기준 (S1~S4)</p>
            <ul className="space-y-2 text-sm">
              {SIM_GATES.map((g) => (
                <li
                  key={g.id}
                  data-gate={g.id}
                  className="flex flex-col gap-0.5 sm:flex-row sm:items-center sm:justify-between"
                >
                  <span>
                    {g.id} · {g.label}
                  </span>
                  <span className="text-xs text-lux-text-muted">
                    {g.rule} · 실패 시 {g.fail}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div
            className="rounded border border-lux-border p-3 text-sm space-y-1"
            data-field="kpi-inputs"
          >
            <p className="font-medium">KPI 입력</p>
            <ul className="text-xs text-lux-text-muted list-disc pl-5 space-y-1">
              <li data-kpi="S1">S1 · uxDisplayAccuracy[] (mismatch 합=0)</li>
              <li data-kpi="S2">
                S2 · worstCasePlatformDrainUsdt + platform_reserve (tab=reserve)
              </li>
              <li data-kpi="S3">S3 · payoutFeasibilityScore (공개 기회 지급 가능)</li>
              <li data-kpi="S4">
                S4 · adapterMatchFailureRate (GET /admin/adapters/simulation-s4)
              </li>
            </ul>
          </div>

          <div
            className="rounded border border-lux-border p-3 text-sm"
            data-field="growth-enabled"
            data-gate="admin.growth.enabled"
          >
            <p className="font-medium">성장 기능 켜기</p>
            <p className="mt-1 text-xs text-lux-text-muted">
              PATCH {growthEnabledApi} · 최근 시뮬레이션 PASS ≤24h · 준비금 설정
              필수
            </p>
          </div>

          <p className="text-xs text-lux-text-muted">
            API: POST {simRunApi} · GET {simLatestApi}
          </p>
        </section>
      ) : tab === "referral" ? (
        <section
          className="mt-6 space-y-3"
          data-testid="growth-referral-panel"
          data-program-api={programApi}
          data-pool-api={poolApi}
          data-hold-queue-api={holdQueueApi}
          data-top-up-api={topUpApi}
          data-accrual-halt-api={accrualHaltApi}
          data-rewards-enabled-default="false"
          data-invite-cap-ui="0"
          data-forbid-monthly-invite-cap="true"
        >
          <p className="text-sm text-lux-text-muted">
            §51.5 초대∞ · rewardsEnabled · Pool top-up · clawback · accrual
            halt · 인원캡 UI 0
          </p>
          <ul className="text-xs text-lux-text-muted list-disc pl-5 space-y-1">
            <li>rewardsEnabled (0원 런칭 기본 OFF)</li>
            <li>Promo Pool top-up · FIFO · queued_pool</li>
            <li>보류 큐 release / clawback (reason≥10)</li>
            <li>공유 한도=스팸 방지 only · 초대 횟수 제한 없음</li>
          </ul>
          <p className="text-xs text-lux-text-muted">
            API: {programApi}
          </p>
        </section>
      ) : tab === "content" ? (
        <section
          className="mt-6 space-y-4"
          data-testid="growth-content-panel"
          data-tax-disclaimer-locked="true"
          data-admin-override="false"
        >
          <h2 className="text-base font-medium">{T.admin.contentTab}</h2>
          <p className="text-sm text-lux-text-muted">
            {T.admin.taxDisclaimerLockedHint}
          </p>
          <div
            data-testid="admin-tax-disclaimer-lock"
            data-editable="false"
            aria-readonly="true"
          >
            <p className="mb-2 text-xs font-medium text-lux-warning">
              {T.admin.taxDisclaimerLocked}
            </p>
            <TaxDisclaimerBlock />
          </div>
        </section>
      ) : (
        <section className="mt-6" data-testid={`growth-${tab}-panel`}>
          <p className="text-sm text-lux-text-muted">
            Admin §35.6 골격 · 시뮬레이션·초대 계약은 해당 탭
          </p>
        </section>
      )}
    </main>
  );
}

export default function Page() {
  return (
    <SearchParamsBoundary>
      <GrowthContent />
    </SearchParamsBoundary>
  );
}
