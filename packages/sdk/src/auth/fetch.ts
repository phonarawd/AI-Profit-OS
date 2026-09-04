/**
 * Auth HTTP client.
 * 기존 Nest 경로만. code를 subject로 쓰지 않음. 성별/주민번호 전송 0.
 */

import type {
  AuthOnboardingStage,
  AuthRequestOpts,
  AuthSession,
  DeleteAccountInput,
  DeleteAccountResult,
  KakaoStartInput,
  KakaoStartResult,
  LogoutResult,
  StageASignupInput,
  StageBProfileInput,
  StageBProfileResult,
} from "./types";

const DELETE_ACCOUNT_CONFIRM_PHRASE = "탈퇴하겠습니다";

export class AuthError extends Error {
  readonly status: number;
  readonly code: string | null;

  constructor(status: number, code: string | null, message?: string) {
    super(message ?? code ?? `auth_${status}`);
    this.name = "AuthError";
    this.status = status;
    this.code = code;
  }
}

export function isAuthError(err: unknown): err is AuthError {
  return err instanceof AuthError;
}

const NEST_ISSUER = "ai-profit-os-nest";
const STAGES = new Set<AuthOnboardingStage>([
  "A",
  "B_incomplete",
  "B_complete",
]);
const FORBIDDEN_PROFILE_KEYS = [
  "gender",
  "rrn",
  "rrnFull",
  "residentRegistrationNumber",
  "addressRequired",
] as const;

function apiUrl(apiBase: string, path: string): string {
  const base = (apiBase || "").replace(/\/$/, "");
  const p = path.startsWith("/") ? path : `/${path}`;
  return base ? `${base}${p}` : p;
}

async function authHeaders(
  opts: AuthRequestOpts,
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
  return typeof v === "string" && v.trim() ? v : null;
}

const EMAIL_MAX_LEN = 254;

function isValidEmail(raw: string): boolean {
  if (typeof raw !== "string") return false;
  const n = raw.length;
  if (n < 5 || n > EMAIL_MAX_LEN) return false;
  let at = -1;
  for (let i = 0; i < n; i += 1) {
    const ch = raw[i]!;
    if (ch === "@") {
      if (at !== -1) return false;
      at = i;
      continue;
    }
    const code = ch.charCodeAt(0);
    if (code <= 32) return false;
  }
  if (at <= 0 || at >= n - 3) return false;
  const domain = raw.slice(at + 1);
  const dot = domain.lastIndexOf(".");
  if (dot <= 0 || dot === domain.length - 1) return false;
  return true;
}

