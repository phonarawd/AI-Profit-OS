"use client";

/**
 * Admin §9.1.1 · 해외 시세 수집기
 * Engine contract: GET /api/v1/admin/adapters · listing-legs · matching-kpi
 * §51.15 SKU실패율 KPI · 알림 · yahoo0 · Simulation S4 선행
 * 근접미달 한도 설정 UI는 execution-policy Owns (이 화면 금지)
 * Day-1 auto-publish = ebay|admin · Phase1+ partners = amazon · yahoo_jp (§0.0.1c)
 */

const COLLECTORS = [
  { id: "ebay", label: "이베이 시세", role: "실호가 · 여러 국가 · 당일" },
  { id: "amazon", label: "아마존 시세", role: "공식 협력 · Phase1+" },
  { id: "yahoo_jp", label: "야후 일본 경매 시세", role: "공식 협력 · Phase1+" },
  { id: "pokemontcg", label: "포켓몬 카드 목록", role: "참고 목록" },
  { id: "ygoprodeck", label: "유희왕 카드 목록", role: "참고 목록" },
  { id: "coingecko", label: "코인 환율", role: "환율" },
  { id: "frankfurter", label: "법정화폐 환율", role: "환율" },
] as const;

const LISTING_LEGS = [
  "이베이(미국) ↔ 이베이(영국)",
  "이베이(미국) ↔ 이베이(독일)",
  "이베이(미국) ↔ 이베이(호주)",
  "이베이 ↔ 운영자 기준가",
] as const;

const PHASE1_PARTNER_LEGS = [
  "아마존(미국·일본·독일) · Phase1+",
  "야후 일본 경매 · Phase1+",
] as const;

const KPI_THRESHOLDS = {
  skuMatchFailRateMax: 0.15,
  compareReadyFalseRatioMax: 0.4,
  s4AdapterMatchFailureRateMax: 0.15,
  windowHours: 24,
} as const;

