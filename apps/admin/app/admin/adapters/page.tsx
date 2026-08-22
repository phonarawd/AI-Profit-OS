"use client";

import { useEffect, useState } from "react";
import {
  adminGet,
  type AdminResult,
} from "../../../lib/admin-api";
import {
  asRecordList,
  readObservedRate,
  readText,
} from "../../../lib/admin-truth";
import { AdminFetchNote, AdminTruth } from "../../../components/AdminTruth";

/**
 * Admin §9.1.1 · 해외 시세 수집기
 * Engine contract: GET /api/v1/admin/adapters · listing-legs · matching-kpi
 * §51.15 SKU실패율 KPI · 알림 · yahoo0 · Simulation S4 선행
 * 근접미달 한도 설정 UI는 execution-policy Owns (이 화면 금지)
 * Day-1 auto-publish = ebay|admin · Phase1+ partners = amazon · yahoo_jp (§0.0.1c)
 * Health/KPI SoT = existing AdaptersAdminService · 화면에서 수치 위조 0.
 */

const KPI_THRESHOLDS = {
  skuMatchFailRateMax: 0.15,
  compareReadyFalseRatioMax: 0.4,
  s4AdapterMatchFailureRateMax: 0.15,
  windowHours: 24,
} as const;

const STATUS_LABEL: Record<string, string> = {
  green: "정상",
  yellow: "주의",
  red: "장애",
  unknown: "확인할 수 없음",
};

type HealthPayload = {
  items?: unknown;
  day1AutoPublishYahooJp?: unknown;
  phase1Partners?: unknown;
  nearMissCapOwns?: unknown;
  matchingKpi?: {
    skuMatchFailureRate?: unknown;
    skuAttempts?: unknown;
    skuFailures?: unknown;
    gradeMismatchCount?: unknown;
    compareReadyFalseRatio?: unknown;
    catalogTotal?: unknown;
    adapterMatchFailureRate?: unknown;
    alerts?: unknown;
    s4?: { pass?: unknown; rate?: unknown; threshold?: unknown };
  };
};

type LegsPayload = {
  pairs?: unknown;
  day1?: unknown;
  day1AutoPublishYahooJp?: unknown;
  phase1Partners?: unknown;
};

type ReviewPayload = {
  items?: unknown;
  count?: unknown;
  silentDrop?: unknown;
};

const ROLE_LABEL: Record<string, string> = {
  listing: "시세 다리",
  catalog_ref: "참고 목록",
  fx: "환율",
};

