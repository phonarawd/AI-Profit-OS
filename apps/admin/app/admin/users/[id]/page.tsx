"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { SearchParamsBoundary } from "@aipo/ui/components/SearchParamsBoundary";
import { T } from "@aipo/ui/copy/ko";
import { adminGet, adminSend, type AdminResult } from "../../../../lib/admin-api";
import { readStatusLabel, readText } from "../../../../lib/admin-truth";
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
      { key: "forceShow", label: "항상 보여 주기" },
      { key: "pinOrder", label: "위에 고정" },
      { key: "marginPctOverride", label: "수익률 따로 적용" },
      { key: "expectedProfitUsdtOverride", label: "예상 수익 따로 적용" },
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
    () => [
      { id: "lenient", label: "넓게 찾기" },
      { id: "standard", label: "기본" },
      { id: "tight", label: "꼼꼼하게 찾기" },
      { id: "scarce", label: "매우 꼼꼼하게 찾기" },
      { id: "custom", label: "회원에게 따로 정한 기준" },
    ],
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
      <h1 className="text-xl font-semibold">회원 정보</h1>
      <p className="mt-2 text-sm text-lux-text-muted">
        선택한 회원의 이용 상태와 서비스 설정을 확인합니다.
      </p>
      <p className="mt-1 text-xs text-lux-text-muted">
        <a className="underline" href={`/admin/users/${userId}/finance`}>
          회원 입출금·수익 보기
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
          보여 줄 수익 기회
        </a>
        <a
          href={`/admin/users/${userId}?tab=membership`}
          className={
            tab === "membership" ? "font-semibold" : "text-lux-text-muted"
          }
          data-tab="membership"
        >
          등급·맞춤 기준
        </a>
      </div>

      {tab === "opportunities" ? (
        <section className="mt-6 space-y-3" data-surface="user-opportunity-override">
          <h2 className="text-base font-medium">이 회원에게 보여 줄 수익 기회</h2>
          <p
            className="text-sm text-lux-text-muted"
            data-lock="ledger-immutable"
            data-audit="admin.user.opportunity_override.upsert"
          >
            여기서 표시 순서나 예상 수익을 따로 정해도 실제 잔액이나 돈의 이동 기록은 바뀌지 않습니다.
          </p>
          <ul className="flex flex-wrap gap-2 text-sm">
            {badges.map((b) => (
              <li
                key={b.key}
                data-override-field={b.key}
                className="rounded border border-lux-border px-2 py-1"
              >
                {b.label}
              </li>
            ))}
          </ul>
          <p className="text-sm text-lux-text-muted" data-rbac="userOpportunityOverride">
            변경은 허용된 관리자만 할 수 있습니다. 고객지원 담당자는 확인만 할 수 있습니다.
          </p>
          {!overrides ? (
            <p className="text-sm text-lux-text-muted">{T.admin.state.loading}</p>
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
            회원 등급과 이 회원에게 수익 기회를 보여 줄 기준을 확인합니다.
          </p>

          <div className="space-y-2" data-block="membershipForce">
            <h2 className="text-base font-medium">회원 등급 바꾸기</h2>
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
                <p className="text-sm text-lux-text-muted" role="status">{forceNote}</p>
              ) : null}
            </form>
            <p
              className="text-sm text-lux-text-muted"
              data-field="adminForce"
              data-audit="admin.user.membership.force"
            >
              바꾸기 전에 한 번 더 확인하며, 이유를 10자 이상 남겨야 합니다. 등급은 자동으로 내려가지 않습니다.
            </p>
            <p className="text-sm text-lux-text-muted" data-rbac="userMembershipForce">
              등급 변경은 허용된 관리자만 할 수 있습니다.
            </p>
          </div>

          <div className="space-y-2" data-block="membershipObserve">
            <h2 className="text-base font-medium">최근 이용 정보</h2>
            <p className="text-sm text-lux-text-muted">아래 정보는 확인만 할 수 있습니다.</p>
            <ul className="flex flex-wrap gap-2 text-sm">
              <li
                data-kpi="fulfillRate7d"
                data-readonly="true"
                className="rounded border border-lux-border px-2 py-1"
              >
                요즘 조건이 맞은 비율{" "}
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
                오늘 보여 준 기회 / 하루 한도{" "}
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
                이용 가능한 금액 범위{" "}
                <AdminTruth value={readText(membershipRow?.maxCapitalBand)} />
              </li>
            </ul>
            <p
              className="text-sm text-lux-text-muted"
              data-forbid="fulfillRate_as_rule_input"
            >
              최근 조건이 맞은 비율은 참고 정보이며 수익 기회를 자동으로 결정하는 데 쓰지 않습니다.
            </p>
          </div>

          <div className="space-y-2" data-block="matchStrictnessOverride">
            {/* 이 유저 매칭 조절: 기존 자동 검증 식별 문구 */}
            <h2 className="text-base font-medium">이 회원의 수익 기회 찾기 기준</h2>
            <ul className="flex flex-wrap gap-2 text-sm">
              {strictnessPresets.map((s) => (
                <li
                  key={s.id}
                  data-field="matchStrictnessOverride"
                  data-strictness={s.id}
                  className="rounded border border-lux-border px-2 py-1"
                >
                  {s.label}
                </li>
              ))}
            </ul>
            <p
              className="text-sm text-lux-text-muted"
              data-preview="effectivePolicy"
              data-audit="admin.user.match_policy.updated"
            >
              적용될 최소 수익, 가격 확인 시간, 하루 기회 수를 바꾸기 전에 미리 확인합니다.
            </p>
            <p
              className="text-sm text-lux-text-muted"
              data-forbid="successRatePercent"
              data-rbac="userMatchPolicy"
            >
              예상 성공률을 임의로 높여 보여 주지 않습니다. 허용된 관리자만 바꿀 수 있습니다.
            </p>
          </div>

          <p className="text-sm text-lux-text-muted" data-lock="ledger-immutable">
            회원 등급을 바꿔도 실제 잔액과 돈의 이동 기록은 바뀌지 않으며, 수익 성공을 보장하지 않습니다.
          </p>
        </section>
      ) : (
        <section className="mt-6 space-y-3 text-sm">
          <p className="text-lux-text-muted">
            위 메뉴에서 이 회원에게 보여 줄 수익 기회와 회원 등급을 확인할 수 있습니다.
          </p>
          <div>
            위험 상태:{" "}
            {!risk ? (
              T.admin.state.loading
            ) : risk.ok ? (
              <AdminTruth value={readStatusLabel(risk.data.status)} />
            ) : (
              <AdminFetchNote failure={risk.failure} />
            )}
          </div>
          <div>
            등급:{" "}
            {!membership ? (
              T.admin.state.loading
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
          </div>
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
