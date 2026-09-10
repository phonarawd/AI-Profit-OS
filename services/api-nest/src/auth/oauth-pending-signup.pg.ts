/**
 * pending OAuth 가입 — hash만 저장. 원문 token/이메일을 로그하지 않는다.
 */

import { Injectable, ServiceUnavailableException } from "@nestjs/common";
import { PostgresService } from "../db/postgres";
import type { OauthProvider } from "./auth.constants";
import type {
  OauthPendingRecord,
  OauthPendingSignupStore,
} from "./oauth-pending-signup";

type Row = {
  token_hash: string;
  provider: OauthProvider;
  provider_subject: string;
  email_from_provider: string | null;
  bind_hash: string;
  expires_at: Date;
  consumed_at: Date | null;
  user_id: string | null;
};

function toRecord(row: Row): OauthPendingRecord {
  return {
    tokenHash: row.token_hash,
    provider: row.provider,
    providerSubject: row.provider_subject,
    emailFromProvider: row.email_from_provider ?? undefined,
    bindHash: row.bind_hash,
    expiresAtMs: new Date(row.expires_at).getTime(),
    consumedAtMs: row.consumed_at ? new Date(row.consumed_at).getTime() : null,
    userId: row.user_id,
  };
}

@Injectable()
export class PostgresOauthPendingStore implements OauthPendingSignupStore {
  constructor(private readonly db: PostgresService) {}

  private assertDb(): void {
    if (!this.db.configured()) {
      throw new ServiceUnavailableException(
        "DATABASE_URL unset — cannot persist pending oauth signup",
      );
    }
  }

  async put(record: OauthPendingRecord): Promise<void> {
    this.assertDb();
    await this.db.query(
      `INSERT INTO public.auth_oauth_pending_signups (
         token_hash, provider, provider_subject, email_from_provider,
         bind_hash, expires_at
       ) VALUES ($1, $2, $3, $4, $5, to_timestamp($6 / 1000.0))`,
      [
        record.tokenHash,
        record.provider,
        record.providerSubject,
        record.emailFromProvider ?? null,
        record.bindHash,
        record.expiresAtMs,
      ],
    );
  }

  async find(tokenHash: string, nowMs: number): Promise<OauthPendingRecord | null> {
    this.assertDb();
    const r = await this.db.query<Row>(
      `SELECT token_hash, provider, provider_subject, email_from_provider,
              bind_hash, expires_at, consumed_at, user_id::text AS user_id
         FROM public.auth_oauth_pending_signups
        WHERE token_hash = $1
          AND expires_at > to_timestamp($2 / 1000.0)`,
      [tokenHash, nowMs],
    );
    return r.rows[0] ? toRecord(r.rows[0]) : null;
  }

  async consumeCreate(
    tokenHash: string,
    nowMs: number,
  ): Promise<OauthPendingRecord | null> {
    this.assertDb();
    const r = await this.db.query<Row>(
      `UPDATE public.auth_oauth_pending_signups
          SET consumed_at = now()
        WHERE token_hash = $1
          AND consumed_at IS NULL
          AND expires_at > to_timestamp($2 / 1000.0)
        RETURNING token_hash, provider, provider_subject, email_from_provider,
                  bind_hash, expires_at, consumed_at, user_id::text AS user_id`,
      [tokenHash, nowMs],
    );
    return r.rows[0] ? toRecord(r.rows[0]) : null;
  }

  async markUser(tokenHash: string, userId: string): Promise<void> {
    this.assertDb();
    await this.db.query(
      `UPDATE public.auth_oauth_pending_signups
          SET user_id = $2::uuid
        WHERE token_hash = $1`,
      [tokenHash, userId],
    );
  }
}
