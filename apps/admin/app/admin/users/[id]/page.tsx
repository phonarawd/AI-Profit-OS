"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { SearchParamsBoundary } from "@aipo/ui/components/SearchParamsBoundary";
import { adminGet, adminSend, type AdminResult } from "../../../../lib/admin-api";
import { readText } from "../../../../lib/admin-truth";
import { AdminFetchNote, AdminTruth } from "../../../../components/AdminTruth";

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

type MembershipPayload = {
  membership?: {
    membership?: unknown;
    adminForce?: unknown;
    fulfillRate7d?: unknown;
    dailyMatchesUsed?: unknown;
    dailyUserMatchCap?: unknown;
    maxCapitalBand?: unknown;
    matchStrictness?: unknown;
  };
  labelKo?: unknown;
};

type RiskPayload = {
  status?: unknown;
  reason?: unknown;
};

type OverrideItem = {
  opportunityId?: unknown;
  hidden?: unknown;
  forceShow?: unknown;
  pinOrder?: unknown;
};

function UserDetailInner() {
  const params = useParams<{ id: string }>();
  const sp = useSearchParams();
  const userId = String(params?.id ?? "");
  const tab = resolveTab(sp.get("tab"));

  const [membership, setMembership] = useState<AdminResult<MembershipPayload> | null>(
    null,
  );
  const [risk, setRisk] = useState<AdminResult<RiskPayload> | null>(null);
  const [overrides, setOverrides] = useState<AdminResult<{ items?: OverrideItem[] }> | null>(
    null,
  );
  const [forceReason, setForceReason] = useState("");
  const [forceTarget, setForceTarget] = useState("sprout");
  const [forceNote, setForceNote] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    void (async () => {
      const [m, r, o] = await Promise.all([
        adminGet<MembershipPayload>(`/api/v1/admin/users/${userId}/membership`),
        adminGet<RiskPayload>(`/api/v1/admin/risk/users/${userId}/state`),
        adminGet<{ items?: OverrideItem[] }>(
          `/api/v1/admin/users/${userId}/opportunity-overrides`,
        ),
      ]);
      if (cancelled) return;
      setMembership(m);
      setRisk(r);
      setOverrides(o);
    })();
    return () => {
      cancelled = true;
    };
  }, [userId]);

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

  const membershipRow = membership?.ok ? membership.data.membership : undefined;
  const overrideItems = overrides?.ok
    ? Array.isArray(overrides.data.items)
      ? overrides.data.items
      : []
    : [];

  async function onForce(event: FormEvent) {
    event.preventDefault();
    if (forceReason.trim().length < 10) {
      setForceNote("사유는 10자 이상이어야 합니다.");
      return;
    }
    if (!window.confirm("이 회원의 등급을 바꿀까요?")) return;
    const res = await adminSend(
      `/api/v1/admin/users/${userId}/membership`,
      "PUT",
      { membership: forceTarget, reason: forceReason.trim() },
    );
    setForceNote(res.ok ? "반영했습니다." : "반영하지 못했습니다.");
    if (res.ok) {
      setMembership(await adminGet(`/api/v1/admin/users/${userId}/membership`));
    }
  }

  return (
    <main className="p-6 text-lux-text" data-testid="admin-user-detail">
      <h1 className="text-xl font-semibold">회원 상세</h1>
      <p className="mt-2 text-sm text-lux-text-muted">
        Admin §9.8 · 선택한 회원
      </p>
      <p className="mt-1 text-xs text-lux-text-muted">
        <a className="underline" href={`/admin/users/${userId}/finance`}>
          회원 금융
        </a>
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
          {!overrides ? (
            <p className="text-sm text-lux-text-muted">불러오는 중</p>
          ) : overrides.ok ? (
            overrideItems.length === 0 ? (
              <p className="text-sm text-lux-text-muted">조정 항목이 없습니다.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {overrideItems.map((item, idx) => (
                  <li
                    key={String(item.opportunityId ?? idx)}
                    className="rounded border border-lux-border p-2"
                  >
                    <AdminTruth value={readText(item.opportunityId)} />
                  </li>
                ))}
              </ul>
            )
          ) : (
            <AdminFetchNote failure={overrides.failure} />
          )}
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
            <p className="text-sm">
              현재:{" "}
              <AdminTruth
                value={
                  membership?.ok
                    ? readText(membership.data.labelKo) ??
                      readText(membershipRow?.membership)
                    : null
                }
              />
            </p>
            {membership && !membership.ok ? (
              <AdminFetchNote failure={membership.failure} />
            ) : null}
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
            <form className="space-y-2" onSubmit={onForce}>
              <label className="block text-sm" htmlFor="force-membership">
                바꿀 등급
              </label>
              <select
                id="force-membership"
                value={forceTarget}
                onChange={(e) => setForceTarget(e.target.value)}
                className="rounded border border-lux-border bg-lux-bg px-2 py-1 text-sm"
              >
                {membershipIds.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.label}
                  </option>
                ))}
              </select>
              <label className="block text-sm" htmlFor="force-reason">
                사유
              </label>
              <textarea
                id="force-reason"
                value={forceReason}
                onChange={(e) => setForceReason(e.target.value)}
                className="w-full max-w-md rounded border border-lux-border bg-lux-bg px-2 py-1 text-sm"
              />
              <button
                type="submit"
                className="rounded bg-lux-elevated px-3 py-1 text-sm"
              >
                등급 반영
              </button>
              {forceNote ? (
                <p className="text-sm text-lux-text-muted">{forceNote}</p>
              ) : null}
            </form>
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
                요즘 조건이 맞은 비율 (fulfillRate7d){" "}
                <AdminTruth
                  value={
                    membershipRow && membershipRow.fulfillRate7d != null
                      ? readText(membershipRow.fulfillRate7d)
                      : null
                  }
                />
              </li>
              <li
                data-field="dailyMatchesUsed"
                className="rounded border border-lux-border px-2 py-1"
              >
                dailyMatchesUsed / Cap{" "}
                <AdminTruth
                  value={
                    membershipRow
                      ? [readText(membershipRow.dailyMatchesUsed), readText(membershipRow.dailyUserMatchCap)]
                          .filter(Boolean)
                          .join(" / ") || null
                      : null
                  }
                />
              </li>
              <li
                data-field="maxCapitalBand"
                className="rounded border border-lux-border px-2 py-1"
              >
                maxCapitalBand{" "}
                <AdminTruth value={readText(membershipRow?.maxCapitalBand)} />
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
        <section className="mt-6 space-y-3 text-sm">
          <p className="text-lux-text-muted">
            Admin §9.1.1 골격 · 탭에서 기회 조정(§9.8.9) · 등급·매칭조절(§9.8.10)
            선택
          </p>
          <p>
            위험 상태:{" "}
            {!risk ? (
              "불러오는 중"
            ) : risk.ok ? (
              <AdminTruth value={readText(risk.data.status)} />
            ) : (
              <AdminFetchNote failure={risk.failure} />
            )}
          </p>
          <p>
            등급:{" "}
            {!membership ? (
              "불러오는 중"
            ) : membership.ok ? (
              <AdminTruth
                value={
                  readText(membership.data.labelKo) ??
                  readText(membershipRow?.membership)
                }
              />
            ) : (
              <AdminFetchNote failure={membership.failure} />
            )}
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
