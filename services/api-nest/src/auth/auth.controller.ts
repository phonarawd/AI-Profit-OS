import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Req,
  Res,
  UseGuards,
} from "@nestjs/common";
import { loadPhase0Env } from "../config/phase0.env";
import {
  ACCESS_TOKEN_TTL_SEC,
  USER_SESSION_COOKIE_NAME,
} from "./auth.constants";
import { AUTH_ROUTES } from "./auth.routes";
import { AuthService } from "./auth.service";
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
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post(AUTH_ROUTES.signup)
  async signup(@Body() body: Record<string, unknown>, @Res({ passthrough: true }) res: CookieResponse) {
    const out = await this.auth.signupStageA(body ?? {});
    if (typeof out.accessToken === "string") {
      attachUserSessionCookie(res, out.accessToken);
    }
    return out;
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
    return this.auth.oauthStart(provider);
  }

  @Post(AUTH_ROUTES.oauthCallback)
  async oauthCallback(
    @Param("provider") provider: string,
    @Body() body: Record<string, unknown>,
    @Res({ passthrough: true }) res: CookieResponse,
  ) {
    const out = (await this.auth.oauthCallback(
      provider,
      body ?? {},
    )) as SessionMintBody;
    if (typeof out.accessToken === "string") {
      attachUserSessionCookie(res, out.accessToken);
    }
    return out;
  }

  @Post(AUTH_ROUTES.passkeyRegisterOptions)
  passkeyRegisterOptions() {
    return this.auth.passkeyOptions("register");
  }

  @Post(AUTH_ROUTES.passkeyRegisterVerify)
  async passkeyRegisterVerify(
    @Body() body: Record<string, unknown>,
    @Res({ passthrough: true }) res: CookieResponse,
  ) {
    const out = await this.auth.signupStageA({
      method: "passkey",
      termsAcceptedAt: String(body?.termsAcceptedAt ?? ""),
      privacyAcceptedAt: String(body?.privacyAcceptedAt ?? ""),
      marketingConsent: Boolean(body?.marketingConsent),
      referralCode:
        typeof body?.referralCode === "string" ? body.referralCode : undefined,
      passkey: {
        credentialId: String(body?.credentialId ?? body?.id ?? ""),
      },
    });
    if (typeof out.accessToken === "string") {
      attachUserSessionCookie(res, out.accessToken);
    }
    return out;
  }

  @Post(AUTH_ROUTES.passkeyAuthOptions)
  passkeyAuthOptions() {
    return this.auth.passkeyOptions("authenticate");
  }

  @Post(AUTH_ROUTES.passkeyAuthVerify)
  async passkeyAuthVerify(
    @Body() body: Record<string, unknown>,
    @Res({ passthrough: true }) res: CookieResponse,
  ) {
    // Authenticate existing passkey → session (M1 wires credential verify)
    const out = await this.auth.signupStageA({
      method: "passkey",
      termsAcceptedAt: new Date().toISOString(),
      privacyAcceptedAt: new Date().toISOString(),
      passkey: {
        credentialId: String(body?.credentialId ?? body?.id ?? "session"),
      },
    });
    if (typeof out.accessToken === "string") {
      attachUserSessionCookie(res, out.accessToken);
    }
    return out;
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
    const out = await this.auth.signupStageA({
      method: "email_magic",
      termsAcceptedAt: String(body?.termsAcceptedAt ?? new Date().toISOString()),
      privacyAcceptedAt: String(
        body?.privacyAcceptedAt ?? new Date().toISOString(),
      ),
      marketingConsent: Boolean(body?.marketingConsent),
      referralCode:
        typeof body?.referralCode === "string" ? body.referralCode : undefined,
      email: typeof body?.email === "string" ? body.email : undefined,
    });
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
    // Ledger snapshot injected by Money module later — skeleton assumes empty
    const ledger = {
      lockedUsdt: Number(body?.lockedUsdt ?? 0),
      pendingWithdrawCount: Number(body?.pendingWithdrawCount ?? 0),
      principalUsdt: Number(body?.principalUsdt ?? 0),
      profitUsdt: Number(body?.profitUsdt ?? 0),
      practiceUsdt: Number(body?.practiceUsdt ?? 0),
    };
    return this.auth.deleteAccount(req.user.userId, body ?? {}, ledger);
  }
}
