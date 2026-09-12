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
import { AuthRateLimitGuard } from "./auth-rate-limit.guard";
import { ClassicSignupService } from "./classic-signup.service";
import {
  DECLARED_NAME_MAX_LEN,
  type ClassicSignupInput,
} from "./classic-signup.policy";
import { FindIdService } from "./find-id.service";
import { JwtAuthGuard, type SessionUser } from "./jwt-auth.guard";
import { PasswordAuthService } from "./password-auth.service";
import { PasswordResetService } from "./password-reset.service";

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

function readClassicSignupInput(body: Record<string, unknown>): ClassicSignupInput {
  const str = (key: string): string =>
    typeof body[key] === "string" ? (body[key] as string) : "";
  return {
    username: str("username"),
    email: str("email"),
    password: str("password"),
    passwordConfirm: str("passwordConfirm"),
    declaredName: str("declaredName").slice(0, DECLARED_NAME_MAX_LEN),
    birthDate: str("birthDate"),
    phoneE164: body.phoneE164 ? str("phoneE164") : undefined,
    termsAcceptedAt: str("termsAcceptedAt"),
    privacyAcceptedAt: str("privacyAcceptedAt"),
    marketingConsent: body.marketingConsent === true,
    referralCode: body.referralCode ? str("referralCode") : undefined,
    turnstileToken: body.turnstileToken ? str("turnstileToken") : undefined,
    termsVersion: body.termsVersion ? str("termsVersion") : undefined,
    privacyVersion: body.privacyVersion ? str("privacyVersion") : undefined,
  };
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
  constructor(
    private readonly auth: AuthService,
    private readonly classicSignup: ClassicSignupService,
    private readonly passwordAuth: PasswordAuthService,
    private readonly passwordReset: PasswordResetService,
    private readonly findIdService: FindIdService,
  ) {}

  @Post(AUTH_ROUTES.signupClassic)
  signupClassic(@Body() body: Record<string, unknown>) {
    return this.classicSignup.request(readClassicSignupInput(body ?? {}));
  }

  @Post(AUTH_ROUTES.signupClassicActivate)
  async signupClassicActivate(
    @Body() body: Record<string, unknown>,
    @Res({ passthrough: true }) res: CookieResponse,
  ) {
    const token = typeof body?.token === "string" ? body.token : "";
    const out = await this.classicSignup.activate(token);
    if (typeof out.accessToken === "string") {
      attachUserSessionCookie(res, out.accessToken);
    }
    return out;
  }

  @Post(AUTH_ROUTES.emailVerifyResend)
  emailVerifyResend(@Body() body: Record<string, unknown>) {
    const email = typeof body?.email === "string" ? body.email : "";
    return this.classicSignup.resendVerification(email);
  }

  @Post(AUTH_ROUTES.loginClassic)
  async loginClassic(
    @Body() body: Record<string, unknown>,
    @Res({ passthrough: true }) res: CookieResponse,
  ) {
    const identifier = typeof body?.identifier === "string" ? body.identifier : "";
    const password = typeof body?.password === "string" ? body.password : "";
    const out = await this.passwordAuth.login(identifier, password);
    if (typeof out.accessToken === "string") {
      attachUserSessionCookie(res, out.accessToken);
    }
    return out;
  }

  @Post(AUTH_ROUTES.findId)
  findId(@Body() body: Record<string, unknown>) {
    const email = typeof body?.email === "string" ? body.email : "";
    return this.findIdService.request(email);
  }

  @Post(AUTH_ROUTES.passwordResetRequest)
  passwordResetRequest(@Body() body: Record<string, unknown>) {
    const email = typeof body?.email === "string" ? body.email : "";
    return this.passwordReset.request(email);
  }

  @Post(AUTH_ROUTES.passwordResetComplete)
  passwordResetComplete(@Body() body: Record<string, unknown>) {
    const token = typeof body?.token === "string" ? body.token : "";
    const newPassword = typeof body?.newPassword === "string" ? body.newPassword : "";
    return this.passwordReset.complete(token, newPassword);
  }

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
    const out = (await this.auth.passkeyRegisterVerify(
      body ?? {},
    )) as SessionMintBody;
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
    const out = (await this.auth.passkeyAuthVerify(
      body ?? {},
    )) as SessionMintBody;
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
    const out = (await this.auth.magicLinkVerify(body ?? {})) as SessionMintBody;
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
