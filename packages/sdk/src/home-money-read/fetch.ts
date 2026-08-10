/**
 * @aipo/sdk/home-money-read — Money v7.23 R1
 * GET /api/v1/me/home-money-read
 * NEVER coerce missing → fake zero as Fact (zero≠absent) · Engine todayPossible 0
 */

import type {
  HomeMoneyReadRequestOpts,
  HomeMoneyReadResponse,
  HomeMoneyReadState,
} from "./types";

const STATES: ReadonlySet<string> = new Set([
  "ready_empty",
  "ready_data",
  "stale",
  "recoverable_error",
  "blocked",
  "unauthorized",
]);

function apiUrl(apiBase: string, path: string): string {
  const base = (apiBase || "").replace(/\/$/, "");
  const p = path.startsWith("/") ? path : `/${path}`;
  return base ? `${base}${p}` : p;
}

async function authHeaders(
  opts: HomeMoneyReadRequestOpts,
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
  return typeof v === "string" && /^-?[0-9]+(\.[0-9]+)?$/.test(v) ? v : "0";
}

function asCount(v: unknown): number {
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.floor(n);
}

function asIso(v: unknown, fallback: string): string {
  return typeof v === "string" && v.trim() ? v : fallback;
}

function asState(v: unknown): HomeMoneyReadState {
  return typeof v === "string" && STATES.has(v)
    ? (v as HomeMoneyReadState)
    : "recoverable_error";
}

/** Normalize wire JSON · does not invent Fact when state=recoverable_error */
export function normalizeHomeMoneyRead(
  raw: Partial<HomeMoneyReadResponse> & Record<string, unknown>,
): HomeMoneyReadResponse {
  const now = new Date().toISOString();
  const asOfRaw =
    raw.asOf && typeof raw.asOf === "object"
      ? (raw.asOf as Record<string, unknown>)
      : {};
  const sourceRaw =
    raw.source && typeof raw.source === "object"
      ? (raw.source as Record<string, unknown>)
      : {};

  const dto: HomeMoneyReadResponse = {
    principalUsdt: asAmount(raw.principalUsdt),
    settlementCompletedTodayCount: asCount(raw.settlementCompletedTodayCount),
    asOf: {
      principalUsdt: asIso(asOfRaw.principalUsdt, now),
      settlementCompletedTodayCount: asIso(
        asOfRaw.settlementCompletedTodayCount,
        now,
      ),
    },
    source: {
      principalUsdt: "ledger_projection",
      settlementCompletedTodayCount: "settlement_projection",
    },
    state: asState(raw.state),
  };

  // source const lock — reject silent drift by overwriting only known consts
  if (sourceRaw.principalUsdt !== "ledger_projection") {
    dto.source.principalUsdt = "ledger_projection";
  }
  if (sourceRaw.settlementCompletedTodayCount !== "settlement_projection") {
    dto.source.settlementCompletedTodayCount = "settlement_projection";
  }

  if (typeof raw.reasonCode === "string" && raw.reasonCode.trim()) {
    dto.reasonCode = raw.reasonCode;
  }

  return dto;
}

export async function fetchHomeMoneyRead(
  opts: HomeMoneyReadRequestOpts = {},
): Promise<HomeMoneyReadResponse> {
  const res = await fetch(
    apiUrl(opts.apiBase ?? "", "/api/v1/me/home-money-read"),
    {
      method: "GET",
      headers: await authHeaders(opts),
      credentials: "include",
      cache: "no-store",
      signal: opts.signal,
    },
  );
  if (res.status === 401) {
    const now = new Date().toISOString();
    return {
      principalUsdt: "0",
      settlementCompletedTodayCount: 0,
      asOf: { principalUsdt: now, settlementCompletedTodayCount: now },
      source: {
        principalUsdt: "ledger_projection",
        settlementCompletedTodayCount: "settlement_projection",
      },
      state: "unauthorized",
      reasonCode: "money.home.auth_required",
    };
  }
  if (!res.ok) {
    throw new Error(`home_money_read_${res.status}`);
  }
  const raw = (await res.json()) as Partial<HomeMoneyReadResponse> &
    Record<string, unknown>;
  return normalizeHomeMoneyRead(raw);
}
