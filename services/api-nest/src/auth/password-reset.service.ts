/**
 * 비밀번호 재설정 — purpose=password_reset 매직링크 테이블 재사용.
 * 계정 존재 여부를 응답으로 드러내지 않음. 완료 시 전 세션 폐기.
 */

import {
  BadRequestException,
  Injectable,
  ServiceUnavailableException,
} from "@nestjs/common";
import { PostgresService } from "../db/postgres";
import { ResendEmailProvider } from "../wallet/resend-email.provider";
import { consumerOrigin, hashProofSecret, randomProofSecret } from "./identity-proof.crypto";
import { hashPassword } from "./password-hash";
import { emailCanonical, isValidPasswordLength } from "./classic-signup.policy";
import { PwnedPasswordService } from "./pwned-password.service";
import { AuthService } from "./auth.service";

const RESET_TTL_MS = 30 * 60 * 1000;

@Injectable()
export class PasswordResetService {
  constructor(
    private readonly db: PostgresService,
    private readonly resend: ResendEmailProvider,
    private readonly pwned: PwnedPasswordService,
    private readonly auth: AuthService,
  ) {}

  private assertDb(): void {
    if (!this.db.configured()) {
      throw new ServiceUnavailableException("DATABASE_URL unset");
    }
  }

  async request(emailRaw: string): Promise<{ ok: true }> {
    this.assertDb();
    const email = typeof emailRaw === "string" ? emailRaw.trim() : "";
    const emailC = emailCanonical(email);
    const user = await this.db.query<{ id: string }>(
      `SELECT id::text FROM public.users
        WHERE email_canonical = $1 AND email_verified_at IS NOT NULL AND password_hash IS NOT NULL`,
      [emailC],
    );
    const found = user.rows[0];
    if (found) {
      const token = randomProofSecret();
      const tokenHash = hashProofSecret(token);
      await this.db.query(
        `UPDATE public.auth_magic_link_challenges
            SET consumed_at = now()
          WHERE consumed_at IS NULL AND purpose = 'password_reset' AND email = $1`,
        [email],
      );
      await this.db.query(
        `INSERT INTO public.auth_magic_link_challenges (email, token_hash, purpose, expires_at)
         VALUES ($1, $2, 'password_reset', to_timestamp($3 / 1000.0))`,
        [email, tokenHash, Date.now() + RESET_TTL_MS],
      );
      const url = `${consumerOrigin()}/auth/reset-password?token=${token}`;
      await this.resend.sendPasswordReset({ to: email, url }).catch(() => undefined);
    }
    return { ok: true };
  }

  async complete(tokenRaw: string, newPassword: string): Promise<{ ok: true }> {
    this.assertDb();
    const token = typeof tokenRaw === "string" ? tokenRaw.trim() : "";
    if (!token || token.length < 16 || token.length > 256) {
      throw new BadRequestException("RESET_LINK_INVALID");
    }
    if (!isValidPasswordLength(newPassword)) {
      throw new BadRequestException("PASSWORD_INVALID_LENGTH");
    }
    const pwnedResult = await this.pwned.check(newPassword);
    if (pwnedResult.pwned) {
      throw new BadRequestException("PASSWORD_PWNED");
    }

    const tokenHash = hashProofSecret(token);
    const consumed = await this.db.query<{ email: string }>(
      `UPDATE public.auth_magic_link_challenges
          SET consumed_at = now()
        WHERE token_hash = $1
          AND purpose = 'password_reset'
          AND consumed_at IS NULL
          AND expires_at > now()
        RETURNING email`,
      [tokenHash],
    );
    const row = consumed.rows[0];
    if (!row) throw new BadRequestException("RESET_LINK_INVALID");

    const newHash = await hashPassword(newPassword);
    const updated = await this.db.query<{ id: string }>(
      `UPDATE public.users SET password_hash = $2, updated_at = now()
        WHERE email = $1
        RETURNING id::text`,
      [row.email, newHash],
    );
    const userId = updated.rows[0]?.id;
    if (!userId) throw new ServiceUnavailableException("RESET_USER_NOT_FOUND");

    await this.auth.revokeEverySession(userId);
    return { ok: true };
  }
}
