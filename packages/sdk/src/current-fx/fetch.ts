/**
 * @aipo/sdk/current-fx — POST /api/v1/me/current-fx/approx
 * Client multiplication 0. Number(amount)*rate 0. Raw GET 0.
 */

import type {
  CurrentFxApproxRequest,
  CurrentFxApproxResponse,
  CurrentFxQuoteOut,
  CurrentFxRequestOpts,
  CurrentFxStatus,
} from "./types";

const DECIMAL = /^-?[0-9]+(\.[0-9]+)?$/;

function apiUrl(apiBase: string, path: string): string {
  const base = (apiBase || "").replace(/\/$/, "");
  const p = path.startsWith("/") ? path : `/${path}`;
  return base ? `${base}${p}` : p;
}

async function authHeaders(
  opts: CurrentFxRequestOpts,
): Promise<Record<string, string>> {
  const headers: Record<string, string> = {
    Accept: "application/json",
    "Content-Type": "application/json",
  };
  if (opts.getAccessToken) {
    const token = await opts.getAccessToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }
  return headers;
}

function asNullableDecimal(v: unknown): string | null {
  if (typeof v !== "string") return null;
  return DECIMAL.test(v) ? v : null;
}

function asNullableText(v: unknown): string | null {
  return typeof v === "string" && v.trim() ? v : null;
}

function asStatus(v: unknown): CurrentFxStatus {
  if (v === "FRESH" || v === "STALE" || v === "UNAVAILABLE") return v;
  return "UNAVAILABLE";
}

function asQuotes(raw: unknown): CurrentFxQuoteOut[] {
  if (!Array.isArray(raw)) return [];
  const out: CurrentFxQuoteOut[] = [];
  for (const row of raw.slice(0, 40)) {
    if (!row || typeof row !== "object") continue;
    const rec = row as Record<string, unknown>;
    const id = asNullableText(rec.id);
    if (!id) continue;
    out.push({
      id,
      amountUsdt: asNullableDecimal(rec.amountUsdt),
      amountKrw: asNullableDecimal(rec.amountKrw),
    });
  }
  return out;
}

export function normalizeCurrentFxApprox(
  raw: Partial<CurrentFxApproxResponse> & Record<string, unknown>,
): CurrentFxApproxResponse {
  const fxStatus = asStatus(raw.fxStatus);
  const krwDisplayAvailable =
    raw.krwDisplayAvailable === true && fxStatus !== "UNAVAILABLE";
  return {
    fxSnapshotId: asNullableText(raw.fxSnapshotId),
    capturedAt: asNullableText(raw.capturedAt),
    principalKrwApprox: asNullableDecimal(raw.principalKrwApprox),
    withdrawableProfitKrwApprox: asNullableDecimal(
      raw.withdrawableProfitKrwApprox,
    ),
    expectedProfitKrwApprox: asNullableDecimal(raw.expectedProfitKrwApprox),
    krwDisplayAvailable,
    fxStatus,
    quotes: asQuotes(raw.quotes),
  };
}

export async function fetchCurrentFxApprox(
  input: CurrentFxApproxRequest,
  opts: CurrentFxRequestOpts = {},
): Promise<CurrentFxApproxResponse> {
  const res = await fetch(
    apiUrl(opts.apiBase ?? "", "/api/v1/me/current-fx/approx"),
    {
      method: "POST",
      headers: await authHeaders(opts),
      credentials: "include",
      cache: "no-store",
      signal: opts.signal,
      body: JSON.stringify({
        principalUsdt: input.principalUsdt,
        withdrawableProfitUsdt: input.withdrawableProfitUsdt,
        expectedProfitUsdt: input.expectedProfitUsdt,
        quotes: input.quotes ?? [],
      }),
    },
  );
  if (!res.ok) {
    throw new Error(`current_fx_approx_${res.status}`);
  }
  const raw = (await res.json()) as Partial<CurrentFxApproxResponse> &
    Record<string, unknown>;
  return normalizeCurrentFxApprox(raw);
}
