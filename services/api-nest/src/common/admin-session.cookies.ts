/**
 * Admin HttpOnly 세션 쿠키. 브라우저 JS는 privileged bearer를 저장하지 않는다.
 */

import { loadPhase0Env } from "../config/phase0.env";
import { ACCESS_TOKEN_TTL_SEC } from "../auth/auth.constants";
import {
  ADMIN_CSRF_COOKIE_NAME,
  ADMIN_SESSION_COOKIE_NAME,
  mintAdminCsrfSecret,
} from "./admin-session.csrf";

export {
  ADMIN_CSRF_COOKIE_NAME,
  ADMIN_CSRF_HEADER,
  ADMIN_SESSION_COOKIE_NAME,
  assertAdminCsrf,
  mintAdminCsrfSecret,
  planAdminLogout,
  requestHasQueryBearer,
} from "./admin-session.csrf";

type CookieResponse = {
  cookie: (
    name: string,
    val: string,
    opts?: {
      httpOnly?: boolean;
      secure?: boolean;
      sameSite?: "lax" | "strict" | "none";
      maxAge?: number;
      path?: string;
    },
  ) => void;
  clearCookie: (name: string, opts?: { path?: string }) => void;
};

function cookieBase() {
  const env = loadPhase0Env();
  return {
    secure: env.nodeEnv === "production",
    sameSite: "strict" as const,
    maxAge: ACCESS_TOKEN_TTL_SEC * 1000,
    path: "/",
  };
}

export function attachAdminCsrfCookie(
  res: CookieResponse,
  csrf: string,
): void {
  const base = cookieBase();
  res.cookie(ADMIN_CSRF_COOKIE_NAME, csrf, {
    ...base,
    httpOnly: true,
  });
}

export function attachAdminSessionCookies(
  res: CookieResponse,
  accessToken: string,
  csrf = mintAdminCsrfSecret(),
): string {
  const base = cookieBase();
  res.cookie(ADMIN_SESSION_COOKIE_NAME, accessToken, {
    ...base,
    httpOnly: true,
  });
  // CSRF token은 HttpOnly cookie에 보관하고 same-origin session 응답으로
  // JS 메모리에 bootstrap한다. document.cookie 저장은 사용하지 않는다.
  attachAdminCsrfCookie(res, csrf);
  return csrf;
}

export function clearAdminSessionCookies(res: CookieResponse): void {
  res.clearCookie(ADMIN_SESSION_COOKIE_NAME, { path: "/" });
  res.clearCookie(ADMIN_CSRF_COOKIE_NAME, { path: "/" });
}
