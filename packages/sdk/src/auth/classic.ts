/**
 * @aipo/sdk/auth/classic - classic (username/password) signup, login,
 * password reset, find-id, and session management HTTP calls (S1F Section
 * 5/7). Same Nest JWT + httpOnly cookie model as the rest of @aipo/sdk/auth
 * - never reads or writes any token via client JavaScript/localStorage.
 */

import { AuthError, isAuthError, normalizeAuthSession } from "./fetch";
import type { AuthRequestOpts, AuthSession } from "./types";

function apiUrl(apiBase: string, path: string): string {
  const base = (apiBase || "").replace(/\/$/, "");
  const p = path.startsWith("/") ? path : `/${path}`;
  return base ? `${base}${p}` : p;
}

async function authHeaders(opts: AuthRequestOpts): Promise<Record<string, string>> {
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

function readAuthErrorCode(status: number, raw: unknown): string | null {
  if (raw && typeof raw === "object") {
    const o = raw as Record<string, unknown>;
    if (typeof o.message === "string" && o.message) return o.message;
  }
  if (status === 429) return "TOO_MANY_REQUESTS";
  if (status === 503) return "SERVICE_UNAVAILABLE";
  if (status === 0) return "NETWORK_ERROR";
  return null;
}

function throwHttp(status: number, raw: unknown): never {
  throw new AuthError(status, readAuthErrorCode(status, raw));
}

async function postJson<T>(
  path: string,
  body: Record<string, unknown>,
  opts: AuthRequestOpts,
): Promise<T> {
  const headers = await authHeaders(opts);
  headers["Content-Type"] = "application/json";
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
  return raw as T;
}

export type ClassicSignupInput = {
  username: string;
  email: string;
  password: string;
  passwordConfirm: string;
  declaredName: string;
  birthDate: string;
  phoneE164?: string;
  termsAcceptedAt: string;
  privacyAcceptedAt: string;
  marketingConsent?: boolean;
  referralCode?: string;
  turnstileToken?: string;
};

export async function signupClassicRequest(
  input: ClassicSignupInput,
  opts: AuthRequestOpts = {},
): Promise<{ ok: true; status: "verification_email_sent" }> {
  return postJson("/api/v1/auth/signup/classic", { ...input }, opts);
}

export async function signupClassicActivate(
  token: string,
  opts: AuthRequestOpts = {},
): Promise<AuthSession> {
  const raw = await postJson<{ ok: true } & Record<string, unknown>>(
    "/api/v1/auth/signup/classic/verify",
    { token },
    opts,
  );
  return normalizeAuthSession((raw as { session?: unknown }).session ?? raw);
}

export async function resendSignupVerification(
  email: string,
  opts: AuthRequestOpts = {},
): Promise<{ ok: true }> {
  return postJson("/api/v1/auth/email/resend", { email }, opts);
}

export type MagicLinkConsent = {
  termsAcceptedAt?: string;
  privacyAcceptedAt?: string;
  marketingConsent?: boolean;
  referralCode?: string;
};

/**
 * S1F Section 6.2 fix: consent is sent at REQUEST time (stored server-side
 * in auth_magic_link_challenges), not stashed in browser sessionStorage for
 * a later verify() call - this is what actually fixes the cross-device/
 * cross-tab bug where a magic link opened on a different browser/device
 * had no sessionStorage to read consent from. The existing
 * `requestMagicLink(email, opts)` (packages/sdk/src/auth/fetch.ts) stays
 * as the no-consent login path (an existing user does not need it); this
 * function is the signup path that also carries consent.
 */
export async function requestMagicLinkWithConsent(
  email: string,
  consent: MagicLinkConsent,
  opts: AuthRequestOpts = {},
): Promise<{ ok: true }> {
  return postJson(
    "/api/v1/auth/magic-link/request",
    {
      email: email.trim(),
      termsAcceptedAt: consent.termsAcceptedAt,
      privacyAcceptedAt: consent.privacyAcceptedAt,
      marketingConsent: consent.marketingConsent === true,
      referralCode: consent.referralCode,
    },
    opts,
  );
}

export async function loginClassic(
  identifier: string,
  password: string,
  opts: AuthRequestOpts & { turnstileToken?: string } = {},
): Promise<AuthSession> {
  const raw = await postJson<Record<string, unknown>>(
    "/api/v1/auth/login",
    { identifier, password, turnstileToken: opts.turnstileToken },
    opts,
  );
  return normalizeAuthSession(raw.session ?? raw);
}

export async function findId(
  email: string,
  opts: AuthRequestOpts & { turnstileToken?: string } = {},
): Promise<{ ok: true }> {
  return postJson("/api/v1/auth/find-id", { email, turnstileToken: opts.turnstileToken }, opts);
}

export async function requestPasswordReset(
  email: string,
  opts: AuthRequestOpts & { turnstileToken?: string } = {},
): Promise<{ ok: true }> {
  return postJson(
    "/api/v1/auth/password-reset/request",
    { email, turnstileToken: opts.turnstileToken },
    opts,
  );
}

export async function completePasswordReset(
  token: string,
  newPassword: string,
  opts: AuthRequestOpts = {},
): Promise<{ ok: true }> {
  return postJson("/api/v1/auth/password-reset/complete", { token, newPassword }, opts);
}

export async function changePassword(
  currentPassword: string,
  newPassword: string,
  opts: AuthRequestOpts = {},
): Promise<{ ok: true }> {
  return postJson("/api/v1/auth/password/change", { currentPassword, newPassword }, opts);
}

export async function refreshSession(
  opts: AuthRequestOpts = {},
): Promise<AuthSession | null> {
  try {
    const raw = await postJson<Record<string, unknown>>("/api/v1/auth/refresh", {}, opts);
    return normalizeAuthSession(raw.session ?? raw);
  } catch (err) {
    if (isAuthError(err) && (err.status === 401 || err.status === 403)) return null;
    throw err;
  }
}

export async function logoutAllDevices(opts: AuthRequestOpts = {}): Promise<{ ok: true }> {
  return postJson("/api/v1/auth/logout-all", {}, opts);
}

export type SessionFamilySummary = {
  familyId: string;
  deviceLabel: string | null;
  ip: string | null;
  issuedAt: string;
  lastActiveAt: string;
  current: boolean;
};

export async function listSessions(
  opts: AuthRequestOpts = {},
): Promise<SessionFamilySummary[]> {
  const headers = await authHeaders(opts);
  let res: Response;
  try {
    res = await fetch(apiUrl(opts.apiBase ?? "", "/api/v1/auth/sessions"), {
      method: "GET",
      headers,
      credentials: "include",
      cache: "no-store",
      signal: opts.signal,
    });
  } catch (err) {
    if (isAbortError(err)) throw err;
    throw new AuthError(0, "NETWORK_ERROR");
  }
  const raw = await readJson(res);
  if (!res.ok) throwHttp(res.status, raw);
  const sessions = (raw as { sessions?: unknown })?.sessions;
  return Array.isArray(sessions) ? (sessions as SessionFamilySummary[]) : [];
}

export async function revokeSessionFamily(
  familyId: string,
  opts: AuthRequestOpts = {},
): Promise<{ ok: true }> {
  const headers = await authHeaders(opts);
  let res: Response;
  try {
    res = await fetch(apiUrl(opts.apiBase ?? "", `/api/v1/auth/sessions/${familyId}`), {
      method: "DELETE",
      headers,
      credentials: "include",
      cache: "no-store",
      signal: opts.signal,
    });
  } catch (err) {
    if (isAbortError(err)) throw err;
    throw new AuthError(0, "NETWORK_ERROR");
  }
  const raw = await readJson(res);
  if (!res.ok) throwHttp(res.status, raw);
  return { ok: true };
}
