/**
 * @aipo/sdk/home-read-model — GET /api/v1/me/home-read
 * unauthorized → viewState unauthorized · Fact fields null (zero≠absent)
 * NEVER invent ready_data from guest/expired
 */

import type {
  HomeReadModelRequestOpts,
  HomeReadModelResponse,
  HomeSessionStatus,
  HomeViewState,
} from "./types";

const VIEW_STATES: ReadonlySet<string> = new Set([
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
  opts: HomeReadModelRequestOpts,
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

function unauthorizedDto(
  sessionStatus: HomeSessionStatus,
  reasonCode: string,
): HomeReadModelResponse {
  return {
    viewState: "unauthorized",
    reasonCode,
    session: { status: sessionStatus },
    money: null,
    opportunity: null,
    growth: null,
    ledgerTotal: null,
    todayPossibleProfitUsdt: null,
    provenance: {
      todayPossibleProfitUsdt: null,
      ledgerTotal: null,
    },
    domainFsm: null,
  };
}

function asViewState(v: unknown): HomeViewState {
  return typeof v === "string" && VIEW_STATES.has(v)
    ? (v as HomeViewState)
    : "recoverable_error";
}

/** Normalize wire JSON · refuse unauthorized→ready_data coerce */
export function normalizeHomeReadModel(
  raw: Partial<HomeReadModelResponse> & Record<string, unknown>,
): HomeReadModelResponse {
  const viewState = asViewState(raw.viewState);
  const sessionRaw =
    raw.session && typeof raw.session === "object"
      ? (raw.session as Record<string, unknown>)
      : {};
  const sessionStatus = (
    sessionRaw.status === "guest" ||
    sessionRaw.status === "authenticated" ||
    sessionRaw.status === "expired"
      ? sessionRaw.status
      : viewState === "unauthorized"
        ? "guest"
        : "authenticated"
  ) as HomeSessionStatus;

  if (viewState === "unauthorized" || sessionStatus !== "authenticated") {
    return unauthorizedDto(
      sessionStatus === "authenticated" ? "guest" : sessionStatus,
      typeof raw.reasonCode === "string" && raw.reasonCode.trim()
        ? raw.reasonCode
        : "home.read.auth_required",
    );
  }

  const dto = raw as HomeReadModelResponse;
  if (dto.viewState === "ready_data" && dto.session?.status !== "authenticated") {
    return unauthorizedDto("guest", "home.read.auth_required");
  }
  return {
    viewState,
    reasonCode:
      typeof raw.reasonCode === "string" && raw.reasonCode.trim()
        ? raw.reasonCode
        : undefined,
    session: { status: "authenticated" },
    money: (raw.money as HomeReadModelResponse["money"]) ?? null,
    opportunity:
      (raw.opportunity as HomeReadModelResponse["opportunity"]) ?? null,
    growth: (raw.growth as HomeReadModelResponse["growth"]) ?? null,
    ledgerTotal:
      typeof raw.ledgerTotal === "number" ? raw.ledgerTotal : null,
    todayPossibleProfitUsdt:
      typeof raw.todayPossibleProfitUsdt === "string"
        ? raw.todayPossibleProfitUsdt
        : null,
    provenance:
      (raw.provenance as HomeReadModelResponse["provenance"]) ?? {
        todayPossibleProfitUsdt: null,
        ledgerTotal: null,
      },
    domainFsm: null,
  };
}

export async function fetchHomeReadModel(
  opts: HomeReadModelRequestOpts = {},
): Promise<HomeReadModelResponse> {
  const res = await fetch(apiUrl(opts.apiBase ?? "", "/api/v1/me/home-read"), {
    method: "GET",
    headers: await authHeaders(opts),
    credentials: "include",
    cache: "no-store",
    signal: opts.signal,
  });
  if (res.status === 401) {
    return unauthorizedDto("guest", "home.read.auth_required");
  }
  if (!res.ok) {
    throw new Error(`home_read_model_${res.status}`);
  }
  const raw = (await res.json()) as Partial<HomeReadModelResponse> &
    Record<string, unknown>;
  return normalizeHomeReadModel(raw);
}
