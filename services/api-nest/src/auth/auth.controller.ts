import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
  Res,
  UseGuards,
} from "@nestjs/common";
import { loadPhase0Env } from "../config/phase0.env";
import { TurnstileGuard } from "../common/turnstile.guard";
import {
  ACCESS_TOKEN_TTL_SEC,
  USER_SESSION_COOKIE_NAME,
} from "./auth.constants";
import {
  REFRESH_TOKEN_TTL_SEC,
  USER_REFRESH_COOKIE_NAME,
  USER_REFRESH_COOKIE_PATH,
} from "./session-cookies";
import { AUTH_ROUTES } from "./auth.routes";
import { AuthService } from "./auth.service";
import { AuthRateLimitGuard } from "./auth-rate-limit.guard";
import { JwtAuthGuard, type SessionUser } from "./jwt-auth.guard";
import { ClassicSignupService } from "./classic-signup.service";
import { PasswordAuthService } from "./password-auth.service";
import { PasswordResetService } from "./password-reset.service";
import { FindIdService } from "./find-id.service";
import {
  DECLARED_NAME_MAX_LEN,
  type ClassicSignupInput,
} from "./classic-signup.policy";

type AuthedRequest = { user: SessionUser; ip?: string; cookies?: Record<string, string | undefined> };
type CookieRequest = { cookies?: Record<string, string | undefined> };

type SessionMintBody = { accessToken?: string; refreshToken?: string };

/** Nest passthrough res - cookie API only (no express type package dependency) */
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

/**
 * CodeQL js/clear-text-storage-of-sensitive-data (alerts 93, 94, S1F 2026-09-05)
 * flags these two res.cookie(...) calls. Tracked in
 * governance/security/CODEQL_LEDGER.md section 3.5 as AWAITING_HUMAN_REVIEW
 * - not self-dismissed. Same class as the pre-existing default-branch
 * alert 20 on this same file. Reasoning kept here for whoever reviews it:
 * this is the standard httpOnly session-cookie pattern (protection comes
 * from HTTPS transport + httpOnly (blocks JS/XSS read) + Secure in
 * production + short access-token TTL + refresh-token rotation with
 * reuse detection - not from encrypting the cookie payload itself). No
 * code change was made here pending that human review.
 */
function attachSessionCookies(
  res: CookieResponse,
  tokens: { accessToken?: string; refreshToken?: string },
): void {
  const env = loadPhase0Env();
  const secure = env.nodeEnv === "production";
  if (typeof tokens.accessToken === "string") {
    res.cookie(USER_SESSION_COOKIE_NAME, tokens.accessToken, {
      httpOnly: true,
      secure,
      sameSite: "lax",
      maxAge: ACCESS_TOKEN_TTL_SEC * 1000,
      path: "/",
    });
  }
  if (typeof tokens.refreshToken === "string") {
    res.cookie(USER_REFRESH_COOKIE_NAME, tokens.refreshToken, {
      httpOnly: true,
      secure,
      sameSite: "lax",
      maxAge: REFRESH_TOKEN_TTL_SEC * 1000,
      path: USER_REFRESH_COOKIE_PATH,
    });
  }
}

function clearSessionCookies(res: CookieResponse): void {
  res.clearCookie(USER_SESSION_COOKIE_NAME, { path: "/" });
  res.clearCookie(USER_REFRESH_COOKIE_NAME, { path: USER_REFRESH_COOKIE_PATH });
}

function readClassicSignupInput(body: Record<string, unknown>): ClassicSignupInput {
  const str = (key: string): string => (typeof body[key] === "string" ? (body[key] as string) : "");
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
  };
}

