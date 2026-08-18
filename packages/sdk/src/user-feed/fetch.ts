/**
 * @aipo/sdk/user-feed — PART9a
 * GET /api/v1/opportunities · /opportunities/:id · /me/day-pulse
 * nearMissCount → nearMissExtraCount (BalanceAwareHome prop) 매핑 Owns=본 모듈
 */

import type {
  DayPulseResponse,
  OpportunityDetailResponse,
  OpportunityFeedResponse,
  UserFeedRequestOpts,
} from "./types";

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

type FeedRaw = Omit<OpportunityFeedResponse, "nearMissExtraCount"> & {
  nearMissCount?: number;
  nearMissExtraCount?: number;
};

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
    items: Array.isArray(raw.items) ? raw.items : [],
    affordableCount:
      typeof raw.affordableCount === "number" ? raw.affordableCount : 0,
    principalUsdt:
      typeof raw.principalUsdt === "string" ? raw.principalUsdt : "0",
  };
}

export async function fetchOpportunityFeed(
  opts: UserFeedRequestOpts = {},
): Promise<OpportunityFeedResponse> {
  const res = await fetch(apiUrl(opts.apiBase ?? "", "/api/v1/opportunities"), {
    method: "GET",
    headers: await authHeaders(opts),
    credentials: "include",
    cache: "no-store",
    signal: opts.signal,
  });
  if (!res.ok) {
    throw new Error(`opportunity_feed_${res.status}`);
  }
  const raw = (await res.json()) as FeedRaw;
  return mapNearMissExtraCount(raw);
}

export async function fetchOpportunityDetail(
  opportunityId: string,
  opts: UserFeedRequestOpts = {},
): Promise<OpportunityDetailResponse> {
  const id = encodeURIComponent(opportunityId);
  const res = await fetch(
    apiUrl(opts.apiBase ?? "", `/api/v1/opportunities/${id}`),
    {
      method: "GET",
      headers: await authHeaders(opts),
      credentials: "include",
      cache: "no-store",
      signal: opts.signal,
    },
  );
  if (!res.ok) {
    throw new Error(`opportunity_detail_${res.status}`);
  }
  return (await res.json()) as OpportunityDetailResponse;
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
