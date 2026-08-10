/**
 * @aipo/sdk/growth — PART9g/9h
 * GET /api/v1/growth/public-surface
 */

import type {
  GrowthPublicSurfaceResponse,
  GrowthRequestOpts,
} from "./types";

function apiUrl(apiBase: string, path: string): string {
  const base = (apiBase || "").replace(/\/$/, "");
  const p = path.startsWith("/") ? path : `/${path}`;
  return base ? `${base}${p}` : p;
}

export async function fetchGrowthPublicSurface(
  opts: GrowthRequestOpts = {},
): Promise<GrowthPublicSurfaceResponse> {
  const res = await fetch(
    apiUrl(opts.apiBase ?? "", "/api/v1/growth/public-surface"),
    {
      method: "GET",
      headers: { Accept: "application/json" },
      credentials: "include",
      cache: "no-store",
      signal: opts.signal,
    },
  );
  if (!res.ok) {
    throw new Error(`growth_public_surface_${res.status}`);
  }
  const raw = (await res.json()) as Partial<GrowthPublicSurfaceResponse>;
  const tickerMode = raw.tickerMode;
  const counterMode = raw.counterMode;
  return {
    tickerMode:
      tickerMode === "live" ||
      tickerMode === "demo" ||
      tickerMode === "hybrid" ||
      tickerMode === "off"
        ? tickerMode
        : "off",
    counterMode:
      counterMode === "ledger" ||
      counterMode === "demo" ||
      counterMode === "blended" ||
      counterMode === "off"
        ? counterMode
        : "off",
    ledgerTotal:
      typeof raw.ledgerTotal === "number" && Number.isFinite(raw.ledgerTotal)
        ? Math.max(0, raw.ledgerTotal)
        : 0,
    events: Array.isArray(raw.events) ? raw.events : [],
    asOf: typeof raw.asOf === "string" ? raw.asOf : new Date().toISOString(),
  };
}
