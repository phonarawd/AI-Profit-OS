/**
 * Classic (username/password) signup - Section 5/6 completion flow.
 *
 * Flow (matches the S1F mandate step-by-step):
 *   1. field validation (classic-signup.policy.ts, called by the caller
 *      before this service, or re-checked here defensively)
 *   2/3. Turnstile + rate limit are enforced by guards on the controller
 *      route, not in this service
 *   4. breached-password check (PwnedPasswordService)
 *   5. pending registration + consent stored server-side
 *   6. verification email sent
 *   7. no session/users row exists yet - email ownership is NOT proven
 *   8. activate() consumes the token exactly once and creates the real
 *      users row atomically
 *   9/10. caller mints the first session and the client proceeds to
 *      profile completion
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
import { SessionRotationService, type MintedSession } from "./session-rotation.service";

const EMAIL_VERIFY_TTL_MS = 30 * 60 * 1000;

export type ClassicSignupRequestResult = {
  ok: true;
  status: "verification_email_sent";
};

export type ClassicSignupActivateResult = MintedSession & {
  ok: true;
  userId: string;
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
export class ClassicSignupService {
  constructor(
    private readonly db: PostgresService,
    private readonly resend: ResendEmailProvider,
    private readonly pwned: PwnedPasswordService,
    private readonly authService: AuthService,
    private readonly sessions: SessionRotationService,
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

    const pwnedResult = await this.pwned.check(input.password);
    if (pwnedResult.pwned) {
      throw new BadRequestException("PASSWORD_PWNED");
    }

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
    if (existing.rows[0]?.hit === "email") throw new ConflictException("EMAIL_TAKEN");

    const passwordHash = await hashPassword(input.password);
    const token = randomProofSecret();
    const tokenHash = hashProofSecret(token);
    const expiresAtMs = Date.now() + EMAIL_VERIFY_TTL_MS;

    // S1F Section 6.2 - a fresh signup request supersedes any earlier
    // unconsumed one for the same email/username (avoid two live links
    // disagreeing about which one is real).
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

    const url = `${consumerOrigin()}/auth/verify-email?token=${token}`;
    const sent = await this.resend.sendSignupVerification({ to: input.email.trim(), url });
    if (!sent.ok) {
      throw new ServiceUnavailableException("EMAIL_SEND_UNAVAILABLE");
    }
    return { ok: true, status: "verification_email_sent" };
  }

  async activate(tokenRaw: string): Promise<ClassicSignupActivateResult> {
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
          // Race: someone else claimed this username/email between the
          // request() availability check and this activate() call.
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
      // Optional, unverified, decorative-only at this stage - phone_verified_at
      // stays NULL (Section 5 - never mark as verified without a real check).
      await this.db.query(
        `UPDATE public.users SET phone_e164 = $2, updated_at = now()
          WHERE id = $1::uuid AND phone_e164 IS NULL`,
        [userId, row.phone_e164],
      );
    }

    await this.authService.provisionLedgerBucketsForUser(userId);
    const minted = await this.sessions.mintNewFamily(userId);
    return { ok: true, ...minted };
  }

  /**
   * Resend the signup verification email. Same {ok:true} response whether
   * or not a matching pending registration exists (does not reveal
   * signup-in-progress state to a prober). Re-issuing invalidates the
   * previous token (Section 6.2 - "재전송 시 이전 token 폐기").
   */
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
      // Re-insert with a fresh token + expiry, copying every other field
      // forward from the most recent still-valid attempt.
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
}
