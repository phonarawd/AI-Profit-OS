/**
 * Admin 세션 교환 — 토큰을 HttpOnly 쿠키로만 남긴다. JSON에 bearer를 돌려주지 않는다.
 */

import {
  Body,
  Controller,
  ForbiddenException,
  Get,
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
  ADMIN_SESSION_COOKIE_NAME,
  attachAdminSessionCookies,
  clearAdminSessionCookies,
  planAdminLogout,
  requestHasQueryBearer,
} from "./admin-session.cookies";
import {
  consumeAdminCodeExchange,
  isAdminAccessTokenRevoked,
  isAdminCodeExchangeConsumed,
  revokeAdminAccessToken,
} from "./admin-session.revoke";
import {
  isAdminCodeExchangeEnabled,
  planAdminCodeExchange,
} from "./admin-code-exchange";

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
  exchange(
    @Body() body: Record<string, unknown>,
    @Req() req: CookieRequest,
    @Res({ passthrough: true }) res: CookieResponse,
  ) {
    if (requestHasQueryBearer(req.url ?? req.originalUrl)) {
      throw new UnauthorizedException("ADMIN_AUTH_INVALID");
    }
    const token = String(body?.token ?? body?.accessToken ?? "").trim();
    const plan = planAdminCodeExchange({
      enabled: isAdminCodeExchangeEnabled(),
      token,
      revoked:
        Boolean(token) &&
        (isAdminAccessTokenRevoked(token) ||
          isAdminCodeExchangeConsumed(token)),
    });
    if (!plan.ok) {
      if (plan.code === "ADMIN_CODE_EXCHANGE_DISABLED") {
        throw new ForbiddenException("ADMIN_CODE_EXCHANGE_DISABLED");
      }
      throw new UnauthorizedException(plan.code);
    }
    let principal;
    try {
      principal = verifyAdminAccessToken(token);
    } catch (err) {
      throw new UnauthorizedException(
        err instanceof AdminTokenError ? err.code : "ADMIN_AUTH_INVALID",
      );
    }
    consumeAdminCodeExchange(token, Date.parse(principal.expiresAt));
    attachAdminSessionCookies(res, token);
    return {
      connected: true,
      adminId: principal.adminId,
      role: principal.role,
    };
  }

  @Get()
  status(@Req() req: CookieRequest) {
    if (requestHasQueryBearer(req.url ?? req.originalUrl)) {
      return { connected: false };
    }
    const token = String(req.cookies?.[ADMIN_SESSION_COOKIE_NAME] ?? "").trim();
    if (!token || isAdminAccessTokenRevoked(token)) {
      return { connected: false };
    }
    try {
      const principal = verifyAdminAccessToken(token);
      return {
        connected: true,
        adminId: principal.adminId,
        role: principal.role,
      };
    } catch {
      return { connected: false };
    }
  }

  @Post("logout")
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
