import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Req,
  Res,
  UseGuards,
  ServiceUnavailableException,
} from "@nestjs/common";
import { loadPhase0Env } from "../config/phase0.env";
import {
  ACCESS_TOKEN_TTL_SEC,
  USER_SESSION_COOKIE_NAME,
} from "./auth.constants";
import { AUTH_ROUTES } from "./auth.routes";
import { AuthService } from "./auth.service";
import { AuthRateLimitGuard } from "./auth-rate-limit.guard";
import { JwtAuthGuard, type SessionUser } from "./jwt-auth.guard";

type AuthedRequest = { user: SessionUser };

type SessionMintBody = { accessToken?: string };

/** Nest passthrough res — cookie API만 (express 타입 패키지 의존 0) */
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

/** PART9-pre2 — 로그인 성공 경로 Set-Cookie · JSON accessToken 응답 유지 */
function attachUserSessionCookie(
  res: CookieResponse,
  accessToken: string,
): void {
  const env = loadPhase0Env();
  res.cookie(USER_SESSION_COOKIE_NAME, accessToken, {
    httpOnly: true,
    secure: env.nodeEnv === "production",
    sameSite: "lax",
    maxAge: ACCESS_TOKEN_TTL_SEC * 1000,
    path: "/",
  });
}

function clearUserSessionCookie(res: CookieResponse): void {
  res.clearCookie(USER_SESSION_COOKIE_NAME, { path: "/" });
}

/**
 * User Auth HTTP surface · Infra §51.9
 * Mounted at /api/v1/auth/* (global prefix in main.ts)
 *
 * signup/profile-start/oauth/passkey/magic-link routes stay PUBLIC — they are
 * how a session is obtained in the first place. session/logout/refresh/
 * delete-account require an already-issued JWT (P0-1 JwtAuthGuard).
 */
@Controller("auth")
@UseGuards(AuthRateLimitGuard)
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post(AUTH_ROUTES.signup)
  signup(@Body() _body: Record<string, unknown>) {
    // Raw email/provider subject/credential id is never identity proof.
    // Use a proof-gated magic-link/OAuth/Passkey verifier instead.
    throw new BadRequestException("IDENTITY_PROOF_REQUIRED");
  }

  @Patch(AUTH_ROUTES.profile)
  @UseGuards(JwtAuthGuard)
  profile(@Body() body: Record<string, unknown>, @Req() req: AuthedRequest) {
    const emailAlreadyKnown = body?.emailAlreadyKnown === true;
    return this.auth.patchProfileStageB(req.user.userId, body ?? {}, {
      emailAlreadyKnown,
    });
  }

  @Get(AUTH_ROUTES.session)
  @UseGuards(JwtAuthGuard)
  session(@Req() req: AuthedRequest) {
    return this.auth.session(req.user);
  }

  @Post(AUTH_ROUTES.logout)
  @UseGuards(JwtAuthGuard)
  async logout(
    @Req() req: AuthedRequest,
    @Res({ passthrough: true }) res: CookieResponse,
  ) {
    const out = await this.auth.logout(req.user);
    clearUserSessionCookie(res);
    return out;
  }

  @Post(AUTH_ROUTES.refresh)
  @UseGuards(JwtAuthGuard)
  async refresh(
    @Req() req: AuthedRequest,
    @Res({ passthrough: true }) res: CookieResponse,
  ) {
    const out = await this.auth.refresh(req.user);
    if (typeof out.accessToken === "string") {
      attachUserSessionCookie(res, out.accessToken);
    }
    return out;
  }

  @Post(AUTH_ROUTES.oauthStart)
  oauthStart(@Param("provider") provider: string) {
    this.auth.parseOauthProvider(provider);
    throw new ServiceUnavailableException("OAUTH_IDENTITY_PROOF_NOT_READY");
  }

  @Post(AUTH_ROUTES.oauthCallback)
  oauthCallback(@Param("provider") provider: string) {
    this.auth.parseOauthProvider(provider);
    throw new ServiceUnavailableException("OAUTH_IDENTITY_PROOF_NOT_READY");
  }

  @Post(AUTH_ROUTES.passkeyRegisterOptions)
  passkeyRegisterOptions() {
    throw new ServiceUnavailableException("PASSKEY_IDENTITY_PROOF_NOT_READY");
  }

  @Post(AUTH_ROUTES.passkeyRegisterVerify)
  passkeyRegisterVerify() {
    throw new ServiceUnavailableException("PASSKEY_IDENTITY_PROOF_NOT_READY");
  }

  @Post(AUTH_ROUTES.passkeyAuthOptions)
  passkeyAuthOptions() {
    throw new ServiceUnavailableException("PASSKEY_IDENTITY_PROOF_NOT_READY");
  }

  @Post(AUTH_ROUTES.passkeyAuthVerify)
  passkeyAuthVerify() {
    throw new ServiceUnavailableException("PASSKEY_IDENTITY_PROOF_NOT_READY");
  }

  @Post(AUTH_ROUTES.magicLinkRequest)
  magicLinkRequest(@Body() body: Record<string, unknown>) {
    return this.auth.magicLinkRequest(body ?? {});
  }

  @Post(AUTH_ROUTES.magicLinkVerify)
  async magicLinkVerify(
    @Body() body: Record<string, unknown>,
    @Res({ passthrough: true }) res: CookieResponse,
  ) {
    const out = await this.auth.magicLinkVerify(body ?? {});
    if (typeof out.accessToken === "string") {
      attachUserSessionCookie(res, out.accessToken);
    }
    return out;
  }

  @Post(AUTH_ROUTES.deleteAccount)
  @UseGuards(JwtAuthGuard)
  deleteAccount(
    @Body() body: Record<string, unknown>,
    @Req() req: AuthedRequest,
  ) {
    // Guard balances/pending-withdraw come from the ledger inside AuthService
    // (PrivacyAccountService.loadGuardSnapshot) — never from this request body.
    return this.auth.deleteAccount(req.user.userId, body ?? {});
  }
}
