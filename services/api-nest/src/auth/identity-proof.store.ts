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

type ConsentColumns = {
  termsAcceptedAt: string | null;
  privacyAcceptedAt: string | null;
  marketingConsent: boolean | null;
  referralCode: string | null;
};

function parseNamespaced(
  email: string,
  hash: string,
  expiresAtMs: number,
  consumedAtMs: number | null,
  consent: ConsentColumns,
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
  // magic_link: carry the server-owned consent captured at request time
  // (S1F Section 6.2 fix) so the caller never needs the client to resend
  // it - fixes the cross-device/cross-tab bug where sessionStorage-only
  // consent was unavailable when the link was opened elsewhere.
  const payload: Record<string, unknown> = { email };
  if (consent.termsAcceptedAt) payload.termsAcceptedAt = consent.termsAcceptedAt;
  if (consent.privacyAcceptedAt) payload.privacyAcceptedAt = consent.privacyAcceptedAt;
  if (consent.marketingConsent === true) payload.marketingConsent = true;
  if (consent.referralCode) payload.referralCode = consent.referralCode;
  return {
    kind: "magic_link",
    hash,
    expiresAtMs,
    consumedAtMs,
    payload,
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
    // Consent is captured server-side at REQUEST time (S1F Section 6.2 fix -
    // previously only lived in the client's sessionStorage, which is empty
    // when the link is opened on a different device/tab; see
    // magic-link.service.ts for how these are read back at verify time).
    const p = record.payload as Record<string, unknown>;
    const termsAcceptedAt = typeof p.termsAcceptedAt === "string" ? p.termsAcceptedAt : null;
    const privacyAcceptedAt = typeof p.privacyAcceptedAt === "string" ? p.privacyAcceptedAt : null;
    const marketingConsent = p.marketingConsent === true;
    const referralCode = typeof p.referralCode === "string" ? p.referralCode : null;
    const purpose = record.kind === "magic_link" && termsAcceptedAt ? "signup" : "login";
    await this.db.query(
      `INSERT INTO public.auth_magic_link_challenges
         (email, token_hash, purpose, expires_at,
          terms_accepted_at, privacy_accepted_at, marketing_consent, referral_code)
       VALUES ($1, $2, $3, to_timestamp($4 / 1000.0),
               $5::timestamptz, $6::timestamptz, $7, $8)`,
      [
        email,
        record.hash,
        purpose,
        record.expiresAtMs,
        termsAcceptedAt,
        privacyAcceptedAt,
        marketingConsent,
        referralCode,
      ],
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
      terms_accepted_at: Date | null;
      privacy_accepted_at: Date | null;
      marketing_consent: boolean | null;
      referral_code: string | null;
    }>(
      `SELECT email, expires_at, consumed_at,
              terms_accepted_at, privacy_accepted_at, marketing_consent, referral_code
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
      {
        termsAcceptedAt: row.terms_accepted_at
          ? new Date(row.terms_accepted_at).toISOString()
          : null,
        privacyAcceptedAt: row.privacy_accepted_at
          ? new Date(row.privacy_accepted_at).toISOString()
          : null,
        marketingConsent: row.marketing_consent,
        referralCode: row.referral_code,
      },
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
      terms_accepted_at: Date | null;
      privacy_accepted_at: Date | null;
      marketing_consent: boolean | null;
      referral_code: string | null;
    }>(
      `UPDATE public.auth_magic_link_challenges
          SET consumed_at = now()
        WHERE token_hash = $1
          AND consumed_at IS NULL
          AND expires_at > to_timestamp($2 / 1000.0)
        RETURNING email, expires_at, consumed_at,
                  terms_accepted_at, privacy_accepted_at, marketing_consent, referral_code`,
      [hash, nowMs],
    );
    const row = r.rows[0];
    if (!row) return null;
    const parsed = parseNamespaced(
      row.email,
      hash,
      new Date(row.expires_at).getTime(),
      row.consumed_at ? new Date(row.consumed_at).getTime() : nowMs,
      {
        termsAcceptedAt: row.terms_accepted_at
          ? new Date(row.terms_accepted_at).toISOString()
          : null,
        privacyAcceptedAt: row.privacy_accepted_at
          ? new Date(row.privacy_accepted_at).toISOString()
          : null,
        marketingConsent: row.marketing_consent,
        referralCode: row.referral_code,
      },
    );
    return parsed.kind === kind ? parsed : null;
  }
}
