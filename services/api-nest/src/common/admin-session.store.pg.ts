/**
 * Admin identity / session — PostgreSQL 권위 구현.
 */

import { Injectable, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { PostgresService } from "../db/postgres";
import { ADMIN_IDLE_TTL_MS } from "./admin-identity.policy";
import {
  evaluateSessionRecord,
  registerAdminIdentityStore,
  registerAdminSessionLookup,
  clearAdminIdentityStore,
  clearAdminSessionLookup,
  type AdminApprovalRow,
  type AdminCredentialRow,
  type AdminIdentityStore,
  type AdminSessionRecord,
  type AdminSessionResolution,
} from "./admin-session.store";

type SessionRow = {
  id: string;
  admin_id: string;
  family_id: string;
  access_jti: string;
  refresh_hash: string;
  kind: AdminSessionRecord["kind"];
  authenticator_assurance: AdminSessionRecord["aal"];
  issued_at: Date | string;
  expires_at: Date | string;
  last_seen_at: Date | string;
  idle_deadline: Date | string;
  step_up_at: Date | string | null;
  revoked_at: Date | string | null;
  rotated_at: Date | string | null;
};

function iso(value: Date | string | null | undefined): string | null {
  if (value == null) return null;
  if (typeof value === "string") return new Date(value).toISOString();
  return value.toISOString();
}

function mapSession(row: SessionRow): AdminSessionRecord {
  return {
    id: row.id,
    adminId: row.admin_id,
    familyId: row.family_id,
    accessJti: row.access_jti,
    refreshHash: row.refresh_hash,
    kind: row.kind,
    aal: row.authenticator_assurance,
    issuedAt: iso(row.issued_at)!,
    expiresAt: iso(row.expires_at)!,
    lastSeenAt: iso(row.last_seen_at)!,
    idleDeadline: iso(row.idle_deadline)!,
    stepUpAt: iso(row.step_up_at),
    revokedAt: iso(row.revoked_at),
    rotatedAt: iso(row.rotated_at),
  };
}

@Injectable()
export class AdminSessionStoreService
  implements AdminIdentityStore, OnModuleInit, OnModuleDestroy
{
  constructor(private readonly db: PostgresService) {}

  onModuleInit(): void {
    registerAdminIdentityStore(this);
    registerAdminSessionLookup(async ({ tokenId }) => this.resolveByJti(tokenId));
  }

  onModuleDestroy(): void {
    clearAdminIdentityStore();
    clearAdminSessionLookup();
  }

  private ready(): boolean {
    return this.db.configured();
  }

  async findCredentialByIdentifier(
    identifier: string,
  ): Promise<AdminCredentialRow | null> {
    if (!this.ready()) return null;
    const r = await this.db.query<{
      admin_id: string;
      username_canonical: string;
      password_hash: string;
      failed_attempts: number;
      locked_until: Date | string | null;
      email: string;
      role: string;
      active: boolean;
    }>(
      `SELECT c.admin_id, c.username_canonical, c.password_hash,
              c.failed_attempts, c.locked_until,
              r.email, r.role, r.active
         FROM public.admin_credentials c
         JOIN public.admin_rbac r ON r.admin_id = c.admin_id
        WHERE c.username_canonical = $1
           OR lower(r.email) = $1
        LIMIT 1`,
      [identifier],
    );
    const row = r.rows[0];
    if (!row) return null;
    return {
      adminId: row.admin_id,
      usernameCanonical: row.username_canonical,
      passwordHash: row.password_hash,
      failedAttempts: Number(row.failed_attempts ?? 0),
      lockedUntil: iso(row.locked_until),
      email: row.email,
      role: row.role,
      active: row.active === true,
    };
  }

  async findCredentialByAdminId(adminId: string): Promise<AdminCredentialRow | null> {
    if (!this.ready()) return null;
    const r = await this.db.query<{
      admin_id: string;
      username_canonical: string;
      password_hash: string;
      failed_attempts: number;
      locked_until: Date | string | null;
      email: string;
      role: string;
      active: boolean;
    }>(
      `SELECT c.admin_id, c.username_canonical, c.password_hash,
              c.failed_attempts, c.locked_until,
              r.email, r.role, r.active
         FROM public.admin_credentials c
         JOIN public.admin_rbac r ON r.admin_id = c.admin_id
        WHERE c.admin_id = $1::uuid`,
      [adminId],
    );
    const row = r.rows[0];
    if (!row) return null;
    return {
      adminId: row.admin_id,
      usernameCanonical: row.username_canonical,
      passwordHash: row.password_hash,
      failedAttempts: Number(row.failed_attempts ?? 0),
      lockedUntil: iso(row.locked_until),
      email: row.email,
      role: row.role,
      active: row.active === true,
    };
  }

  async putCredentialRow(row: AdminCredentialRow): Promise<void> {
    await this.upsertCredential({
      adminId: row.adminId,
      usernameCanonical: row.usernameCanonical,
      passwordHash: row.passwordHash,
    });
    await this.updateCredentialLock({
      adminId: row.adminId,
      failedAttempts: row.failedAttempts,
      lockedUntil: row.lockedUntil,
    });
  }

  async upsertCredential(row: {
    adminId: string;
    usernameCanonical: string;
    passwordHash: string;
  }): Promise<void> {
    await this.db.query(
      `INSERT INTO public.admin_credentials (
         admin_id, username_canonical, password_hash
       ) VALUES ($1::uuid, $2, $3)
       ON CONFLICT (admin_id) DO UPDATE
         SET username_canonical = excluded.username_canonical,
             password_hash = excluded.password_hash,
             password_changed_at = now(),
             updated_at = now()`,
      [row.adminId, row.usernameCanonical, row.passwordHash],
    );
  }

  async updateCredentialLock(input: {
    adminId: string;
    failedAttempts: number;
    lockedUntil: string | null;
  }): Promise<void> {
    await this.db.query(
      `UPDATE public.admin_credentials
          SET failed_attempts = $2,
              locked_until = $3::timestamptz,
              updated_at = now()
        WHERE admin_id = $1::uuid`,
      [input.adminId, input.failedAttempts, input.lockedUntil],
    );
  }

  async putTotp(adminId: string, secretCiphertext: string): Promise<void> {
    await this.db.query(
      `INSERT INTO public.admin_totp (admin_id, secret_ciphertext)
       VALUES ($1::uuid, $2)
       ON CONFLICT (admin_id) DO UPDATE
         SET secret_ciphertext = excluded.secret_ciphertext,
             enrolled_at = now()`,
      [adminId, secretCiphertext],
    );
  }

  async getTotp(adminId: string): Promise<string | null> {
    const r = await this.db.query<{ secret_ciphertext: string }>(
      `SELECT secret_ciphertext FROM public.admin_totp WHERE admin_id = $1::uuid`,
      [adminId],
    );
    return r.rows[0]?.secret_ciphertext ?? null;
  }

  async replaceBackupCodes(adminId: string, codeHashes: string[]): Promise<void> {
    await this.db.withTransaction(async (client) => {
      await client.query(
        `DELETE FROM public.admin_backup_codes WHERE admin_id = $1::uuid`,
        [adminId],
      );
      for (const hash of codeHashes) {
        await client.query(
          `INSERT INTO public.admin_backup_codes (admin_id, code_hash)
           VALUES ($1::uuid, $2)`,
          [adminId, hash],
        );
      }
    });
  }

  async consumeBackupCode(adminId: string, codeHash: string): Promise<boolean> {
    const r = await this.db.query(
      `UPDATE public.admin_backup_codes
          SET consumed_at = now()
        WHERE admin_id = $1::uuid
          AND code_hash = $2
          AND consumed_at IS NULL`,
      [adminId, codeHash],
    );
    return (r.rowCount ?? 0) > 0;
  }

  async putChallenge(input: {
    id: string;
    adminId: string;
    purpose: "login_mfa" | "step_up";
    tokenHash: string;
    expiresAt: string;
  }): Promise<void> {
    await this.db.query(
      `INSERT INTO public.admin_login_challenges (
         id, admin_id, purpose, token_hash, expires_at
       ) VALUES ($1::uuid, $2::uuid, $3, $4, $5::timestamptz)`,
      [input.id, input.adminId, input.purpose, input.tokenHash, input.expiresAt],
    );
  }

  async peekChallenge(
    tokenHash: string,
    purpose: "login_mfa" | "step_up",
  ): Promise<{ adminId: string } | null> {
    const r = await this.db.query<{ admin_id: string }>(
      `SELECT admin_id
         FROM public.admin_login_challenges
        WHERE token_hash = $1
          AND purpose = $2
          AND consumed_at IS NULL
          AND expires_at > now()
        LIMIT 1`,
      [tokenHash, purpose],
    );
    const row = r.rows[0];
    return row ? { adminId: row.admin_id } : null;
  }

  async consumeChallenge(
    tokenHash: string,
    purpose: "login_mfa" | "step_up",
  ): Promise<{ adminId: string } | null> {
    const r = await this.db.query<{ admin_id: string }>(
      `UPDATE public.admin_login_challenges
          SET consumed_at = now()
        WHERE token_hash = $1
          AND purpose = $2
          AND consumed_at IS NULL
          AND expires_at > now()
      RETURNING admin_id`,
      [tokenHash, purpose],
    );
    const row = r.rows[0];
    return row ? { adminId: row.admin_id } : null;
  }

  async insertSession(row: AdminSessionRecord): Promise<void> {
    await this.db.query(
      `INSERT INTO public.admin_sessions (
         id, admin_id, family_id, access_jti, refresh_hash, kind,
         authenticator_assurance, issued_at, expires_at, last_seen_at,
         idle_deadline, step_up_at
       ) VALUES (
         $1::uuid, $2::uuid, $3::uuid, $4, $5, $6, $7,
         $8::timestamptz, $9::timestamptz, $10::timestamptz,
         $11::timestamptz, $12::timestamptz
       )`,
      [
        row.id,
        row.adminId,
        row.familyId,
        row.accessJti,
        row.refreshHash,
        row.kind,
        row.aal,
        row.issuedAt,
        row.expiresAt,
        row.lastSeenAt,
        row.idleDeadline,
        row.stepUpAt,
      ],
    );
  }

  async resolveByJti(
    accessJti: string,
    nowMs?: number,
  ): Promise<AdminSessionResolution> {
    if (!this.ready()) return { kind: "unavailable" };
    try {
      const r = await this.db.query<SessionRow>(
        `SELECT id, admin_id, family_id, access_jti, refresh_hash, kind,
                authenticator_assurance, issued_at, expires_at, last_seen_at,
                idle_deadline, step_up_at, revoked_at, rotated_at
           FROM public.admin_sessions
          WHERE access_jti = $1`,
        [accessJti],
      );
      return evaluateSessionRecord(r.rows[0] ? mapSession(r.rows[0]) : null, nowMs);
    } catch {
      return { kind: "unavailable" };
    }
  }

  async findByRefreshHash(refreshHash: string): Promise<AdminSessionRecord | null> {
    const r = await this.db.query<SessionRow>(
      `SELECT id, admin_id, family_id, access_jti, refresh_hash, kind,
              authenticator_assurance, issued_at, expires_at, last_seen_at,
              idle_deadline, step_up_at, revoked_at, rotated_at
         FROM public.admin_sessions
        WHERE refresh_hash = $1
        ORDER BY issued_at DESC
        LIMIT 1`,
      [refreshHash],
    );
    return r.rows[0] ? mapSession(r.rows[0]) : null;
  }

  async touchSession(id: string, nowMs = Date.now()): Promise<void> {
    await this.db.query(
      `UPDATE public.admin_sessions
          SET last_seen_at = $2::timestamptz,
              idle_deadline = $3::timestamptz
        WHERE id = $1::uuid
          AND revoked_at IS NULL`,
      [
        id,
        new Date(nowMs).toISOString(),
        new Date(nowMs + ADMIN_IDLE_TTL_MS).toISOString(),
      ],
    );
  }

  async markStepUp(id: string, atIso: string): Promise<void> {
    await this.db.query(
      `UPDATE public.admin_sessions SET step_up_at = $2::timestamptz WHERE id = $1::uuid`,
      [id, atIso],
    );
  }

  async revokeByJti(accessJti: string, atIso: string): Promise<void> {
    await this.db.query(
      `UPDATE public.admin_sessions
          SET revoked_at = $2::timestamptz
        WHERE access_jti = $1
          AND revoked_at IS NULL`,
      [accessJti, atIso],
    );
  }

  async revokeFamily(familyId: string, atIso: string): Promise<void> {
    await this.db.query(
      `UPDATE public.admin_sessions
          SET revoked_at = $2::timestamptz
        WHERE family_id = $1::uuid
          AND revoked_at IS NULL`,
      [familyId, atIso],
    );
  }

  async revokeAllForAdmin(adminId: string, atIso: string): Promise<void> {
    await this.db.query(
      `UPDATE public.admin_sessions
          SET revoked_at = $2::timestamptz
        WHERE admin_id = $1::uuid
          AND revoked_at IS NULL`,
      [adminId, atIso],
    );
  }

  async rotateSession(input: {
    previous: AdminSessionRecord;
    next: AdminSessionRecord;
    reuse: boolean;
  }): Promise<void> {
    if (input.reuse) {
      await this.revokeFamily(input.previous.familyId, new Date().toISOString());
      await this.db.query(
        `UPDATE public.admin_sessions
            SET reuse_detected_at = now()
          WHERE id = $1::uuid`,
        [input.previous.id],
      );
      return;
    }
    await this.db.withTransaction(async (client) => {
      await client.query(
        `UPDATE public.admin_sessions
            SET rotated_at = $2::timestamptz,
                replaced_by_id = $3::uuid
          WHERE id = $1::uuid`,
        [input.previous.id, input.next.issuedAt, input.next.id],
      );
      await client.query(
        `INSERT INTO public.admin_sessions (
           id, admin_id, family_id, access_jti, refresh_hash, kind,
           authenticator_assurance, issued_at, expires_at, last_seen_at,
           idle_deadline, step_up_at
         ) VALUES (
           $1::uuid, $2::uuid, $3::uuid, $4, $5, $6, $7,
           $8::timestamptz, $9::timestamptz, $10::timestamptz,
           $11::timestamptz, $12::timestamptz
         )`,
        [
          input.next.id,
          input.next.adminId,
          input.next.familyId,
          input.next.accessJti,
          input.next.refreshHash,
          input.next.kind,
          input.next.aal,
          input.next.issuedAt,
          input.next.expiresAt,
          input.next.lastSeenAt,
          input.next.idleDeadline,
          input.next.stepUpAt,
        ],
      );
    });
  }

  async consumeCodeExchange(tokenHash: string, expiresAt: string): Promise<boolean> {
    try {
      const r = await this.db.query(
        `INSERT INTO public.admin_code_exchanges (token_hash, expires_at)
         VALUES ($1, $2::timestamptz)
         ON CONFLICT (token_hash) DO NOTHING`,
        [tokenHash, expiresAt],
      );
      return (r.rowCount ?? 0) > 0;
    } catch {
      return false;
    }
  }

  async isCodeExchangeConsumed(tokenHash: string): Promise<boolean> {
    const r = await this.db.query(
      `SELECT 1 FROM public.admin_code_exchanges WHERE token_hash = $1`,
      [tokenHash],
    );
    return r.rows.length > 0;
  }

  async insertApproval(row: AdminApprovalRow): Promise<void> {
    await this.db.query(
      `INSERT INTO public.admin_approval_requests (
         id, action_type, payload, maker_admin_id, status, reason
       ) VALUES ($1::uuid, $2, $3::jsonb, $4::uuid, $5, $6)`,
      [
        row.id,
        row.actionType,
        JSON.stringify(row.payload),
        row.makerAdminId,
        row.status,
        row.reason,
      ],
    );
  }

  async getApproval(id: string): Promise<AdminApprovalRow | null> {
    const r = await this.db.query<{
      id: string;
      action_type: string;
      payload: Record<string, unknown>;
      maker_admin_id: string;
      checker_admin_id: string | null;
      status: string;
      reason: string;
    }>(
      `SELECT id, action_type, payload, maker_admin_id, checker_admin_id, status, reason
         FROM public.admin_approval_requests
        WHERE id = $1::uuid`,
      [id],
    );
    const row = r.rows[0];
    if (!row) return null;
    return {
      id: row.id,
      actionType: row.action_type,
      payload: row.payload ?? {},
      makerAdminId: row.maker_admin_id,
      checkerAdminId: row.checker_admin_id,
      status: row.status,
      reason: row.reason,
    };
  }

  async decideApproval(input: {
    id: string;
    checkerAdminId: string;
    status: "approved" | "rejected";
    decidedAt: string;
  }): Promise<AdminApprovalRow | null> {
    const current = await this.getApproval(input.id);
    if (!current) return null;
    const r = await this.db.query<{
      id: string;
      action_type: string;
      payload: Record<string, unknown>;
      maker_admin_id: string;
      checker_admin_id: string | null;
      status: string;
      reason: string;
    }>(
      `UPDATE public.admin_approval_requests
          SET checker_admin_id = $2::uuid,
              status = $3,
              decided_at = $4::timestamptz
        WHERE id = $1::uuid
          AND status = 'pending'
          AND maker_admin_id <> $2::uuid
      RETURNING id, action_type, payload, maker_admin_id, checker_admin_id, status, reason`,
      [input.id, input.checkerAdminId, input.status, input.decidedAt],
    );
    const row = r.rows[0];
    if (!row) return null;
    return {
      id: row.id,
      actionType: row.action_type,
      payload: row.payload ?? {},
      makerAdminId: row.maker_admin_id,
      checkerAdminId: row.checker_admin_id,
      status: row.status,
      reason: row.reason,
    };
  }
}
