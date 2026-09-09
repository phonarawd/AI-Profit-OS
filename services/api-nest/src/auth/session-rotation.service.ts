/**
 * S1F Section 7 - refresh-token rotation, reuse detection, and family
 * (per-device) revocation.
 *
 * Design: `public.auth_sessions` rows now form a chain per login/device
 * (grouped by `family_id`). Each successful /auth/refresh call:
 *   1. looks up the presented opaque token's hash,
 *   2. if that row was already rotated or already revoked, the token is
 *      being REUSED (stolen or replayed) - the whole family is revoked and
 *      the caller must log in again,
 *   3. otherwise marks the row rotated (`rotated_at`, `replaced_by_id`) and
 *      inserts a fresh row in the same family with a brand-new opaque
 *      token + a brand-new short-lived access JWT.
 *
 * The opaque refresh token itself is never stored - only its SHA-256 hash
 * (reusing the existing `refresh_jti` UNIQUE column, which historically
 * held the access token's own jti; that historical usage is untouched -
 * see the migration file's own comment for why old rows stay inert and
 * harmless under the new lookup).
 */

import { randomBytes, createHash } from "node:crypto";
import { createRequire } from "node:module";
import { join } from "node:path";
import {
  ForbiddenException,
  Injectable,
  ServiceUnavailableException,
} from "@nestjs/common";
import { PostgresService } from "../db/postgres";
import { loadPhase0Env } from "../config/phase0.env";
import {
  ACCESS_TOKEN_TTL_SEC,
  USER_JWT_AUDIENCE,
  USER_JWT_ISSUER,
} from "./auth.constants";
import { REFRESH_TOKEN_TTL_SEC } from "./session-cookies";

const req = createRequire(__filename);
// eslint-disable-next-line @typescript-eslint/no-require-imports
const jwtCore = req(join(__dirname, "..", "..", "jwt.core.cjs")) as {
  sign: (
    payload: Record<string, unknown>,
    secret: string,
    opts: { issuer: string; audience: string; expiresInSec: number; nowMs?: number; jti?: string },
  ) => string;
};

export type MintedSession = {
  accessToken: string;
  refreshToken: string;
  familyId: string;
  sessionRowId: string;
  userId: string;
  issuedAt: string;
  accessExpiresAt: string;
};

export type SessionFamilySummary = {
  familyId: string;
  deviceLabel: string | null;
  ip: string | null;
  issuedAt: string;
  lastActiveAt: string;
  current: boolean;
};

function randomOpaqueToken(): string {
  return randomBytes(32).toString("base64url");
}

function hashToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

@Injectable()
export class SessionRotationService {
  constructor(private readonly db: PostgresService) {}

  private assertDb(): void {
    if (!this.db.configured()) {
      throw new ServiceUnavailableException(
        "DATABASE_URL unset - cannot mint/rotate a real session",
      );
    }
  }

  /** `jti` is set to the auth_sessions row id itself (not an unrelated
   * random nonce) so a decoded access token's jti is always traceable to a
   * real DB row for audit/debugging - see jwt-auth.guard.ts's SessionUser. */
  private mintAccessToken(
    userId: string,
    familyId: string,
    sessionRowId: string,
  ): { token: string; issuedAt: Date } {
    const env = loadPhase0Env();
    if (!env.jwtUserSecret) {
      throw new ServiceUnavailableException(
        "JWT_USER_SECRET unset - cannot mint session",
      );
    }
    const issuedAt = new Date();
    const token = jwtCore.sign({ sub: userId, fam: familyId }, env.jwtUserSecret, {
      issuer: USER_JWT_ISSUER,
      audience: USER_JWT_AUDIENCE,
      expiresInSec: ACCESS_TOKEN_TTL_SEC,
      jti: sessionRowId,
    });
    return { token, issuedAt };
  }

