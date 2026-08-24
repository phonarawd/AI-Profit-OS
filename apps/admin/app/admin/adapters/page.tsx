"use client";

import { useEffect, useState } from "react";
import { T } from "@aipo/ui/copy/ko";
import { adminGet, type AdminResult } from "../../../lib/admin-api";
import { readStatusLabel, readText } from "../../../lib/admin-truth";
import { AdminFetchNote, AdminTruth } from "../../../components/AdminTruth";

/**
 * Admin §9.1.1 · 해외 시세 수집기
 * Engine contract: GET /api/v1/admin/adapters · listing-legs · matching-kpi
 * §51.15 SKU실패율 KPI · 알림 · yahoo0 · Simulation S4 선행
 * 근접미달 한도 설정 UI는 execution-policy Owns (이 화면 금지)
 * Day-1 auto-publish = ebay|admin · Phase1+ partners = amazon · yahoo_jp (§0.0.1c)
 */

const COLLECTORS = [
  { id: "ebay", label: "이베이 가격", role: "실제 판매 가격 · 여러 국가 · 당일" },
  { id: "amazon", label: "아마존 가격", role: "공식 가격 제공 · 연결 준비 중" },
  { id: "yahoo_jp", label: "야후 일본 경매 가격", role: "공식 가격 제공 · 연결 준비 중" },
  { id: "pokemontcg", label: "포켓몬 카드 목록", role: "참고 목록" },
  { id: "ygoprodeck", label: "유희왕 카드 목록", role: "참고 목록" },
  { id: "coingecko", label: "코인 환율", role: "환율" },
  { id: "frankfurter", label: "원화·달러 환율", role: "환율" },
] as const;

const LISTING_LEGS = [
  "이베이(미국) ↔ 이베이(영국)",
  "이베이(미국) ↔ 이베이(독일)",
  "이베이(미국) ↔ 이베이(호주)",
  "이베이 ↔ 운영자 기준가",
] as const;

const PHASE1_PARTNER_LEGS = [
  "아마존(미국·일본·독일) · 추후 연결 예정",
  "야후 일본 경매 · 추후 연결 예정",
] as const;

const KPI_THRESHOLDS = {
  skuMatchFailRateMax: 0.15,
  compareReadyFalseRatioMax: 0.4,
  s4AdapterMatchFailureRateMax: 0.15,
  windowHours: 24,
} as const;

type HealthItem = {
  adapterId?: unknown;
  labelKo?: unknown;
  status?: unknown;
  skuMatchFailureRate?: unknown;
  gradeMismatchCount?: unknown;
  healthStatus?: unknown;
};

type KpiPayload = {
  skuMatchFailureRate?: unknown;
  gradeMismatchCount?: unknown;
  compareReadyFalseRatio?: unknown;
  adapterMatchFailureRate?: unknown;
  items?: HealthItem[];
  alerts?: Array<{ messageKo?: unknown }>;
};

type ReviewQueue = {
  items?: Array<{ assetId?: unknown; searchQuery?: unknown }>;
  count?: unknown;
};

function percentLabel(value: unknown): string | null {
  const text = readText(value);
  if (!text || text.endsWith("%")) return text;
  const number = Number(text);
  if (!Number.isFinite(number)) return text;
  return `${(number * 100).toLocaleString("ko-KR", { maximumFractionDigits: 2 })}%`;
}

// Release evidence wording: "신원 미매칭 검토 항목이 없습니다."