export default function Page() {
  return (
    <main className="p-6 text-lux-text" data-surface="admin-adapters">
      <h1 className="text-xl font-semibold">해외 시세 수집기</h1>
      <p className="mt-2 text-sm text-lux-text-muted">
        연결 상태 · 시세 다리 · 매칭 실패율 · 공식 협력(아마존·야후 일본) Phase1+
      </p>

      <section
        className="mt-6 rounded-md border border-lux-border p-3"
        data-kpi="matching"
        data-testid="adapter-matching-kpi"
      >
        <h2 className="text-sm font-medium">매칭 실패율 (24시간)</h2>
        <p className="mt-1 text-xs text-lux-text-muted">
          Engine §51.15 · GET /api/v1/admin/adapters/matching-kpi
        </p>
        <ul className="mt-3 space-y-2 text-sm">
          <li
            className="flex items-center justify-between"
            data-field="skuMatchFailureRate"
            data-threshold={KPI_THRESHOLDS.skuMatchFailRateMax}
          >
            <span>SKU 매칭 실패율</span>
            <span className="text-lux-text-muted">
              기준 {(KPI_THRESHOLDS.skuMatchFailRateMax * 100).toFixed(0)}% 초과 시
              알림 · 자동 공개 축소
            </span>
          </li>
          <li
            className="flex items-center justify-between"
            data-field="gradeMismatchCount"
            data-pipeline="51.12"
          >
            <span>등급 불일치</span>
            <span className="text-lux-text-muted">
              listing 등급 ≠ 자산 등급 · 비교 준비 불가
            </span>
          </li>
          <li
            className="flex items-center justify-between"
            data-field="compareReadyFalseRatio"
            data-threshold={KPI_THRESHOLDS.compareReadyFalseRatioMax}
          >
            <span>비교 준비 미달 비율</span>
            <span className="text-lux-text-muted">
              기준 {(KPI_THRESHOLDS.compareReadyFalseRatioMax * 100).toFixed(0)}%
              초과 시 시드 점검
            </span>
          </li>
          <li
            className="flex items-center justify-between"
            data-field="adapterMatchFailureRate"
            data-simulation="S4"
            data-threshold={KPI_THRESHOLDS.s4AdapterMatchFailureRateMax}
          >
            <span>시뮬레이션 S4 입력</span>
            <span className="text-lux-text-muted">
              adapterMatchFailureRate ≤{" "}
              {(KPI_THRESHOLDS.s4AdapterMatchFailureRateMax * 100).toFixed(0)}%
            </span>
          </li>
        </ul>
        <div
          className="mt-3 rounded border border-lux-border/60 px-3 py-2 text-sm"
          data-role="adapter-alerts"
          data-event="adapter.health.changed"
        >
          <p className="font-medium">수집기 알림</p>
          <p className="mt-1 text-xs text-lux-text-muted">
            SKU 실패 · 비교 준비 미달 · 만료 시세(적색) · SSE adapter.health.changed
          </p>
        </div>
        <p
          className="mt-2 text-xs text-lux-text-muted"
          data-lock="yahoo0"
          data-day1-auto-publish-yahoo-jp="false"
        >
          당일 자동 공개에 야후 일본 경매는 쓰지 않습니다 (yahoo0).
        </p>
      </section>

      <section
        className="mt-6 rounded-md border border-lux-border p-3"
        data-testid="identity-review-queue"
        data-surface="identity-review-queue"
      >
        <h2 className="text-sm font-medium">신원 미매칭 검토</h2>
        <p className="mt-1 text-xs text-lux-text-muted">
          Engine §0.10 · GET /api/v1/admin/adapters/identity-review-queue · eBay
          listing이 Asset Master exact match에 실패하면 여기로 남깁니다 (조용히
          버리지 않음 · query 자리표시자 저장 금지).
        </p>
        <p
          className="mt-2 text-xs text-lux-text-muted"
          data-field="identityReviewCount"
          data-silent-drop="false"
        >
          검토 대기 항목은 Admin API identity-review-queue에서 확인합니다.
        </p>
      </section>

      <section className="mt-6">
        <h2 className="text-sm font-medium">수집기</h2>
        <ul className="mt-3 space-y-2">
          {COLLECTORS.map((c) => (
            <li
              key={c.id}
              data-adapter={c.id}
              className="flex items-center justify-between rounded-md border border-lux-border px-3 py-2 text-sm"
            >
              <span>
                {c.label}
                <span className="ml-2 text-lux-text-muted">{c.role}</span>
              </span>
              <span
                className="text-lux-text-muted"
                data-field="skuMatchFailureRate"
              >
                대기
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-8">
        <h2 className="text-sm font-medium">시세 다리 (당일 자동 공개)</h2>
        <ul className="mt-3 list-inside list-disc space-y-1 text-sm text-lux-text-muted">
          {LISTING_LEGS.map((leg) => (
            <li key={leg}>{leg}</li>
          ))}
        </ul>
      </section>

      <section className="mt-8">
        <h2 className="text-sm font-medium">공식 협력 다리 (Phase1+)</h2>
        <ul className="mt-3 list-inside list-disc space-y-1 text-sm text-lux-text-muted">
          {PHASE1_PARTNER_LEGS.map((leg) => (
            <li key={leg}>{leg}</li>
          ))}
        </ul>
      </section>

      <p
        className="mt-8 text-xs text-lux-text-muted"
        data-forbid="day1_yahoo_jp_auto_publish"
      >
        당일 기회 자동 공개는 이베이·운영자 기준가만 씁니다. 아마존·야후 일본은
        공식 협력 수집기(Phase1+)입니다.
      </p>
      <p
        className="mt-2 text-xs text-lux-text-muted"
        data-lock="proximity-limit-owns"
        data-owns="execution-policy"
      >
        근접미달 한도 설정은 진행 정책 화면만 · 이 화면 금지
      </p>
    </main>
  );
}
