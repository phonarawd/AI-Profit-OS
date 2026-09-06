/**
 * Admin 세션 교환 — 토큰을 HttpOnly 쿠키로만 남긴다. JSON에 bearer를 돌려주지 않는다.
 * 연결 코드는 정식 로그인이 아니다. 성공 시 emergency session 을 새로 발급한다.
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
  ADMIN_REFRESH_COOKIE_NAME,
  ADMIN_SESSION_COOKIE_NAME,
  attachAdminSessionCookies,
  clearAdminSessionCookies,
  planAdminLogout,
  requestHasQueryBearer,
} from "./admin-session.cookies";
import {
  consumeAdminCodeExchange,
  hashToken,
  isAdminAccessTokenRevoked,
  isAdminCodeExchangeConsumed,
} from "./admin-session.revoke";
import {
  isAdminCodeExchangeEnabled,
  planAdminCodeExchange,
} from "./admin-code-exchange";
import { resolveAdminRbac } from "./admin-rbac.lookup";
import { getAdminIdentityStore, resolveAdminSession } from "./admin-session.store";
import {
  mintEmergencyCodeSession,
  revokeCurrentAdminFamily,
} from "./admin-auth.flow";

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
  async exchange(
    @Body() body: Record<string, unknown>,
    @Req() req: CookieRequest,
    @Res({ passthrough: true }) res: CookieResponse,
  ) {
    if (requestHasQueryBearer(req.url ?? req.originalUrl)) {
      throw new UnauthorizedException("ADMIN_AUTH_INVALID");
    }
    const token = String(body?.token ?? body?.accessToken ?? "").trim();
    const store = getAdminIdentityStore();
    const consumedAlready = token
      ? isAdminCodeExchangeConsumed(token) ||
        Boolean(store && (await store.isCodeExchangeConsumed(hashToken(token))))
      : false;
    const plan = planAdminCodeExchange({
      enabled: isAdminCodeExchangeEnabled(),
      token,
      revoked: Boolean(token) && (isAdminAccessTokenRevoked(token) || consumedAlready),
    });
    if (!plan.ok) {
      if (plan.code === "ADMIN_CODE_EXCHANGE_DISABLED") {
        throw new ForbiddenException("ADMIN_CODE_EXCHANGE_DISABLED");
      }
      throw new UnauthorizedException(plan.code);
    }
    if (!store) {
      throw new UnauthorizedException("ADMIN_SESSION_UNAVAILABLE");
    }
    let principal;
    try {
      principal = verifyAdminAccessToken(token);
    } catch (err) {
      throw new UnauthorizedException(
        err instanceof AdminTokenError ? err.code : "ADMIN_AUTH_INVALID",
      );
    }
    const rbac = await resolveAdminRbac(principal.adminId);
    if (rbac.kind !== "active" && rbac.kind !== "unwired") {
      throw new ForbiddenException("ADMIN_RBAC_INACTIVE");
    }
    const expiresAt = Date.parse(principal.expiresAt);
    const firstUse = await store.consumeCodeExchange(
      hashToken(token),
      new Date(Number.isFinite(expiresAt) ? expiresAt : Date.now() + 15 * 60 * 1000).toISOString(),
    );
    if (!firstUse) {
      throw new UnauthorizedException("ADMIN_AUTH_INVALID");
    }
    consumeAdminCodeExchange(
      token,
      Number.isFinite(expiresAt) ? expiresAt : Date.now() + 15 * 60 * 1000,
    );
    const minted = await mintEmergencyCodeSession({
      adminId: principal.adminId,
      role: rbac.kind === "active" ? rbac.role : principal.role,
    });
    attachAdminSessionCookies(res, minted.accessToken, undefined, minted.refreshToken);
    return {
      connected: true,
      adminId: principal.adminId,
      role: minted.session.kind === "code_exchange_emergency" ? (rbac.kind === "active" ? rbac.role : principal.role) : principal.role,
      kind: "code_exchange_emergency",
    };
  }

  @Get()
  async status(@Req() req: CookieRequest) {
    if (requestHasQueryBearer(req.url ?? req.originalUrl)) {
      return { connected: false };
    }
    const token = String(req.cookies?.[ADMIN_SESSION_COOKIE_NAME] ?? "").trim();
    if (!token || isAdminAccessTokenRevoked(token)) {
      return { connected: false };
    }
    try {
      const principal = verifyAdminAccessToken(token);
      const session = await resolveAdminSession({
        tokenId: principal.tokenId,
        adminId: principal.adminId,
      });
      if (session.kind !== "active" && session.kind !== "unwired") {
        return { connected: false };
      }
      return {
        connected: true,
        adminId: principal.adminId,
        role: principal.role,
        kind: session.kind === "active" ? session.session.kind : undefined,
      };
    } catch {
      return { connected: false };
    }
  }

  @Post("logout")
  async logout(
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
        await revokeCurrentAdminFamily(principal.tokenId);
      } catch {
        /* 쿠키는 지운다 */
      }
      clearAdminSessionCookies(res);
    } else if (plan.action === "clear_only") {
      clearAdminSessionCookies(res);
    }
    return { connected: false };
  }
}

export function readAdminRefreshCookie(req: CookieRequest): string {
  return String(req.cookies?.[ADMIN_REFRESH_COOKIE_NAME] ?? "").trim();
}
