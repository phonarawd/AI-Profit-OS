"use client";

import { useEffect, useState } from "react";
import { adminGet, adminSend, type AdminResult } from "../../../lib/admin-api";
import { readText } from "../../../lib/admin-truth";
import { AdminFetchNote, AdminTruth } from "../../../components/AdminTruth";

/**
 * Admin §9.1.1 / §48.6 — 진행 정책
 * Engine §48.13.3 Owns: matchStrictness→policy 맵 · Soft60/Hard90 표시
 * Engine §0.0.5.1 Owns: feed.nearMissCapUsdt SSOT (adapters 설정 UI 금지)
 * FORBIDDEN: successRatePercent · 난수 성공률 슬라이더 · 클라이언트 money 계산
 */
// route lock: execution-policy

const STRICTNESS_OPTIONS = [
  { value: "lenient", label: "여유" },
  { value: "standard", label: "표준" },
  { value: "tight", label: "타이트" },
  { value: "scarce", label: "희소" },
  { value: "custom", label: "직접 설정" },
] as const;

type Strictness = (typeof STRICTNESS_OPTIONS)[number]["value"];

const POLICY_API = "/api/v1/admin/execution-policy";
const STATS_API = "/api/v1/admin/execution-policy/stats/today";
const CHANGE_REASON_MIN = 4;

type PolicyBody = {
  matchStrictness?: unknown;
  minProfitUsdt?: unknown;
  staleAllowanceSec?: unknown;
  maxRematchCount?: unknown;
  retryWaitSec?: unknown;
  slippageBoundBps?: unknown;
  dailyUserMatchCap?: unknown;
  dailyOppSlotsDefault?: unknown;
  autoCancelOnShortfall?: unknown;
  membershipBandOverlayEnabled?: unknown;
  feed?: { nearMissCapUsdt?: unknown } | null;
  updatedAt?: unknown;
};

type SoftHard = {
  softSec?: unknown;
  hardSec?: unknown;
  membershipUniform?: unknown;
};

type PresetRow = {
  minProfitUsdt?: unknown;
  staleAllowanceSec?: unknown;
  maxRematchCount?: unknown;
};

type PolicyPayload = {
  policy?: PolicyBody;
  softHard?: SoftHard;
  presets?: Partial<Record<Exclude<Strictness, "custom">, PresetRow>>;
  observedWriteForbidden?: unknown;
};

type TodayStats = {
  day?: unknown;
  successCount?: unknown;
  priceMovedCount?: unknown;
  belowMinProfitCount?: unknown;
  requeueCount?: unknown;
  otherTerminalCount?: unknown;
  denominator?: unknown;
  observedSuccessRate?: unknown;
  readOnly?: unknown;
};

function isStrictness(value: string): value is Strictness {
  return STRICTNESS_OPTIONS.some((opt) => opt.value === value);
}

function asPayload(data: unknown): PolicyPayload | null {
  if (!data || typeof data !== "object") return null;
  return data as PolicyPayload;
}

function asStats(data: unknown): TodayStats | null {
  if (!data || typeof data !== "object") return null;
  return data as TodayStats;
}

function decimalOk(value: string): boolean {
  return /^[0-9]+(\.[0-9]+)?$/.test(value);
}

