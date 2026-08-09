"use client";

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

export default function Page() {
  return (
    <main className="p-6 text-lux-text">
      <h1 className="text-xl font-semibold">진행 정책</h1>
      <p className="mt-2 text-sm text-lux-text-muted">
        매칭 성공 조절 · Soft60/Hard90 · 근접미달 한도 · 난수 성공률 없음
      </p>

      <section className="mt-6 space-y-3" data-surface="execution-policy">
        <p className="text-sm text-lux-text-muted">
          API: GET/PUT /api/v1/admin/execution-policy
        </p>

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
                className="rounded border border-lux-border px-3 py-1.5 text-sm"
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
            Soft {60}초 · Hard {90}초 · 등급으로 단축 없음 · 연출 시간과 무관
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
            placeholder="50"
            defaultValue=""
            readOnly
            aria-readonly="true"
          />
        </label>
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
          <p className="mt-2 text-xs text-lux-text-muted">
            GET /api/v1/admin/execution-policy/stats/today
          </p>
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
