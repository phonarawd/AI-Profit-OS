/**
 * Nest Auth service — Infra §51.9 · ADR-006 (P0-1 fix).
 * Real JWT issuance/verification (see jwt.core.cjs + jwt-auth.guard.ts) +
 * DB-backed identity resolution against the existing users/auth_* SoT tables
 * (supabase/migrations/20260808205844_identity_nest_auth.sql +
 * .../20260808224856_auth_oauth_passkey_stage_a_b.sql — no new schema needed).
 *
 * Kakao (C-AUTH-001): code→token→profile is implemented in kakao-oauth.core.cjs.
 * Google code exchange and WebAuthn attestation remain out of scope — those
 * still trust a caller-supplied providerSubject/credentialId.
 */

import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  ServiceUnavailableException,
} from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { createRequire } from "node:module";
import { join } from "node:path";
import {
  loadPhase0Env,
  oauthConfigured,
} from "../config/phase0.env";
import { PostgresService } from "../db/postgres";
import { NotificationPrefsService } from "../inbox/notification-prefs.service";
import { LedgerProvisionService } from "../ledger/ledger.provision.service";
import { PracticeGrantService } from "../ledger/practice-grant.service";
import {
  ACCESS_TOKEN_TTL_SEC,
  ADMIN_JWT_ISSUER,
  DELETE_ACCOUNT_CONFIRM_PHRASE,
  OAUTH_PROVIDERS,
  USER_JWT_AUDIENCE,
  USER_JWT_ISSUER,
  type OauthProvider,
  type OnboardingStage,
} from "./auth.constants";
import type { SessionUser } from "./jwt-auth.guard";
import { PrivacyAccountService } from "./privacy-account.service";
import {
  assertNoForbiddenAuthFields,
  evaluateDeleteAccountGuards,
  validateStageA,
  validateStageB,
  type DeleteAccountGuardSnapshot,
  type StageASignupInput,
  type StageBProfileInput,
} from "./auth.stage";

const req = createRequire(__filename);
// eslint-disable-next-line @typescript-eslint/no-require-imports
const jwtCore = req(join(__dirname, "..", "..", "jwt.core.cjs")) as {
  sign: (
    payload: Record<string, unknown>,
    secret: string,
    opts: {
      issuer: string;
      audience: string;
      expiresInSec: number;
      nowMs?: number;
      jti?: string;
    },
  ) => string;
};

const kakaoOauth = req(join(__dirname, "..", "..", "kakao-oauth.core.cjs")) as {
  kakaoRedirectUri: (apiHost: string) => string;
  appOrigin: (appHost: string) => string;
  continuePathAfterOauth: (stage: OnboardingStage) => string;
  buildAuthorizeUrl: (opts: {
    clientId: string;
    redirectUri: string;
    state: string;
  }) => string;
  signOauthState: (
    payload: {
      termsAcceptedAt?: string;
      privacyAcceptedAt?: string;
      marketingConsent?: boolean;
      referralCode?: string;
    },
    secret: string,
  ) => string;
  verifyOauthState: (
    state: string,
    secret: string,
  ) => {
    termsAcceptedAt: string;
    privacyAcceptedAt: string;
    marketingConsent: boolean;
    referralCode: string;
  };
  exchangeKakaoCode: (opts: {
    code: string;
    redirectUri: string;
    clientId: string;
    clientSecret: string;
    fetchImpl?: typeof fetch;
  }) => Promise<{
    providerSubject: string;
    nickname?: string;
    email?: string;
    rawProfile: Record<string, unknown>;
  }>;
};

export type AuthSessionView = {
  sessionId: string;
  userId: string;
  issuer: typeof USER_JWT_ISSUER;
  issuedAt: string;
  expiresAt: string;
  revoked: boolean;
  onboardingStage: OnboardingStage;
};

function isUniqueViolation(e: unknown): boolean {
  return (
    typeof e === "object" &&
    e !== null &&
    "code" in e &&
    String((e as { code?: unknown }).code) === "23505"
  );
}