  /** Fresh login - starts a brand-new rotation family (one per device/login). */
  async mintNewFamily(
    userId: string,
    opts: { deviceLabel?: string | null; ip?: string | null } = {},
  ): Promise<MintedSession> {
    this.assertDb();
    const refreshToken = randomOpaqueToken();
    const refreshHash = hashToken(refreshToken);
    const now = new Date();
    const refreshExpiresAt = new Date(now.getTime() + REFRESH_TOKEN_TTL_SEC * 1000);

    const inserted = await this.db.query<{ id: string; family_id: string }>(
      `INSERT INTO public.auth_sessions (
         user_id, issuer, refresh_jti, family_id, device_label, ip, issued_at, expires_at
       ) VALUES ($1::uuid, $2, $3, gen_random_uuid(), $4, $5, $6, $7)
       RETURNING id::text, family_id::text`,
      [
        userId,
        USER_JWT_ISSUER,
        refreshHash,
        opts.deviceLabel ?? null,
        opts.ip ?? null,
        now.toISOString(),
        refreshExpiresAt.toISOString(),
      ],
    );
    const row = inserted.rows[0];
    if (!row) throw new ServiceUnavailableException("session insert failed");
    const { token: accessToken, issuedAt } = this.mintAccessToken(userId, row.family_id, row.id);
    return {
      accessToken,
      refreshToken,
      familyId: row.family_id,
      sessionRowId: row.id,
      userId,
      issuedAt: issuedAt.toISOString(),
      accessExpiresAt: new Date(issuedAt.getTime() + ACCESS_TOKEN_TTL_SEC * 1000).toISOString(),
    };
  }

  /**
   * Rotate an opaque refresh token.
   * - unknown/expired token -> null (caller returns 401, no session leaked)
   * - already-rotated or already-revoked token presented again -> reuse
   *   detected, whole family revoked, throws ForbiddenException
   * - otherwise -> rotates and returns a brand-new pair in the same family
   */
  async rotate(refreshTokenRaw: string): Promise<MintedSession | null> {
    this.assertDb();
    const hash = hashToken(refreshTokenRaw);
    const existing = await this.db.query<{
      id: string;
      user_id: string;
      family_id: string;
      expires_at: Date;
      revoked: boolean;
      rotated_at: Date | null;
    }>(
      `SELECT id::text, user_id::text, family_id::text, expires_at, revoked, rotated_at
         FROM public.auth_sessions
        WHERE refresh_jti = $1`,
      [hash],
    );
    const row = existing.rows[0];
    if (!row) return null;
    if (new Date(row.expires_at).getTime() <= Date.now()) return null;

    if (row.revoked || row.rotated_at) {
      await this.revokeFamily(row.family_id, { reuseDetected: true });
      throw new ForbiddenException("REFRESH_TOKEN_REUSE_DETECTED");
    }

    const newRefreshToken = randomOpaqueToken();
    const newHash = hashToken(newRefreshToken);
    const now = new Date();
    const refreshExpiresAt = new Date(now.getTime() + REFRESH_TOKEN_TTL_SEC * 1000);

    const inserted = await this.db.query<{ id: string }>(
      `INSERT INTO public.auth_sessions (
         user_id, issuer, refresh_jti, family_id, issued_at, expires_at
       ) VALUES ($1::uuid, $2, $3, $4::uuid, $5, $6)
       RETURNING id::text`,
      [
        row.user_id,
        USER_JWT_ISSUER,
        newHash,
        row.family_id,
        now.toISOString(),
        refreshExpiresAt.toISOString(),
      ],
    );
    const newRowId = inserted.rows[0]?.id;
    if (!newRowId) throw new ServiceUnavailableException("session rotation insert failed");

    // Optimistic guard: only mark rotated if it is still un-rotated right
    // now - protects against a concurrent double-rotate race on the exact
    // same token landing both branches on "not yet rotated".
    const marked = await this.db.query<{ id: string }>(
      `UPDATE public.auth_sessions
          SET rotated_at = now(), replaced_by_id = $2::uuid
        WHERE id = $1::uuid AND rotated_at IS NULL AND revoked = false
        RETURNING id::text`,
      [row.id, newRowId],
    );
    if (!marked.rows[0]) {
      // Lost the race - someone else rotated this exact token concurrently.
      // Treat as reuse: revoke everything (including the row we just
      // inserted) rather than hand out two live children of one parent.
      await this.db.query(
        `UPDATE public.auth_sessions SET revoked = true, revoked_at = now()
          WHERE id = $1::uuid`,
        [newRowId],
      );
      await this.revokeFamily(row.family_id, { reuseDetected: true });
      throw new ForbiddenException("REFRESH_TOKEN_REUSE_DETECTED");
    }

    const { token: accessToken, issuedAt } = this.mintAccessToken(
      row.user_id,
      row.family_id,
      newRowId,
    );
    return {
      accessToken,
      refreshToken: newRefreshToken,
      familyId: row.family_id,
      sessionRowId: newRowId,
      userId: row.user_id,
      issuedAt: issuedAt.toISOString(),
      accessExpiresAt: new Date(issuedAt.getTime() + ACCESS_TOKEN_TTL_SEC * 1000).toISOString(),
    };
  }

