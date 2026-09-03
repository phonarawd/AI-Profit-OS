/**
 * One-time proof challenge store.
 * raw token/state/challenge 는 저장하지 않고 hash 만 둔다.
 */

import {
  Injectable,
  ServiceUnavailableException,
} from "@nestjs/common";
import { PostgresService } from "../db/postgres";

export type ProofKind = "magic_link" | "oauth_state" | "webauthn";

export type ProofRecord = {
  kind: ProofKind;
  hash: string;
  expiresAtMs: number;
  consumedAtMs: number | null;
  payload: Record<string, unknown>;
};

export interface ProofChallengeStore {
  put(record: ProofRecord): Promise<void>;
  findFresh(kind: ProofKind, hash: string, nowMs: number): Promise<ProofRecord | null>;
  consumeAtomic(
    kind: ProofKind,
    hash: string,
    nowMs: number,
  ): Promise<ProofRecord | null>;
}

export class MemoryProofStore implements ProofChallengeStore {
  private readonly rows = new Map<string, ProofRecord>();

  private key(kind: ProofKind, hash: string): string {
    return `${kind}:${hash}`;
  }

  async put(record: ProofRecord): Promise<void> {
    this.rows.set(this.key(record.kind, record.hash), { ...record, payload: { ...record.payload } });
  }

  async findFresh(
    kind: ProofKind,
    hash: string,
    nowMs: number,
  ): Promise<ProofRecord | null> {
    const row = this.rows.get(this.key(kind, hash));
    if (!row || row.consumedAtMs != null || row.expiresAtMs <= nowMs) return null;
    return { ...row, payload: { ...row.payload } };
  }

  async consumeAtomic(
    kind: ProofKind,
    hash: string,
    nowMs: number,
  ): Promise<ProofRecord | null> {
    const row = this.rows.get(this.key(kind, hash));
    if (!row || row.consumedAtMs != null || row.expiresAtMs <= nowMs) return null;
    row.consumedAtMs = nowMs;
    return { ...row, payload: { ...row.payload } };
  }
}

function namespaceEmail(kind: ProofKind, payload: Record<string, unknown>): string {
  if (kind === "magic_link") return String(payload.email ?? "");
  if (kind === "oauth_state") return `oauth:${String(payload.provider ?? "")}`;
  return `webauthn:${String(payload.webauthnKind ?? "challenge")}`;
}

function parseNamespaced(
  email: string,
  hash: string,
  expiresAtMs: number,
  consumedAtMs: number | null,
): ProofRecord {
  if (email.startsWith("oauth:")) {
    return {
      kind: "oauth_state",
      hash,
      expiresAtMs,
      consumedAtMs,
      payload: { provider: email.slice("oauth:".length) },
    };
  }
  if (email.startsWith("webauthn:")) {
    return {
      kind: "webauthn",
      hash,
      expiresAtMs,
      consumedAtMs,
      payload: { webauthnKind: email.slice("webauthn:".length) },
    };
  }
  return {
    kind: "magic_link",
    hash,
    expiresAtMs,
    consumedAtMs,
    payload: { email },
  };
}

/**
 * 기존 auth_magic_link_challenges 재사용 (Production DDL 0).
 * oauth/webauthn 은 email 네임스페이스로 구분한다.
 */
@Injectable()
export class PostgresProofStore implements ProofChallengeStore {
  constructor(private readonly db: PostgresService) {}

  private assertDb(): void {
    if (!this.db.configured()) {
      throw new ServiceUnavailableException("DATABASE_URL unset — cannot persist proof");
    }
  }

  async put(record: ProofRecord): Promise<void> {
    this.assertDb();
    const email = namespaceEmail(record.kind, record.payload);
    if (!email) throw new ServiceUnavailableException("proof payload missing identity key");
    await this.db.query(
      `INSERT INTO public.auth_magic_link_challenges
         (email, token_hash, purpose, expires_at)
       VALUES ($1, $2, 'login', to_timestamp($3 / 1000.0))`,
      [email, record.hash, record.expiresAtMs],
    );
  }

  async findFresh(
    kind: ProofKind,
    hash: string,
    nowMs: number,
  ): Promise<ProofRecord | null> {
    this.assertDb();
    const r = await this.db.query<{
      email: string;
      expires_at: Date;
      consumed_at: Date | null;
    }>(
      `SELECT email, expires_at, consumed_at
         FROM public.auth_magic_link_challenges
        WHERE token_hash = $1
          AND consumed_at IS NULL
          AND expires_at > to_timestamp($2 / 1000.0)`,
      [hash, nowMs],
    );
    const row = r.rows[0];
    if (!row) return null;
    const parsed = parseNamespaced(
      row.email,
      hash,
      new Date(row.expires_at).getTime(),
      row.consumed_at ? new Date(row.consumed_at).getTime() : null,
    );
    return parsed.kind === kind ? parsed : null;
  }

  async consumeAtomic(
    kind: ProofKind,
    hash: string,
    nowMs: number,
  ): Promise<ProofRecord | null> {
    this.assertDb();
    const r = await this.db.query<{
      email: string;
      expires_at: Date;
      consumed_at: Date | null;
    }>(
      `UPDATE public.auth_magic_link_challenges
          SET consumed_at = now()
        WHERE token_hash = $1
          AND consumed_at IS NULL
          AND expires_at > to_timestamp($2 / 1000.0)
        RETURNING email, expires_at, consumed_at`,
      [hash, nowMs],
    );
    const row = r.rows[0];
    if (!row) return null;
    const parsed = parseNamespaced(
      row.email,
      hash,
      new Date(row.expires_at).getTime(),
      row.consumed_at ? new Date(row.consumed_at).getTime() : nowMs,
    );
    return parsed.kind === kind ? parsed : null;
  }
}