export default function Page() {
  const [health, setHealth] = useState<AdminResult<HealthPayload> | null>(null);
  const [legs, setLegs] = useState<AdminResult<LegsPayload> | null>(null);
  const [review, setReview] = useState<AdminResult<ReviewPayload> | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const [h, l, r] = await Promise.all([
        adminGet<HealthPayload>("/api/v1/admin/adapters"),
        adminGet<LegsPayload>("/api/v1/admin/adapters/listing-legs"),
        adminGet<ReviewPayload>("/api/v1/admin/adapters/identity-review-queue"),
      ]);
      if (cancelled) return;
      setHealth(h);
      setLegs(l);
      setReview(r);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const items = health?.ok ? asRecordList(health.data.items) : null;
  const kpi = health?.ok ? health.data.matchingKpi : null;
  const alerts = kpi ? asRecordList(kpi.alerts) : null;
  const pairs = legs?.ok ? asRecordList(legs.data.pairs) : null;
  const reviewItems = review?.ok ? asRecordList(review.data.items) : null;
  const partners =
    health?.ok && Array.isArray(health.data.phase1Partners)
      ? health.data.phase1Partners.filter((p): p is string => typeof p === "string")
      : null;

  return (
    <main
      className="p-6 text-lux-text"
      data-surface="admin-adapters"
      data-testid="admin-adapters"
      data-forbid="fake-adapter-truth"
    >
      <h1 className="text-xl font-semibold">해외 시세 수집기</h1>
      <p className="mt-2 text-sm text-lux-text-muted">
        서버가 준 연결 상태만 봅니다. 없는 건강·신선도·실패율은 만들지 않습니다.
      </p>
      <p className="mt-1 text-xs text-lux-text-muted">
        시세 수집 성공은 기회 성립이 아닙니다.
      </p>

      <section
        className="mt-6 rounded-md border border-lux-border p-3"
        data-kpi="matching"
        data-testid="adapter-matching-kpi"
        data-kpi-api="/api/v1/admin/adapters/matching-kpi"
        data-list-api="/api/v1/admin/adapters"
      >
        <h2 className="text-sm font-medium">매칭 실패율 (24시간)</h2>
        <p className="mt-1 text-xs text-lux-text-muted">
          Engine §51.15 · GET /api/v1/admin/adapters/matching-kpi
        </p>
        {!health ? (
          <p className="mt-3 text-sm text-lux-text-muted">불러오는 중</p>
        ) : !health.ok ? (
          <AdminFetchNote failure={health.failure} />
        ) : (
          <ul className="mt-3 space-y-2 text-sm">
            <li
              className="flex items-center justify-between"
              data-field="skuMatchFailureRate"
              data-threshold={KPI_THRESHOLDS.skuMatchFailRateMax}
            >
              <span>SKU 매칭 실패율</span>
              <AdminTruth
                value={readObservedRate(
                  kpi?.skuMatchFailureRate,
                  kpi?.skuAttempts,
                )}
                testId="sku-match-failure-rate"
              />
            </li>
            <li
              className="flex items-center justify-between"
              data-field="gradeMismatchCount"
              data-pipeline="51.12"
            >
              <span>등급 불일치</span>
              <AdminTruth
                value={
                  typeof kpi?.gradeMismatchCount === "number"
                    ? String(kpi.gradeMismatchCount)
                    : null
                }
              />
            </li>
            <li
              className="flex items-center justify-between"
              data-field="compareReadyFalseRatio"
              data-threshold={KPI_THRESHOLDS.compareReadyFalseRatioMax}
            >
              <span>비교 준비 미달 비율</span>
              <AdminTruth
                value={readObservedRate(
                  kpi?.compareReadyFalseRatio,
                  kpi?.catalogTotal,
                )}
              />
            </li>
            <li
              className="flex items-center justify-between"
              data-field="adapterMatchFailureRate"
              data-simulation="S4"
              data-threshold={KPI_THRESHOLDS.s4AdapterMatchFailureRateMax}
            >
              <span>시뮬레이션 S4 입력</span>
              <AdminTruth
                value={readObservedRate(
                  kpi?.adapterMatchFailureRate ?? kpi?.s4?.rate,
                  kpi?.skuAttempts,
                )}
              />
            </li>
          </ul>
        )}
        <p className="mt-2 text-xs text-lux-text-muted">
          기준 SKU {(KPI_THRESHOLDS.skuMatchFailRateMax * 100).toFixed(0)}% · 비교
          준비 {(KPI_THRESHOLDS.compareReadyFalseRatioMax * 100).toFixed(0)}% ·
          S4 {(KPI_THRESHOLDS.s4AdapterMatchFailureRateMax * 100).toFixed(0)}%
        </p>
        <div
          className="mt-3 rounded border border-lux-border/60 px-3 py-2 text-sm"
          data-role="adapter-alerts"
          data-event="adapter.health.changed"
        >
          <p className="font-medium">수집기 알림</p>
          {!health ? (
            <p className="mt-1 text-xs text-lux-text-muted">불러오는 중</p>
          ) : !health.ok ? (
            <AdminFetchNote failure={health.failure} />
          ) : alerts == null ? (
            <AdminTruth value={null} />
          ) : alerts.length === 0 ? (
            <p className="mt-1 text-xs text-lux-text-muted">열린 알림이 없습니다.</p>
          ) : (
            <ul className="mt-1 space-y-1 text-xs">
              {alerts.map((alert, idx) => (
                <li key={readText(alert.kind) ?? String(idx)}>
                  <AdminTruth value={readText(alert.messageKo) ?? readText(alert.kind)} />
                </li>
              ))}
            </ul>
          )}
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
        data-review-api="/api/v1/admin/adapters/identity-review-queue"
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
          {!review ? (
            "불러오는 중"
          ) : !review.ok ? (
            <AdminFetchNote failure={review.failure} />
          ) : (
            <>
              검토 대기{" "}
              <AdminTruth
                value={
                  typeof review.data.count === "number"
                    ? String(review.data.count)
                    : reviewItems
                      ? String(reviewItems.length)
                      : null
                }
              />
            </>
          )}
        </p>
        {!review ? null : !review.ok ? null : reviewItems == null ? (
          <AdminTruth value={null} testId="identity-review-list" />
        ) : reviewItems.length === 0 ? (
          <p className="mt-2 text-sm text-lux-text-muted">검토 대기 항목이 없습니다.</p>
        ) : (
          <ul className="mt-2 space-y-2 text-sm" data-testid="identity-review-list">
            {reviewItems.map((item, idx) => (
              <li
                key={
                  readText(item.externalItemId) ??
                  readText(item.listingId) ??
                  String(idx)
                }
                className="rounded border border-lux-border px-3 py-2"
              >
                <p>
                  외부 번호{" "}
                  <AdminTruth
                    value={
                      readText(item.externalItemId) ?? readText(item.listingId)
                    }
                  />
                </p>
                <p>
                  사유 <AdminTruth value={readText(item.reason)} />
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-6">
        <h2 className="text-sm font-medium">수집기</h2>
        {!health ? (
          <p className="mt-3 text-sm text-lux-text-muted">불러오는 중</p>
        ) : !health.ok ? (
          <AdminFetchNote failure={health.failure} />
        ) : items == null ? (
          <AdminTruth value={null} testId="adapter-list" />
        ) : items.length === 0 ? (
          <p className="mt-3 text-sm text-lux-text-muted" data-testid="adapter-empty">
            등록된 수집기가 없습니다.
          </p>
        ) : (
          <ul className="mt-3 space-y-2" data-testid="adapter-list">
            {items.map((row, idx) => {
              const id = readText(row.adapterId);
              const status = readText(row.status);
              const role = readText(row.role);
              return (
                <li
                  key={id ?? String(idx)}
                  data-adapter={id ?? undefined}
                  className="rounded-md border border-lux-border px-3 py-2 text-sm"
                >
                  <div className="flex items-center justify-between">
                    <span>
                      <AdminTruth value={readText(row.labelKo) ?? id} />
                      <span className="ml-2 text-lux-text-muted">
                        {role ? (ROLE_LABEL[role] ?? role) : ""}
                      </span>
                    </span>
                    <span data-field="skuMatchFailureRate">
                      <AdminTruth
                        value={status ? (STATUS_LABEL[status] ?? status) : null}
                      />
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-lux-text-muted">
                    최근 수집{" "}
                    <AdminTruth value={readText(row.lastIngestAt)} />
                  </p>
                  <p className="text-xs text-lux-text-muted">
                    SKU 실패율{" "}
                    <AdminTruth
                      value={
                        typeof row.skuMatchFailureRate === "number"
                          ? readObservedRate(row.skuMatchFailureRate, 1)
                          : null
                      }
                    />
                  </p>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="mt-8" data-legs-api="/api/v1/admin/adapters/listing-legs">
        <h2 className="text-sm font-medium">시세 다리 (당일 자동 공개)</h2>
        {!legs ? (
          <p className="mt-3 text-sm text-lux-text-muted">불러오는 중</p>
        ) : !legs.ok ? (
          <AdminFetchNote failure={legs.failure} />
        ) : pairs == null ? (
          <AdminTruth value={null} testId="listing-legs" />
        ) : pairs.length === 0 ? (
          <p className="mt-3 text-sm text-lux-text-muted">당일 다리가 없습니다.</p>
        ) : (
          <ul
            className="mt-3 list-inside list-disc space-y-1 text-sm text-lux-text-muted"
            data-testid="listing-legs"
          >
            {pairs.map((pair, idx) => (
              <li key={`${readText(pair.buy)}-${readText(pair.sell)}-${idx}`}>
                <AdminTruth value={readText(pair.buy)} /> ↔{" "}
                <AdminTruth value={readText(pair.sell)} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-8">
        <h2 className="text-sm font-medium">공식 협력 다리 (Phase1+)</h2>
        {!health ? (
          <p className="mt-3 text-sm text-lux-text-muted">불러오는 중</p>
        ) : !health.ok ? (
          <AdminFetchNote failure={health.failure} />
        ) : partners == null ? (
          <p className="mt-3 text-sm text-lux-text-muted">
            <AdminTruth value={null} />
          </p>
        ) : partners.length === 0 ? (
          <p className="mt-3 text-sm text-lux-text-muted">공식 협력 다리가 없습니다.</p>
        ) : (
          <ul className="mt-3 list-inside list-disc space-y-1 text-sm text-lux-text-muted">
            {partners.map((id) => (
              <li key={id} data-adapter={id}>
                {id === "amazon"
                  ? "아마존(미국·일본·독일) · Phase1+"
                  : id === "yahoo_jp"
                    ? "야후 일본 경매 · Phase1+"
                    : id}
              </li>
            ))}
          </ul>
        )}
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
