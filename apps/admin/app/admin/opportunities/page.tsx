"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { SearchParamsBoundary } from "@aipo/ui/components/SearchParamsBoundary";
import {
  adminGet,
  adminSend,
  type AdminResult,
} from "../../../lib/admin-api";
import {
  asRecordList,
  readAmount,
  readText,
} from "../../../lib/admin-truth";
import { AdminFetchNote, AdminTruth } from "../../../components/AdminTruth";

/**
 * Admin §9.1.1 / Engine §0.0 + §36 — opportunities contract surface.
 * capitalBand filter chips = Engine §0.0.5 SSOT labels (mirror).
 * List SoT = GET /api/v1/admin/opportunities · public.opportunities owner.
 * PATCH pricing = existing OpportunitiesAdminService · 클라이언트 재계산 0.
 */

/** Band chip labels mirror Engine §0.0.5 CAPITAL_BAND_LABEL_KO · verify:capital-tier-catalog */

const CATEGORY_LABEL: Record<string, string> = {
  watch: "시계",
  trading_card: "카드",
  luxury_bag: "가방",
};

const STATUS_LABEL: Record<string, string> = {
  available: "가능",
  paused: "일시중지",
  expired: "만료",
  circuit_open: "회로 열림",
};

const BAND_LABEL: Record<string, string> = {
  micro: "소액(10~)",
  small: "입문(100~)",
  mid: "중급(1천~)",
  high: "고액(1만~)",
  whale: "웨일(10만~)",
};

