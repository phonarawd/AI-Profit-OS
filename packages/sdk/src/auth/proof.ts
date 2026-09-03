/**
 * Magic link / OAuth finish — token·code 를 서버 검증에만 넘긴다.
 * providerSubject / raw email 세션 발급 0.
 */

import {
  AuthError,
  assertNoForbiddenProfileFields,
  normalizeAuthSession,
} from "./fetch";
import type { AuthRequestOpts, AuthSession } from "./types";

function apiUrl(apiBase: string, path: string): string {
  const base = (apiBase || "").replace(/\/$/, "");
  const p = path.startsWith("/") ? path : `/${path}`;
  return base ? `${base}${p}` : p;
}

async function authHeaders(
  opts: AuthRequestOpts,
): Promise<Record<string, string>> {
  const headers: Record<string, string> = { Accept: "application/json" };
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

async function readJson(res: Response): Promise<unknown> {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

function throwHttp(status: number, raw: unknown): never {
  const message =
    raw && typeof raw === "object" && typeof (raw as { message?: unknown }).message === "string"
      ? (raw as { message: string }).message
      : null;
  throw new AuthError(status, message && message.includes("TERMS") ? "TERMS_REQUIRED" : null);
}

async function postSession(
  path: string,
  body: Record<string, unknown>,
  opts: AuthRequestOpts,
): Promise<AuthSession> {
  const headers = await authHeaders(opts);
  headers["Content-Type"] = "application/json";
  assertNoForbiddenProfileFields(body);
  let res: Response;
  try {
    res = await fetch(apiUrl(opts.apiBase ?? "", path), {
      method: "POST",
      headers,
      credentials: "include",
      cache: "no-store",
      signal: opts.signal,
      body: JSON.stringify(body),
    });
  } catch (err) {
    if (isAbortError(err)) throw err;
    throw new AuthError(0, "NETWORK_ERROR");
  }
  const raw = await readJson(res);
  if (!res.ok) throwHttp(res.status, raw);
  const sessionRaw =
    raw && typeof raw === "object"
      ? (raw as Record<string, unknown>).session
      : null;
  return normalizeAuthSession(sessionRaw);
}

export async function verifyMagicLink(
  token: string,
  extra: {
    termsAcceptedAt?: string;
    privacyAcceptedAt?: string;
    marketingConsent?: boolean;
    referralCode?: string;
  } = {},
  opts: AuthRequestOpts = {},
): Promise<AuthSession> {
  const trimmed = token.trim();
  if (!trimmed) throw new AuthError(400, "VALIDATION_ERROR");
  const body: Record<string, unknown> = { token: trimmed };
  if (extra.termsAcceptedAt) body.termsAcceptedAt = extra.termsAcceptedAt;
  if (extra.privacyAcceptedAt) body.privacyAcceptedAt = extra.privacyAcceptedAt;
  if (extra.marketingConsent === true) body.marketingConsent = true;
  if (extra.referralCode?.trim()) body.referralCode = extra.referralCode.trim();
  return postSession("/api/v1/auth/magic-link/verify", body, opts);
}

export async function finishOauth(
  input: {
    provider: "kakao" | "google";
    code: string;
    state: string;
    termsAcceptedAt?: string;
    privacyAcceptedAt?: string;
    marketingConsent?: boolean;
    referralCode?: string;
  },
  opts: AuthRequestOpts = {},
): Promise<AuthSession> {
  const code = input.code.trim();
  const state = input.state.trim();
  if (!code || !state) throw new AuthError(400, "VALIDATION_ERROR");
  const body: Record<string, unknown> = { code, state };
  if (input.termsAcceptedAt) body.termsAcceptedAt = input.termsAcceptedAt;
  if (input.privacyAcceptedAt) body.privacyAcceptedAt = input.privacyAcceptedAt;
  if (input.marketingConsent === true) body.marketingConsent = true;
  if (input.referralCode?.trim()) body.referralCode = input.referralCode.trim();
  return postSession("/api/v1/auth/oauth/" + input.provider + "/callback", body, opts);
}
