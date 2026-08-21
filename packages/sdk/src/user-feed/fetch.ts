/**
 * @aipo/sdk/user-feed — PART9a
 * GET /api/v1/opportunities · /opportunities/:id · /me/day-pulse
 * nearMissCount → nearMissExtraCount (BalanceAwareHome prop) 매핑 Owns=본 모듈
 */

import {
  OpportunityFeedError,
  type DayPulseResponse,
  type OpportunityAssetImageSource,
  type OpportunityDetailResponse,
  type OpportunityFeedItem,
  type OpportunityFeedResponse,
  type UserFeedRequestOpts,
} from "./types";

function isAbortError(err: unknown): boolean {
  return (
    (err instanceof DOMException && err.name === "AbortError") ||
    (err instanceof Error && err.name === "AbortError")
  );
}

function apiUrl(apiBase: string, path: string): string {
  const base = (apiBase || "").replace(/\/$/, "");
  const p = path.startsWith("/") ? path : `/${path}`;
  return base ? `${base}${p}` : p;
}

async function authHeaders(
  opts: UserFeedRequestOpts,
): Promise<Record<string, string>> {
  const headers: Record<string, string> = {
    Accept: "application/json",
  };
  if (opts.getAccessToken) {
    const token = await opts.getAccessToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }
  return headers;
}

type FeedRaw = Omit<OpportunityFeedResponse, "nearMissExtraCount" | "items"> & {
  nearMissCount?: number;
  nearMissExtraCount?: number;
  items?: unknown;
};

const MONEY_RE = /^-?[0-9]+(\.[0-9]+)?$/;
const ASSET_IMAGE_SOURCES = new Set<OpportunityAssetImageSource>([
  "ebay",
  "pokemontcg",
  "ygoprodeck",
  "admin_r2",
]);

function asText(v: unknown): string | null {
  return typeof v === "string" && v.trim() ? v : null;
}

function asMoneyString(v: unknown): string | null {
  return typeof v === "string" && MONEY_RE.test(v) ? v : null;
}

