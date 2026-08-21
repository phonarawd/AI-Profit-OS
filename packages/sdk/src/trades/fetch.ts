/**
 * GET /api/v1/trades — 세션 유저 trade_executions 목록
 * 결측 금액을 0으로 채우지 않는다.
 */

import { TradeExecutionRequestError } from "../execution-stream/errors";
import type {
  TradeExecutionResultCode,
  TradeExecutionState,
  TradeExecutionStatus,
} from "../execution-stream/types";
import type { TradeListRequestOpts, TradeListResponse } from "./types";

const MONEY_RE = /^-?[0-9]+(\.[0-9]+)?$/;
const STATUSES = new Set<TradeExecutionStatus>([
  "running",
  "requeue",
  "success",
  "safe_stop",
  "cancelled",
  "failed",
]);
const RESULT_CODES = new Set<TradeExecutionResultCode>([
  "MATCH_SUCCESS",
  "REQUEUE",
  "PRICE_MOVED",
  "BELOW_MIN_PROFIT",
  "CANCELLED_BY_USER",
  "CIRCUIT_OPEN",
  "SYSTEM_FAILED",
  "MATCH_TIMEOUT",
]);

function apiUrl(apiBase: string, path: string): string {
  const base = (apiBase || "").replace(/\/$/, "");
  const p = path.startsWith("/") ? path : `/${path}`;
  return base ? `${base}${p}` : p;
}

async function authHeaders(
  opts: TradeListRequestOpts,
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

function asMoney(v: unknown): string | null {
  return typeof v === "string" && MONEY_RE.test(v) ? v : null;
}

function readListItem(raw: unknown): TradeExecutionState | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const tradeId = typeof o.tradeId === "string" ? o.tradeId.trim() : "";
  const opportunityId =
    typeof o.opportunityId === "string" ? o.opportunityId.trim() : "";
  const status = o.status;
  const expectedProfitUsdt = asMoney(o.expectedProfitUsdt);
  if (!tradeId || !opportunityId || !STATUSES.has(status as TradeExecutionStatus)) {
    return null;
  }
  if (!expectedProfitUsdt) return null;
  if (!Number.isInteger(o.pricingVersion) || Number(o.pricingVersion) < 1) {
    return null;
  }
  const assetRaw =
    o.asset && typeof o.asset === "object"
      ? (o.asset as Record<string, unknown>)
      : {};
  const assetId = typeof assetRaw.id === "string" ? assetRaw.id : opportunityId;
  const label = typeof assetRaw.label === "string" ? assetRaw.label : "";
  const settledProfitUsdt = asMoney(o.settledProfitUsdt);
  const resultCode = RESULT_CODES.has(o.resultCode as TradeExecutionResultCode)
    ? (o.resultCode as TradeExecutionResultCode)
    : undefined;
  const stepRaw = Number(o.stepIndex);
  const stepIndex = ([0, 1, 2, 3, 4] as const).includes(
    stepRaw as 0 | 1 | 2 | 3 | 4,
  )
    ? (stepRaw as 0 | 1 | 2 | 3 | 4)
    : 0;
  const progressPct =
    typeof o.progressPct === "number" && Number.isFinite(o.progressPct)
      ? o.progressPct
      : 0;
  return {
    tradeId,
    opportunityId,
    pricingVersion: Number(o.pricingVersion),
    status: status as TradeExecutionStatus,
    ...(resultCode ? { resultCode } : {}),
    stepIndex,
    progressPct,
    expectedProfitUsdt,
    ...(settledProfitUsdt ? { settledProfitUsdt } : {}),
    asset: {
      id: assetId,
      label,
      ...(typeof assetRaw.iconUrl === "string" ? { iconUrl: assetRaw.iconUrl } : {}),
      ...(typeof assetRaw.ref === "string" ? { ref: assetRaw.ref } : {}),
    },
  };
}

export async function fetchTradeList(
  opts: TradeListRequestOpts = {},
): Promise<TradeListResponse> {
  let res: Response;
  try {
    res = await fetch(apiUrl(opts.apiBase ?? "", "/api/v1/trades"), {
      method: "GET",
      headers: await authHeaders(opts),
      credentials: "include",
      cache: "no-store",
      signal: opts.signal,
    });
  } catch (err) {
    if (
      (err instanceof DOMException && err.name === "AbortError") ||
      (err instanceof Error && err.name === "AbortError")
    ) {
      throw err;
    }
    throw new TradeExecutionRequestError(0);
  }
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new TradeExecutionRequestError(res.status, body);
  }
  let raw: unknown;
  try {
    raw = await res.json();
  } catch {
    throw new TradeExecutionRequestError(502, "trade list body");
  }
  const itemsRaw =
    raw && typeof raw === "object" && Array.isArray((raw as { items?: unknown }).items)
      ? (raw as { items: unknown[] }).items
      : null;
  if (!itemsRaw) {
    throw new TradeExecutionRequestError(502, "trade list items");
  }
  const items: TradeExecutionState[] = [];
  for (const row of itemsRaw) {
    const item = readListItem(row);
    if (item) items.push(item);
  }
  return { items };
}
