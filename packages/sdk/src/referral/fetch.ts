/**
 * Referral HTTP client — C-ACC-002
 * 기존 Nest 경로만. % / L1·L2·L3 유저 DTO 전달 0. 코드 발명 0.
 */

import type {
  ReferralBindInput,
  ReferralBindResult,
  ReferralConsumerState,
  ReferralMe,
  ReferralRequestOpts,
  ReferralShareResult,
} from "./types";

export class ReferralError extends Error {
  readonly status: number;
  readonly code: string | null;

  constructor(status: number, code: string | null, message?: string) {
    super(message ?? code ?? `referral_${status}`);
    this.name = "ReferralError";
    this.status = status;
    this.code = code;
  }
}

export function isReferralError(err: unknown): err is ReferralError {
  return err instanceof ReferralError;
}

function apiUrl(apiBase: string, path: string): string {
  const base = (apiBase || "").replace(/\/$/, "");
  const p = path.startsWith("/") ? path : `/${path}`;
  return base ? `${base}${p}` : p;
}

async function authHeaders(
  opts: ReferralRequestOpts,
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

function isAbortError(err: unknown): boolean {
  return (
    (err instanceof DOMException && err.name === "AbortError") ||
    (err instanceof Error && err.name === "AbortError")
  );
}

function asText(v: unknown): string | null {
  return typeof v === "string" && v.trim() ? v.trim() : null;
}

async function readJson(res: Response): Promise<unknown> {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

export function readReferralErrorCode(
  status: number,
  raw: unknown,
): string | null {
  if (raw && typeof raw === "object") {
    const o = raw as Record<string, unknown>;
    if (asText(o.code)) return asText(o.code);
    const message = typeof o.message === "string" ? o.message : "";
    if (message.includes("REFERRAL_DISABLED")) return "REFERRAL_DISABLED";
    if (message.includes("REFERRAL_CODE_INVALID")) return "REFERRAL_CODE_INVALID";
    if (message.includes("REFERRAL_SELF_FORBIDDEN")) {
      return "REFERRAL_SELF_FORBIDDEN";
    }
    if (message.includes("REFERRAL_ALREADY_BOUND")) {
      return "REFERRAL_ALREADY_BOUND";
    }
  }
  if (status === 401) return "AUTH_REQUIRED";
  if (status === 429) return "REFERRAL_SHARE_LIMIT";
  if (status === 0) return "NETWORK_ERROR";
  return null;
}

function throwHttp(status: number, raw: unknown): never {
  throw new ReferralError(status, readReferralErrorCode(status, raw));
}

function isQueuedPool(raw: unknown): boolean {
  if (!raw || typeof raw !== "object") return false;
  return (raw as { status?: unknown }).status === "queued_pool";
}

export function referralConsumerState(input: {
  enabled: boolean;
  rewardsEnabled: boolean;
  bound: boolean;
  poolWait: boolean;
}): ReferralConsumerState {
  if (!input.enabled || !input.rewardsEnabled) return "rewards_off";
  if (input.poolWait) return "pool_wait";
  if (input.bound) return "bound";
  return "enabled";
}

export function normalizeReferralMe(raw: unknown): ReferralMe {
  if (!raw || typeof raw !== "object") {
    throw new ReferralError(0, "REFERRAL_UNAVAILABLE");
  }
  const o = raw as Record<string, unknown>;
  if (typeof o.enabled !== "boolean" || typeof o.rewardsEnabled !== "boolean") {
    throw new ReferralError(0, "REFERRAL_UNAVAILABLE");
  }
  if (o.inviteCountUnlimited !== true) {
    throw new ReferralError(0, "REFERRAL_UNAVAILABLE");
  }
  const edges = Array.isArray(o.edges) ? o.edges : [];
  const myBinding =
    o.myBinding && typeof o.myBinding === "object" ? o.myBinding : null;
  const poolWait =
    isQueuedPool(myBinding) || edges.some((edge) => isQueuedPool(edge));
  const bound = myBinding != null;
  const myReferralCode = asText(o.myReferralCode);
  const consumerState = referralConsumerState({
    enabled: o.enabled,
    rewardsEnabled: o.rewardsEnabled,
    bound,
    poolWait,
  });
  return {
    enabled: o.enabled,
    rewardsEnabled: o.rewardsEnabled,
    inviteCountUnlimited: true,
    inviteCount: edges.length,
    bound,
    poolWait,
    myReferralCode,
    consumerState,
  };
}

export async function fetchReferralMe(
  opts: ReferralRequestOpts = {},
): Promise<ReferralMe> {
  let res: Response;
  try {
    res = await fetch(apiUrl(opts.apiBase ?? "", "/api/v1/referral/me"), {
      method: "GET",
      headers: await authHeaders(opts),
      credentials: "include",
      cache: "no-store",
      signal: opts.signal,
    });
  } catch (err) {
    if (isAbortError(err)) throw err;
    throw new ReferralError(0, "NETWORK_ERROR");
  }
  const raw = await readJson(res);
  if (!res.ok) throwHttp(res.status, raw);
  return normalizeReferralMe(raw);
}

export async function bindReferral(
  input: ReferralBindInput,
  opts: ReferralRequestOpts = {},
): Promise<ReferralBindResult> {
  const referralCode = input.referralCode.trim();
  if (!referralCode) {
    throw new ReferralError(400, "REFERRAL_CODE_INVALID");
  }
  const headers = await authHeaders(opts);
  headers["Content-Type"] = "application/json";
  let res: Response;
  try {
    res = await fetch(apiUrl(opts.apiBase ?? "", "/api/v1/referral/bind"), {
      method: "POST",
      headers,
      credentials: "include",
      cache: "no-store",
      signal: opts.signal,
      body: JSON.stringify({ referralCode }),
    });
  } catch (err) {
    if (isAbortError(err)) throw err;
    throw new ReferralError(0, "NETWORK_ERROR");
  }
  const raw = await readJson(res);
  if (!res.ok) throwHttp(res.status, raw);
  return { ok: true, bound: true };
}

export async function shareReferral(
  opts: ReferralRequestOpts = {},
): Promise<ReferralShareResult> {
  let res: Response;
  try {
    res = await fetch(apiUrl(opts.apiBase ?? "", "/api/v1/referral/share"), {
      method: "POST",
      headers: await authHeaders(opts),
      credentials: "include",
      cache: "no-store",
      signal: opts.signal,
    });
  } catch (err) {
    if (isAbortError(err)) throw err;
    throw new ReferralError(0, "NETWORK_ERROR");
  }
  const raw = await readJson(res);
  if (!res.ok) throwHttp(res.status, raw);
  const o = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  if (typeof o.shareCount !== "number" || typeof o.remaining !== "number") {
    throw new ReferralError(0, "REFERRAL_UNAVAILABLE");
  }
  return { shareCount: o.shareCount, remaining: o.remaining };
}