function asFiniteNumber(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

function asPositiveInt(v: unknown): number | null {
  return typeof v === "number" && Number.isInteger(v) && v >= 1 ? v : null;
}

function asAssetImageSource(v: unknown): OpportunityAssetImageSource | null {
  return typeof v === "string" &&
    ASSET_IMAGE_SOURCES.has(v as OpportunityAssetImageSource)
    ? (v as OpportunityAssetImageSource)
    : null;
}

/**
 * toUserCard user surface만 고른다.
 * ghost(partnerLabel/partner/officialPartner/official/title) 복사 금지.
 * USDT를 Number로 재계산하지 않는다.
 */
export function readOpportunityFeedItem(
  raw: unknown,
): OpportunityFeedItem | null {
  if (raw == null || typeof raw !== "object" || Array.isArray(raw)) return null;
  const o = raw as Record<string, unknown>;
  const id = asText(o.id);
  if (!id) return null;

  const item: OpportunityFeedItem = {
    id,
    assetId: asText(o.assetId),
    assetLabel: asText(o.assetLabel),
    assetImageUrl: asText(o.assetImageUrl),
    assetImageSource: asAssetImageSource(o.assetImageSource),
    assetImageAltKo: asText(o.assetImageAltKo),
    arbitrageType: asText(o.arbitrageType),
    arbitrageTypeKo: asText(o.arbitrageTypeKo),
    expectedProfitUsdt: asMoneyString(o.expectedProfitUsdt),
    expectedProfitKrwApprox: asFiniteNumber(o.expectedProfitKrwApprox),
    requiredCapitalUsdt: asMoneyString(o.requiredCapitalUsdt),
    estimatedDurationSec: asFiniteNumber(o.estimatedDurationSec),
    staleAt: asText(o.staleAt),
    status: asText(o.status),
    bucket: asText(o.bucket),
    marginPct: asMoneyString(o.marginPct) ?? asText(o.marginPct),
  };

  const pricing =
    o.pricing != null && typeof o.pricing === "object" && !Array.isArray(o.pricing)
      ? (o.pricing as Record<string, unknown>)
      : null;
  const buyMarketId = asText(o.buyMarketId) ?? asText(pricing?.buyMarketId);
  const buyMarketLabelKo =
    asText(o.buyMarketLabelKo) ?? asText(pricing?.buyMarketLabelKo);
  const sellMarketId = asText(o.sellMarketId) ?? asText(pricing?.sellMarketId);
  const sellMarketLabelKo =
    asText(o.sellMarketLabelKo) ?? asText(pricing?.sellMarketLabelKo);
  const buyPriceUsdt =
    asMoneyString(o.buyPriceUsdt) ?? asMoneyString(pricing?.buyPriceUsdt);
  const sellPriceUsdt =
    asMoneyString(o.sellPriceUsdt) ?? asMoneyString(pricing?.sellPriceUsdt);
  const grossSpreadUsdt =
    asMoneyString(o.grossSpreadUsdt) ?? asMoneyString(pricing?.grossSpreadUsdt);
  if (buyMarketId) item.buyMarketId = buyMarketId;
  if (buyMarketLabelKo) item.buyMarketLabelKo = buyMarketLabelKo;
  if (sellMarketId) item.sellMarketId = sellMarketId;
  if (sellMarketLabelKo) item.sellMarketLabelKo = sellMarketLabelKo;
  if (buyPriceUsdt) item.buyPriceUsdt = buyPriceUsdt;
  if (sellPriceUsdt) item.sellPriceUsdt = sellPriceUsdt;
  if (grossSpreadUsdt) item.grossSpreadUsdt = grossSpreadUsdt;
  const pricingVersion = asPositiveInt(o.pricingVersion);
  if (pricingVersion != null) item.pricingVersion = pricingVersion;
  const suggestDepositUsdt = asMoneyString(o.suggestDepositUsdt);
  if (suggestDepositUsdt != null) item.suggestDepositUsdt = suggestDepositUsdt;
  if (typeof o.compareReady === "boolean") item.compareReady = o.compareReady;
  return item;
}

export function readOpportunityFeedItems(raw: unknown): OpportunityFeedItem[] {
  if (!Array.isArray(raw)) return [];
  const out: OpportunityFeedItem[] = [];
  for (const row of raw) {
    const item = readOpportunityFeedItem(row);
    if (item) out.push(item);
  }
  return out;
}

/** listFeed.nearMissCount → BalanceAwareHome nearMissExtraCount */
export function mapNearMissExtraCount(raw: FeedRaw): OpportunityFeedResponse {
  const nearMissCount =
    typeof raw.nearMissCount === "number" && raw.nearMissCount >= 0
      ? Math.floor(raw.nearMissCount)
      : 0;
  return {
    ...raw,
    nearMissCount,
    nearMissExtraCount: nearMissCount,
    items: readOpportunityFeedItems(raw.items),
    affordableCount:
      typeof raw.affordableCount === "number" ? raw.affordableCount : 0,
    principalUsdt:
      typeof raw.principalUsdt === "string" ? raw.principalUsdt : "0",
  };
}

export async function fetchOpportunityFeed(
  opts: UserFeedRequestOpts = {},
): Promise<OpportunityFeedResponse> {
  let res: Response;
  try {
    res = await fetch(apiUrl(opts.apiBase ?? "", "/api/v1/opportunities"), {
      method: "GET",
      headers: await authHeaders(opts),
      credentials: "include",
      cache: "no-store",
      signal: opts.signal,
    });
  } catch (err) {
    if (isAbortError(err)) throw err;
    throw new OpportunityFeedError(0, "opportunity_feed_network");
  }
  if (!res.ok) {
    throw new OpportunityFeedError(res.status);
  }
  let raw: FeedRaw;
  try {
    raw = (await res.json()) as FeedRaw;
  } catch (err) {
    if (isAbortError(err)) throw err;
    throw new OpportunityFeedError(res.status, "opportunity_feed_malformed");
  }
  if (raw == null || typeof raw !== "object" || Array.isArray(raw)) {
    throw new OpportunityFeedError(res.status, "opportunity_feed_malformed");
  }
  return mapNearMissExtraCount(raw);
}

export async function fetchOpportunityDetail(
  opportunityId: string,
  opts: UserFeedRequestOpts = {},
): Promise<OpportunityDetailResponse> {
  const id = encodeURIComponent(opportunityId);
  let res: Response;
  try {
    res = await fetch(
      apiUrl(opts.apiBase ?? "", `/api/v1/opportunities/${id}`),
      {
        method: "GET",
        headers: await authHeaders(opts),
        credentials: "include",
        cache: "no-store",
        signal: opts.signal,
      },
    );
  } catch (err) {
    if (isAbortError(err)) throw err;
    throw new OpportunityFeedError(0, "opportunity_detail_network");
  }
  if (!res.ok) {
    throw new OpportunityFeedError(res.status);
  }
  const raw = (await res.json()) as {
    principalUsdt?: unknown;
    nearMissCapUsdt?: unknown;
    classificationOwner?: unknown;
    item?: unknown;
  };
  const item = readOpportunityFeedItem(raw.item);
  if (!item) {
    throw new OpportunityFeedError(res.status, "opportunity_detail_malformed");
  }
  return {
    principalUsdt: asMoneyString(raw.principalUsdt),
    nearMissCapUsdt:
      typeof raw.nearMissCapUsdt === "string" ? raw.nearMissCapUsdt : undefined,
    classificationOwner:
      typeof raw.classificationOwner === "string"
        ? raw.classificationOwner
        : undefined,
    item,
  };
}

export async function fetchDayPulse(
  opts: UserFeedRequestOpts = {},
): Promise<DayPulseResponse> {
  const res = await fetch(apiUrl(opts.apiBase ?? "", "/api/v1/me/day-pulse"), {
    method: "GET",
    headers: await authHeaders(opts),
    credentials: "include",
    cache: "no-store",
    signal: opts.signal,
  });
  if (!res.ok) {
    throw new Error(`day_pulse_${res.status}`);
  }
  return (await res.json()) as DayPulseResponse;
}
