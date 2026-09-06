/** 관리자 정상 로그인. 연결 코드와 경로를 섞지 않는다. */

import { getAdminCsrf, ADMIN_CSRF_HEADER } from "./admin-session";

export type AdminLoginStart =
  | { ok: true; next: "mfa"; challengeId: string }
  | { ok: false; reason: "failed" | "protection" };

export async function startAdminLogin(
  identifier: string,
  password: string,
  turnstileToken: string,
): Promise<AdminLoginStart> {
  const res = await fetch("/api/v1/admin-auth/login", {
    method: "POST",
    credentials: "include",
    cache: "no-store",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      identifier,
      account: identifier,
      password,
      turnstileToken,
    }),
  });
  if (res.status === 503) return { ok: false, reason: "protection" };
  if (!res.ok) return { ok: false, reason: "failed" };
  const body = (await res.json().catch(() => null)) as {
    next?: unknown;
    challengeId?: unknown;
  } | null;
  if (body?.next === "mfa" && typeof body.challengeId === "string") {
    return { ok: true, next: "mfa", challengeId: body.challengeId };
  }
  return { ok: false, reason: "failed" };
}

export async function finishAdminLogin(
  challengeId: string,
  totp: string,
  backupCode: string,
  turnstileToken: string,
): Promise<boolean> {
  const res = await fetch("/api/v1/admin-auth/mfa", {
    method: "POST",
    credentials: "include",
    cache: "no-store",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      challengeId,
      totp,
      backupCode,
      turnstileToken,
    }),
  });
  if (!res.ok) return false;
  const body = (await res.json().catch(() => null)) as { connected?: unknown } | null;
  return body?.connected === true;
}

export async function logoutAllAdminSessions(): Promise<void> {
  const csrf = getAdminCsrf();
  await fetch("/api/v1/admin-auth/logout-all", {
    method: "POST",
    credentials: "include",
    cache: "no-store",
    headers: {
      Accept: "application/json",
      ...(csrf ? { [ADMIN_CSRF_HEADER]: csrf } : {}),
    },
  }).catch(() => undefined);
}
