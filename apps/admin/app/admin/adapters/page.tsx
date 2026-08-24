"use client";

import { useEffect, useState } from "react";
import { T } from "@aipo/ui/copy/ko";
import { adminGet, type AdminResult } from "../../../lib/admin-api";
import {
  formatDateTimeKo,
  readStatusLabel,
  readText,
  statusTone,
} from "../../../lib/admin-truth";
import { useAdminSessionRevision } from "../../../lib/use-admin-session";
import { AdminFetchNote, AdminTruth } from "../../../components/AdminTruth";

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
  lastIngestAt?: unknown;
  lastError?: unknown;
  observationCount24h?: unknown;
  alerts?: unknown;
  circuitState?: unknown;
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

function sourceStatus(row: HealthItem | undefined, id: string): { label: string; tone: "good" | "warn" | "danger" | "neutral" } {
  const raw = readText(row?.status)?.toLowerCase();
  const health = readText(row?.healthStatus)?.toUpperCase();
  if (health === "BLOCKED" || raw === "red") return { label: "오류 · 확인 필요", tone: "danger" };
  if (raw === "yellow") return { label: "지연·확인 필요", tone: "warn" };
  if (raw === "green") return { label: "정상 수집", tone: "good" };
  if (id === "amazon" || id === "yahoo_jp") return { label: "연결 준비 중", tone: "neutral" };
  return { label: "아직 수집 기록 없음", tone: "neutral" };
}

