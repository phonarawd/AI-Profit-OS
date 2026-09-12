/**
 * 클래식 가입 — pending_registrations → 이메일 인증 → users 1회 생성.
 * 세션은 기존 AuthService.mintUserSession (Stage A 로그인으로 바꾸지 않음).
 */

import {
  BadRequestException,
  ConflictException,
  Injectable,
  ServiceUnavailableException,
} from "@nestjs/common";
import { PostgresService } from "../db/postgres";
import { ResendEmailProvider } from "../wallet/resend-email.provider";
import { mintReferralCode, uniqueViolationTarget } from "../referral/referral-code.util";
import { consumerOrigin, hashProofSecret, randomProofSecret } from "./identity-proof.crypto";
import { hashPassword } from "./password-hash";
import { PwnedPasswordService } from "./pwned-password.service";
import {
  emailCanonical,
  usernameCanonical,
  validateClassicSignupFields,
  type ClassicSignupInput,
} from "./classic-signup.policy";
import { AuthService } from "./auth.service";
import { readConsentVersions } from "./consent-versions";

const EMAIL_VERIFY_TTL_MS = 30 * 60 * 1000;

export type ClassicSignupRequestResult = {
  ok: true;
  status: "verification_email_sent";
};

function isUniqueViolation(e: unknown): boolean {
  return (
    typeof e === "object" &&
    e !== null &&
    "code" in e &&
    String((e as { code?: unknown }).code) === "23505"
  );
}

function isUndefinedColumn(e: unknown): boolean {
  return (
    typeof e === "object" &&
    e !== null &&
    "code" in e &&
    String((e as { code?: unknown }).code) === "42703"
  );
}

@Injectable()
export class ClassicSignupService {
  constructor(
    private readonly db: PostgresService,
    private readonly resend: ResendEmailProvider,
    private readonly pwned: PwnedPasswordService,
    private readonly authService: AuthService,
  ) {}

  private assertDb(): void {
    if (!this.db.configured()) {
      throw new ServiceUnavailableException("DATABASE_URL unset");
    }
  }

  async request(input: ClassicSignupInput): Promise<ClassicSignupRequestResult> {
    const fieldError = validateClassicSignupFields(input);
    if (fieldError) throw new BadRequestException(fieldError);
    this.assertDb();

    const consent = readConsentVersions(input);
    if (consent === "CONSENT_VERSION_STALE") {
      throw new BadRequestException("CONSENT_VERSION_STALE");
    }

    const pwnedResult = await this.pwned.check(input.password);
    if (pwnedResult.pwned) {
      throw new BadRequestException("PASSWORD_PWNED");
    }

    const passwordHash = await hashPassword(input.password);
    const usernameC = usernameCanonical(input.username);
    const emailC = emailCanonical(input.email);

    const existing = await this.db.query<{ hit: string }>(
      `SELECT 'username' AS hit FROM public.users WHERE username_canonical = $1
       UNION ALL
       SELECT 'email' AS hit FROM public.users WHERE email_canonical = $2
       LIMIT 1`,
      [usernameC, emailC],
    );
    if (existing.rows[0]?.hit === "username") throw new ConflictException("USERNAME_TAKEN");
    if (existing.rows[0]?.hit === "email") {
      await this.resend
        .sendAccountExistsNotice({ to: input.email.trim() })
        .catch(() => undefined);
      return { ok: true, status: "verification_email_sent" };
    }
    const token = randomProofSecret();
    const tokenHash = hashProofSecret(token);
    const expiresAtMs = Date.now() + EMAIL_VERIFY_TTL_MS;

    await this.db.query(
      `UPDATE public.pending_registrations SET consumed_at = now()
        WHERE consumed_at IS NULL
          AND (email_canonical = $1 OR username_canonical = $2)`,
      [emailC, usernameC],
    );

    await this.db.query(
      `INSERT INTO public.pending_registrations (
         email, email_canonical, username, username_canonical, password_hash,
         declared_name, birth_date, phone_e164,
         terms_accepted_at, privacy_accepted_at, marketing_consent, referral_code,
         token_hash, expires_at
       ) VALUES (
         $1, $2, $3, $4, $5,
         $6, $7::date, $8,
         $9::timestamptz, $10::timestamptz, $11, $12,
         $13, to_timestamp($14 / 1000.0)
       )`,
      [
        input.email.trim(),
        emailC,
        input.username.trim(),
        usernameC,
        passwordHash,
        input.declaredName.trim(),
        input.birthDate,
        input.phoneE164 ?? null,
        input.termsAcceptedAt,
        input.privacyAcceptedAt,
        input.marketingConsent === true,
        input.referralCode ?? null,
        tokenHash,
        expiresAtMs,
      ],
    );
    await this.persistConsentVersions(tokenHash, consent);

    const url = `${consumerOrigin()}/auth/verify-email?token=${token}`;
    const sent = await this.resend.sendSignupVerification({ to: input.email.trim(), url });
    if (!sent.ok) {
      throw new ServiceUnavailableException("EMAIL_SEND_UNAVAILABLE");
    }
    return { ok: true, status: "verification_email_sent" };
  }

