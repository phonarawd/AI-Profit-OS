/**
 * Nest Auth service — Infra §51.9 · ADR-006 (P0-1 fix).
 * Real JWT issuance/verification (see jwt.core.cjs + jwt-auth.guard.ts) +
 * DB-backed identity resolution against the existing users/auth_* SoT tables
 * (supabase/migrations/20260808205844_identity_nest_auth.sql +
 * .../20260808224856_auth_oauth_passkey_stage_a_b.sql — no new schema needed).
 *
 * Identity authority is server-owned only:
 * Magic link = hashed one-time token · OAuth = state + code exchange ·
 * WebAuthn = challenge + RP/origin + signature. Caller email / providerSubject /
 * credentialId 단독으로는 세션을 만들지 않는다.
 */

import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from "@nestjs/common";
import { PostgresService } from "../db/postgres";
import { NotificationPrefsService } from "../inbox/notification-prefs.service";
import { UserUxPrefsService } from "../ux-prefs/user-ux-prefs.service";
import { LedgerProvisionService } from "../ledger/ledger.provision.service";
import { PracticeGrantService } from "../ledger/practice-grant.service";
import {
  ADMIN_JWT_ISSUER,
  DELETE_ACCOUNT_CONFIRM_PHRASE,
  OAUTH_PROVIDERS,
  USER_JWT_ISSUER,
  type OauthProvider,
  type OnboardingStage,
} from "./auth.constants";
import {
  mintReferralCode,
  uniqueViolationTarget,
} from "../referral/referral-code.util";
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
import { MagicLinkService } from "./magic-link.service";
import { OauthIdentityService } from "./oauth-identity.service";
import { WebauthnAssertService } from "./webauthn-assert.service";
import {
  assertPasskeyCredentialUnclaimed,
  rejectPasskeyCredentialInsertRace,
} from "./passkey-registration.policy";
import { SessionRotationService } from "./session-rotation.service";

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
    private readonly uxPrefs: UserUxPrefsService,
    private readonly privacy: PrivacyAccountService,
    private readonly magicLink: MagicLinkService,
    private readonly oauthIdentity: OauthIdentityService,
    private readonly webauthn: WebauthnAssertService,
    private readonly sessions: SessionRotationService,
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
    await this.uxPrefs.ensureDefaultsForUser(userId);
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
    if (
      input.method === "email_magic" ||
      input.method === "oauth_kakao" ||
      input.method === "oauth_google" ||
      input.method === "passkey"
    ) {
      throw new BadRequestException(
        "caller identity is not authority — use magic-link/oauth/passkey verify",
      );
    }
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

  oauthStart(providerRaw: string) {
    return this.oauthIdentity.startReady(this.parseOauthProvider(providerRaw));
  }

  async oauthCallback(providerRaw: string, body: Record<string, unknown>) {
    const provider = this.parseOauthProvider(providerRaw);
    const proven = await this.oauthIdentity.prove(provider, body ?? {});
    this.assertDbConfigured();
    const existingOauth = await this.db.query<{ user_id: string }>(
      `SELECT user_id::text FROM public.auth_oauth_identities
        WHERE provider = $1 AND provider_subject = $2 AND unlinked_at IS NULL`,
      [provider, proven.providerSubject],
    );
    const isExisting = Boolean(existingOauth.rows[0]);
    const terms = String(body.termsAcceptedAt ?? "");
    const privacy = String(body.privacyAcceptedAt ?? "");
    if (!isExisting && (!terms || !privacy)) {
      throw new BadRequestException("TERMS_REQUIRED");
    }
    const { userId, isNew } = await this.findOrCreateUserByOauth(
      provider,
      proven.providerSubject,
      proven.email,
    );
    if (isNew) {
      await this.provisionLedgerBucketsForUser(userId);
      await this.upsertStageAProfile(userId, {
        method: provider === "kakao" ? "oauth_kakao" : "oauth_google",
        termsAcceptedAt: terms,
        privacyAcceptedAt: privacy,
        marketingConsent: Boolean(body.marketingConsent),
        referralCode:
          typeof body.referralCode === "string" ? body.referralCode : undefined,
        oauth: { provider, providerSubject: proven.providerSubject, email: proven.email },
      });
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
    };
  }

  passkeyOptions(kind: "register" | "authenticate") {
    return this.webauthn.options(kind);
  }

  async passkeyRegisterVerify(body: Record<string, unknown>) {
    const proven = await this.webauthn.prove("register", body ?? {}, {
      findByCredentialId: (id) => this.lookupPasskey(id),
    });
    this.assertDbConfigured();
    const terms = String(body.termsAcceptedAt ?? "");
    const privacy = String(body.privacyAcceptedAt ?? "");
    if (!terms || !privacy) {
      throw new BadRequestException("TERMS_REQUIRED");
    }
    const { userId, isNew } = await this.registerPasskey(
      proven.credentialId,
      proven.publicKeySpki,
      proven.signCount,
    );
    if (isNew) {
      await this.provisionLedgerBucketsForUser(userId);
      await this.upsertStageAProfile(userId, {
        method: "passkey",
        termsAcceptedAt: terms,
        privacyAcceptedAt: privacy,
        marketingConsent: Boolean(body.marketingConsent),
        referralCode:
          typeof body.referralCode === "string" ? body.referralCode : undefined,
        passkey: { credentialId: proven.credentialId },
      });
    }
    return this.sessionMintView(userId);
  }

  async passkeyAuthVerify(body: Record<string, unknown>) {
    const proven = await this.webauthn.prove("authenticate", body ?? {}, {
      findByCredentialId: (id) => this.lookupPasskey(id),
    });
    this.assertDbConfigured();
    const existing = await this.lookupPasskey(proven.credentialId);
    if (!existing) {
      throw new BadRequestException("webauthn credential unknown");
    }
    await this.db.query(
      `UPDATE public.auth_passkeys
          SET sign_count = $2, last_used_at = now()
        WHERE credential_id = $1 AND revoked_at IS NULL`,
      [proven.credentialId, proven.signCount],
    );
    const row = await this.db.query<{ user_id: string }>(
      `SELECT user_id::text FROM public.auth_passkeys
        WHERE credential_id = $1 AND revoked_at IS NULL`,
      [proven.credentialId],
    );
    const userId = row.rows[0]?.user_id;
    if (!userId) throw new BadRequestException("webauthn credential unknown");
    return this.sessionMintView(userId);
  }

  magicLinkRequest(body: Record<string, unknown>) {
    return this.magicLink.request(body ?? {});
  }

  async magicLinkVerify(body: Record<string, unknown>) {
    this.assertDbConfigured();
    const token = typeof body.token === "string" ? body.token.trim() : "";
    if (!token) {
      throw new BadRequestException("magic link token required");
    }
    const previewEmail = await this.magicLink.peekEmail(token);
    const exists = previewEmail ? await this.emailExists(previewEmail) : false;
    const proven = await this.magicLink.prove(body ?? {}, { userExists: exists });
    const { userId, isNew } = await this.findOrCreateUserByEmail(proven.email);
    if (isNew) {
      await this.provisionLedgerBucketsForUser(userId);
      await this.upsertStageAProfile(userId, {
        method: "email_magic",
        termsAcceptedAt: String(body.termsAcceptedAt ?? ""),
        privacyAcceptedAt: String(body.privacyAcceptedAt ?? ""),
        marketingConsent: Boolean(body.marketingConsent),
        referralCode:
          typeof body.referralCode === "string" ? body.referralCode : undefined,
        email: proven.email,
      });
    }
    return this.sessionMintView(userId);
  }

  logout(sessionUser: SessionUser) {
    return this.revokeSession(sessionUser).then(() => ({
      ok: true as const,
      revoked: true as const,
    }));
  }

  /**
   * S1F Section 7 - refresh now works from the opaque refresh-token cookie
   * alone, WITHOUT requiring a still-valid access token (the old design
   * required JwtAuthGuard here, which made refresh impossible once the
   * 15-minute access token had actually expired - the one case refresh
   * exists for). Reuse/rotation-race detection is handled inside
   * SessionRotationService.rotate() and surfaces as a thrown
   * ForbiddenException (controller maps this to a hard logout).
   */
  async refreshFromToken(refreshTokenRaw: string): Promise<{
    ok: true;
    issuer: typeof USER_JWT_ISSUER;
    accessToken: string;
    refreshToken: string;
    session: AuthSessionView;
  }> {
    if (!refreshTokenRaw) {
      throw new UnauthorizedException("AUTH_REQUIRED");
    }
    const minted = await this.sessions.rotate(refreshTokenRaw);
    if (!minted) {
      throw new UnauthorizedException("AUTH_REQUIRED");
    }
    // A deleted/banned account must not be able to keep refreshing.
    const active = await this.isAccountActive(minted.userId);
    if (!active) {
      await this.sessions.revokeFamily(minted.familyId);
      throw new ForbiddenException("ACCOUNT_NOT_ACTIVE");
    }
    const onboardingStage = await this.loadOnboardingStage(minted.userId);
    return {
      ok: true,
      issuer: USER_JWT_ISSUER,
      accessToken: minted.accessToken,
      refreshToken: minted.refreshToken,
      session: {
        sessionId: minted.sessionRowId,
        userId: minted.userId,
        issuer: USER_JWT_ISSUER,
        issuedAt: minted.issuedAt,
        expiresAt: minted.accessExpiresAt,
        revoked: false,
        onboardingStage,
      },
    };
  }

  /** "Log out everywhere" - revokes every device/login for this user. */
  async logoutAll(userId: string): Promise<{ ok: true }> {
    await this.sessions.revokeAllForUser(userId);
    return { ok: true };
  }

  async listSessions(sessionUser: SessionUser) {
    const families = await this.sessions.listActiveFamilies(
      sessionUser.userId,
      sessionUser.familyId,
    );
    return { ok: true as const, sessions: families };
  }

  async revokeSessionFamily(sessionUser: SessionUser, familyId: string): Promise<{ ok: true }> {
    const revoked = await this.sessions.revokeFamilyForUser(sessionUser.userId, familyId);
    if (!revoked) throw new BadRequestException("SESSION_NOT_FOUND");
    return { ok: true };
  }

  private async isAccountActive(userId: string): Promise<boolean> {
    if (!this.db.configured()) return true;
    const r = await this.db.query<{ status: string }>(
      `SELECT status FROM public.users WHERE id = $1::uuid`,
      [userId],
    );
    const status = r.rows[0]?.status;
    return status === "active";
  }

  async session(sessionUser: SessionUser): Promise<AuthSessionView> {
    let revoked = false;
    if (this.db.configured() && sessionUser.familyId) {
      // Checked by family_id, not the access token's own jti (S1F Section 7
      // - the access token's jti is a per-mint nonce with no DB row of its
      // own under the refresh-rotation model; family_id is the real,
      // DB-backed unit of revocation). The most recent row in the family
      // reflects whether logout/reuse-detection has revoked this device.
      const r = await this.db.query<{ revoked: boolean }>(
        `SELECT revoked FROM public.auth_sessions
          WHERE user_id = $1::uuid AND family_id = $2::uuid
          ORDER BY issued_at DESC
          LIMIT 1`,
        [sessionUser.userId, sessionUser.familyId],
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
    _input: StageASignupInput,
  ): Promise<{ userId: string; isNew: boolean }> {
    throw new BadRequestException(
      "caller identity is not authority — use magic-link/oauth/passkey verify",
    );
  }

  private async findOrCreateUserByOauth(
    provider: "kakao" | "google",
    providerSubject: string,
    email?: string,
  ): Promise<{ userId: string; isNew: boolean }> {
    const existing = await this.db.query<{ user_id: string }>(
      `SELECT user_id::text FROM public.auth_oauth_identities
        WHERE provider = $1 AND provider_subject = $2 AND unlinked_at IS NULL`,
      [provider, providerSubject],
    );
    if (existing.rows[0]) {
      return { userId: existing.rows[0].user_id, isNew: false };
    }

    const userId = await this.insertBareUser();
    try {
      await this.db.query(
        `INSERT INTO public.auth_oauth_identities (
           user_id, provider, provider_subject, email_from_provider
         ) VALUES ($1::uuid, $2, $3, $4)`,
        [userId, provider, providerSubject, email ?? null],
      );
    } catch (e) {
      if (isUniqueViolation(e)) {
        const again = await this.db.query<{ user_id: string }>(
          `SELECT user_id::text FROM public.auth_oauth_identities
            WHERE provider = $1 AND provider_subject = $2`,
          [provider, providerSubject],
        );
        if (again.rows[0]) {
          return { userId: again.rows[0].user_id, isNew: false };
        }
      }
      throw e;
    }
    return { userId, isNew: true };
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
      return await this.insertUserWithEmail(email);
    } catch (e) {
      if (isUniqueViolation(e) && uniqueViolationTarget(e) !== "referral_code") {
        const again = await this.db.query<{ id: string }>(
          `SELECT id::text FROM public.users WHERE email = $1`,
          [email],
        );
        if (again.rows[0]) return { userId: again.rows[0].id, isNew: false };
      }
      throw e;
    }
  }

  private async emailExists(email: string): Promise<boolean> {
    const existing = await this.db.query<{ id: string }>(
      `SELECT id::text FROM public.users WHERE email = $1`,
      [email],
    );
    return Boolean(existing.rows[0]);
  }

  private async lookupPasskey(credentialId: string): Promise<{
    credentialId: string;
    publicKeySpki: Buffer;
    signCount: number;
  } | null> {
    const existing = await this.db.query<{
      credential_id: string;
      public_key: Buffer;
      sign_count: string | number;
    }>(
      `SELECT credential_id, public_key, sign_count
         FROM public.auth_passkeys
        WHERE credential_id = $1 AND revoked_at IS NULL`,
      [credentialId],
    );
    const row = existing.rows[0];
    if (!row || !row.public_key || row.public_key.length === 0) return null;
    return {
      credentialId: row.credential_id,
      publicKeySpki: Buffer.from(row.public_key),
      signCount: Number(row.sign_count) || 0,
    };
  }

  private async registerPasskey(
    credentialId: string,
    publicKeySpki: Buffer,
    signCount: number,
  ): Promise<{ userId: string; isNew: boolean }> {
    // Registration proves possession of the *submitted* public key. It does
    // NOT prove ownership of an already-registered credentialId. An existing
    // credential must only enter through passkeyAuthVerify(), where the
    // signature is verified against the stored public key.
    const existing = await this.lookupPasskey(credentialId);
    assertPasskeyCredentialUnclaimed(existing);

    const userId = await this.insertBareUser();
    try {
      await this.db.query(
        `INSERT INTO public.auth_passkeys (user_id, credential_id, public_key, sign_count)
         VALUES ($1::uuid, $2, $3, $4)`,
        [userId, credentialId, publicKeySpki, signCount],
      );
    } catch (e) {
      if (isUniqueViolation(e)) {
        // A concurrent registration may have claimed the credential after the
        // pre-check. Never resolve that race by returning the winner's userId.
        rejectPasskeyCredentialInsertRace();
      }
      throw e;
    }
    return { userId, isNew: true };
  }

  private async sessionMintView(userId: string) {
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
    };
  }

  private async insertUserWithEmail(
    email: string,
  ): Promise<{ userId: string; isNew: boolean }> {
    for (let attempt = 0; attempt < 8; attempt++) {
      try {
        const created = await this.db.query<{ id: string }>(
          `INSERT INTO public.users (email, referral_code) VALUES ($1, $2)
           RETURNING id::text`,
          [email, mintReferralCode()],
        );
        const userId = created.rows[0]?.id;
        if (!userId) throw new ServiceUnavailableException("user insert failed");
        return { userId, isNew: true };
      } catch (e) {
        if (uniqueViolationTarget(e) === "referral_code") continue;
        throw e;
      }
    }
    throw new ServiceUnavailableException("referral code mint failed");
  }

  private async insertBareUser(): Promise<string> {
    for (let attempt = 0; attempt < 8; attempt++) {
      try {
        const created = await this.db.query<{ id: string }>(
          `INSERT INTO public.users (referral_code) VALUES ($1) RETURNING id::text`,
          [mintReferralCode()],
        );
        const userId = created.rows[0]?.id;
        if (!userId) throw new ServiceUnavailableException("user insert failed");
        return userId;
      } catch (e) {
        if (uniqueViolationTarget(e) === "referral_code") continue;
        throw e;
      }
    }
    throw new ServiceUnavailableException("referral code mint failed");
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

  // ── session mint/revoke (S1F Section 7 - delegates to
  // SessionRotationService for the real opaque-refresh-token rotation
  // family model; kept here as a thin adapter so every existing caller
  // (oauth/passkey/magic-link) picks up rotation-capable sessions for
  // free, with zero change to their own call sites) ──

  private async mintSession(userId: string): Promise<{
    accessToken: string;
    refreshToken: string;
    session: AuthSessionView;
  }> {
    const minted = await this.sessions.mintNewFamily(userId);
    const onboardingStage = await this.loadOnboardingStage(userId);
    return {
      accessToken: minted.accessToken,
      refreshToken: minted.refreshToken,
      session: {
        sessionId: minted.sessionRowId,
        userId,
        issuer: USER_JWT_ISSUER,
        issuedAt: minted.issuedAt,
        expiresAt: minted.accessExpiresAt,
        revoked: false,
        onboardingStage,
      },
    };
  }

  private async revokeSession(sessionUser: SessionUser): Promise<void> {
    if (!sessionUser.familyId) return;
    await this.sessions.revokeFamily(sessionUser.familyId);
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
