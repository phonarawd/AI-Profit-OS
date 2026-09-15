/**
 * Admin 세션 교환 — 토큰을 HttpOnly 쿠키로만 남긴다. JSON에 bearer를 돌려주지 않는다.
 */

import { createRequire } from "node:module";
import { join } from "node:path";
import {
  Body,
  Controller,
  Get,
  Optional,
  Post,
  Req,
  Res,
  ServiceUnavailableException,
  UnauthorizedException,
} from "@nestjs/common";
import { loadPhase0Env } from "../config/phase0.env";
import { verifyPassword } from "../auth/password-hash";
import { PostgresService } from "../db/postgres";
import {
  AdminTokenError,
  verifyAdminAccessToken,
} from "./admin-token";
import { USER_SESSION_COOKIE_NAME } from "../auth/auth.constants";

const requireCjs = createRequire(__filename);
const staffLogin = requireCjs(
  join(__dirname, "..", "..", "admin-staff-login.core.cjs"),
) as {
  loginStaff: (
    input: object,
    deps: object,
  ) => Promise<{
    ok: boolean;
    applied: boolean;
    code: string;
    httpStatus: number;
    adminId?: string;
    role?: string;
    token?: string;
  }>;
  createUnreadyStaffStore: () => { ready: false };
};
import {
  ADMIN_SESSION_COOKIE_NAME,
  attachAdminSessionCookies,
  clearAdminSessionCookies,
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
  constructor(@Optional() private readonly db?: PostgresService) {}

  @Post("login")
  async login(
    @Body() body: Record<string, unknown>,
    @Req() req: CookieRequest,
    @Res({ passthrough: true }) res: CookieResponse,
  ) {
    if (requestHasQueryBearer(req.url ?? req.originalUrl)) {
      throw new UnauthorizedException("ADMIN_AUTH_INVALID");
    }
    const userCookie = String(req.cookies?.[USER_SESSION_COOKIE_NAME] ?? "").trim();
    const opsDb =
      this.db && this.db.configured && this.db.configured() ? this.db : undefined;
    const out = await staffLogin.loginStaff(
      {
        email: body?.email,
        password: body?.password,
        userAccessToken: userCookie || body?.userAccessToken || null,
      },
      {
        store: staffLogin.createUnreadyStaffStore(),
        opsDb,
        verifyPassword,
        adminJwtSecret: loadPhase0Env().jwtAdminSecret || "",
      },
    );
    if (out.code === "STORE_UNREADY" || out.code === "ADMIN_AUTH_NOT_CONFIGURED") {
      throw new ServiceUnavailableException({
        code: out.code,
        applied: false,
        storeStatus: "unready",
        statusCode: 503,
      });
    }
    if (!out.ok || !out.token) {
      throw new UnauthorizedException(out.code || "ADMIN_AUTH_INVALID");
    }
    attachAdminSessionCookies(res, out.token);
    return {
      connected: true,
      adminId: out.adminId,
      role: out.role,
    };
  }

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