  /** Revoke one device/login chain (used by logout + reuse-detection). */
  async revokeFamily(
    familyId: string,
    opts: { reuseDetected?: boolean } = {},
  ): Promise<void> {
    if (!this.db.configured()) return;
    if (opts.reuseDetected) {
      await this.db.query(
        `UPDATE public.auth_sessions
            SET revoked = true, revoked_at = now(), reuse_detected_at = now()
          WHERE family_id = $1::uuid AND revoked = false`,
        [familyId],
      );
      return;
    }
    await this.db.query(
      `UPDATE public.auth_sessions SET revoked = true, revoked_at = now()
        WHERE family_id = $1::uuid AND revoked = false`,
      [familyId],
    );
  }

  /** Revoke every device/login for this user (used by "log out everywhere",
   * password reset/change, and account suspension). */
  async revokeAllForUser(userId: string): Promise<void> {
    if (!this.db.configured()) return;
    await this.db.query(
      `UPDATE public.auth_sessions SET revoked = true, revoked_at = now()
        WHERE user_id = $1::uuid AND revoked = false`,
      [userId],
    );
  }

  /** One row per distinct family (the most recent row in each chain). */
  async listActiveFamilies(
    userId: string,
    currentFamilyId?: string,
  ): Promise<SessionFamilySummary[]> {
    if (!this.db.configured()) return [];
    const res = await this.db.query<{
      family_id: string;
      device_label: string | null;
      ip: string | null;
      issued_at: Date;
      last_active_at: Date;
    }>(
      `SELECT DISTINCT ON (family_id)
              family_id::text, device_label, ip, issued_at,
              greatest(issued_at, coalesce(rotated_at, issued_at)) AS last_active_at
         FROM public.auth_sessions
        WHERE user_id = $1::uuid AND revoked = false
        ORDER BY family_id, issued_at DESC`,
      [userId],
    );
    return res.rows.map((r) => ({
      familyId: r.family_id,
      deviceLabel: r.device_label,
      ip: r.ip,
      issuedAt: new Date(r.issued_at).toISOString(),
      lastActiveAt: new Date(r.last_active_at).toISOString(),
      current: r.family_id === currentFamilyId,
    }));
  }

  /** Revoke one specific family, but only if it belongs to `userId` (never
   * lets a user revoke someone else's session by guessing a familyId). */
  async revokeFamilyForUser(userId: string, familyId: string): Promise<boolean> {
    if (!this.db.configured()) return false;
    const owns = await this.db.query<{ exists: boolean }>(
      `SELECT EXISTS (
         SELECT 1 FROM public.auth_sessions
          WHERE family_id = $1::uuid AND user_id = $2::uuid
       ) AS exists`,
      [familyId, userId],
    );
    if (!owns.rows[0]?.exists) return false;
    await this.revokeFamily(familyId);
    return true;
  }
}