export default function Page() {
  const sessionRevision = useAdminSessionRevision();
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
  }, [sessionRevision]);

  const rows = health?.ok && Array.isArray(health.data.items) ? health.data.items : null;
  const reviewCount = review?.ok
    ? Array.isArray(review.data.items)
      ? review.data.items.length
      : Number(review.data.count ?? 0)
    : null;

  return (
    <main className="p-6 text-lux-text" data-surface="admin-adapters" data-testid="admin-adapters-page">
      <p className="admin-eyebrow">가격 소스 운영</p>
      <h1 className="mt-1 text-3xl font-extrabold tracking-tight">{T.admin.navigation.adapters}</h1>
      <p className="mt-2 max-w-3xl text-sm text-lux-text-muted">
        해외 가격이 실제로 들어오는지, 마지막 수집이 언제였는지, 같은 상품끼리 정확히 연결되는지 확인합니다.
      </p>

      <section className="mt-6 rounded-2xl border border-lux-border p-4" data-kpi="matching" data-testid="adapter-matching-kpi">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold">상품 연결 정확도 · 최근 24시간</h2>
            <p className="mt-1 text-sm text-lux-text-muted">기준을 넘으면 자동 공개 범위를 줄이고 관리자에게 알려 줍니다.</p>
          </div>
          <span className="admin-status-chip" data-tone={reviewCount && reviewCount > 0 ? "warn" : "good"}>
            직접 확인 {reviewCount == null ? "—" : `${reviewCount}건`}
          </span>
        </div>
        <div className="admin-stat-grid mt-4">
          <KpiCard label="상품 번호 연결 실패" value={percentLabel(kpi?.ok ? kpi.data.skuMatchFailureRate : null)} threshold="15%" />
          <KpiCard label="상품 정보 불일치" value={readText(kpi?.ok ? kpi.data.gradeMismatchCount : null)} threshold="건수 확인" />
          <KpiCard label="가격 비교 준비 실패" value={percentLabel(kpi?.ok ? kpi.data.compareReadyFalseRatio : null)} threshold="40%" />
          <KpiCard label="행사 시작 전 실패율" value={percentLabel(kpi?.ok ? kpi.data.adapterMatchFailureRate : null)} threshold="15%" />
        </div>
        <div className="mt-4 rounded-xl border border-lux-border/70 px-3 py-3 text-sm" data-role="adapter-alerts" data-event="adapter.health.changed">
          <strong>가격 확인 알림</strong>
          {kpi?.ok && Array.isArray(kpi.data.alerts) && kpi.data.alerts.length > 0 ? (
            <ul className="mt-2 list-disc space-y-1 pl-5 text-lux-text-muted">
              {kpi.data.alerts.map((alert, idx) => <li key={idx}>{readText(alert.messageKo) ?? "가격 소스를 확인해 주세요."}</li>)}
            </ul>
          ) : (
            <p className="mt-1 text-xs text-lux-text-muted">현재 표시할 가격 수집 알림이 없습니다.</p>
          )}
        </div>
        <p className="mt-2 text-xs text-lux-text-muted" data-lock="yahoo0" data-day1-auto-publish-yahoo-jp="false">
          야후 일본 경매 가격은 당일 자동 공개에 사용하지 않습니다.
        </p>
      </section>

      <section className="mt-6 rounded-2xl border border-lux-border p-4" data-testid="identity-review-queue" data-surface="identity-review-queue">
        <h2 className="text-lg font-bold">상품 연결 확인 요청</h2>
        <p className="mt-1 text-sm text-lux-text-muted">이베이 상품을 내부 상품과 정확히 연결하지 못하면 여기에 남깁니다. 확인하지 못한 상품을 조용히 버리지 않습니다.</p>
        <div className="mt-3 text-sm" data-field="identityReviewCount" data-silent-drop="false">
          {!review ? <p>{T.admin.state.loading}</p> : !review.ok ? <AdminFetchNote failure={review.failure} /> : Array.isArray(review.data.items) && review.data.items.length === 0 ? <div className="admin-empty-state">현재 직접 확인할 상품이 없습니다.</div> : Array.isArray(review.data.items) ? (
            <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>상품 검색어</th><th>상품 번호</th></tr></thead><tbody>{review.data.items.map((item, idx) => <tr key={readText(item.assetId) ?? String(idx)}><td data-label="상품 검색어">{readText(item.searchQuery) ?? "—"}</td><td data-label="상품 번호" className="admin-mono">{readText(item.assetId) ?? "—"}</td></tr>)}</tbody></table></div>
          ) : <AdminTruth value={null} />}
        </div>
      </section>

      <section className="mt-6 rounded-2xl border border-lux-border p-4">
        <h2 className="text-lg font-bold">가격을 가져오는 곳</h2>
        <p className="mt-1 text-sm text-lux-text-muted">‘unknown’ 대신 실제 운영 의미와 마지막 수집 정보를 보여 줍니다.</p>
        {!health ? <p className="mt-4 text-sm text-lux-text-muted">{T.admin.state.loading}</p> : !health.ok ? <AdminFetchNote failure={health.failure} /> : (
          <div className="admin-table-wrap mt-4">
            <table className="admin-table" data-testid="adapter-health-table">
              <thead><tr><th>가격 소스</th><th>상태</th><th>최근 수집</th><th>24시간 수집량</th><th>상품 연결 실패율</th><th>최근 오류</th></tr></thead>
              <tbody>
                {COLLECTORS.map((collector) => {
                  const row = rows?.find((r) => readText(r.adapterId) === collector.id);
                  const state = sourceStatus(row, collector.id);
                  return (
                    <tr key={collector.id} data-adapter={collector.id}>
                      <td data-label="가격 소스"><strong>{collector.label}</strong><div className="mt-1 text-xs text-lux-text-muted">{collector.role}</div></td>
                      <td data-label="상태"><span className="admin-status-chip" data-tone={state.tone}>{state.label}</span>{readText(row?.circuitState) ? <div className="mt-1 text-xs text-lux-text-muted">회로 {readText(row?.circuitState)}</div> : null}</td>
                      <td data-label="최근 수집">{formatDateTimeKo(row?.lastIngestAt) ?? (collector.id === "amazon" || collector.id === "yahoo_jp" ? "연결 전" : "기록 없음")}</td>
                      <td data-label="24시간 수집량">{readText(row?.observationCount24h) ?? "0"}</td>
                      <td data-label="상품 연결 실패율">{percentLabel(row?.skuMatchFailureRate) ?? "측정 전"}</td>
                      <td data-label="최근 오류">{readText(row?.lastError) ?? "없음"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="mt-6 rounded-2xl border border-lux-border p-4">
        <h2 className="text-lg font-bold">당일 가격 비교 범위</h2>
        <ul className="mt-3 list-inside list-disc space-y-1 text-sm text-lux-text-muted">
          {LISTING_LEGS.map((leg) => <li key={leg}>{leg}</li>)}
        </ul>
      </section>

      <section className="mt-6 rounded-2xl border border-lux-border p-4">
        <h2 className="text-lg font-bold">공식 협력 가격 제공처 · 연결 준비 중</h2>
        <ul className="mt-3 list-inside list-disc space-y-1 text-sm text-lux-text-muted">
          {PHASE1_PARTNER_LEGS.map((leg) => <li key={leg}>{leg}</li>)}
        </ul>
      </section>

      <p className="mt-6 text-xs text-lux-text-muted" data-forbid="day1_yahoo_jp_auto_publish">
        당일 기회 자동 공개는 이베이·운영자 기준가만 씁니다. 아마존·야후 일본은 공식 가격 연결을 마친 뒤에만 자동 공개에 사용합니다.
      </p>
      <p className="mt-2 text-xs text-lux-text-muted" data-lock="proximity-limit-owns" data-owns="execution-policy">
        아쉽게 놓친 기회의 금액 한도는 ‘수익 진행 기준’에서만 바꿀 수 있습니다.
      </p>
    </main>
  );
}

function KpiCard({ label, value, threshold }: { label: string; value: string | null; threshold: string }) {
  return (
    <div className="admin-stat-card">
      <p className="admin-stat-label">{label}</p>
      <p className="admin-stat-value"><AdminTruth value={value} /></p>
      <p className="mt-2 text-xs text-lux-text-muted">확인 기준 {threshold}</p>
    </div>
  );
}