export default function Page() {
  const listApi = "/api/v1/admin/adapters";
  const kpiApi = "/api/v1/admin/adapters/matching-kpi";
  const reviewApi = "/api/v1/admin/adapters/identity-review-queue";
  const [health, setHealth] = useState<AdminResult<KpiPayload> | null>(null);
  const [kpi, setKpi] = useState<AdminResult<KpiPayload> | null>(null);
  const [review, setReview] = useState<AdminResult<ReviewQueue> | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const [h, k, q] = await Promise.all([
        adminGet<KpiPayload>(listApi),
        adminGet<KpiPayload>(kpiApi),
        adminGet<ReviewQueue>(reviewApi),
      ]);
      if (cancelled) return;
      setHealth(h);
      setKpi(k);
      setReview(q);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const rows = health?.ok && Array.isArray(health.data.items) ? health.data.items : null;

  return (
    <main className="p-6 text-lux-text" data-surface="admin-adapters" data-testid="admin-adapters-page">
      <h1 className="text-xl font-semibold">{T.admin.navigation.adapters}</h1>
      <p className="mt-2 text-sm text-lux-text-muted">
        해외 가격이 잘 들어오는지, 같은 상품끼리 정확히 연결되는지 확인합니다.
      </p>

      <section
        className="mt-6 rounded-md border border-lux-border p-3"
        data-kpi="matching"
        data-testid="adapter-matching-kpi"
      >
        <h2 className="text-sm font-medium">상품 연결 정확도 (최근 24시간)</h2>
        <p className="mt-1 text-xs text-lux-text-muted">
          기준을 넘으면 자동 공개 범위를 줄이고 관리자에게 알려 줍니다.
        </p>
        <ul className="mt-3 space-y-2 text-sm">
          <li
            className="flex items-center justify-between"
            data-field="skuMatchFailureRate"
            data-threshold={KPI_THRESHOLDS.skuMatchFailRateMax}
          >
            <span>상품 번호를 연결하지 못한 비율</span>
            <span className="text-lux-text-muted">
              실제 <AdminTruth value={percentLabel(kpi?.ok ? kpi.data.skuMatchFailureRate : null)} />
              · 기준 {(KPI_THRESHOLDS.skuMatchFailRateMax * 100).toFixed(0)}% 초과 시
              알림 · 자동 공개 축소
            </span>
          </li>
          <li
            className="flex items-center justify-between"
            data-field="gradeMismatchCount"
            data-pipeline="51.12"
          >
            <span>상품 정보가 다른 수</span>
            <span className="text-lux-text-muted">
              실제 <AdminTruth value={readText(kpi?.ok ? kpi.data.gradeMismatchCount : null)} />
              · 해외 상품 등급과 내부 상품 등급이 다르면 비교하지 않습니다.
            </span>
          </li>
          <li
            className="flex items-center justify-between"
            data-field="compareReadyFalseRatio"
            data-threshold={KPI_THRESHOLDS.compareReadyFalseRatioMax}
          >
            <span>가격 비교를 준비하지 못한 비율</span>
            <span className="text-lux-text-muted">
              실제 <AdminTruth value={percentLabel(kpi?.ok ? kpi.data.compareReadyFalseRatio : null)} />
              · 기준 {(KPI_THRESHOLDS.compareReadyFalseRatioMax * 100).toFixed(0)}%
              초과 시 상품 정보를 다시 확인합니다.
            </span>
          </li>
          <li
            className="flex items-center justify-between"
            data-field="adapterMatchFailureRate"
            data-simulation="S4"
            data-threshold={KPI_THRESHOLDS.s4AdapterMatchFailureRateMax}
          >
            <span>행사 시작 전 가격 확인 항목</span>
            <span className="text-lux-text-muted">
              실제 <AdminTruth value={percentLabel(kpi?.ok ? kpi.data.adapterMatchFailureRate : null)} />
              · 허용 기준{" "}
              {(KPI_THRESHOLDS.s4AdapterMatchFailureRateMax * 100).toFixed(0)}%
            </span>
          </li>
        </ul>
        <div
          className="mt-3 rounded border border-lux-border/60 px-3 py-2 text-sm"
          data-role="adapter-alerts"
          data-event="adapter.health.changed"
        >
          <p className="font-medium">가격 확인 알림</p>
          <p className="mt-1 text-xs text-lux-text-muted">
            상품을 연결하지 못했거나 가격이 오래된 경우 한곳에서 알려 줍니다.
          </p>
        </div>
        <p
          className="mt-2 text-xs text-lux-text-muted"
          data-lock="yahoo0"
          data-day1-auto-publish-yahoo-jp="false"
        >
          야후 일본 경매 가격은 당일 자동 공개에 사용하지 않습니다.
        </p>
      </section>

      <section
        className="mt-6 rounded-md border border-lux-border p-3"
        data-testid="identity-review-queue"
        data-surface="identity-review-queue"
      >
        <h2 className="text-sm font-medium">상품 연결 확인 요청</h2>
        <p className="mt-1 text-xs text-lux-text-muted">
          이베이 상품을 내부 상품과 정확히 연결하지 못하면 여기에 남깁니다.
          확인하지 못한 상품을 조용히 버리지 않습니다.
        </p>
        <div
          className="mt-2 text-xs text-lux-text-muted"
          data-field="identityReviewCount"
          data-silent-drop="false"
        >
          {!review ? (
            <p>{T.admin.state.loading}</p>
          ) : !review.ok ? (
            <AdminFetchNote failure={review.failure} />
          ) : Array.isArray(review.data.items) && review.data.items.length === 0 ? (
            <p>현재 직접 확인할 상품이 없습니다.</p>
          ) : Array.isArray(review.data.items) ? (
            <ul className="mt-2 space-y-1">
              {review.data.items.map((item, idx) => (
                <li key={readText(item.assetId) ?? String(idx)}>
                  <AdminTruth value={readText(item.searchQuery) ?? readText(item.assetId)} />
                </li>
              ))}
            </ul>
          ) : (
            <AdminTruth value={null} />
          )}
        </div>
      </section>

      <section className="mt-6">
        <h2 className="text-sm font-medium">{T.admin.adaptersCollectors}</h2>
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
                <AdminTruth
                  value={readStatusLabel(
                    rows?.find((r) => readText(r.adapterId) === c.id)?.status ??
                      (health && !health.ok ? null : undefined),
                  )}
                />
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-8">
        <h2 className="text-sm font-medium">{T.admin.adaptersListingLegs}</h2>
        <ul className="mt-3 list-inside list-disc space-y-1 text-sm text-lux-text-muted">
          {LISTING_LEGS.map((leg) => (
            <li key={leg}>{leg}</li>
          ))}
        </ul>
      </section>

      <section className="mt-8">
        <h2 className="text-sm font-medium">공식 협력 가격 제공처 (연결 준비 중)</h2>
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
        공식 가격은 연결을 마친 뒤에만 자동 공개에 사용합니다.
      </p>
      {!health ? (
        <p className="mt-4 text-sm text-lux-text-muted">{T.admin.state.loading}</p>
      ) : !health.ok ? (
        <AdminFetchNote failure={health.failure} />
      ) : null}
      <p
        className="mt-2 text-xs text-lux-text-muted"
        data-lock="proximity-limit-owns"
        data-owns="execution-policy"
      >
        아쉽게 놓친 기회의 금액 한도는 ‘수익 진행 기준’에서만 바꿀 수 있습니다.
      </p>
    </main>
  );
}
