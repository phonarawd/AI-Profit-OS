"use client";

import { useMemo } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { SearchParamsBoundary } from "@aipo/ui/components/SearchParamsBoundary";

/**
 * Admin §9.8 · 유저360
 * §9.8.9 opportunities tab = override contract
 * §9.8.10 membership · matchStrictnessOverride (Engine §0.0.7)
 */
type Tab = "summary" | "opportunities" | "membership";

function resolveTab(raw: string | null): Tab {
  if (raw === "opportunities") return "opportunities";
  if (raw === "membership") return "membership";
  return "summary";
}

function UserDetailInner() {
  const params = useParams<{ id: string }>();
  const sp = useSearchParams();
  const userId = String(params?.id ?? "");
  const tab = resolveTab(sp.get("tab"));

  const badges = useMemo(
    () => [
      { key: "hidden", label: "숨김" },
      { key: "forceShow", label: "강제표시" },
      { key: "pinOrder", label: "고정" },
      { key: "marginPctOverride", label: "마진조정" },
      { key: "expectedProfitUsdtOverride", label: "수익조정" },
    ],
    [],
  );

  const membershipIds = useMemo(
    () => [
      { id: "sprout", label: "새싹" },
      { id: "entry", label: "입문" },
      { id: "core", label: "본격" },
      { id: "high", label: "고액" },
      { id: "vip", label: "VIP" },
    ],
    [],
  );

  const strictnessPresets = useMemo(
    () => ["lenient", "standard", "tight", "scarce", "custom"],
    [],
  );

  return (
    <main className="p-6 text-lux-text">
      <h1 className="text-xl font-semibold">회원 상세</h1>
      <p className="mt-2 text-sm text-lux-text-muted">
        Admin §9.8 · 유저 {userId || "—"}
      </p>

      <div className="mt-4 flex gap-3 text-sm">
        <a
          href={`/admin/users/${userId}`}
          className={tab === "summary" ? "font-semibold" : "text-lux-text-muted"}
        >
          요약
        </a>
        <a
          href={`/admin/users/${userId}?tab=opportunities`}
          className={
            tab === "opportunities" ? "font-semibold" : "text-lux-text-muted"
          }
          data-tab="opportunities"
        >
          기회 조정
        </a>
        <a
          href={`/admin/users/${userId}?tab=membership`}
          className={
            tab === "membership" ? "font-semibold" : "text-lux-text-muted"
          }
          data-tab="membership"
        >
          등급·매칭조절
        </a>
      </div>

      {tab === "opportunities" ? (
        <section className="mt-6 space-y-3" data-surface="user-opportunity-override">
          <p className="text-sm text-lux-text-muted">
            §9.8.9 · schema forceShow/pinOrder/marginPctOverride/expectedProfitUsdtOverride
          </p>
          <p className="text-sm text-lux-text-muted">
            API: GET/PUT/DELETE /api/v1/admin/users/:id/opportunity-overrides
          </p>
          <p className="text-sm text-lux-text-muted" data-lock="ledger-immutable">
            원장·잔액 직접 변경 금지 · audit admin.user.opportunity_override.upsert
          </p>
          <ul className="flex flex-wrap gap-2 text-sm">
            {badges.map((b) => (
              <li
                key={b.key}
                data-override-field={b.key}
                className="rounded border border-lux-border px-2 py-1"
              >
                {b.label}
                <span className="ml-1 text-lux-text-muted">({b.key})</span>
              </li>
            ))}
          </ul>
          <p className="text-sm text-lux-text-muted" data-rbac="userOpportunityOverride">
            RBAC: 재무·최고=쓰기 · 고객지원=조회만 · 마케팅=불가
          </p>
        </section>
      ) : tab === "membership" ? (
        <section className="mt-6 space-y-4" data-surface="user-membership">
          <p className="text-sm text-lux-text-muted">
            §9.8.10 · Engine §0.0.7 등급 강제 · 유저별 엄격도 · fulfillRate 읽기전용
          </p>
          <p className="text-sm text-lux-text-muted">
            API: GET/PUT /api/v1/admin/users/:id/membership ·
            GET/PUT /api/v1/admin/users/:id/match-policy-override
          </p>

          <div className="space-y-2" data-block="membershipForce">
            <p className="text-sm font-medium">멤버십 강제</p>
            <ul className="flex flex-wrap gap-2 text-sm">
              {membershipIds.map((m) => (
                <li
                  key={m.id}
                  data-membership={m.id}
                  className="rounded border border-lux-border px-2 py-1"
                >
                  {m.label}
                  <span className="ml-1 text-lux-text-muted">({m.id})</span>
                </li>
              ))}
            </ul>
            <p
              className="text-sm text-lux-text-muted"
              data-field="adminForce"
              data-audit="admin.user.membership.force"
            >
              Confirm · reason≥10 · audit admin.user.membership.force · 자동 강등 0
            </p>
            <p className="text-sm text-lux-text-muted" data-rbac="userMembershipForce">
              RBAC: 재무·최고=쓰기
            </p>
          </div>

          <div className="space-y-2" data-block="membershipObserve">
            <p className="text-sm font-medium">관측 (읽기전용)</p>
            <ul className="flex flex-wrap gap-2 text-sm">
              <li
                data-kpi="fulfillRate7d"
                data-readonly="true"
                className="rounded border border-lux-border px-2 py-1"
              >
                요즘 조건이 맞은 비율 (fulfillRate7d)
              </li>
              <li
                data-field="dailyMatchesUsed"
                className="rounded border border-lux-border px-2 py-1"
              >
                dailyMatchesUsed / Cap
              </li>
              <li
                data-field="maxCapitalBand"
                className="rounded border border-lux-border px-2 py-1"
              >
                maxCapitalBand
              </li>
            </ul>
            <p
              className="text-sm text-lux-text-muted"
              data-forbid="fulfillRate_as_rule_input"
            >
              fulfillRate → Rule/participate 입력 금지
            </p>
          </div>

          <div className="space-y-2" data-block="matchStrictnessOverride">
            <p className="text-sm font-medium">이 유저 매칭 조절</p>
            <ul className="flex flex-wrap gap-2 text-sm">
              {strictnessPresets.map((s) => (
                <li
                  key={s}
                  data-field="matchStrictnessOverride"
                  data-strictness={s}
                  className="rounded border border-lux-border px-2 py-1"
                >
                  {s}
                </li>
              ))}
            </ul>
            <p
              className="text-sm text-lux-text-muted"
              data-preview="effectivePolicy"
              data-audit="admin.user.match_policy.updated"
            >
              effectivePolicy 미리보기 (minProfit/stale/cap) · audit
              admin.user.match_policy.updated
            </p>
            <p
              className="text-sm text-lux-text-muted"
              data-forbid="successRatePercent"
              data-rbac="userMatchPolicy"
            >
              successRatePercent 금지 · RBAC userMatchPolicy
            </p>
          </div>

          <p className="text-sm text-lux-text-muted" data-lock="ledger-immutable">
            원장·잔액 직접 변경 금지 · 등급만으로 MATCH_SUCCESS 100% 보장 금지
          </p>
        </section>
      ) : (
        <section className="mt-6 text-sm text-lux-text-muted">
          <p>
            Admin §9.1.1 골격 · 탭에서 기회 조정(§9.8.9) · 등급·매칭조절(§9.8.10)
            선택
          </p>
        </section>
      )}
    </main>
  );
}

export default function Page() {
  return (
    <SearchParamsBoundary>
      <UserDetailInner />
    </SearchParamsBoundary>
  );
}
