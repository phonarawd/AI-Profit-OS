/**
 * S3 / B0 정상 Admin 로그인. 연결 코드와 경로가 다르다.
 */

import {
  Body,
  Controller,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from "@nestjs/common";
import { AuthRateLimitGuard } from "../auth/auth-rate-limit.guard";
import { TurnstileGuard } from "./turnstile.guard";
import {
  attachAdminSessionCookies,
  clearAdminSessionCookies,
  ADMIN_SESSION_COOKIE_NAME,
} from "./admin-session.cookies";
import { requestHasQueryBearer } from "./admin-session.csrf";
import {
  finishAdminMfaLogin,
  finishAdminStepUp,
  rotateAdminRefresh,
  revokeAllAdminSessions,
  startAdminPasswordLogin,
  startAdminStepUp,
} from "./admin-auth.flow";
import { ADMIN_GENERIC_AUTH_FAILED } from "./admin-identity.policy";
import { verifyAdminAccessToken } from "./admin-token";
import { resolveAdminSession } from "./admin-session.store";
import { readAdminRefreshCookie } from "./admin-session.controller";
import { assertAdminCsrf } from "./admin-session.csrf";

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

@Controller("admin-auth")
@UseGuards(AuthRateLimitGuard)
export class AdminAuthController {
  @Post("login")
  @UseGuards(TurnstileGuard)
  async login(@Body() body: Record<string, unknown>) {
    const result = await startAdminPasswordLogin({
      identifier: body.identifier ?? body.account,
      password: body.password,
    });
    if (!result.ok) {
      throw new UnauthorizedException(ADMIN_GENERIC_AUTH_FAILED);
    }
    return { next: result.next, challengeId: result.challengeId };
  }

  @Post("mfa")
  async mfa(
    @Body() body: Record<string, unknown>,
    @Req() req: CookieRequest,
    @Res({ passthrough: true }) res: CookieResponse,
  ) {
    if (requestHasQueryBearer(req.url ?? req.originalUrl)) {
      throw new UnauthorizedException("ADMIN_AUTH_INVALID");
    }
    const result = await finishAdminMfaLogin({
      challengeId: body.challengeId,
      totp: body.totp ?? body.code,
      backupCode: body.backupCode,
    });
    if (!result.ok) {
      throw new UnauthorizedException(ADMIN_GENERIC_AUTH_FAILED);
    }
    attachAdminSessionCookies(res, result.accessToken, undefined, result.refreshToken);
    return {
      connected: true,
      adminId: result.adminId,
      role: result.role,
      kind: "password_mfa",
    };
  }

  @Post("refresh")
  async refresh(
    @Req() req: CookieRequest,
    @Res({ passthrough: true }) res: CookieResponse,
  ) {
    const result = await rotateAdminRefresh(readAdminRefreshCookie(req));
    if (!result.ok) {
      clearAdminSessionCookies(res);
      throw new UnauthorizedException(ADMIN_GENERIC_AUTH_FAILED);
    }
    attachAdminSessionCookies(res, result.accessToken, undefined, result.refreshToken);
    return { connected: true, adminId: result.adminId, role: result.role };
  }

  @Post("step-up/start")
  async stepUpStart(@Req() req: CookieRequest) {
    const session = await requireLiveAdmin(req);
    const result = await startAdminStepUp(session.adminId);
    if (!result.ok) throw new UnauthorizedException(ADMIN_GENERIC_AUTH_FAILED);
    return { challengeId: result.challengeId };
  }

  @Post("step-up")
  async stepUpFinish(
    @Body() body: Record<string, unknown>,
    @Req() req: CookieRequest,
  ) {
    try {
      assertAdminCsrf(req);
    } catch {
      throw new UnauthorizedException("ADMIN_CSRF_INVALID");
    }
    const session = await requireLiveAdmin(req);
    const result = await finishAdminStepUp({
      adminId: session.adminId,
      sessionId: session.sessionId,
      challengeId: body.challengeId,
      totp: body.totp ?? body.code,
      backupCode: body.backupCode,
    });
    if (!result.ok) throw new UnauthorizedException(ADMIN_GENERIC_AUTH_FAILED);
    return { ok: true };
  }

  @Post("logout-all")
  async logoutAll(
    @Req() req: CookieRequest,
    @Res({ passthrough: true }) res: CookieResponse,
  ) {
    try {
      assertAdminCsrf(req);
    } catch {
      throw new UnauthorizedException("ADMIN_CSRF_INVALID");
    }
    const session = await requireLiveAdmin(req);
    await revokeAllAdminSessions(session.adminId);
    clearAdminSessionCookies(res);
    return { connected: false };
  }
}

async function requireLiveAdmin(req: CookieRequest): Promise<{
  adminId: string;
  sessionId: string;
}> {
  const token = String(req.cookies?.[ADMIN_SESSION_COOKIE_NAME] ?? "").trim();
  if (!token) throw new UnauthorizedException("ADMIN_AUTH_REQUIRED");
  const principal = verifyAdminAccessToken(token);
  const session = await resolveAdminSession({
    tokenId: principal.tokenId,
    adminId: principal.adminId,
  });
  if (session.kind !== "active") {
    throw new UnauthorizedException("ADMIN_AUTH_INVALID");
  }
  return { adminId: principal.adminId, sessionId: session.session.id };
}
