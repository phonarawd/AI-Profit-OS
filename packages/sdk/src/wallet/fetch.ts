/**
 * @aipo/sdk/wallet — PART9f
 * GET /api/v1/wallet/buckets
 */

import type { WalletBucketsResponse, WalletRequestOpts } from "./types";

function apiUrl(apiBase: string, path: string): string {
  const base = (apiBase || "").replace(/\/$/, "");
  const p = path.startsWith("/") ? path : `/${path}`;
  return base ? `${base}${p}` : p;
}

async function authHeaders(
  opts: WalletRequestOpts,
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

function asAmount(v: unknown): string {
  return typeof v === "string" && v.trim() ? v : "0";
}

export function normalizeWalletBuckets(
  raw: Partial<WalletBucketsResponse> & Record<string, unknown>,
): WalletBucketsResponse {
  return {
    userId: typeof raw.userId === "string" ? raw.userId : "",
    principalUsdt: asAmount(raw.principalUsdt),
    profitUsdt: asAmount(raw.profitUsdt),
    lockedUsdt: asAmount(raw.lockedUsdt),
    practiceUsdt: asAmount(raw.practiceUsdt),
    liabilityUsdt: asAmount(raw.liabilityUsdt),
    asOfLedgerEntryId:
      typeof raw.asOfLedgerEntryId === "string"
        ? raw.asOfLedgerEntryId
        : "none",
  };
}

export async function fetchWalletBuckets(
  opts: WalletRequestOpts = {},
): Promise<WalletBucketsResponse> {
  const res = await fetch(
    apiUrl(opts.apiBase ?? "", "/api/v1/wallet/buckets"),
    {
      method: "GET",
      headers: await authHeaders(opts),
      credentials: "include",
      cache: "no-store",
      signal: opts.signal,
    },
  );
  if (!res.ok) {
    throw new Error(`wallet_buckets_${res.status}`);
  }
  const raw = (await res.json()) as Partial<WalletBucketsResponse> &
    Record<string, unknown>;
  return normalizeWalletBuckets(raw);
}
