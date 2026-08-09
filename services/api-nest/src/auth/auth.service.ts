/**
 * Nest Auth service skeleton — contract SSOT for §51.9.
 * Persistence/JWT signing land with Money M1.
 * OAuth client IDs/secrets = Phase0 host env (phase0-bootstrap-hosts).
 * This module must never import Supabase Auth clients.
 */

import { BadRequestException, ForbiddenException, Injectable } from "@nestjs/common";
import {
  loadPhase0Env,
  oauthConfigured,
} from "../config/phase0.env";
import { LedgerProvisionService } from "../ledger/ledger.provision.service";
import { PracticeGrantService } from "../ledger/practice-grant.service";
import {
  ADMIN_JWT_ISSUER,
  DELETE_ACCOUNT_CONFIRM_PHRASE,
  OAUTH_PROVIDERS,
  USER_JWT_ISSUER,
  type OauthProvider,
} from "./auth.constants";
import {
  assertNoForbiddenAuthFields,
  evaluateDeleteAccountGuards,
  validateStageA,
  validateStageB,
  type DeleteAccountGuardSnapshot,
  type StageASignupInput,
  type StageBProfileInput,
} from "./auth.stage";

export type AuthSessionView = {
  sessionId: string;
  userId: string;
  issuer: typeof USER_JWT_ISSUER;
  issuedAt: string;
  expiresAt: string;
  revoked: boolean;
  onboardingStage: "A" | "B_incomplete" | "B_complete";
};

@Injectable()
export class AuthService {
  constructor(
    private readonly ledgerProvision: LedgerProvisionService,
    private readonly practiceGrant: PracticeGrantService,
  ) {}

  /**
   * After a real `users` row insert (Stage A persist) — provision §49 buckets
   * then §51.7 welcome practice (+10 · 1회 · expire 7d).
   * Calls SQL `provision_user_bucket_accounts` (idempotent).
   */
  async provisionLedgerBucketsForUser(userId: string): Promise<void> {
    await this.ledgerProvision.provisionUserBucketAccounts(userId);
    await this.practiceGrant.grantWelcome(userId);
  }

  /** Fail-closed: admin issuer must never mint user sessions */
  assertUserIssuer(issuer: string): void {
    if (issuer === ADMIN_JWT_ISSUER) {
      throw new ForbiddenException("admin JWT forbidden on user auth routes");
    }
    if (issuer !== USER_JWT_ISSUER) {
      throw new ForbiddenException("unknown JWT issuer");
    }
  }

  parseOauthProvider(raw: string): OauthProvider {
    if ((OAUTH_PROVIDERS as readonly string[]).includes(raw)) {
      return raw as OauthProvider;
    }
    throw new BadRequestException("unsupported OAuth provider");
  }

  signupStageA(body: Record<string, unknown>) {
    const forbidden = assertNoForbiddenAuthFields(body);
    if (forbidden) throw new BadRequestException(forbidden);

    const input = body as unknown as StageASignupInput;
    const err = validateStageA(input);
    if (err) throw new BadRequestException(err);

    // Skeleton response — DB write + JWT mint = M1 wiring.
    // Persist path MUST call provisionLedgerBucketsForUser(userId)
    // → SQL provision_user_bucket_accounts (Money §49).
    const now = new Date();
    const expires = new Date(now.getTime() + 15 * 60 * 1000);
    const session: AuthSessionView = {
      sessionId: "pending-session",
      userId: "pending-user",
      issuer: USER_JWT_ISSUER,
      issuedAt: now.toISOString(),
      expiresAt: expires.toISOString(),
      revoked: false,
      onboardingStage: "A",
    };
    return {
      ok: true as const,
      stage: "A" as const,
      onboarding: "incomplete" as const,
      session,
      issuer: USER_JWT_ISSUER,
      ledgerProvision: "provisionLedgerBucketsForUser" as const,
      practiceWelcome: "practice_grant_welcome" as const,
    };
  }

  patchProfileStageB(
    body: Record<string, unknown>,
    opts: { emailAlreadyKnown: boolean },
  ) {
    const forbidden = assertNoForbiddenAuthFields(body);
    if (forbidden) throw new BadRequestException(forbidden);

    const input = body as unknown as StageBProfileInput;
    const err = validateStageB(input, opts);
    if (err) throw new BadRequestException(err);

    return {
      ok: true as const,
      onboardingStage: "B_complete" as const,
    };
  }