async function readJson(res: Response): Promise<unknown> {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

export function readAuthErrorCode(status: number, raw: unknown): string | null {
  if (raw && typeof raw === "object") {
    const o = raw as Record<string, unknown>;
    const message = typeof o.message === "string" ? o.message : "";
    if (message.includes("TERMS_REQUIRED") || message.includes("termsAccepted")) {
      return "TERMS_REQUIRED";
    }
    if (message.includes("birthDate")) return "AGE_REQUIRED";
    if (message.includes("phoneE164")) return "PHONE_INVALID";
    if (message.includes("displayName")) return "NAME_INVALID";
    if (message.includes("email") && status === 400) return "VALIDATION_ERROR";
    if (asText(o.code)) return asText(o.code);
  }
  if (typeof raw === "string" && raw.includes("TERMS_REQUIRED")) {
    return "TERMS_REQUIRED";
  }
  if (status === 401) return "AUTH_REQUIRED";
  if (status === 429) return "TOO_MANY_REQUESTS";
  if (status === 0) return "NETWORK_ERROR";
  return null;
}

function throwHttp(status: number, raw: unknown): never {
  throw new AuthError(status, readAuthErrorCode(status, raw));
}

export function normalizeAuthSession(raw: unknown): AuthSession {
  if (!raw || typeof raw !== "object") {
    throw new AuthError(0, "SESSION_UNAVAILABLE");
  }
  const o = raw as Record<string, unknown>;
  const sessionId = asText(o.sessionId);
  const userId = asText(o.userId);
  const issuedAt = asText(o.issuedAt);
  const expiresAt = asText(o.expiresAt);
  const stage = o.onboardingStage;
  if (!sessionId || !userId || !issuedAt || !expiresAt) {
    throw new AuthError(0, "SESSION_UNAVAILABLE");
  }
  if (o.issuer !== NEST_ISSUER) {
    throw new AuthError(0, "SESSION_UNAVAILABLE");
  }
  if (o.revoked === true) {
    throw new AuthError(401, "AUTH_REQUIRED");
  }
  if (!STAGES.has(stage as AuthOnboardingStage)) {
    throw new AuthError(0, "SESSION_UNAVAILABLE");
  }
  return {
    sessionId,
    userId,
    issuer: NEST_ISSUER,
    issuedAt,
    expiresAt,
    revoked: false,
    onboardingStage: stage as AuthOnboardingStage,
  };
}

export function continuePathAfterAuth(stage: AuthOnboardingStage): string {
  return stage === "B_complete" ? "/" : "/auth/complete-profile";
}

export function assertNoForbiddenProfileFields(
  body: Record<string, unknown>,
): void {
  for (const key of FORBIDDEN_PROFILE_KEYS) {
    if (Object.prototype.hasOwnProperty.call(body, key) && body[key] != null) {
      throw new AuthError(400, "FORBIDDEN_FIELD");
    }
  }
}

export function buildStageBProfileBody(
  input: StageBProfileInput,
): Record<string, unknown> {
  const body: Record<string, unknown> = {
    displayName: input.displayName.trim(),
    phoneE164: input.phoneE164.trim(),
    birthDate: input.birthDate.trim(),
    emailAlreadyKnown: input.emailAlreadyKnown === true,
  };
  if (input.email?.trim()) body.email = input.email.trim();
  assertNoForbiddenProfileFields(body);
  return body;
}

export async function fetchAuthSession(
  opts: AuthRequestOpts = {},
): Promise<AuthSession | null> {
  let res: Response;
  try {
    res = await fetch(apiUrl(opts.apiBase ?? "", "/api/v1/auth/session"), {
      method: "GET",
      headers: await authHeaders(opts),
      credentials: "include",
      cache: "no-store",
      signal: opts.signal,
    });
  } catch (err) {
    if (isAbortError(err)) throw err;
    throw new AuthError(0, "NETWORK_ERROR");
  }
  if (res.status === 401) return null;
  const raw = await readJson(res);
  if (!res.ok) throwHttp(res.status, raw);
  try {
    return normalizeAuthSession(raw);
  } catch (err) {
    if (isAuthError(err) && err.code === "AUTH_REQUIRED") return null;
    throw err;
  }
}

export async function signupStageA(
  input: StageASignupInput,
  opts: AuthRequestOpts = {},
): Promise<AuthSession> {
  const email = input.email.trim();
  if (!email || !isValidEmail(email)) {
    throw new AuthError(400, "VALIDATION_ERROR");
  }
  if (!input.termsAcceptedAt || !input.privacyAcceptedAt) {
    throw new AuthError(400, "TERMS_REQUIRED");
  }
  const headers = await authHeaders(opts);
  headers["Content-Type"] = "application/json";
  const body: Record<string, unknown> = {
    method: "email_magic",
    termsAcceptedAt: input.termsAcceptedAt,
    privacyAcceptedAt: input.privacyAcceptedAt,
    email,
  };
  if (input.marketingConsent === true) body.marketingConsent = true;
  if (input.referralCode?.trim()) body.referralCode = input.referralCode.trim();
  assertNoForbiddenProfileFields(body);
  let res: Response;
  try {
    res = await fetch(apiUrl(opts.apiBase ?? "", "/api/v1/auth/signup"), {
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

export async function startKakaoOAuth(
  input: KakaoStartInput = {},
  opts: AuthRequestOpts = {},
): Promise<KakaoStartResult> {
  const headers = await authHeaders(opts);
  headers["Content-Type"] = "application/json";
  const body: Record<string, unknown> = {};
  if (input.termsAcceptedAt) body.termsAcceptedAt = input.termsAcceptedAt;
  if (input.privacyAcceptedAt) body.privacyAcceptedAt = input.privacyAcceptedAt;
  if (input.marketingConsent === true) body.marketingConsent = true;
  if (input.referralCode?.trim()) body.referralCode = input.referralCode.trim();
  assertNoForbiddenProfileFields(body);
  let res: Response;
  try {
    res = await fetch(
      apiUrl(opts.apiBase ?? "", "/api/v1/auth/oauth/kakao/start"),
      {
        method: "POST",
        headers,
        credentials: "include",
        cache: "no-store",
        signal: opts.signal,
        body: JSON.stringify(body),
      },
    );
  } catch (err) {
    if (isAbortError(err)) throw err;
    throw new AuthError(0, "NETWORK_ERROR");
  }
  const raw = await readJson(res);
  if (!res.ok) throwHttp(res.status, raw);
  const o = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  if (o.status === "not_configured") {
    return { status: "not_configured" };
  }
  const authorizeUrl = asText(o.authorizeUrl);
  if ((o.status === "ready" || o.ok === true) && authorizeUrl) {
    return { status: "ready", authorizeUrl };
  }
  throw new AuthError(res.status, "KAKAO_UNAVAILABLE");
}

export async function patchAuthProfile(
  input: StageBProfileInput,
  opts: AuthRequestOpts = {},
): Promise<StageBProfileResult> {
  const headers = await authHeaders(opts);
  headers["Content-Type"] = "application/json";
  const body = buildStageBProfileBody(input);
  let res: Response;
  try {
    res = await fetch(apiUrl(opts.apiBase ?? "", "/api/v1/auth/profile"), {
      method: "PATCH",
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
  return { ok: true, onboardingStage: "B_complete" };
}

export async function requestMagicLink(
  email: string,
  opts: AuthRequestOpts = {},
): Promise<{ ok: true }> {
  const trimmed = email.trim();
  if (!trimmed || !isValidEmail(trimmed)) {
    throw new AuthError(400, "VALIDATION_ERROR");
  }
  const headers = await authHeaders(opts);
  headers["Content-Type"] = "application/json";
  let res: Response;
  try {
    res = await fetch(
      apiUrl(opts.apiBase ?? "", "/api/v1/auth/magic-link/request"),
      {
        method: "POST",
        headers,
        credentials: "include",
        cache: "no-store",
        signal: opts.signal,
        body: JSON.stringify({ email: trimmed }),
      },
    );
  } catch (err) {
    if (isAbortError(err)) throw err;
    throw new AuthError(0, "NETWORK_ERROR");
  }
  const raw = await readJson(res);
  if (!res.ok) throwHttp(res.status, raw);
  return { ok: true };
}

export async function logoutAuth(
  opts: AuthRequestOpts = {},
): Promise<LogoutResult> {
  let res: Response;
  try {
    res = await fetch(apiUrl(opts.apiBase ?? "", "/api/v1/auth/logout"), {
      method: "POST",
      headers: await authHeaders(opts),
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
  return { ok: true, revoked: true };
}

export async function deleteAuthAccount(
  input: DeleteAccountInput,
  opts: AuthRequestOpts = {},
): Promise<DeleteAccountResult> {
  if (input.confirmPhrase !== DELETE_ACCOUNT_CONFIRM_PHRASE) {
    throw new AuthError(400, "VALIDATION_ERROR");
  }
  if (input.confirmAgain !== true) {
    throw new AuthError(400, "VALIDATION_ERROR");
  }
  const headers = await authHeaders(opts);
  headers["Content-Type"] = "application/json";
  let res: Response;
  try {
    res = await fetch(
      apiUrl(opts.apiBase ?? "", "/api/v1/auth/delete-account"),
      {
        method: "POST",
        headers,
        credentials: "include",
        cache: "no-store",
        signal: opts.signal,
        body: JSON.stringify({
          confirmPhrase: DELETE_ACCOUNT_CONFIRM_PHRASE,
          confirmAgain: true,
        }),
      },
    );
  } catch (err) {
    if (isAbortError(err)) throw err;
    throw new AuthError(0, "NETWORK_ERROR");
  }
  const raw = await readJson(res);
  if (!res.ok) throwHttp(res.status, raw);
  return { ok: true };
}
