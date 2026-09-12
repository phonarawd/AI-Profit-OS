/**
 * 아이디 찾기 — 인증된 이메일로 마스킹된 username만 발송. 응답은 항상 {ok:true}.
 */

import { Injectable, ServiceUnavailableException } from "@nestjs/common";
import { PostgresService } from "../db/postgres";
import { ResendEmailProvider } from "../wallet/resend-email.provider";
import { emailCanonical } from "./classic-signup.policy";

function maskUsername(username: string): string {
  if (username.length <= 2) {
    return username.slice(0, 1) + "*".repeat(Math.max(1, username.length - 1));
  }
  return username.slice(0, 2) + "*".repeat(username.length - 2);
}

@Injectable()
export class FindIdService {
  constructor(
    private readonly db: PostgresService,
    private readonly resend: ResendEmailProvider,
  ) {}

  async request(emailRaw: string): Promise<{ ok: true }> {
    if (!this.db.configured()) {
      throw new ServiceUnavailableException("DATABASE_URL unset");
    }
    const email = typeof emailRaw === "string" ? emailRaw.trim() : "";
    const emailC = emailCanonical(email);
    const rows = await this.db.query<{ username: string | null }>(
      `SELECT username FROM public.users
        WHERE email_canonical = $1 AND email_verified_at IS NOT NULL AND username IS NOT NULL`,
      [emailC],
    );
    const usernames = rows.rows
      .map((r) => r.username)
      .filter((u): u is string => typeof u === "string" && u.length > 0);
    if (usernames.length > 0 && email) {
      const masked = usernames.map(maskUsername);
      await this.resend
        .sendFindIdResult({ to: email, maskedUsernames: masked })
        .catch(() => undefined);
    }
    return { ok: true };
  }
}

export { maskUsername };