/**
 * User Auth HTTP surface - Infra Section 51.9
 * Mounted at /api/v1/auth/* (global prefix in main.ts)
 *
 * signup/profile-start/oauth/passkey/magic-link/classic-signup/login/
 * find-id/password-reset routes stay PUBLIC - they are how a session is
 * obtained or recovered in the first place. session/logout/refresh/
 * delete-account/sessions require an already-issued JWT (JwtAuthGuard),
 * EXCEPT refresh itself, which by design works from the refresh cookie
 * alone (S1F Section 7 - it must still work after the access token has
 * actually expired).
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

  @Post(AUTH_ROUTES.signup)
  async signup(@Body() body: Record<string, unknown>, @Res({ passthrough: true }) res: CookieResponse) {
    const out = await this.auth.signupStageA(body ?? {});
    attachSessionCookies(res, out as SessionMintBody);
    return out;
  }

  @Post(AUTH_ROUTES.signupClassic)
  @UseGuards(TurnstileGuard)
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
    attachSessionCookies(res, out);
    return out;
  }

  @Post(AUTH_ROUTES.emailVerifyResend)
  @UseGuards(TurnstileGuard)
  emailVerifyResend(@Body() body: Record<string, unknown>) {
    const email = typeof body?.email === "string" ? body.email : "";
    return this.classicSignup.resendVerification(email);
  }

  @Post(AUTH_ROUTES.loginClassic)
  @UseGuards(TurnstileGuard)
  async loginClassic(
    @Body() body: Record<string, unknown>,
    @Req() req: CookieRequest & { ip?: string },
    @Res({ passthrough: true }) res: CookieResponse,
  ) {
    const identifier = typeof body?.identifier === "string" ? body.identifier : "";
    const password = typeof body?.password === "string" ? body.password : "";
    const out = await this.passwordAuth.login(identifier, password, { ip: req.ip ?? null });
    attachSessionCookies(res, out);
    return out;
  }

  @Post(AUTH_ROUTES.findId)
  @UseGuards(TurnstileGuard)
  findId(@Body() body: Record<string, unknown>) {
    const email = typeof body?.email === "string" ? body.email : "";
    return this.findIdService.request(email);
  }

  @Post(AUTH_ROUTES.passwordResetRequest)
  @UseGuards(TurnstileGuard)
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

  @Post(AUTH_ROUTES.changePassword)
  @UseGuards(JwtAuthGuard)
  async changePassword(
    @Body() body: Record<string, unknown>,
    @Req() req: AuthedRequest,
  ) {
    const currentPassword = typeof body?.currentPassword === "string" ? body.currentPassword : "";
    const newPassword = typeof body?.newPassword === "string" ? body.newPassword : "";
    const currentOk = await this.passwordAuth.verifyCurrentPassword(
      req.user.userId,
      currentPassword,
    );
    if (!currentOk) {
      throw new BadRequestException("CURRENT_PASSWORD_INVALID");
    }
    return this.passwordReset.changeWhileLoggedIn(req.user.userId, newPassword);
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

  @Get(AUTH_ROUTES.sessionsList)
  @UseGuards(JwtAuthGuard)
  listSessions(@Req() req: AuthedRequest) {
    return this.auth.listSessions(req.user);
  }

  @Delete(AUTH_ROUTES.sessionRevoke)
  @UseGuards(JwtAuthGuard)
  revokeSession(@Param("familyId") familyId: string, @Req() req: AuthedRequest) {
    return this.auth.revokeSessionFamily(req.user, familyId);
  }

  @Post(AUTH_ROUTES.logoutAll)
  @UseGuards(JwtAuthGuard)
  async logoutAll(
    @Req() req: AuthedRequest,
    @Res({ passthrough: true }) res: CookieResponse,
  ) {
    const out = await this.auth.logoutAll(req.user.userId);
    clearSessionCookies(res);
    return out;
  }

  @Post(AUTH_ROUTES.logout)
  @UseGuards(JwtAuthGuard)
  async logout(
    @Req() req: AuthedRequest,
    @Res({ passthrough: true }) res: CookieResponse,
  ) {
    const out = await this.auth.logout(req.user);
    clearSessionCookies(res);
    return out;
  }

  /**
   * By design NOT behind JwtAuthGuard - refresh must keep working once the
   * short-lived access token has actually expired (S1F Section 7). Reads
   * the opaque refresh token from its own httpOnly cookie only (never from
   * the request body - a body-supplied token would defeat httpOnly).
   */
  @Post(AUTH_ROUTES.refresh)
  async refresh(
    @Req() req: CookieRequest,
    @Res({ passthrough: true }) res: CookieResponse,
  ) {
    const token = req.cookies?.[USER_REFRESH_COOKIE_NAME];
    const out = await this.auth.refreshFromToken(typeof token === "string" ? token : "");
    attachSessionCookies(res, out);
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
    attachSessionCookies(res, out);
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
    attachSessionCookies(res, out);
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
    attachSessionCookies(res, out);
    return out;
  }

  @Post(AUTH_ROUTES.magicLinkRequest)
  @UseGuards(TurnstileGuard)
  magicLinkRequest(@Body() body: Record<string, unknown>) {
    return this.auth.magicLinkRequest(body ?? {});
  }

  @Post(AUTH_ROUTES.magicLinkVerify)
  async magicLinkVerify(
    @Body() body: Record<string, unknown>,
    @Res({ passthrough: true }) res: CookieResponse,
  ) {
    const out = (await this.auth.magicLinkVerify(body ?? {})) as SessionMintBody;
    attachSessionCookies(res, out);
    return out;
  }

  @Post(AUTH_ROUTES.deleteAccount)
  @UseGuards(JwtAuthGuard)
  deleteAccount(
    @Body() body: Record<string, unknown>,
    @Req() req: AuthedRequest,
  ) {
    // Guard balances/pending-withdraw come from the ledger inside AuthService
    // (PrivacyAccountService.loadGuardSnapshot) - never from this request body.
    return this.auth.deleteAccount(req.user.userId, body ?? {});
  }
}
