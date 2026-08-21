/**
 * POST /api/v1/opportunities/:id/preflight
 * POST /api/v1/opportunities/:id/participate
 */

import {
  ParticipateError,
  type ParticipateRequestBody,
  type ParticipateRequestOpts,
  type ParticipateResult,
  type PreflightResponse,
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
  opts: ParticipateRequestOpts,
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

const MONEY_RE = /^-?[0-9]+(\.[0-9]+)?$/;

function asText(v: unknown): string | null {
  return typeof v === "string" && v.trim() ? v : null;
}

function readNestedCode(raw: unknown): string | null {
  if (raw == null || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const code = asText(o.code) ?? asText(o.toastCode);
  if (code) return code;
  if (typeof o.message === "string") {
    return o.message === "AUTH_REQUIRED" ? "AUTH_REQUIRED" : null;
  }
  if (o.message && typeof o.message === "object") {
    return readNestedCode(o.message);
  }
  return null;
}

export function readParticipateErrorCode(
  status: number,
  raw: unknown,
): string | null {
  const nested = readNestedCode(raw);
  if (nested) return nested;
  if (status === 401) return "AUTH_REQUIRED";
  if (status === 412) return "PREFLIGHT_REQUIRED";
  return null;
}

function assertParticipateBody(body: ParticipateRequestBody): ParticipateRequestBody {
  const opportunityId = body.opportunityId.trim();
  const minProfitUsdt = body.minProfitUsdt.trim();
  const amountUsdt = body.amountUsdt.trim();
  const idempotencyKey = body.idempotencyKey.trim();
  const preflightToken = body.preflightToken.trim();
  if (!opportunityId) {
    throw new ParticipateError(400, "VALIDATION_ERROR", "opportunityId required");
  }
  if (!Number.isInteger(body.pricingVersion) || body.pricingVersion < 1) {
    throw new ParticipateError(400, "VALIDATION_ERROR", "pricingVersion required");
  }
  if (!MONEY_RE.test(minProfitUsdt) || !MONEY_RE.test(amountUsdt)) {
    throw new ParticipateError(400, "VALIDATION_ERROR", "money fields required");
  }
  if (idempotencyKey.length < 8) {
    throw new ParticipateError(400, "VALIDATION_ERROR", "idempotencyKey minLength 8");
  }
  if (preflightToken.length < 16) {
    throw new ParticipateError(412, "PREFLIGHT_REQUIRED");
  }
  return {
    opportunityId,
    pricingVersion: body.pricingVersion,
    minProfitUsdt,
    amountUsdt,
    idempotencyKey,
    preflightToken,
  };
}

async function readJson(res: Response): Promise<unknown> {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

function throwHttp(status: number, raw: unknown): never {
  throw new ParticipateError(status, readParticipateErrorCode(status, raw));
}

export async function issuePreflight(
  opportunityId: string,
  opts: ParticipateRequestOpts = {},
): Promise<PreflightResponse> {
  const id = encodeURIComponent(opportunityId);
  let res: Response;
  try {
    res = await fetch(
      apiUrl(opts.apiBase ?? "", `/api/v1/opportunities/${id}/preflight`),
      {
        method: "POST",
        headers: await authHeaders(opts),
        credentials: "include",
        cache: "no-store",
        signal: opts.signal,
      },
    );
  } catch (err) {
    if (isAbortError(err)) throw err;
    throw new ParticipateError(0, "NETWORK_ERROR");
  }
  const raw = await readJson(res);
  if (!res.ok) throwHttp(res.status, raw);
  const o = raw as Record<string, unknown> | null;
  const preflightToken = asText(o?.preflightToken);
  const expiresAt = asText(o?.expiresAt);
  if (!preflightToken || !expiresAt) {
    throw new ParticipateError(res.status, "PREFLIGHT_REQUIRED");
  }
  return {
    preflightToken,
    expiresAt,
    mayStopRequired: true,
  };
}

export async function postParticipate(
  opportunityId: string,
  body: ParticipateRequestBody,
  opts: ParticipateRequestOpts = {},
): Promise<ParticipateResult> {
  const validated = assertParticipateBody(body);
  if (validated.opportunityId !== opportunityId) {
    throw new ParticipateError(400, "VALIDATION_ERROR");
  }
  const id = encodeURIComponent(opportunityId);
  const headers = await authHeaders(opts);
  headers["Content-Type"] = "application/json";
  let res: Response;
  try {
    res = await fetch(
      apiUrl(opts.apiBase ?? "", `/api/v1/opportunities/${id}/participate`),
      {
        method: "POST",
        headers,
        credentials: "include",
        cache: "no-store",
        signal: opts.signal,
        body: JSON.stringify({
          opportunityId: validated.opportunityId,
          pricingVersion: validated.pricingVersion,
          minProfitUsdt: validated.minProfitUsdt,
          amountUsdt: validated.amountUsdt,
          idempotencyKey: validated.idempotencyKey,
          preflightToken: validated.preflightToken,
        }),
      },
    );
  } catch (err) {
    if (isAbortError(err)) throw err;
    throw new ParticipateError(0, "NETWORK_ERROR");
  }
  const raw = await readJson(res);
  if (!res.ok) throwHttp(res.status, raw);
  const o = raw as Record<string, unknown> | null;
  const tradeId = asText(o?.tradeId);
  const participateRequestId = asText(o?.participateRequestId);
  if (!tradeId || !participateRequestId) {
    throw new ParticipateError(res.status, "VALIDATION_ERROR");
  }
  return {
    ok: true,
    participateRequestId,
    tradeId,
    opportunityId: asText(o?.opportunityId) ?? opportunityId,
    pricingVersion:
      typeof o?.pricingVersion === "number" && Number.isInteger(o.pricingVersion)
        ? o.pricingVersion
        : validated.pricingVersion,
    expectedProfitUsdt:
      typeof o?.expectedProfitUsdt === "string" ? o.expectedProfitUsdt : validated.minProfitUsdt,
    amountUsdt:
      typeof o?.amountUsdt === "string" ? o.amountUsdt : validated.amountUsdt,
    status: "accepted",
    tradeStatus: "running",
    reused: o?.reused === true,
    priceSoftAccept: o?.priceSoftAccept === true,
  };
}

export function newParticipateIdempotencyKey(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `pt_${crypto.randomUUID().replace(/-/g, "")}`;
  }
  return `pt_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}
