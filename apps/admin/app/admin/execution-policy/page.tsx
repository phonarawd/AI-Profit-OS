"use client";

import { useEffect, useState } from "react";
import {
  adminGet,
  adminSend,
  type AdminResult,
} from "../../../lib/admin-api";
import { asRecordList, readRate, readText } from "../../../lib/admin-truth";
import { AdminFetchNote, AdminTruth } from "../../../components/AdminTruth";

/**
 * Admin §9.1.1 / §48.6 — 진행 정책
 * Engine §48.13.3 Owns: matchStrictness→policy 맵 · Soft60/Hard90 표시
 * Engine §0.0.5.1 Owns: feed.nearMissCapUsdt SSOT (adapters 설정 UI 금지)
 * FORBIDDEN: successRatePercent · 난수 성공률 슬라이더
 */

const STRICTNESS_OPTIONS = [
  { value: "lenient", label: "여유" },
  { value: "standard", label: "표준" },
  { value: "tight", label: "타이트" },
  { value: "scarce", label: "희소" },
  { value: "custom", label: "직접 설정" },
] as const;

type MatchStrictness = (typeof STRICTNESS_OPTIONS)[number]["value"];

type PolicyPayload = {
  policy?: {
    matchStrictness?: unknown;
    minProfitUsdt?: unknown;
    staleAllowanceSec?: unknown;
    maxRematchCount?: unknown;
    feed?: { nearMissCapUsdt?: unknown };
    updatedAt?: unknown;
  };
  softHard?: {
    softSec?: unknown;
    hardSec?: unknown;
    membershipUniform?: unknown;
  };
  presets?: Record<
    string,
    {
      minProfitUsdt?: unknown;
      staleAllowanceSec?: unknown;
      maxRematchCount?: unknown;
    }
  >;
  observedWriteForbidden?: unknown;
};

type StatsPayload = {
  day?: unknown;
  observedSuccessRate?: unknown;
  denominator?: unknown;
  readOnly?: unknown;
};

