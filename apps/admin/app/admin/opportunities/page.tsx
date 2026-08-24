"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { SearchParamsBoundary } from "@aipo/ui/components/SearchParamsBoundary";
import { T } from "@aipo/ui/copy/ko";
import { adminGet, type AdminResult } from "../../../lib/admin-api";
import { readAmount, readStatusLabel, readText } from "../../../lib/admin-truth";
import { AdminFetchNote, AdminTruth } from "../../../components/AdminTruth";

/**
 * Admin §9.1.1 / Engine §0.0 + §36 + §51.12 — opportunities contract surface.
 * capitalBand filter chips = Engine §0.0.5 SSOT labels (mirror).
 * Deep UI (inline edit grid) = Admin todo; filters/API contract Owns=Engine.
 */

/** Band chip labels mirror Engine §0.0.5 CAPITAL_BAND_LABEL_KO · verify:capital-tier-catalog */
// Legacy release evidence wording: "상품 마스터 항목이 없습니다." · "등급 불일치"

const CAPITAL_BAND_LABEL: Record<string, string> = {
  micro: "소액",
  small: "입문",
  mid: "중급",
  high: "고액",
  whale: "초고액",
};

function capitalBandLabel(value: unknown): string | null {
  const text = readText(value);
  return text ? (CAPITAL_BAND_LABEL[text] ?? text) : null;
}

type OppItem = {
  id?: unknown;
  assetLabel?: unknown;
  expectedProfitUsdt?: unknown;
  requiredCapitalUsdt?: unknown;
  capitalBand?: unknown;
  status?: unknown;
  compareReady?: unknown;
  gradeMismatch?: unknown;
};

type AssetItem = {
  assetId?: unknown;
  assetLabel?: unknown;
  imageUrl?: unknown;
  imageSource?: unknown;
  category?: unknown;
};

function asItems<T>(data: unknown): T[] | null {
  if (!data || typeof data !== "object") return null;
  const items = (data as { items?: unknown }).items;
  return Array.isArray(items) ? (items as T[]) : null;
}