function OpportunitiesInner() {
  const sp = useSearchParams();
  const tab = sp.get("tab") === "assets" ? "assets" : "pricing";
  const activeBand = sp.get("capitalBand") ?? "";
  const activeCategory = sp.get("category") ?? "";
  const compareReady = sp.get("compareReady") ?? "";
  const gradeMismatch = sp.get("gradeMismatch") ?? "";
  const imageMissing = sp.get("image_missing") ?? "";

  const filters = useMemo(
    () => [
      { key: "compareReady", label: "비교 준비" },
      { key: "gradeMismatch", label: "등급 불일치" },
      { key: "image_missing", label: "이미지 없음" },
      { key: "capitalBand", label: "자본대" },
      { key: "category", label: "카테고리" },
    ],
    [],
  );

  const qs = (extra: Record<string, string>) => {
    const q = new URLSearchParams();
    if (tab === "assets") q.set("tab", "assets");
    if (activeCategory) q.set("category", activeCategory);
    if (activeBand) q.set("capitalBand", activeBand);
    if (compareReady) q.set("compareReady", compareReady);
    if (gradeMismatch) q.set("gradeMismatch", gradeMismatch);
    if (imageMissing) q.set("image_missing", imageMissing);
    for (const [k, v] of Object.entries(extra)) {
      if (v) q.set(k, v);
      else q.delete(k);
    }
    const s = q.toString();
    return s ? `/admin/opportunities?${s}` : "/admin/opportunities";
  };

  const bandHref = (band: string) => qs({ capitalBand: band });
  const categoryHref = (category: string) => qs({ category });

  const listApi = useMemo(() => {
    const q = new URLSearchParams();
    if (activeCategory) q.set("category", activeCategory);
    if (activeBand) q.set("capitalBand", activeBand);
    if (compareReady === "true" || compareReady === "false") {
      q.set("compareReady", compareReady);
    }
    if (gradeMismatch === "true" || gradeMismatch === "false") {
      q.set("gradeMismatch", gradeMismatch);
    }
    if (imageMissing === "true" || imageMissing === "false") {
      q.set("image_missing", imageMissing);
    }
    const s = q.toString();
    return s
      ? `/api/v1/admin/opportunities?${s}`
      : "/api/v1/admin/opportunities";
  }, [activeBand, activeCategory, compareReady, gradeMismatch, imageMissing]);

  const assetsApi = useMemo(() => {
    const q = new URLSearchParams();
    if (activeCategory) q.set("category", activeCategory);
    if (imageMissing === "true" || imageMissing === "false") {
      q.set("image_missing", imageMissing);
    }
    const s = q.toString();
    return s
      ? `/api/v1/admin/opportunities/assets?${s}`
      : "/api/v1/admin/opportunities/assets";
  }, [activeCategory, imageMissing]);

  const [list, setList] = useState<AdminResult<unknown> | null>(null);
  const [assets, setAssets] = useState<AdminResult<unknown> | null>(null);
  const [buyDraft, setBuyDraft] = useState("");
  const [sellDraft, setSellDraft] = useState("");
  const [actionNote, setActionNote] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      if (tab === "assets") {
        const res = await adminGet<unknown>(assetsApi);
        if (!cancelled) setAssets(res);
        return;
      }
      const res = await adminGet<unknown>(listApi);
      if (!cancelled) setList(res);
    })();
    return () => {
      cancelled = true;
    };
  }, [tab, listApi, assetsApi]);

  async function reloadList() {
    setList(await adminGet<unknown>(listApi));
  }

  async function reloadAssets() {
    setAssets(await adminGet<unknown>(assetsApi));
  }

  async function patchPricing(id: string, version: number) {
    const buy = buyDraft.trim();
    const sell = sellDraft.trim();
    if (!buy && !sell) {
      setActionNote("바꿀 기준가를 확인할 수 없습니다.");
      return;
    }
    if (!window.confirm("이 기회의 운영자 기준가를 바꿀까요?")) return;
    const res = await adminSend(`/api/v1/admin/opportunities/${id}/pricing`, "PATCH", {
      expectedPricingVersion: version,
      useAdminOverride: true,
      adminBuyUsdt: buy || undefined,
      adminSellUsdt: sell || undefined,
    });
    setActionNote(res.ok ? "반영했습니다." : "반영하지 못했습니다.");
    if (res.ok) await reloadList();
  }

  async function seed(path: string, label: string) {
    if (!window.confirm(`${label}를 서버에 요청할까요?`)) return;
    const res = await adminSend(path, "POST", {});
    setActionNote(res.ok ? "반영했습니다." : "반영하지 못했습니다.");
    if (res.ok && tab === "assets") await reloadAssets();
    if (res.ok && tab === "pricing") await reloadList();
  }

  const items = list?.ok ? asRecordList(list.data) : null;
  const assetItems = assets?.ok ? asRecordList(assets.data) : null;

  return (
    <main
      className="p-6 text-lux-text"
      data-testid="admin-opportunities"
      data-forbid="fake-opportunity-truth"
    >
      <h1 className="text-xl font-semibold">수익 기회 관리</h1>
      <p className="mt-2 text-sm text-lux-text-muted">
        서버에 있는 기회만 봅니다. 없는 수익·자본·상태는 만들지 않습니다.
      </p>

      <div className="mt-4 flex gap-3 text-sm">
        <a
          href="/admin/opportunities"
          className={tab === "pricing" ? "font-semibold" : "text-lux-text-muted"}
        >
          가격·마진
        </a>
        <a
          href="/admin/opportunities?tab=assets"
          className={tab === "assets" ? "font-semibold" : "text-lux-text-muted"}
        >
          상품 마스터
        </a>
      </div>

      <section className="mt-4" data-filter="category">
        <h2 className="text-sm font-medium">카테고리 필터</h2>
        <ul className="mt-2 flex flex-wrap gap-2 text-sm">
          <li>
            <a
              href={categoryHref("")}
              data-category="all"
              className={
                !activeCategory
                  ? "rounded border border-lux-border bg-lux-surface px-2 py-1 font-semibold"
                  : "rounded border border-lux-border px-2 py-1 text-lux-text-muted"
              }
            >
              전체
            </a>
          </li>
          <li>
            <a
              href={categoryHref("watch")}
              data-category="watch"
              className={
                activeCategory === "watch"
                  ? "rounded border border-lux-border bg-lux-surface px-2 py-1 font-semibold"
                  : "rounded border border-lux-border px-2 py-1 text-lux-text-muted"
              }
            >
              시계
            </a>
          </li>
          <li>
            <a
              href={categoryHref("trading_card")}
              data-category="trading_card"
              className={
                activeCategory === "trading_card"
                  ? "rounded border border-lux-border bg-lux-surface px-2 py-1 font-semibold"
                  : "rounded border border-lux-border px-2 py-1 text-lux-text-muted"
              }
            >
              카드
            </a>
          </li>
          <li>
            <a
              href={categoryHref("luxury_bag")}
              data-category="luxury_bag"
              className={
                activeCategory === "luxury_bag"
                  ? "rounded border border-lux-border bg-lux-surface px-2 py-1 font-semibold"
                  : "rounded border border-lux-border px-2 py-1 text-lux-text-muted"
              }
            >
              가방
            </a>
          </li>
        </ul>
        <p className="mt-2 text-xs text-lux-text-muted">
          API: GET /admin/opportunities?category=watch|trading_card|luxury_bag ·
          필터칩 가방 = luxury_bag
        </p>
      </section>

      <section className="mt-4" data-filter="capitalBand">
        <h2 className="text-sm font-medium">자본대 필터</h2>
        <ul className="mt-2 flex flex-wrap gap-2 text-sm">
          <li>
            <a
              href={bandHref("")}
              data-capital-band="all"
              className={
                !activeBand
                  ? "rounded border border-lux-border bg-lux-surface px-2 py-1 font-semibold"
                  : "rounded border border-lux-border px-2 py-1 text-lux-text-muted"
              }
            >
              전체
            </a>
          </li>
          <li>
            <a
              href={bandHref("micro")}
              data-capital-band="micro"
              className={
                activeBand === "micro"
                  ? "rounded border border-lux-border bg-lux-surface px-2 py-1 font-semibold"
                  : "rounded border border-lux-border px-2 py-1 text-lux-text-muted"
              }
            >
              소액(10~)
            </a>
          </li>
          <li>
            <a
              href={bandHref("small")}
              data-capital-band="small"
              className={
                activeBand === "small"
                  ? "rounded border border-lux-border bg-lux-surface px-2 py-1 font-semibold"
                  : "rounded border border-lux-border px-2 py-1 text-lux-text-muted"
              }
            >
              입문(100~)
            </a>
          </li>
          <li>
            <a
              href={bandHref("mid")}
              data-capital-band="mid"
              className={
                activeBand === "mid"
                  ? "rounded border border-lux-border bg-lux-surface px-2 py-1 font-semibold"
                  : "rounded border border-lux-border px-2 py-1 text-lux-text-muted"
              }
            >
              중급(1천~)
            </a>
          </li>
          <li>
            <a
              href={bandHref("high")}
              data-capital-band="high"
              className={
                activeBand === "high"
                  ? "rounded border border-lux-border bg-lux-surface px-2 py-1 font-semibold"
                  : "rounded border border-lux-border px-2 py-1 text-lux-text-muted"
              }
            >
              고액(1만~)
            </a>
          </li>
          <li>
            <a
              href={bandHref("whale")}
              data-capital-band="whale"
              className={
                activeBand === "whale"
                  ? "rounded border border-lux-border bg-lux-surface px-2 py-1 font-semibold"
                  : "rounded border border-lux-border px-2 py-1 text-lux-text-muted"
              }
            >
              웨일(10만~)
            </a>
          </li>
        </ul>
        <p className="mt-2 text-xs text-lux-text-muted">
          API: GET /admin/opportunities?capitalBand=micro|small|mid|high|whale
        </p>
      </section>

      {tab === "pricing" ? (
        <section
          className="mt-6 space-y-3"
          data-testid="opportunities-pricing-panel"
          data-list-api="/api/v1/admin/opportunities"
          data-patch-api="/api/v1/admin/opportunities/:id/pricing"
        >
          <p className="text-sm text-lux-text-muted">
            API: PATCH /admin/opportunities/:id/pricing · opportunity.price.updated
          </p>
          <ul className="flex flex-wrap gap-2 text-sm">
            {filters.map((f) => (
              <li
                key={f.key}
                data-filter={f.key}
                className="rounded border border-lux-border px-2 py-1"
              >
                {f.key === "compareReady" ? (
                  <a href={qs({ compareReady: compareReady === "true" ? "" : "true" })}>
                    {f.label}
                  </a>
                ) : f.key === "gradeMismatch" ? (
                  <a href={qs({ gradeMismatch: gradeMismatch === "true" ? "" : "true" })}>
                    {f.label}
                  </a>
                ) : f.key === "image_missing" ? (
                  <a href={qs({ image_missing: imageMissing === "true" ? "" : "true" })}>
                    {f.label}
                  </a>
                ) : (
                  f.label
                )}
                <span className="ml-1 text-lux-text-muted">({f.key})</span>
              </li>
            ))}
          </ul>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
            <span className="text-lux-text-muted">배지:</span>
            <span
              data-badge="gradeMismatch"
              className="rounded bg-amber-100 px-2 py-0.5 text-amber-900"
              title="listing grade ≠ asset.gradeDeclared · compareReady=false"
            >
              등급 불일치
            </span>
            <span
              data-badge="compareReady"
              className="rounded border border-lux-border px-2 py-0.5 text-lux-text-muted"
            >
              비교 준비
            </span>
            <span
              data-badge="image_missing"
              className="rounded border border-lux-border px-2 py-0.5 text-lux-text-muted"
            >
              이미지 없음
            </span>
          </div>
          <p className="text-xs text-lux-text-muted">
            trading_card · §51.12 PSA 파이프라인 · GET
            /admin/opportunities?gradeMismatch=true&category=trading_card
          </p>
          <p className="text-xs text-lux-text-muted">
            luxury_bag · brand+model(+size/color) · ebay 멀티|admin · GET
            /admin/opportunities?category=luxury_bag · POST
            /admin/opportunities/assets/seed/luxury-bag
          </p>
          <p className="text-xs text-lux-text-muted">
            watch · Patek/AP/Rolex · brand+reference · whale≥100k Ultra · GET
            /admin/opportunities?category=watch&capitalBand=whale · POST
            /admin/opportunities/assets/seed/watch
          </p>

          <label className="mt-4 block text-sm" htmlFor="opp-admin-buy">
            운영자 매수 기준가
          </label>
          <input
            id="opp-admin-buy"
            value={buyDraft}
            onChange={(e) => setBuyDraft(e.target.value)}
            className="mt-1 w-full max-w-md rounded border border-lux-border bg-lux-bg px-2 py-1 text-sm"
          />
          <label className="mt-3 block text-sm" htmlFor="opp-admin-sell">
            운영자 매도 기준가
          </label>
          <input
            id="opp-admin-sell"
            value={sellDraft}
            onChange={(e) => setSellDraft(e.target.value)}
            className="mt-1 w-full max-w-md rounded border border-lux-border bg-lux-bg px-2 py-1 text-sm"
          />

          {!list ? (
            <p className="mt-3 text-sm text-lux-text-muted">불러오는 중</p>
          ) : !list.ok ? (
            <AdminFetchNote failure={list.failure} />
          ) : items == null ? (
            <AdminTruth value={null} testId="opportunities-list" />
          ) : items.length === 0 ? (
            <p
              className="mt-3 text-sm text-lux-text-muted"
              data-testid="opportunities-empty"
            >
              해당 조건의 기회가 없습니다.
            </p>
          ) : (
            <ul className="mt-3 space-y-3" data-testid="opportunities-list">
              {items.map((item, idx) => {
                const id = readText(item.id);
                const status = readText(item.status);
                const category = readText(item.category);
                const band = readText(item.capitalBand);
                const version =
                  typeof item.pricingVersion === "number"
                    ? item.pricingVersion
                    : null;
                return (
                  <li
                    key={id ?? String(idx)}
                    className="rounded border border-lux-border p-3 text-sm"
                  >
                    <p>
                      상품 <AdminTruth value={readText(item.assetLabel)} />
                    </p>
                    <p>
                      상태{" "}
                      <AdminTruth
                        value={status ? (STATUS_LABEL[status] ?? status) : null}
                      />
                    </p>
                    <p>
                      분류{" "}
                      <AdminTruth
                        value={
                          category ? (CATEGORY_LABEL[category] ?? category) : null
                        }
                      />
                    </p>
                    <p>
                      예상 수익{" "}
                      <AdminTruth value={readAmount(item.expectedProfitUsdt)} />
                    </p>
                    <p>
                      필요 자본{" "}
                      <AdminTruth value={readAmount(item.requiredCapitalUsdt)} />
                    </p>
                    <p>
                      자본대{" "}
                      <AdminTruth value={band ? (BAND_LABEL[band] ?? band) : null} />
                    </p>
                    <p>
                      비교 준비{" "}
                      <AdminTruth
                        value={
                          typeof item.compareReady === "boolean"
                            ? item.compareReady
                              ? "준비"
                              : "미준비"
                            : null
                        }
                      />
                    </p>
                    {id && version != null ? (
                      <button
                        type="button"
                        className="mt-2 rounded bg-lux-elevated px-2 py-1"
                        onClick={() => void patchPricing(id, version)}
                      >
                        기준가 반영
                      </button>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      ) : (
        <section
          className="mt-6 space-y-3 text-sm"
          data-tab="assets"
          data-surface="asset-master"
          data-testid="opportunities-assets-panel"
          data-assets-api="/api/v1/admin/opportunities/assets"
        >
          <h2 className="font-medium">상품 마스터 · 이미지</h2>
          <p className="text-lux-text-muted">
            Asset Master · R2 이미지 · imageSource · SKU 1:1 · Engine §0.0.6 ·
            luxury_bag=admin_r2 · watch=admin_r2
          </p>
          <p className="text-lux-text-muted">
            API: GET/PUT /admin/opportunities/assets · POST
            /admin/opportunities/assets/:assetId/image · POST
            /admin/opportunities/assets/seed/luxury-bag · POST
            /admin/opportunities/assets/seed/watch
          </p>
          <ul className="flex flex-wrap gap-2">
            <li
              data-filter="image_missing"
              className="rounded border border-lux-border px-2 py-1"
            >
              이미지 없음
              <span className="ml-1 text-lux-text-muted">(image_missing)</span>
            </li>
            <li
              data-field="imageUrl"
              className="rounded border border-lux-border px-2 py-1"
            >
              이미지 URL
            </li>
            <li
              data-field="imageSource"
              className="rounded border border-lux-border px-2 py-1"
            >
              imageSource
            </li>
            <li
              data-r2-upload="asset-images"
              className="rounded border border-lux-border px-2 py-1"
            >
              R2 업로드 (asset-images)
            </li>
          </ul>
          <div
            data-preview="assetImageUrl"
            className="rounded border border-dashed border-lux-border p-3 text-lux-text-muted"
          >
            미리보기 = 유저 카드와 동일 assetImageUrl · 시세 참고용
          </div>
          <p data-sku="1:1" className="text-xs text-lux-text-muted">
            SKU 1:1 · assetId ↔ assetImageUrl 불변 · 교차 카테고리 금지
          </p>
          <p className="text-xs text-lux-text-muted">
            독립 /admin/assets 경로 없음 · tab=assets 만
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="rounded px-2 py-1 text-lux-text-muted"
              onClick={() =>
                void seed(
                  "/api/v1/admin/opportunities/assets/seed/trading-card",
                  "카드 시드",
                )
              }
            >
              카드 시드
            </button>
            <button
              type="button"
              className="rounded px-2 py-1 text-lux-text-muted"
              onClick={() =>
                void seed(
                  "/api/v1/admin/opportunities/assets/seed/luxury-bag",
                  "가방 시드",
                )
              }
            >
              가방 시드
            </button>
            <button
              type="button"
              className="rounded px-2 py-1 text-lux-text-muted"
              onClick={() =>
                void seed(
                  "/api/v1/admin/opportunities/assets/seed/watch",
                  "시계 시드",
                )
              }
            >
              시계 시드
            </button>
            <button
              type="button"
              className="rounded px-2 py-1 text-lux-text-muted"
              onClick={() =>
                void seed(
                  "/api/v1/admin/opportunities/catalog/runtime-seed",
                  "최소 카탈로그",
                )
              }
            >
              최소 카탈로그
            </button>
          </div>
          {!assets ? (
            <p className="text-sm text-lux-text-muted">불러오는 중</p>
          ) : !assets.ok ? (
            <AdminFetchNote failure={assets.failure} />
          ) : assetItems == null ? (
            <AdminTruth value={null} testId="opportunities-assets" />
          ) : assetItems.length === 0 ? (
            <p
              className="text-sm text-lux-text-muted"
              data-testid="opportunities-assets-empty"
            >
              상품 마스터가 없습니다.
            </p>
          ) : (
            <ul className="space-y-3" data-testid="opportunities-assets">
              {assetItems.map((item, idx) => {
                const assetId = readText(item.assetId);
                return (
                  <li
                    key={assetId ?? String(idx)}
                    className="rounded border border-lux-border p-3"
                  >
                    <p>
                      상품 <AdminTruth value={readText(item.assetLabel)} />
                    </p>
                    <p>
                      출처 <AdminTruth value={readText(item.imageSource)} />
                    </p>
                    <p>
                      이미지{" "}
                      <AdminTruth
                        value={
                          typeof item.imageMissing === "boolean"
                            ? item.imageMissing
                              ? "없음"
                              : "있음"
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
      )}
      {actionNote ? (
        <p className="mt-3 text-sm text-lux-text-muted">{actionNote}</p>
      ) : null}
    </main>
  );
}

export default function Page() {
  return (
    <SearchParamsBoundary>
      <OpportunitiesInner />
    </SearchParamsBoundary>
  );
}
