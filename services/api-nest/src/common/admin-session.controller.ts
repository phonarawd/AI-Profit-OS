/**
 * Admin 세션 교환 — 토큰을 HttpOnly 쿠키로만 남긴다. JSON에 bearer를 돌려주지 않는다.
 */

import {
  Body,
  Controller,
  Get,
  Header,
  Post,
  Req,
  Res,
  UnauthorizedException,
} from "@nestjs/common";
import {
  AdminTokenError,
  verifyAdminAccessToken,
} from "./admin-token";
import {
  ADMIN_CSRF_COOKIE_NAME,
  ADMIN_SESSION_COOKIE_NAME,
  attachAdminCsrfCookie,
  attachAdminSessionCookies,
  clearAdminSessionCookies,
  mintAdminCsrfSecret,
  planAdminLogout,
  requestHasQueryBearer,
} from "./admin-session.cookies";
import {
  isAdminAccessTokenRevoked,
  revokeAdminAccessToken,
} from "./admin-session.revoke";

type CookieRequest = {
  cookies?: Record<string, string | undefined>;
  headers?: Record<string, unknown>;
  url?: string;
  originalUrl?: string;
};

type CookieResponse = {
  cookie: (
    name: string,
    val: string,
    opts?: Record<string, unknown>,
  ) => void;
  clearCookie: (name: string, opts?: { path?: string }) => void;
};

@Controller("admin-session")
export class AdminSessionController {
  @Post()
  @Header("Cache-Control", "no-store")
  exchange(
    @Body() body: Record<string, unknown>,
    @Req() req: CookieRequest,
    @Res({ passthrough: true }) res: CookieResponse,
  ) {
    if (requestHasQueryBearer(req.url ?? req.originalUrl)) {
      throw new UnauthorizedException("ADMIN_AUTH_INVALID");
    }
    const token = String(body?.token ?? body?.accessToken ?? "").trim();
    if (!token) throw new UnauthorizedException("ADMIN_AUTH_REQUIRED");
    if (isAdminAccessTokenRevoked(token)) {
      throw new UnauthorizedException("ADMIN_AUTH_INVALID");
    }
    let principal;
    try {
      principal = verifyAdminAccessToken(token);
    } catch (err) {
      throw new UnauthorizedException(
        err instanceof AdminTokenError ? err.code : "ADMIN_AUTH_INVALID",
      );
    }
    const csrfToken = attachAdminSessionCookies(res, token);
    return {
      connected: true,
      adminId: principal.adminId,
      role: principal.role,
      csrfToken,
    };
  }

  @Get()
  @Header("Cache-Control", "no-store")
  status(
    @Req() req: CookieRequest,
    @Res({ passthrough: true }) res: CookieResponse,
  ) {
    if (requestHasQueryBearer(req.url ?? req.originalUrl)) {
      return { connected: false };
    }
    const token = String(req.cookies?.[ADMIN_SESSION_COOKIE_NAME] ?? "").trim();
    if (!token || isAdminAccessTokenRevoked(token)) {
      return { connected: false };
    }
    try {
      const principal = verifyAdminAccessToken(token);
      let csrfToken = String(
        req.cookies?.[ADMIN_CSRF_COOKIE_NAME] ?? "",
      ).trim();
      if (csrfToken.length < 32) {
        csrfToken = mintAdminCsrfSecret();
      }
      // Re-set on every authenticated status read so legacy JS-readable cookies
      // are upgraded to HttpOnly without rotating the admin bearer.
      attachAdminCsrfCookie(res, csrfToken);
      return {
        connected: true,
        adminId: principal.adminId,
        role: principal.role,
        csrfToken,
      };
    } catch {
      return { connected: false };
    }
  }

  @Post("logout")
  @Header("Cache-Control", "no-store")
  logout(
    @Req() req: CookieRequest,
    @Res({ passthrough: true }) res: CookieResponse,
  ) {
    const plan = planAdminLogout(req);
    if (plan.action === "reject_csrf") {
      throw new UnauthorizedException("ADMIN_CSRF_INVALID");
    }
    if (plan.action === "revoke_and_clear") {
      try {
        const principal = verifyAdminAccessToken(plan.token);
        revokeAdminAccessToken(plan.token, Date.parse(principal.expiresAt));
      } catch {
        revokeAdminAccessToken(plan.token, Date.now() + 15 * 60 * 1000);
      }
      clearAdminSessionCookies(res);
    } else if (plan.action === "clear_only") {
      clearAdminSessionCookies(res);
    }
    return { connected: false };
  }
}