  async activate(tokenRaw: string) {
    const token = typeof tokenRaw === "string" ? tokenRaw.trim() : "";
    if (!token || token.length < 16 || token.length > 256) {
      throw new BadRequestException("SIGNUP_LINK_INVALID");
    }
    this.assertDb();
    const tokenHash = hashProofSecret(token);

    const consumed = await this.db.query<{
      email: string;
      email_canonical: string;
      username: string;
      username_canonical: string;
      password_hash: string;
      declared_name: string;
      birth_date: Date;
      phone_e164: string | null;
      terms_accepted_at: Date;
      privacy_accepted_at: Date;
      marketing_consent: boolean;
      referral_code: string | null;
    }>(
      `UPDATE public.pending_registrations
          SET consumed_at = now()
        WHERE token_hash = $1 AND consumed_at IS NULL AND expires_at > now()
        RETURNING email, email_canonical, username, username_canonical, password_hash,
                  declared_name, birth_date, phone_e164,
                  terms_accepted_at, privacy_accepted_at, marketing_consent, referral_code`,
      [tokenHash],
    );
    const row = consumed.rows[0];
    if (!row) throw new BadRequestException("SIGNUP_LINK_INVALID");

    let userId = "";
    for (let attempt = 0; attempt < 8; attempt += 1) {
      try {
        const inserted = await this.db.query<{ id: string }>(
          `INSERT INTO public.users (
             email, email_canonical, username, username_canonical, password_hash,
             email_verified_at, referral_code, status
           ) VALUES ($1, $2, $3, $4, $5, now(), $6, 'active')
           RETURNING id::text`,
          [
            row.email,
            row.email_canonical,
            row.username,
            row.username_canonical,
            row.password_hash,
            mintReferralCode(),
          ],
        );
        userId = inserted.rows[0]?.id ?? "";
        if (!userId) throw new ServiceUnavailableException("user insert failed");
        break;
      } catch (e) {
        if (uniqueViolationTarget(e) === "referral_code") continue;
        if (isUniqueViolation(e)) {
          throw new ConflictException("USERNAME_OR_EMAIL_ALREADY_TAKEN");
        }
        throw e;
      }
    }
    if (!userId) throw new ServiceUnavailableException("referral code mint failed");

    await this.db.query(
      `INSERT INTO public.user_profiles (
         user_id, declared_name, birth_date,
         terms_accepted_at, privacy_accepted_at, marketing_consent, onboarding_stage
       ) VALUES ($1::uuid, $2, $3::date, $4, $5, $6, 'A')`,
      [
        userId,
        row.declared_name,
        row.birth_date,
        row.terms_accepted_at,
        row.privacy_accepted_at,
        row.marketing_consent,
      ],
    );

    if (row.phone_e164) {
      await this.db.query(
        `UPDATE public.users SET phone_e164 = $2, updated_at = now()
          WHERE id = $1::uuid AND phone_e164 IS NULL`,
        [userId, row.phone_e164],
      );
    }

    await this.copyConsentVersionsFromPending(tokenHash, userId);
    await this.authService.provisionLedgerBucketsForUser(userId);
    return this.authService.mintUserSession(userId);
  }

  async resendVerification(emailRaw: string): Promise<{ ok: true }> {
    this.assertDb();
    const email = typeof emailRaw === "string" ? emailRaw.trim() : "";
    const emailC = emailCanonical(email);
    const existing = await this.db.query<{ email: string }>(
      `SELECT email FROM public.pending_registrations
        WHERE email_canonical = $1 AND consumed_at IS NULL AND expires_at > now()
        ORDER BY created_at DESC
        LIMIT 1`,
      [emailC],
    );
    const row = existing.rows[0];
    if (row) {
      const token = randomProofSecret();
      const tokenHash = hashProofSecret(token);
      await this.db.query(
        `UPDATE public.pending_registrations
            SET consumed_at = now()
          WHERE consumed_at IS NULL AND email_canonical = $1`,
        [emailC],
      );
      await this.db.query(
        `INSERT INTO public.pending_registrations (
           email, email_canonical, username, username_canonical, password_hash,
           declared_name, birth_date, phone_e164,
           terms_accepted_at, privacy_accepted_at, marketing_consent, referral_code,
           token_hash, expires_at
         )
         SELECT email, email_canonical, username, username_canonical, password_hash,
                declared_name, birth_date, phone_e164,
                terms_accepted_at, privacy_accepted_at, marketing_consent, referral_code,
                $2, to_timestamp($3 / 1000.0)
           FROM public.pending_registrations
          WHERE email_canonical = $1
          ORDER BY created_at DESC
          LIMIT 1`,
        [emailC, tokenHash, Date.now() + EMAIL_VERIFY_TTL_MS],
      );
      const url = `${consumerOrigin()}/auth/verify-email?token=${token}`;
      await this.resend.sendSignupVerification({ to: row.email, url }).catch(() => undefined);
    }
    return { ok: true };
  }

  private async persistConsentVersions(
    tokenHash: string,
    consent: { termsVersion: string; privacyVersion: string },
  ): Promise<void> {
    try {
      await this.db.query(
        `UPDATE public.pending_registrations
            SET terms_version = $2, privacy_version = $3
          WHERE token_hash = $1`,
        [tokenHash, consent.termsVersion, consent.privacyVersion],
      );
    } catch (e) {
      if (!isUndefinedColumn(e)) throw e;
    }
  }

  private async copyConsentVersionsFromPending(
    tokenHash: string,
    userId: string,
  ): Promise<void> {
    try {
      await this.db.query(
        `UPDATE public.user_profiles AS p
            SET terms_version = r.terms_version,
                privacy_version = r.privacy_version
           FROM public.pending_registrations AS r
          WHERE p.user_id = $1::uuid AND r.token_hash = $2`,
        [userId, tokenHash],
      );
    } catch (e) {
      if (!isUndefinedColumn(e)) throw e;
    }
  }
}