  oauthStart(providerRaw: string) {
    const provider = this.parseOauthProvider(providerRaw);
    const env = loadPhase0Env();
    if (!oauthConfigured(env, provider)) {
      return {
        ok: true as const,
        provider,
        status: "not_configured" as const,
        message:
          "Set OAUTH_*_CLIENT_ID/SECRET in .env (Phase0 hosts) — never commit secrets",
      };
    }

    const apiBase = env.apiHost.startsWith("http")
      ? env.apiHost
      : env.apiHost.includes("localhost")
        ? `http://${env.apiHost}`
        : `https://${env.apiHost}`;
    const redirectUri = `${apiBase}/api/v1/auth/oauth/${provider}/callback`;
    if (provider === "kakao") {
      const u = new URL("https://kauth.kakao.com/oauth/authorize");
      u.searchParams.set("client_id", env.oauthKakaoClientId!);
      u.searchParams.set("redirect_uri", redirectUri);
      u.searchParams.set("response_type", "code");
      return {
        ok: true as const,
        provider,
        status: "ready" as const,
        authorizeUrl: u.toString(),
      };
    }

    const u = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    u.searchParams.set("client_id", env.oauthGoogleClientId!);
    u.searchParams.set("redirect_uri", redirectUri);
    u.searchParams.set("response_type", "code");
    u.searchParams.set("scope", "openid email profile");
    return {
      ok: true as const,
      provider,
      status: "ready" as const,
      authorizeUrl: u.toString(),
    };
  }

  oauthCallback(providerRaw: string, body: Record<string, unknown>) {
    const provider = this.parseOauthProvider(providerRaw);
    if (!body?.code && !body?.providerSubject) {
      throw new BadRequestException("oauth code or providerSubject required");
    }
    return this.signupStageA({
      method: provider === "kakao" ? "oauth_kakao" : "oauth_google",
      termsAcceptedAt: String(body.termsAcceptedAt ?? ""),
      privacyAcceptedAt: String(body.privacyAcceptedAt ?? ""),
      marketingConsent: Boolean(body.marketingConsent),
      referralCode:
        typeof body.referralCode === "string" ? body.referralCode : undefined,
      oauth: {
        provider,
        providerSubject: String(body.providerSubject ?? body.code ?? ""),
        email: typeof body.email === "string" ? body.email : undefined,
      },
    });
  }

  passkeyOptions(kind: "register" | "authenticate") {
    return {
      ok: true as const,
      kind,
      status: "not_configured" as const,
      rpName: "퍼뜩",
      issuer: USER_JWT_ISSUER,
    };
  }

  magicLinkRequest(body: Record<string, unknown>) {
    const email = typeof body.email === "string" ? body.email.trim() : "";
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new BadRequestException("valid email required");
    }
    return {
      ok: true as const,
      delivery: "resend" as const,
      status: "accepted" as const,
      // Never echo magic token
    };
  }

  logout() {
    return { ok: true as const, revoked: true as const };
  }

  refresh() {
    return {
      ok: true as const,
      issuer: USER_JWT_ISSUER,
      status: "skeleton" as const,
    };
  }

  session(): AuthSessionView {
    const now = new Date();
    return {
      sessionId: "skeleton",
      userId: "anonymous",
      issuer: USER_JWT_ISSUER,
      issuedAt: now.toISOString(),
      expiresAt: new Date(now.getTime() + 15 * 60 * 1000).toISOString(),
      revoked: false,
      onboardingStage: "A",
    };
  }

  deleteAccount(
    body: Record<string, unknown>,
    ledger: DeleteAccountGuardSnapshot,
  ) {
    const confirm1 = body.confirmPhrase === DELETE_ACCOUNT_CONFIRM_PHRASE;
    const confirm2 = body.confirmAgain === true || body.confirmTwice === true;
    if (!confirm1 || !confirm2) {
      throw new BadRequestException("delete-account requires confirm×2");
    }
    const gate = evaluateDeleteAccountGuards(ledger);
    if (!gate.ok) throw new ForbiddenException(gate.reason);
    return {
      ok: true as const,
      status: "anonymized" as const,
      kycRetention: "archive_r2" as const,
    };
  }
}
