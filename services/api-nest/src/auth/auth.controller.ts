import { Body, Controller, Get, Param, Patch, Post } from "@nestjs/common";
import { AUTH_ROUTES } from "./auth.routes";
import { AuthService } from "./auth.service";

/**
 * User Auth HTTP surface · Infra §51.9
 * Mounted at /api/v1/auth/* (global prefix in main.ts)
 */
@Controller("auth")
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post(AUTH_ROUTES.signup)
  signup(@Body() body: Record<string, unknown>) {
    return this.auth.signupStageA(body ?? {});
  }

  @Patch(AUTH_ROUTES.profile)
  profile(@Body() body: Record<string, unknown>) {
    const emailAlreadyKnown = body?.emailAlreadyKnown === true;
    return this.auth.patchProfileStageB(body ?? {}, { emailAlreadyKnown });
  }

  @Get(AUTH_ROUTES.session)
  session() {
    return this.auth.session();
  }

  @Post(AUTH_ROUTES.logout)
  logout() {
    return this.auth.logout();
  }

  @Post(AUTH_ROUTES.refresh)
  refresh() {
    return this.auth.refresh();
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
  deleteAccount(@Body() body: Record<string, unknown>) {
    // Ledger snapshot injected by Money module later — skeleton assumes empty
    const ledger = {
      lockedUsdt: Number(body?.lockedUsdt ?? 0),
      pendingWithdrawCount: Number(body?.pendingWithdrawCount ?? 0),
      principalUsdt: Number(body?.principalUsdt ?? 0),
      profitUsdt: Number(body?.profitUsdt ?? 0),
      practiceUsdt: Number(body?.practiceUsdt ?? 0),
    };
    return this.auth.deleteAccount(body ?? {}, ledger);
  }
}
