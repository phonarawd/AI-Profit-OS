"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { SearchParamsBoundary } from "@aipo/ui/components/SearchParamsBoundary";
import { TaxDisclaimerBlock } from "@aipo/ui/components/trust";
import { T } from "@aipo/ui/copy/ko";
import { adminGet, type AdminResult } from "../../../lib/admin-api";
import { readText } from "../../../lib/admin-truth";
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
// Release evidence wording: "이 탭의 운영 목록 API가 없습니다."

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
  }, [tab, simLatestApi, programApi, poolApi, holdQueueApi]);

  return (
    <main
      className="p-6 text-lux-text"
      data-admin-growth-tab={tab}
      data-testid="admin-growth-page"
    >
      <h1 className="text-xl font-semibold">{T.admin.navigation.growth}</h1>
      <p className="mt-2 text-sm text-lux-text-muted">
        공지, 행사, 친구 초대와 혜택을 시작하기 전에 안전 상태를 확인합니다.
      </p>
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
            혜택과 행사를 시작하려면 최근 24시간 안의 안전 점검 통과와 운영 준비금 설정이 필요합니다.
          </p>

          <div
            className="rounded border border-lux-border p-3 space-y-2"
            data-field="gates"
          >
            <p className="text-sm font-medium">반드시 확인할 네 가지</p>
            <ul className="space-y-2 text-sm">
              {SIM_GATES.map((g) => (
                <li
                  key={g.id}
                  data-gate={g.id}
                  data-field={g.id === "S4" ? "adapterMatchFailureRate" : undefined}
                  className="flex flex-col gap-0.5 sm:flex-row sm:items-center sm:justify-between"
                >
                  <span>
                    {g.label}
                  </span>
                  <span className="text-xs text-lux-text-muted">
                    {g.rule} · 기준을 넘으면 {g.fail}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div
            className="rounded border border-lux-border p-3 text-sm space-y-1"
            data-field="kpi-inputs"
          >
            <p className="font-medium">점검에 사용하는 실제 정보</p>
            <ul className="text-xs text-lux-text-muted list-disc pl-5 space-y-1">
              <li data-kpi="S1">회원 화면에 표시되는 금액과 안내의 정확도</li>
              <li data-kpi="S2">
                한 번에 나갈 수 있는 최대 금액과 운영 준비금
              </li>
              <li data-kpi="S3">공개할 수익 기회의 실제 지급 가능 여부</li>
              <li data-kpi="S4">
                해외 상품과 내부 상품을 연결하지 못한 비율
              </li>
            </ul>
          </div>

          <div
            className="rounded border border-lux-border p-3 text-sm"
            data-field="growth-enabled"
            data-gate="admin.growth.enabled"
          >
            <p className="font-medium">혜택·행사 시작</p>
            <p className="mt-1 text-xs text-lux-text-muted">
              최근 안전 점검을 통과했고 운영 준비금이 설정된 경우에만 시작할 수 있습니다.
            </p>
          </div>

          {!simLatest ? (
            <p className="text-sm text-lux-text-muted">{T.admin.state.loading}</p>
          ) : !simLatest.ok ? (
            <AdminFetchNote failure={simLatest.failure} />
          ) : (
            <p className="text-sm">
              최근 안전 점검{" "}
              <AdminTruth
                value={
                  typeof (simLatest.data as { pass?: unknown }).pass === "boolean"
                    ? (simLatest.data as { pass: boolean }).pass
                      ? "통과"
                      : "확인 필요"
                    : null
                }
              />
            </p>
          )}
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
            친구 초대 횟수에는 제한이 없습니다. 혜택 예산이 부족하거나 의심 활동이 있으면 지급만 잠시 보류합니다.
          </p>
          <ul className="text-xs text-lux-text-muted list-disc pl-5 space-y-1">
            <li>출시 시 초대 혜택은 기본으로 멈춰 있습니다.</li>
            <li>남은 혜택 예산과 지급 대기 순서를 확인합니다.</li>
            <li>보류한 혜택의 지급 또는 취소 사유를 기록합니다.</li>
            <li>과도한 공유만 막고, 친구를 초대하는 횟수는 제한하지 않습니다.</li>
          </ul>
          {!program ? (
            <p className="text-sm text-lux-text-muted">{T.admin.state.loading}</p>
          ) : !program.ok ? (
            <AdminFetchNote failure={program.failure} />
          ) : (
            <div className="text-sm space-y-1">
              <p>
                초대 혜택{" "}
                <AdminTruth value={enabledLabel((program.data as { rewardsEnabled?: unknown }).rewardsEnabled)} />
              </p>
              <p>
                남은 혜택 예산{" "}
                <AdminTruth value={pool?.ok ? readText((pool.data as { availableUsdt?: unknown }).availableUsdt) : null} />
              </p>
              <p>
                확인 대기{" "}
                <AdminTruth
                  value={
                    hold?.ok && Array.isArray((hold.data as { items?: unknown[] }).items)
                      ? String((hold.data as { items: unknown[] }).items.length)
                      : null
                  }
                />
              </p>
            </div>
          )}
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
        <section className="mt-6" data-testid={`growth-${tab}-panel`} data-admin-api="none">
          <p className="text-sm text-lux-text-muted">
            이 메뉴는 아직 관리 화면이 준비되지 않았습니다.
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