export default function Page() {
  const [policyRes, setPolicyRes] = useState<AdminResult<unknown> | null>(null);
  const [statsRes, setStatsRes] = useState<AdminResult<unknown> | null>(null);
  const [strictness, setStrictness] = useState<Strictness>("standard");
  const [nearMissCap, setNearMissCap] = useState("");
  const [minProfitUsdt, setMinProfitUsdt] = useState("");
  const [staleAllowanceSec, setStaleAllowanceSec] = useState("");
  const [maxRematchCount, setMaxRematchCount] = useState("");
  const [slippageBoundBps, setSlippageBoundBps] = useState("");
  const [dailyUserMatchCap, setDailyUserMatchCap] = useState("");
  const [dailyOppSlotsDefault, setDailyOppSlotsDefault] = useState("");
  const [changeReason, setChangeReason] = useState("");
  const [actionNote, setActionNote] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function applyPolicy(data: unknown) {
    const payload = asPayload(data);
    const policy = payload?.policy;
    const nextStrict = readText(policy?.matchStrictness);
    if (nextStrict && isStrictness(nextStrict)) setStrictness(nextStrict);
    setNearMissCap(readText(policy?.feed?.nearMissCapUsdt) ?? "");
    setMinProfitUsdt(readText(policy?.minProfitUsdt) ?? "");
    setStaleAllowanceSec(readText(policy?.staleAllowanceSec) ?? "");
    setMaxRematchCount(readText(policy?.maxRematchCount) ?? "");
    setSlippageBoundBps(readText(policy?.slippageBoundBps) ?? "");
    setDailyUserMatchCap(readText(policy?.dailyUserMatchCap) ?? "");
    setDailyOppSlotsDefault(readText(policy?.dailyOppSlotsDefault) ?? "");
  }

  async function refresh() {
    const [nextPolicy, nextStats] = await Promise.all([
      adminGet<unknown>(POLICY_API),
      adminGet<unknown>(STATS_API),
    ]);
    setPolicyRes(nextPolicy);
    setStatsRes(nextStats);
    if (nextPolicy.ok) applyPolicy(nextPolicy.data);
  }

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const [nextPolicy, nextStats] = await Promise.all([
        adminGet<unknown>(POLICY_API),
        adminGet<unknown>(STATS_API),
      ]);
      if (cancelled) return;
      setPolicyRes(nextPolicy);
      setStatsRes(nextStats);
      if (nextPolicy.ok) applyPolicy(nextPolicy.data);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function savePolicy() {
    const reason = changeReason.trim();
    if (reason.length < CHANGE_REASON_MIN) {
      setActionNote("변경 사유는 4자 이상이어야 합니다.");
      return;
    }
    if (!decimalOk(nearMissCap)) {
      setActionNote("근접미달 한도는 서버에 보낼 숫자여야 합니다.");
      return;
    }
    if (strictness === "custom") {
      if (!decimalOk(minProfitUsdt)) {
        setActionNote("직접 설정 최소수익이 없습니다.");
        return;
      }
      if (
        !readText(staleAllowanceSec) ||
        !readText(maxRematchCount) ||
        !readText(slippageBoundBps) ||
        !readText(dailyUserMatchCap) ||
        !readText(dailyOppSlotsDefault)
      ) {
        setActionNote("직접 설정 값이 없습니다. 추측 숫자는 넣지 않습니다.");
        return;
      }
    }
    if (!window.confirm("진행 정책을 저장할까요?")) return;

    const body: Record<string, unknown> = {
      matchStrictness: strictness,
      changeReason: reason,
      feed: { nearMissCapUsdt: nearMissCap },
    };
    if (strictness === "custom") {
      body.minProfitUsdt = minProfitUsdt;
      body.staleAllowanceSec = Number(staleAllowanceSec);
      body.maxRematchCount = Number(maxRematchCount);
      body.slippageBoundBps = Number(slippageBoundBps);
      body.dailyUserMatchCap = Number(dailyUserMatchCap);
      body.dailyOppSlotsDefault = Number(dailyOppSlotsDefault);
    }

    setSaving(true);
    const res = await adminSend(POLICY_API, "PUT", body);
    setSaving(false);
    setActionNote(res.ok ? "반영했습니다." : "반영하지 못했습니다.");
    if (res.ok) {
      setChangeReason("");
      await refresh();
    }
  }

  const payload = policyRes?.ok ? asPayload(policyRes.data) : null;
  const policy = payload?.policy;
  const presets = payload?.presets;
  const stats = statsRes?.ok ? asStats(statsRes.data) : null;
  const noObservedToday =
    stats != null &&
    stats.observedSuccessRate == null &&
    (stats.denominator === 0 || stats.denominator === "0");

  return (
    <main
      className="p-6 text-lux-text"
      data-testid="admin-execution-policy-page"
    >
      <h1 className="text-xl font-semibold">진행 정책</h1>
      <p className="mt-2 text-sm text-lux-text-muted">
        매칭 성공 조절 · Soft60/Hard90 · 근접미달 한도 · 난수 성공률 없음
      </p>

      <section
        className="mt-6 space-y-3"
        data-surface="execution-policy"
        data-policy-api={POLICY_API}
        data-stats-api={STATS_API}
        data-change-reason-min={CHANGE_REASON_MIN}
      >
        <p className="text-sm text-lux-text-muted">API: {POLICY_API}</p>

        {!policyRes ? (
          <p className="text-sm text-lux-text-muted">불러오는 중</p>
        ) : !policyRes.ok ? (
          <AdminFetchNote failure={policyRes.failure} />
        ) : !payload?.policy ? (
          <p className="text-sm text-lux-text-muted">
            저장된 진행 정책이 없습니다.
          </p>
        ) : (
          <>
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
              <div className="mt-3 flex flex-wrap gap-2">
                {STRICTNESS_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    data-strictness={opt.value}
                    aria-pressed={strictness === opt.value}
                    className={
                      strictness === opt.value
                        ? "rounded border border-lux-border bg-lux-elevated px-3 py-1.5 text-sm"
                        : "rounded border border-lux-border px-3 py-1.5 text-sm"
                    }
                    onClick={() => setStrictness(opt.value)}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              <ul
                className="mt-3 space-y-1 text-xs text-lux-text-muted"
                data-map="matchStrictness-presets"
              >
                <li data-preset="lenient">
                  여유 → minProfit{" "}
                  <AdminTruth
                    value={readText(presets?.lenient?.minProfitUsdt)}
                  />{" "}
                  · stale{" "}
                  <AdminTruth
                    value={readText(presets?.lenient?.staleAllowanceSec)}
                  />{" "}
                  · rematch{" "}
                  <AdminTruth
                    value={readText(presets?.lenient?.maxRematchCount)}
                  />
                </li>
                <li data-preset="standard">
                  표준 → minProfit{" "}
                  <AdminTruth
                    value={readText(presets?.standard?.minProfitUsdt)}
                  />{" "}
                  · stale{" "}
                  <AdminTruth
                    value={readText(presets?.standard?.staleAllowanceSec)}
                  />{" "}
                  · rematch{" "}
                  <AdminTruth
                    value={readText(presets?.standard?.maxRematchCount)}
                  />
                </li>
                <li data-preset="tight">
                  타이트 → minProfit{" "}
                  <AdminTruth
                    value={readText(presets?.tight?.minProfitUsdt)}
                  />{" "}
                  · stale{" "}
                  <AdminTruth
                    value={readText(presets?.tight?.staleAllowanceSec)}
                  />{" "}
                  · rematch{" "}
                  <AdminTruth
                    value={readText(presets?.tight?.maxRematchCount)}
                  />
                </li>
                <li data-preset="scarce">
                  희소 → minProfit{" "}
                  <AdminTruth
                    value={readText(presets?.scarce?.minProfitUsdt)}
                  />{" "}
                  · stale{" "}
                  <AdminTruth
                    value={readText(presets?.scarce?.staleAllowanceSec)}
                  />{" "}
                  · rematch{" "}
                  <AdminTruth
                    value={readText(presets?.scarce?.maxRematchCount)}
                  />
                </li>
              </ul>
              <p className="mt-3 text-sm">
                현재 최소수익 <AdminTruth value={readText(policy?.minProfitUsdt)} />{" "}
                USDT · 시세허용{" "}
                <AdminTruth value={readText(policy?.staleAllowanceSec)} />초 ·
                재매칭 <AdminTruth value={readText(policy?.maxRematchCount)} />
              </p>
            </div>

            {strictness === "custom" ? (
              <div className="grid max-w-xl gap-3 rounded border border-lux-border p-3 text-sm">
                <label>
                  최소수익 (USDT)
                  <input
                    className="mt-1 w-full rounded border border-lux-border bg-transparent px-3 py-2"
                    value={minProfitUsdt}
                    onChange={(e) => setMinProfitUsdt(e.target.value)}
                    inputMode="decimal"
                  />
                </label>
                <label>
                  시세 허용 (초)
                  <input
                    className="mt-1 w-full rounded border border-lux-border bg-transparent px-3 py-2"
                    value={staleAllowanceSec}
                    onChange={(e) => setStaleAllowanceSec(e.target.value)}
                    inputMode="numeric"
                  />
                </label>
                <label>
                  재매칭 횟수
                  <input
                    className="mt-1 w-full rounded border border-lux-border bg-transparent px-3 py-2"
                    value={maxRematchCount}
                    onChange={(e) => setMaxRematchCount(e.target.value)}
                    inputMode="numeric"
                  />
                </label>
                <label>
                  슬리피지 (bps)
                  <input
                    className="mt-1 w-full rounded border border-lux-border bg-transparent px-3 py-2"
                    value={slippageBoundBps}
                    onChange={(e) => setSlippageBoundBps(e.target.value)}
                    inputMode="numeric"
                  />
                </label>
                <label>
                  회원 일일 매칭 한도
                  <input
                    className="mt-1 w-full rounded border border-lux-border bg-transparent px-3 py-2"
                    value={dailyUserMatchCap}
                    onChange={(e) => setDailyUserMatchCap(e.target.value)}
                    inputMode="numeric"
                  />
                </label>
                <label>
                  기회 기본 슬롯
                  <input
                    className="mt-1 w-full rounded border border-lux-border bg-transparent px-3 py-2"
                    value={dailyOppSlotsDefault}
                    onChange={(e) => setDailyOppSlotsDefault(e.target.value)}
                    inputMode="numeric"
                  />
                </label>
              </div>
            ) : null}

            <div
              className="rounded border border-lux-border p-3 text-sm"
              data-lock="soft-hard"
              data-soft-sec="60"
              data-hard-sec="90"
              data-membership-uniform="true"
            >
              <p className="font-medium">대기 한도 (전 등급 동일)</p>
              <p className="mt-1 text-lux-text-muted">
                Soft <AdminTruth value={readText(payload.softHard?.softSec)} />초
                · Hard <AdminTruth value={readText(payload.softHard?.hardSec)} />
                초 · 등급으로 단축 없음 · 연출 시간과 무관
              </p>
            </div>

            <label className="block text-sm" data-field="feed.nearMissCapUsdt">
              <span className="font-medium">근접미달 한도 (USDT)</span>
              <span className="mt-1 block text-lux-text-muted">
                feed.nearMissCapUsdt · Engine §0.0.5.1 · 기본 max(50, 원금×0.25)
              </span>
              <input
                type="text"
                inputMode="decimal"
                name="feed.nearMissCapUsdt"
                data-testid="near-miss-cap-usdt"
                className="mt-2 w-full max-w-xs rounded border border-lux-border bg-transparent px-3 py-2"
                value={nearMissCap}
                onChange={(e) => setNearMissCap(e.target.value)}
                placeholder=""
              />
            </label>
            <p
              className="text-sm text-lux-text-muted"
              data-lock="nearMissCap-owns"
              data-owns="execution-policy"
            >
              근접미달 한도 설정은 이 화면만 · 수집기 화면 금지
            </p>

            <label className="block text-sm" htmlFor="execution-policy-reason">
              변경 사유
            </label>
            <textarea
              id="execution-policy-reason"
              value={changeReason}
              onChange={(e) => setChangeReason(e.target.value)}
              className="w-full max-w-md rounded border border-lux-border bg-lux-bg px-2 py-1 text-sm"
            />
            <button
              type="button"
              className="rounded bg-lux-elevated px-3 py-1.5 text-sm"
              disabled={saving}
              onClick={() => void savePolicy()}
            >
              저장
            </button>
            {actionNote ? (
              <p className="text-sm text-lux-text-muted">{actionNote}</p>
            ) : null}
            <p className="text-xs text-lux-text-muted">
              마지막 변경{" "}
              <AdminTruth value={readText(policy?.updatedAt)} />
            </p>
          </>
        )}

        <div
          className="rounded border border-lux-border p-3"
          data-kpi="observedSuccessRate"
          data-readonly="true"
        >
          <p className="text-sm font-medium">오늘 실제 성공 %</p>
          <p className="mt-1 text-sm text-lux-text-muted">
            관측 KPI · 읽기전용 · 목표 %로 자동 맞춤 없음 · 이 화면에서 비율을
            계산하지 않음
          </p>
          <p className="mt-2 text-xs text-lux-text-muted">API: {STATS_API}</p>
          {!statsRes ? (
            <p className="mt-2 text-sm text-lux-text-muted">불러오는 중</p>
          ) : !statsRes.ok ? (
            <AdminFetchNote failure={statsRes.failure} />
          ) : noObservedToday ? (
            <p className="mt-2 text-sm text-lux-text-muted">
              오늘 관측된 종료 건이 없습니다.
            </p>
          ) : (
            <div className="mt-2 space-y-1 text-sm">
              <p>
                관측 성공 비율{" "}
                <AdminTruth
                  testId="observed-success-rate"
                  value={readText(stats?.observedSuccessRate)}
                />
              </p>
              <p>
                성공 <AdminTruth value={readText(stats?.successCount)} /> · 분모{" "}
                <AdminTruth value={readText(stats?.denominator)} />
              </p>
              <p>
                시세변동{" "}
                <AdminTruth value={readText(stats?.priceMovedCount)} /> ·
                최소수익미달{" "}
                <AdminTruth value={readText(stats?.belowMinProfitCount)} /> ·
                재대기 <AdminTruth value={readText(stats?.requeueCount)} />
              </p>
            </div>
          )}
        </div>

        <p
          className="text-sm text-lux-text-muted"
          data-forbid="successRatePercent"
        >
          금지: 난수 성공률 · 목표 성공률 슬라이더 없음
        </p>
      </section>
    </main>
  );
}