export default function Page() {
  const [policy, setPolicy] = useState<AdminResult<PolicyPayload> | null>(null);
  const [stats, setStats] = useState<AdminResult<StatsPayload> | null>(null);
  const [audit, setAudit] = useState<AdminResult<{ items?: unknown }> | null>(
    null,
  );
  const [nearMissCap, setNearMissCap] = useState("");
  const [changeReason, setChangeReason] = useState("");
  const [actionNote, setActionNote] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const [p, s, a] = await Promise.all([
        adminGet<PolicyPayload>("/api/v1/admin/execution-policy"),
        adminGet<StatsPayload>("/api/v1/admin/execution-policy/stats/today"),
        adminGet<{ items?: unknown }>("/api/v1/admin/execution-policy/audit"),
      ]);
      if (cancelled) return;
      setPolicy(p);
      setStats(s);
      setAudit(a);
      if (p.ok) {
        const cap = readText(p.data.policy?.feed?.nearMissCapUsdt);
        if (cap) setNearMissCap(cap);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function save(body: Record<string, unknown>) {
    if (changeReason.trim().length < 4) {
      setActionNote("변경 사유는 4자 이상이어야 합니다.");
      return;
    }
    if (!window.confirm("진행 정책을 바꿀까요?")) return;
    const res = await adminSend<PolicyPayload>(
      "/api/v1/admin/execution-policy",
      "PUT",
      {
        ...body,
        changeReason: changeReason.trim(),
      },
    );
    setActionNote(res.ok ? "반영했습니다." : "반영하지 못했습니다.");
    if (res.ok) {
      setPolicy(res);
      const cap = readText(res.data.policy?.feed?.nearMissCapUsdt);
      if (cap) setNearMissCap(cap);
      setAudit(await adminGet("/api/v1/admin/execution-policy/audit"));
    }
  }

  const currentStrictness = policy?.ok
    ? readText(policy.data.policy?.matchStrictness)
    : null;
  const softSec =
    policy?.ok && typeof policy.data.softHard?.softSec === "number"
      ? String(policy.data.softHard.softSec)
      : null;
  const hardSec =
    policy?.ok && typeof policy.data.softHard?.hardSec === "number"
      ? String(policy.data.softHard.hardSec)
      : null;
  const auditItems = audit?.ok ? asRecordList(audit.data.items ?? audit.data) : null;

  return (
    <main className="p-6 text-lux-text" data-testid="admin-execution-policy">
      <h1 className="text-xl font-semibold">진행 정책</h1>
      <p className="mt-2 text-sm text-lux-text-muted">
        매칭 성공 조절 · Soft60/Hard90 · 근접미달 한도 · 난수 성공률 없음
      </p>

      {!policy ? (
        <p className="mt-4 text-sm text-lux-text-muted">불러오는 중</p>
      ) : !policy.ok ? (
        <div className="mt-4">
          <AdminFetchNote failure={policy.failure} />
        </div>
      ) : null}

      <section className="mt-6 space-y-3" data-surface="execution-policy">
        <label className="block text-sm" htmlFor="policy-change-reason">
          변경 사유
        </label>
        <textarea
          id="policy-change-reason"
          value={changeReason}
          onChange={(e) => setChangeReason(e.target.value)}
          className="w-full max-w-md rounded border border-lux-border bg-lux-bg px-2 py-1 text-sm"
        />

        <div
          className="rounded border border-lux-border p-3"
          data-field="matchStrictness"
          data-testid="match-strictness"
        >
          <p className="text-sm font-medium">매칭 성공 조절</p>
          <p className="mt-1 text-sm text-lux-text-muted">
            엄격도 프리셋이 실조건(최소수익·시세허용·재매칭·일일캡)을 채워요 ·
            주사위·난수 당첨률이 아니에요
          </p>
          <p className="mt-2 text-sm">
            현재 <AdminTruth value={currentStrictness} testId="current-strictness" />
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {STRICTNESS_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                data-strictness={opt.value}
                className={
                  currentStrictness === opt.value
                    ? "rounded border border-lux-accent bg-lux-elevated px-3 py-1.5 text-sm"
                    : "rounded border border-lux-border px-3 py-1.5 text-sm"
                }
                disabled={!policy?.ok}
                onClick={() =>
                  void save({ matchStrictness: opt.value as MatchStrictness })
                }
              >
                {opt.label}
              </button>
            ))}
          </div>
          <ul
            className="mt-3 space-y-1 text-xs text-lux-text-muted"
            data-map="matchStrictness-presets"
          >
            <li data-preset="lenient">여유 → minProfit 2 · stale 5 · rematch 4</li>
            <li data-preset="standard">
              표준 → minProfit 5 · stale 3 · rematch 2
            </li>
            <li data-preset="tight">타이트 → minProfit 8 · stale 2 · rematch 1</li>
            <li data-preset="scarce">희소 → minProfit 12 · stale 1 · rematch 0</li>
          </ul>
        </div>

        <div
          className="rounded border border-lux-border p-3 text-sm"
          data-lock="soft-hard"
          data-soft-sec="60"
          data-hard-sec="90"
          data-membership-uniform="true"
        >
          <p className="font-medium">대기 한도 (전 등급 동일)</p>
          <p className="mt-1 text-lux-text-muted">
            Soft <AdminTruth value={softSec} />초 · Hard{" "}
            <AdminTruth value={hardSec} />초 · 등급으로 단축 없음 · 연출 시간과
            무관
          </p>
        </div>

        <label className="block text-sm" data-field="feed.nearMissCapUsdt">
          <span className="font-medium">근접미달 한도 (USDT)</span>
          <span className="mt-1 block text-lux-text-muted">
            진행 정책 화면만 설정 · 수집기 화면 금지
          </span>
          <input
            type="text"
            inputMode="decimal"
            name="feed.nearMissCapUsdt"
            data-testid="near-miss-cap-usdt"
            className="mt-2 w-full max-w-xs rounded border border-lux-border bg-transparent px-3 py-2"
            placeholder="서버 값"
            value={nearMissCap}
            onChange={(e) => setNearMissCap(e.target.value)}
            disabled={!policy?.ok}
          />
        </label>
        <button
          type="button"
          className="rounded bg-lux-elevated px-3 py-1.5 text-sm"
          disabled={!policy?.ok}
          onClick={() =>
            void save({
              matchStrictness: currentStrictness || "standard",
              feed: { nearMissCapUsdt: nearMissCap.trim() },
            })
          }
        >
          근접미달 한도 저장
        </button>
        <p
          className="text-sm text-lux-text-muted"
          data-lock="nearMissCap-owns"
          data-owns="execution-policy"
        >
          근접미달 한도 설정은 이 화면만 · 수집기 화면 금지
        </p>

        <div
          className="rounded border border-lux-border p-3"
          data-kpi="observedSuccessRate"
          data-readonly="true"
        >
          <p className="text-sm font-medium">오늘 실제 성공 %</p>
          <p className="mt-1 text-sm text-lux-text-muted">
            관측 KPI · 읽기전용 · 목표 %로 자동 맞춤 없음
          </p>
          {!stats ? (
            <p className="mt-2 text-sm text-lux-text-muted">불러오는 중</p>
          ) : !stats.ok ? (
            <AdminFetchNote failure={stats.failure} />
          ) : (
            <p className="mt-2 text-sm" data-testid="observed-success-rate">
              <AdminTruth value={readRate(stats.data.observedSuccessRate)} />
            </p>
          )}
        </div>

        <p
          className="text-sm text-lux-text-muted"
          data-forbid="successRatePercent"
        >
          금지: 난수 성공률 · 목표 성공률 슬라이더 없음
        </p>

        <section className="rounded border border-lux-border p-3">
          <p className="text-sm font-medium">변경 기록</p>
          {!audit ? (
            <p className="mt-2 text-sm text-lux-text-muted">불러오는 중</p>
          ) : !audit.ok ? (
            <AdminFetchNote failure={audit.failure} />
          ) : auditItems == null ? (
            <AdminTruth value={null} />
          ) : auditItems.length === 0 ? (
            <p className="mt-2 text-sm text-lux-text-muted">기록이 없습니다.</p>
          ) : (
            <ul className="mt-2 space-y-1 text-sm">
              {auditItems.slice(0, 8).map((row, idx) => (
                <li key={readText(row.id) ?? String(idx)}>
                  <AdminTruth value={readText(row.change_reason) ?? readText(row.changeReason)} />{" "}
                  <AdminTruth value={readText(row.created_at) ?? readText(row.createdAt)} />
                </li>
              ))}
            </ul>
          )}
        </section>
        {actionNote ? (
          <p className="text-sm text-lux-text-muted">{actionNote}</p>
        ) : null}
      </section>
    </main>
  );
}