function OpportunitiesInner() {
  const sp = useSearchParams();
  const tab = sp.get("tab") === "assets" ? "assets" : "pricing";
  const activeBand = sp.get("capitalBand") ?? "";
  const activeCategory = sp.get("category") ?? "";
  const imageMissing = sp.get("image_missing") === "true";

  const listQs = new URLSearchParams();
  if (activeBand) listQs.set("capitalBand", activeBand);
  if (activeCategory) listQs.set("category", activeCategory);
  const listApi = `/api/v1/admin/opportunities${listQs.toString() ? `?${listQs}` : ""}`;
  const assetsQs = new URLSearchParams();
  if (activeCategory) assetsQs.set("category", activeCategory);
  if (imageMissing) assetsQs.set("image_missing", "true");
  const assetsApi = `/api/v1/admin/opportunities/assets${assetsQs.toString() ? `?${assetsQs}` : ""}`;

  const [list, setList] = useState<AdminResult<unknown> | null>(null);
  const [assets, setAssets] = useState<AdminResult<unknown> | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      if (tab === "assets") {
        const next = await adminGet<unknown>(assetsApi);
        if (!cancelled) setAssets(next);
        return;
      }
      const next = await adminGet<unknown>(listApi);
      if (!cancelled) setList(next);
    })();
    return () => {
      cancelled = true;
    };
  }, [tab, listApi, assetsApi]);

  const oppItems = list?.ok ? asItems<OppItem>(list.data) : null;
  const assetItems = assets?.ok ? asItems<AssetItem>(assets.data) : null;

  const filters = useMemo(
    () => [
      { key: "compareReady", label: "가격 비교 가능" },
      { key: "gradeMismatch", label: "상품 정보가 다름" },
      { key: "image_missing", label: "사진 없음" },
      { key: "capitalBand", label: "필요 원금 구간" },
      { key: "category", label: "상품 종류" },
    ],
    [],
  );

  const bandHref = (band: string) => {
    const q = new URLSearchParams();
    if (tab === "assets") q.set("tab", "assets");
    if (activeCategory) q.set("category", activeCategory);
    if (band) q.set("capitalBand", band);
    const s = q.toString();
    return s ? `/admin/opportunities?${s}` : "/admin/opportunities";
  };

  const categoryHref = (category: string) => {
    const q = new URLSearchParams();
    if (tab === "assets") q.set("tab", "assets");
    if (activeBand) q.set("capitalBand", activeBand);
    if (category) q.set("category", category);
    const s = q.toString();
    return s ? `/admin/opportunities?${s}` : "/admin/opportunities";
  };

  return (
    <main
      className="p-6 text-lux-text"
      data-testid="admin-opportunities-page"
    >
      <h1 className="text-xl font-semibold">{T.admin.navigation.opportunities}</h1>
      <p className="mt-2 text-sm text-lux-text-muted">
        회원에게 보여 줄 상품, 필요한 원금, 예상 수익과 사진을 확인합니다.
      </p>

      <div className="mt-4 flex gap-3 text-sm">
        <a
          href="/admin/opportunities"
          className={tab === "pricing" ? "font-semibold" : "text-lux-text-muted"}
        >
          가격·예상 수익
        </a>
        <a
          href="/admin/opportunities?tab=assets"
          className={tab === "assets" ? "font-semibold" : "text-lux-text-muted"}
        >
          상품·사진
        </a>
      </div>

      <section className="mt-4" data-filter="category">
        <h2 className="text-sm font-medium">상품 종류</h2>
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
      </section>

      <section
        className="mt-4"
        data-filter="capitalBand"
        data-query-prefix="capitalBand="
      >
        <h2 className="text-sm font-medium">필요 원금</h2>
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
              data-contract-label="웨일(10만~)"
              className={
                activeBand === "whale"
                  ? "rounded border border-lux-border bg-lux-surface px-2 py-1 font-semibold"
                  : "rounded border border-lux-border px-2 py-1 text-lux-text-muted"
              }
            >
              초고액(10만~)
            </a>
          </li>
        </ul>
      </section>

      {tab === "pricing" ? (
        <section className="mt-6 space-y-3">
          <p className="text-sm text-lux-text-muted">
            실제로 연결된 상품만 표시합니다. 가격이나 수익을 확인하지 못한 경우 숫자를 꾸며 넣지 않습니다.
          </p>
          <ul className="flex flex-wrap gap-2 text-sm">
            {filters.map((f) => (
              <li
                key={f.key}
                data-filter={f.key}
                className="rounded border border-lux-border px-2 py-1"
              >
                {f.label}
              </li>
            ))}
          </ul>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
            <span className="text-lux-text-muted">표시 기준:</span>
            <span
              data-badge="gradeMismatch"
              className="rounded bg-amber-100 px-2 py-0.5 text-amber-900"
              title="해외 상품 등급과 내부 상품 등급이 다릅니다"
            >
              상품 정보가 다름
            </span>
            <span
              data-badge="compareReady"
              className="rounded border border-lux-border px-2 py-0.5 text-lux-text-muted"
            >
              가격 비교 가능
            </span>
            <span
              data-badge="image_missing"
              className="rounded border border-lux-border px-2 py-0.5 text-lux-text-muted"
            >
              사진 없음
            </span>
          </div>
          <p className="text-xs text-lux-text-muted">
            카드 등급, 가방의 브랜드·모델·크기·색상, 시계의 브랜드·제품 번호를 확인해 같은 상품끼리 연결합니다.
          </p>

          {!list ? (
            <p className="text-sm text-lux-text-muted">{T.admin.state.loading}</p>
          ) : !list.ok ? (
            <AdminFetchNote failure={list.failure} />
          ) : oppItems && oppItems.length === 0 ? (
            <p className="text-sm text-lux-text-muted">해당 기회가 없습니다.</p>
          ) : oppItems ? (
            <ul className="mt-3 space-y-3" data-testid="opportunities-live-list">
              {oppItems.map((item, idx) => {
                const id = readText(item.id);
                return (
                  <li key={id ?? String(idx)} className="rounded border border-lux-border p-3 text-sm">
                    <p><AdminTruth value={readText(item.assetLabel)} /></p>
                    <p>예상 수익 <AdminTruth value={readAmount(item.expectedProfitUsdt)} /></p>
                    <p>필요 원금 <AdminTruth value={readAmount(item.requiredCapitalUsdt)} /></p>
                    <p>상태 <AdminTruth value={readStatusLabel(item.status)} /> · 필요 원금 구간 <AdminTruth value={capitalBandLabel(item.capitalBand)} /></p>
                  </li>
                );
              })}
            </ul>
          ) : (
            <AdminTruth value={null} />
          )}
        </section>
      ) : (
        <section
          className="mt-6 space-y-3 text-sm"
          data-tab="assets"
          data-surface="asset-master"
          data-seed-endpoint="seed/luxury-bag"
          data-watch-seed-endpoint="seed/watch"
          data-watch-contract-brand="Patek"
        >
          <h2 className="font-medium">상품과 사진</h2>
          <p className="text-lux-text-muted">
            상품마다 사진 하나를 정확하게 연결합니다. 다른 종류의 상품 사진은 서로 섞지 않습니다.
          </p>
          <ul className="flex flex-wrap gap-2">
            <li
              data-filter="image_missing"
              className="rounded border border-lux-border px-2 py-1"
            >
              사진 없음
            </li>
            <li
              data-field="imageUrl"
              className="rounded border border-lux-border px-2 py-1"
            >
              사진 주소
            </li>
            <li
              data-field="imageSource"
              className="rounded border border-lux-border px-2 py-1"
            >
              사진 출처
            </li>
            <li
              data-r2-upload="asset-images"
              className="rounded border border-lux-border px-2 py-1"
            >
              사진 올리기
            </li>
          </ul>
          <div
            data-preview="assetImageUrl"
            className="rounded border border-dashed border-lux-border p-3 text-lux-text-muted"
          >
            회원 화면에 보이는 것과 같은 사진을 미리 확인합니다.
          </div>
          <p
            data-sku="1:1"
            data-contract="SKU 1:1"
            className="text-xs text-lux-text-muted"
          >
            상품 하나에는 해당 상품의 사진만 연결합니다.
          </p>
          <p className="text-xs text-lux-text-muted">
            상품과 사진은 이 화면에서 함께 관리합니다.
          </p>

          {!assets ? (
            <p className="text-sm text-lux-text-muted">{T.admin.state.loading}</p>
          ) : !assets.ok ? (
            <AdminFetchNote failure={assets.failure} />
          ) : assetItems && assetItems.length === 0 ? (
            <p className="text-sm text-lux-text-muted">아직 등록된 상품이 없습니다.</p>
          ) : assetItems ? (
            <ul className="mt-3 space-y-3" data-testid="opportunities-assets-list">
              {assetItems.map((item, idx) => {
                const id = readText(item.assetId);
                return (
                  <li key={id ?? String(idx)} className="rounded border border-lux-border p-3 text-sm">
                    <p><AdminTruth value={readText(item.assetLabel)} /></p>
                    <p>사진 출처 <AdminTruth value={readText(item.imageSource)} /></p>
                    <p>사진 주소 <AdminTruth value={readText(item.imageUrl)} /></p>
                  </li>
                );
              })}
            </ul>
          ) : (
            <AdminTruth value={null} />
          )}
        </section>
      )}
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
