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

export function attachAdminSessionCookies(
  res: CookieResponse,
  accessToken: string,
  csrf = mintAdminCsrfSecret(),
): void {
  const base = cookieBase();
  res.cookie(ADMIN_SESSION_COOKIE_NAME, accessToken, {
    ...base,
    httpOnly: true,
  });
  // 더블서브밋 동기화 토큰 — 세션 비밀이 아니다. HttpOnly로 바꾸면 JS가 헤더를 못 채운다.
  res.cookie(ADMIN_CSRF_COOKIE_NAME, csrf, {
    ...base,
    httpOnly: false,
  });
}

export function clearAdminSessionCookies(res: CookieResponse): void {
  res.clearCookie(ADMIN_SESSION_COOKIE_NAME, { path: "/" });
  res.clearCookie(ADMIN_CSRF_COOKIE_NAME, { path: "/" });
}