@Injectable()
export class AuthService {
  constructor(
    private readonly db: PostgresService,
    private readonly ledgerProvision: LedgerProvisionService,
    private readonly practiceGrant: PracticeGrantService,
    private readonly notificationPrefs: NotificationPrefsService,
    private readonly privacy: PrivacyAccountService,
  ) {}

  /**
   * After a real `users` row insert (Stage A persist) — provision §49 buckets
   * then §51.7 welcome practice (+10 · 1회 · expire 7d).
   * Calls SQL `provision_user_bucket_accounts` (idempotent).
   */
  async provisionLedgerBucketsForUser(userId: string): Promise<void> {
    await this.ledgerProvision.provisionUserBucketAccounts(userId);
    await this.practiceGrant.grantWelcome(userId);
    /** UI §50.1n — 가입 시 알림 prefs 전부 ON */
    await this.notificationPrefs.ensureDefaultsForUser(userId);
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

  async signupStageA(body: Record<string, unknown>) {
    const forbidden = assertNoForbiddenAuthFields(body);
    if (forbidden) throw new BadRequestException(forbidden);

    const input = body as unknown as StageASignupInput;
    const err = validateStageA(input);
    if (err) throw new BadRequestException(err);
    this.assertDbConfigured();

    const { userId, isNew } = await this.resolveIdentity(input);
    if (isNew) {
      await this.provisionLedgerBucketsForUser(userId);
      await this.upsertStageAProfile(userId, input);
    }

    const { accessToken, session } = await this.mintSession(userId);
    return {
      ok: true as const,
      stage: "A" as const,
      onboarding:
        session.onboardingStage === "B_complete"
          ? ("complete" as const)
          : ("incomplete" as const),
      session,
      accessToken,
      issuer: USER_JWT_ISSUER,
      ledgerProvision: "provisionLedgerBucketsForUser" as const,
      practiceWelcome: "practice_grant_welcome" as const,
    };
  }

  async patchProfileStageB(
    userId: string,
    body: Record<string, unknown>,
    opts: { emailAlreadyKnown: boolean },
  ) {
    const forbidden = assertNoForbiddenAuthFields(body);
    if (forbidden) throw new BadRequestException(forbidden);

    const input = body as unknown as StageBProfileInput;
    const err = validateStageB(input, opts);
    if (err) throw new BadRequestException(err);
    this.assertDbConfigured();

    await this.db.query(
      `INSERT INTO public.user_profiles (
         user_id, terms_accepted_at, privacy_accepted_at,
         display_name, birth_date, onboarding_stage
       ) VALUES ($1::uuid, now(), now(), $2, $3::date, 'B_complete')
       ON CONFLICT (user_id) DO UPDATE
         SET display_name = EXCLUDED.display_name,
             birth_date = EXCLUDED.birth_date,
             onboarding_stage = 'B_complete',
             updated_at = now()`,
      [userId, input.displayName, input.birthDate],
    );
    if (input.email && !opts.emailAlreadyKnown) {
      await this.db.query(
        `UPDATE public.users SET email = $2, updated_at = now()
          WHERE id = $1::uuid AND email IS NULL`,
        [userId, input.email],
      );
    }
    if (input.phoneE164) {
      await this.db.query(
        `UPDATE public.users SET phone_e164 = $2, updated_at = now()
          WHERE id = $1::uuid AND phone_e164 IS NULL`,
        [userId, input.phoneE164],
      );
    }

    return {
      ok: true as const,
      onboardingStage: "B_complete" as const,
    };
  }

  oauthStart(providerRaw: string, body: Record<string, unknown> = {}) {
    const provider = this.parseOauthProvider(providerRaw);
    const env = loadPhase0Env();
    if (!oauthConfigured(env, provider) || !env.jwtUserSecret) {
      return {
        ok: true as const,
        provider,
        status: "not_configured" as const,
        message:
          "Set OAUTH_*_CLIENT_ID/SECRET and JWT_USER_SECRET in .env (Phase0 hosts) — never commit secrets",
      };
    }

    const state = kakaoOauth.signOauthState(
      {
        termsAcceptedAt:
          typeof body.termsAcceptedAt === "string" ? body.termsAcceptedAt : "",
        privacyAcceptedAt:
          typeof body.privacyAcceptedAt === "string"
            ? body.privacyAcceptedAt
            : "",
        marketingConsent: body.marketingConsent === true,
        referralCode:
          typeof body.referralCode === "string" ? body.referralCode : "",
      },
      env.jwtUserSecret,
    );

    if (provider === "kakao") {
      return {
        ok: true as const,
        provider,
        status: "ready" as const,
        authorizeUrl: kakaoOauth.buildAuthorizeUrl({
          clientId: env.oauthKakaoClientId!,
          redirectUri: kakaoOauth.kakaoRedirectUri(env.apiHost),
          state,
        }),
      };
    }

    const redirectUri = `${kakaoOauth.appOrigin(env.apiHost)}/api/v1/auth/oauth/google/callback`;
    const u = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    u.searchParams.set("client_id", env.oauthGoogleClientId!);
    u.searchParams.set("redirect_uri", redirectUri);
    u.searchParams.set("response_type", "code");
    u.searchParams.set("scope", "openid email profile");
    u.searchParams.set("state", state);
    return {
      ok: true as const,
      provider,
      status: "ready" as const,
      authorizeUrl: u.toString(),
    };
  }

  oauthErrorRedirect(): string {
    const env = loadPhase0Env();
    return `${kakaoOauth.appOrigin(env.appHost)}/auth/login`;
  }

  oauthSignupRedirect(): string {
    const env = loadPhase0Env();
    return `${kakaoOauth.appOrigin(env.appHost)}/auth/signup`;
  }

  /**
   * Kakao browser GET callback (console redirect = API_HOST).
   * Existing identity → session. New identity → Stage A terms from signed state.
   */
  async oauthBrowserCallback(
    providerRaw: string,
    query: { code?: string; state?: string; error?: string },
  ): Promise<{ accessToken: string; redirectUrl: string }> {
    if (query.error) {
      throw new BadRequestException("oauth denied");
    }
    const provider = this.parseOauthProvider(providerRaw);
    if (provider !== "kakao") {
      throw new BadRequestException("browser callback is kakao-only");
    }
    const out = await this.completeKakaoCode(
      String(query.code ?? ""),
      String(query.state ?? ""),
    );
    const env = loadPhase0Env();
    const path = kakaoOauth.continuePathAfterOauth(out.session.onboardingStage);
    return {
      accessToken: out.accessToken,
      redirectUrl: `${kakaoOauth.appOrigin(env.appHost)}${path}`,
    };
  }

  oauthCallback(providerRaw: string, body: Record<string, unknown>) {
    const provider = this.parseOauthProvider(providerRaw);
    if (provider === "kakao") {
      if (!body?.code || typeof body.code !== "string") {
        throw new BadRequestException("kakao oauth code required");
      }
      return this.completeKakaoCode(
        body.code,
        typeof body.state === "string" ? body.state : "",
        {
          termsAcceptedAt:
            typeof body.termsAcceptedAt === "string"
              ? body.termsAcceptedAt
              : undefined,
          privacyAcceptedAt:
            typeof body.privacyAcceptedAt === "string"
              ? body.privacyAcceptedAt
              : undefined,
          marketingConsent: Boolean(body.marketingConsent),
          referralCode:
            typeof body.referralCode === "string" ? body.referralCode : undefined,
        },
      );
    }
    if (typeof body.providerSubject !== "string" || !body.providerSubject) {
      throw new BadRequestException("google oauth providerSubject required");
    }
    return this.signupStageA({
      method: "oauth_google",
      termsAcceptedAt: String(body.termsAcceptedAt ?? ""),
      privacyAcceptedAt: String(body.privacyAcceptedAt ?? ""),
      marketingConsent: Boolean(body.marketingConsent),
      referralCode:
        typeof body.referralCode === "string" ? body.referralCode : undefined,
      oauth: {
        provider,
        providerSubject: body.providerSubject,
        email: typeof body.email === "string" ? body.email : undefined,
      },
    });
  }

  private async completeKakaoCode(
    code: string,
    state: string,
    bodyTerms?: {
      termsAcceptedAt?: string;
      privacyAcceptedAt?: string;
      marketingConsent?: boolean;
      referralCode?: string;
    },
  ) {
    if (!code) throw new BadRequestException("oauth code required");
    const env = loadPhase0Env();
    if (!oauthConfigured(env, "kakao") || !env.jwtUserSecret) {
      throw new ServiceUnavailableException("kakao oauth not configured");
    }
    let stateTerms = {
      termsAcceptedAt: "",
      privacyAcceptedAt: "",
      marketingConsent: false,
      referralCode: "",
    };
    if (state) {
      try {
        stateTerms = kakaoOauth.verifyOauthState(state, env.jwtUserSecret);
      } catch {
        throw new BadRequestException("oauth state invalid");
      }
    }
    const profile = await kakaoOauth.exchangeKakaoCode({
      code,
      redirectUri: kakaoOauth.kakaoRedirectUri(env.apiHost),
      clientId: env.oauthKakaoClientId!,
      clientSecret: env.oauthKakaoClientSecret!,
    });
    this.assertDbConfigured();
    const existing = await this.db.query<{ user_id: string }>(
      `SELECT user_id::text FROM public.auth_oauth_identities
        WHERE provider = 'kakao' AND provider_subject = $1 AND unlinked_at IS NULL`,
      [profile.providerSubject],
    );
    if (existing.rows[0]) {
      await this.touchOauthProfile(
        "kakao",
        profile.providerSubject,
        profile.email,
        profile.rawProfile,
      );
      return this.mintSession(existing.rows[0].user_id);
    }
    const termsAcceptedAt =
      bodyTerms?.termsAcceptedAt || stateTerms.termsAcceptedAt;
    const privacyAcceptedAt =
      bodyTerms?.privacyAcceptedAt || stateTerms.privacyAcceptedAt;
    if (!termsAcceptedAt || !privacyAcceptedAt) {
      throw new BadRequestException("TERMS_REQUIRED");
    }
    return this.signupStageA({
      method: "oauth_kakao",
      termsAcceptedAt,
      privacyAcceptedAt,
      marketingConsent:
        bodyTerms?.marketingConsent === true || stateTerms.marketingConsent,
      referralCode:
        bodyTerms?.referralCode || stateTerms.referralCode || undefined,
      oauth: {
        provider: "kakao",
        providerSubject: profile.providerSubject,
        email: profile.email,
        rawProfile: profile.rawProfile,
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

  logout(sessionUser: SessionUser) {
    return this.revokeSession(sessionUser).then(() => ({
      ok: true as const,
      revoked: true as const,
    }));
  }

  async refresh(sessionUser: SessionUser): Promise<{
    ok: true;
    issuer: typeof USER_JWT_ISSUER;
    accessToken: string;
    session: AuthSessionView;
  }> {
    // A deleted account's still-valid (short-TTL) access token must not be
    // able to mint a fresh one — refresh is the one session-authority path
    // that already round-trips the DB, so this is the minimal enforcement
    // point (no new blacklist architecture; reuses the existing users.status
    // tombstone this same wave introduces).
    await this.assertAccountActive(sessionUser.userId);
    await this.revokeSession(sessionUser);
    const minted = await this.mintSession(sessionUser.userId);
    return {
      ok: true,
      issuer: USER_JWT_ISSUER,
      accessToken: minted.accessToken,
      session: minted.session,
    };
  }

  private async assertAccountActive(userId: string): Promise<void> {
    if (!this.db.configured()) return;
    const r = await this.db.query<{ status: string }>(
      `SELECT status FROM public.users WHERE id = $1::uuid`,
      [userId],
    );
    if (r.rows[0]?.status === "deleted") {
      throw new ForbiddenException("ACCOUNT_DELETED");
    }
  }

  async session(sessionUser: SessionUser): Promise<AuthSessionView> {
    let revoked = false;
    if (this.db.configured() && sessionUser.sessionId) {
      const r = await this.db.query<{ revoked: boolean }>(
        `SELECT revoked FROM public.auth_sessions
          WHERE user_id = $1::uuid AND refresh_jti = $2`,
        [sessionUser.userId, sessionUser.sessionId],
      );
      // No row is not "not revoked" — the session was revoked/purged (delete-
      // account hard-deletes auth_sessions rows) or never existed; either way
      // this must read as revoked, not as a healthy active session.
      revoked = r.rows[0] ? r.rows[0].revoked === true : true;
    }
    const onboardingStage = await this.loadOnboardingStage(sessionUser.userId);
    return {
      sessionId: sessionUser.sessionId,
      userId: sessionUser.userId,
      issuer: USER_JWT_ISSUER,
      issuedAt: sessionUser.issuedAt,
      expiresAt: sessionUser.expiresAt,
      revoked,
      onboardingStage,
    };
  }

  async deleteAccount(userId: string, body: Record<string, unknown>) {
    const confirm1 = body.confirmPhrase === DELETE_ACCOUNT_CONFIRM_PHRASE;
    const confirm2 = body.confirmAgain === true || body.confirmTwice === true;
    if (!confirm1 || !confirm2) {
      throw new BadRequestException("delete-account requires confirm×2");
    }
    if (!this.db.configured()) {
      // Nothing to purge against — same "no DB, no mutation" contract as before.
      return {
        ok: true as const,
        status: "anonymized" as const,
        kycRetention: "archive_r2" as const,
      };
    }

    // Real server-side balances/pending-withdraws — never trust a client body
    // for a guard that exists specifically to stop a client from bypassing it.
    const ledger: DeleteAccountGuardSnapshot = await this.privacy.loadGuardSnapshot(
      userId,
    );
    const gate = evaluateDeleteAccountGuards(ledger);
    if (!gate.ok) throw new ForbiddenException(gate.reason);

    const result = await this.privacy.purgeAccount(userId);
    return {
      ok: true as const,
      status: "anonymized" as const,
      kycRetention: "archive_r2" as const,
      purged: result.purged,
      anonymized: result.anonymized,
    };
  }

  // ── identity resolution (find-or-create against existing SoT tables) ──

  private async resolveIdentity(
    input: StageASignupInput,
  ): Promise<{ userId: string; isNew: boolean }> {
    if (input.method === "oauth_kakao" || input.method === "oauth_google") {
      const provider: OauthProvider =
        input.method === "oauth_kakao" ? "kakao" : "google";
      const subject = input.oauth?.providerSubject;
      if (!subject) {
        throw new BadRequestException("oauth.providerSubject required");
      }
      return this.findOrCreateUserByOauth(
        provider,
        subject,
        input.oauth?.email ?? input.email,
        input.oauth?.rawProfile,
      );
    }
    if (input.method === "email_magic") {
      if (!input.email) {
        throw new BadRequestException("email required for email_magic");
      }
      return this.findOrCreateUserByEmail(input.email);
    }
    if (input.method === "passkey") {
      const credentialId = input.passkey?.credentialId;
      if (!credentialId) {
        throw new BadRequestException("passkey.credentialId required");
      }
      return this.findOrCreateUserByPasskey(credentialId);
    }
    throw new BadRequestException("unsupported Stage A method");
  }

  private async findOrCreateUserByOauth(
    provider: "kakao" | "google",
    providerSubject: string,
    email?: string,
    rawProfile?: Record<string, unknown>,
  ): Promise<{ userId: string; isNew: boolean }> {
    const existing = await this.db.query<{ user_id: string }>(
      `SELECT user_id::text FROM public.auth_oauth_identities
        WHERE provider = $1 AND provider_subject = $2 AND unlinked_at IS NULL`,
      [provider, providerSubject],
    );
    if (existing.rows[0]) {
      await this.touchOauthProfile(
        provider,
        providerSubject,
        email,
        rawProfile,
      );
      return { userId: existing.rows[0].user_id, isNew: false };
    }

    const userId = await this.insertBareUser();
    try {
      await this.db.query(
        `INSERT INTO public.auth_oauth_identities (
           user_id, provider, provider_subject, email_from_provider, raw_profile
         ) VALUES ($1::uuid, $2, $3, $4, $5::jsonb)`,
        [
          userId,
          provider,
          providerSubject,
          email ?? null,
          JSON.stringify(rawProfile ?? {}),
        ],
      );
    } catch (e) {
      if (isUniqueViolation(e)) {
        const again = await this.db.query<{ user_id: string }>(
          `SELECT user_id::text FROM public.auth_oauth_identities
            WHERE provider = $1 AND provider_subject = $2`,
          [provider, providerSubject],
        );
        if (again.rows[0]) {
          await this.touchOauthProfile(
            provider,
            providerSubject,
            email,
            rawProfile,
          );
          return { userId: again.rows[0].user_id, isNew: false };
        }
      }
      throw e;
    }
    return { userId, isNew: true };
  }

  private async touchOauthProfile(
    provider: OauthProvider,
    providerSubject: string,
    email: string | undefined,
    rawProfile: Record<string, unknown> | undefined,
  ): Promise<void> {
    if (!rawProfile && !email) return;
    await this.db.query(
      `UPDATE public.auth_oauth_identities
          SET raw_profile = COALESCE($3::jsonb, raw_profile),
              email_from_provider = COALESCE($4, email_from_provider)
        WHERE provider = $1 AND provider_subject = $2 AND unlinked_at IS NULL`,
      [
        provider,
        providerSubject,
        rawProfile ? JSON.stringify(rawProfile) : null,
        email ?? null,
      ],
    );
  }

  private async findOrCreateUserByEmail(
    email: string,
  ): Promise<{ userId: string; isNew: boolean }> {
    const existing = await this.db.query<{ id: string }>(
      `SELECT id::text FROM public.users WHERE email = $1`,
      [email],
    );
    if (existing.rows[0]) {
      return { userId: existing.rows[0].id, isNew: false };
    }
    try {
      const created = await this.db.query<{ id: string }>(
        `INSERT INTO public.users (email) VALUES ($1) RETURNING id::text`,
        [email],
      );
      const userId = created.rows[0]?.id;
      if (!userId) throw new ServiceUnavailableException("user insert failed");
      return { userId, isNew: true };
    } catch (e) {
      if (isUniqueViolation(e)) {
        const again = await this.db.query<{ id: string }>(
          `SELECT id::text FROM public.users WHERE email = $1`,
          [email],
        );
        if (again.rows[0]) return { userId: again.rows[0].id, isNew: false };
      }
      throw e;
    }
  }

  /**
   * Phase0: WebAuthn attestation/assertion signature verification is NOT
   * implemented — credential_id is used as an opaque bearer identity only
   * (public_key stored empty). Real cryptographic verification is Phase1.
   */
  private async findOrCreateUserByPasskey(
    credentialId: string,
  ): Promise<{ userId: string; isNew: boolean }> {
    const existing = await this.db.query<{ user_id: string }>(
      `SELECT user_id::text FROM public.auth_passkeys
        WHERE credential_id = $1 AND revoked_at IS NULL`,
      [credentialId],
    );
    if (existing.rows[0]) {
      return { userId: existing.rows[0].user_id, isNew: false };
    }

    const userId = await this.insertBareUser();
    try {
      await this.db.query(
        `INSERT INTO public.auth_passkeys (user_id, credential_id, public_key)
         VALUES ($1::uuid, $2, $3)`,
        [userId, credentialId, Buffer.alloc(0)],
      );
    } catch (e) {
      if (isUniqueViolation(e)) {
        const again = await this.db.query<{ user_id: string }>(
          `SELECT user_id::text FROM public.auth_passkeys WHERE credential_id = $1`,
          [credentialId],
        );
        if (again.rows[0]) {
          return { userId: again.rows[0].user_id, isNew: false };
        }
      }
      throw e;
    }
    return { userId, isNew: true };
  }

  private async insertBareUser(): Promise<string> {
    const created = await this.db.query<{ id: string }>(
      `INSERT INTO public.users DEFAULT VALUES RETURNING id::text`,
    );
    const userId = created.rows[0]?.id;
    if (!userId) throw new ServiceUnavailableException("user insert failed");
    return userId;
  }

  private async upsertStageAProfile(
    userId: string,
    input: StageASignupInput,
  ): Promise<void> {
    await this.db.query(
      `INSERT INTO public.user_profiles (
         user_id, terms_accepted_at, privacy_accepted_at, marketing_consent
       ) VALUES ($1::uuid, $2::timestamptz, $3::timestamptz, $4)
       ON CONFLICT (user_id) DO NOTHING`,
      [
        userId,
        input.termsAcceptedAt,
        input.privacyAcceptedAt,
        input.marketingConsent === true,
      ],
    );
  }

  // ── session mint/revoke (real HS256 JWT — see jwt.core.cjs) ──

  private async mintSession(userId: string): Promise<{
    accessToken: string;
    session: AuthSessionView;
  }> {
    const env = loadPhase0Env();
    if (!env.jwtUserSecret) {
      throw new ServiceUnavailableException(
        "JWT_USER_SECRET unset — cannot mint session (never fall back to a hardcoded secret)",
      );
    }
    const jti = randomUUID();
    const issuedAt = new Date();
    const expiresAt = new Date(issuedAt.getTime() + ACCESS_TOKEN_TTL_SEC * 1000);
    const accessToken = jwtCore.sign({ sub: userId }, env.jwtUserSecret, {
      issuer: USER_JWT_ISSUER,
      audience: USER_JWT_AUDIENCE,
      expiresInSec: ACCESS_TOKEN_TTL_SEC,
      jti,
    });

    if (this.db.configured()) {
      await this.db.query(
        `INSERT INTO public.auth_sessions (
           user_id, issuer, refresh_jti, issued_at, expires_at
         ) VALUES ($1::uuid, $2, $3, $4, $5)`,
        [
          userId,
          USER_JWT_ISSUER,
          jti,
          issuedAt.toISOString(),
          expiresAt.toISOString(),
        ],
      );
    }

    const onboardingStage = await this.loadOnboardingStage(userId);
    return {
      accessToken,
      session: {
        sessionId: jti,
        userId,
        issuer: USER_JWT_ISSUER,
        issuedAt: issuedAt.toISOString(),
        expiresAt: expiresAt.toISOString(),
        revoked: false,
        onboardingStage,
      },
    };
  }

  /**
   * Access tokens are stateless (HS256, self-contained exp). Revoking here
   * marks the auth_sessions row for audit/session-list purposes but does not
   * force-invalidate an already-issued token before its (short, 15min) TTL
   * elapses — an accepted Phase0 tradeoff; revisit with a refresh-token
   * rotation + denylist if TTL grows or true instant revocation is required.
   */
  private async revokeSession(sessionUser: SessionUser): Promise<void> {
    if (!this.db.configured() || !sessionUser.sessionId) return;
    await this.db.query(
      `UPDATE public.auth_sessions SET revoked = true, revoked_at = now()
        WHERE user_id = $1::uuid AND refresh_jti = $2 AND revoked = false`,
      [sessionUser.userId, sessionUser.sessionId],
    );
  }

  private async revokeAllSessions(userId: string): Promise<void> {
    if (!this.db.configured()) return;
    await this.db.query(
      `UPDATE public.auth_sessions SET revoked = true, revoked_at = now()
        WHERE user_id = $1::uuid AND revoked = false`,
      [userId],
    );
  }

  private async loadOnboardingStage(userId: string): Promise<OnboardingStage> {
    if (!this.db.configured()) return "A";
    const r = await this.db.query<{ onboarding_stage: OnboardingStage }>(
      `SELECT onboarding_stage FROM public.user_profiles WHERE user_id = $1::uuid`,
      [userId],
    );
    return r.rows[0]?.onboarding_stage ?? "A";
  }

  private assertDbConfigured(): void {
    if (!this.db.configured()) {
      throw new ServiceUnavailableException(
        "DATABASE_URL unset — cannot create/verify a real session",
      );
    }
  }
}
