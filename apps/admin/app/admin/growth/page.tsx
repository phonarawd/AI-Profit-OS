"use client";

import { useMemo } from "react";
import { useSearchParams } from "next/navigation";

const TABS = [
  "simulation",
  "referral",
  "notices",
  "campaigns",
  "share",
  "content",
  "deposit",
  "whale",
  "ticker",
] as const;
type GrowthTab = (typeof TABS)[number];

const TAB_LABEL: Record<GrowthTab, string> = {
  simulation: "시뮬레이션",
  referral: "초대",
  notices: "공지",
  campaigns: "캠페인",
  share: "공유 카드",
  content: "G1",
  deposit: "G2",
  whale: "G3",
  ticker: "G4",
};

/**
 * Admin §35.6 / Money §51.5 — `/admin/growth?tab=referral`
 * Program SoT = GET/PATCH /api/v1/admin/growth/referral/program
 * FORBIDDEN: 월간 초대 인원캡 입력칸 (capPerReferrerMonth)
 */
// route lock: growth?tab=referral
export default function Page() {
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

  return (
    <main
      className="p-6 text-[var(--color-lux-text)]"
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
                ? "rounded px-2 py-1 bg-[var(--color-lux-elevated)] text-[var(--color-lux-accent)]"
                : "rounded px-2 py-1 text-[var(--color-lux-text-muted)]"
            }
          >
            {TAB_LABEL[t]}
          </a>
        ))}
      </nav>

      {tab === "referral" ? (
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
          <p className="text-sm text-[var(--color-lux-text-muted)]">
            §51.5 초대∞ · rewardsEnabled · Pool top-up · clawback · accrual
            halt · 인원캡 UI 0
          </p>
          <ul className="text-xs text-[var(--color-lux-text-muted)] list-disc pl-5 space-y-1">
            <li>rewardsEnabled (0원 런칭 기본 OFF)</li>
            <li>Promo Pool top-up · FIFO · queued_pool</li>
            <li>보류 큐 release / clawback (reason≥10)</li>
            <li>공유 한도=스팸 방지 only · 초대 횟수 제한 없음</li>
          </ul>
          <p className="text-xs text-[var(--color-lux-text-muted)]">
            API: {programApi}
          </p>
        </section>
      ) : (
        <section className="mt-6" data-testid={`growth-${tab}-panel`}>
          <p className="text-sm text-[var(--color-lux-text-muted)]">
            Admin §35.6 골격 · 초대 계약은 referral 탭
          </p>
        </section>
      )}
    </main>
  );
}
