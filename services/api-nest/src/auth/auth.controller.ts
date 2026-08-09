import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from "@nestjs/common";
import { AUTH_ROUTES } from "./auth.routes";
import { AuthService } from "./auth.service";
import { JwtAuthGuard, type SessionUser } from "./jwt-auth.guard";

type AuthedRequest = { user: SessionUser };

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
  signup(@Body() body: Record<string, unknown>) {
    return this.auth.signupStageA(body ?? {});
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
  logout(@Req() req: AuthedRequest) {
    return this.auth.logout(req.user);
  }

  @Post(AUTH_ROUTES.refresh)
  @UseGuards(JwtAuthGuard)
  refresh(@Req() req: AuthedRequest) {
    return this.auth.refresh(req.user);
  }

  @Post(AUTH_ROUTES.oauthStart)
  oauthStart(@Param("provider") provider: string) {
    return this.auth.oauthStart(provider);
  }

  @Post(AUTH_ROUTES.oauthCallback)
  oauthCallback(
    @Param("provider") provider: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.auth.oauthCallback(provider, body ?? {});
  }

  @Post(AUTH_ROUTES.passkeyRegisterOptions)
  passkeyRegisterOptions() {
    return this.auth.passkeyOptions("register");
  }

  @Post(AUTH_ROUTES.passkeyRegisterVerify)
  passkeyRegisterVerify(@Body() body: Record<string, unknown>) {
    return this.auth.signupStageA({
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
  }

  @Post(AUTH_ROUTES.passkeyAuthOptions)
  passkeyAuthOptions() {
    return this.auth.passkeyOptions("authenticate");
  }

  @Post(AUTH_ROUTES.passkeyAuthVerify)
  passkeyAuthVerify(@Body() body: Record<string, unknown>) {
    // Authenticate existing passkey → session (M1 wires credential verify)
    return this.auth.signupStageA({
      method: "passkey",
      termsAcceptedAt: new Date().toISOString(),
      privacyAcceptedAt: new Date().toISOString(),
      passkey: {
        credentialId: String(body?.credentialId ?? body?.id ?? "session"),
      },
    });
  }

  @Post(AUTH_ROUTES.magicLinkRequest)
  magicLinkRequest(@Body() body: Record<string, unknown>) {
    return this.auth.magicLinkRequest(body ?? {});
  }

  @Post(AUTH_ROUTES.magicLinkVerify)
  magicLinkVerify(@Body() body: Record<string, unknown>) {
    return this.auth.signupStageA({
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
