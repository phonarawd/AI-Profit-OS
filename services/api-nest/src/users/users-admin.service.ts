/**
 * Admin members directory (S1F Section 9.1) - the concrete launch-blocker
 * gap this wave closes: apps/admin/app/admin/users/page.tsx previously had
 * no real list, only a UUID-lookup jump form.
 *
 * Hard rules:
 *   - parameterized queries only (no string-interpolated SQL anywhere)
 *   - sort column is an allowlist, never a raw client string
 *   - list rows mask email/phone; only the single-record detail endpoint
 *     returns the unmasked value
 *   - password_hash / refresh token hashes / any auth token are NEVER
 *     selected by this service, let alone returned
 */

import { Injectable, ServiceUnavailableException } from "@nestjs/common";
import { PostgresService } from "../db/postgres";

export type AdminUserSignupMethod = "classic" | "kakao" | "google" | "passkey" | "email_magic";
export type AdminUserStatusFilter = "active" | "banned" | "deleted" | "all";

export type AdminUserListItem = {
  id: string;
  username: string | null;
  emailMasked: string | null;
  displayName: string | null;
  status: string;
  signupMethod: AdminUserSignupMethod;
  emailVerified: boolean;
  createdAt: string;
};

export type AdminUserListResult = {
  items: AdminUserListItem[];
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
};

export type AdminUserDetail = {
  id: string;
  username: string | null;
  email: string | null;
  phoneE164: string | null;
  displayName: string | null;
  declaredName: string | null;
  status: string;
  signupMethod: AdminUserSignupMethod;
  emailVerified: boolean;
  emailVerifiedAt: string | null;
  phoneVerified: boolean;
  onboardingStage: string | null;
  createdAt: string;
  updatedAt: string;
};

const SORT_COLUMNS = Object.freeze({
  createdAt: "u.created_at",
});
type SortKey = keyof typeof SORT_COLUMNS;

function maskEmail(email: string | null): string | null {
  if (!email) return null;
  const at = email.indexOf("@");
  if (at <= 0) return "***";
  const local = email.slice(0, at);
  const domain = email.slice(at + 1);
  const visible = local.slice(0, Math.min(2, local.length));
  return `${visible}${"*".repeat(Math.max(1, local.length - visible.length))}@${domain}`;
}

@Injectable()
export class UsersAdminService {
  constructor(private readonly db: PostgresService) {}

  private assertDb(): void {
    if (!this.db.configured()) {
      throw new ServiceUnavailableException("DATABASE_URL unset");
    }
  }

  private static readonly SIGNUP_METHOD_CASE = `
    CASE
      WHEN u.password_hash IS NOT NULL THEN 'classic'
      WHEN oauth.provider = 'kakao' THEN 'kakao'
      WHEN oauth.provider = 'google' THEN 'google'
      WHEN pk.user_id IS NOT NULL THEN 'passkey'
      ELSE 'email_magic'
    END`;

  private static readonly BASE_FROM = `
    FROM public.users u
    LEFT JOIN public.user_profiles p ON p.user_id = u.id
    LEFT JOIN LATERAL (
      SELECT provider FROM public.auth_oauth_identities
       WHERE user_id = u.id AND unlinked_at IS NULL
       ORDER BY linked_at ASC LIMIT 1
    ) oauth ON true
    LEFT JOIN LATERAL (
      SELECT user_id FROM public.auth_passkeys
       WHERE user_id = u.id AND revoked_at IS NULL LIMIT 1
    ) pk ON true`;

  async list(opts: {
    page?: number;
    pageSize?: number;
    search?: string;
    status?: AdminUserStatusFilter;
    signupMethod?: AdminUserSignupMethod | "all";
    sort?: SortKey;
    order?: "asc" | "desc";
  }): Promise<AdminUserListResult> {
    this.assertDb();
    const page = Math.max(1, Math.floor(opts.page ?? 1));
    const pageSize = Math.min(100, Math.max(1, Math.floor(opts.pageSize ?? 20)));
    const offset = (page - 1) * pageSize;
    const sortColumn = SORT_COLUMNS[opts.sort ?? "createdAt"] ?? SORT_COLUMNS.createdAt;
    const order = opts.order === "asc" ? "ASC" : "DESC";

    const where: string[] = [];
    const params: unknown[] = [];

    if (opts.status && opts.status !== "all") {
      params.push(opts.status);
      where.push(`u.status = $${params.length}`);
    }
    const search = opts.search?.trim();
    if (search) {
      // CodeQL js/incomplete-sanitization fix: backslash itself MUST be
      // escaped first. If we escape % and _ without first doubling any
      // existing backslash, a search string containing its own backslash
      // (e.g. "foo\%bar", a user literally searching for a percent sign)
      // gets re-interpreted by Postgres's LIKE escape parser - the
      // pre-existing backslash pairs up with our newly-inserted one and
      // un-escapes the wildcard, silently turning a literal search into a
      // wildcard match. Doubling backslashes first makes every backslash
      // in the final pattern unambiguous.
      const likeSafe = search.replace(/\\/g, "\\\\").replace(/[%_]/g, "\\$&");
      params.push(`%${likeSafe}%`);
      const likeIdx = params.length;
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(search);
      if (isUuid) {
        params.push(search);
        where.push(`(u.id = $${params.length}::uuid OR u.username ILIKE $${likeIdx} OR u.email ILIKE $${likeIdx} OR p.declared_name ILIKE $${likeIdx})`);
      } else {
        where.push(`(u.username ILIKE $${likeIdx} OR u.email ILIKE $${likeIdx} OR p.declared_name ILIKE $${likeIdx} OR p.display_name ILIKE $${likeIdx})`);
      }
    }

    const signupMethod = opts.signupMethod;
    if (signupMethod && signupMethod !== "all") {
      where.push(`(${UsersAdminService.SIGNUP_METHOD_CASE}) = $${params.length + 1}`);
      params.push(signupMethod);
    }

    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

    const countRes = await this.db.query<{ count: string }>(
      `SELECT count(*)::text AS count ${UsersAdminService.BASE_FROM} ${whereSql}`,
      params,
    );
    const totalCount = Number(countRes.rows[0]?.count ?? "0");

    const listParams = [...params, pageSize, offset];
    const rows = await this.db.query<{
      id: string;
      username: string | null;
      email: string | null;
      display_name: string | null;
      status: string;
      signup_method: AdminUserSignupMethod;
      email_verified_at: Date | null;
      created_at: Date;
    }>(
      `SELECT u.id::text, u.username, u.email, p.display_name, u.status,
              (${UsersAdminService.SIGNUP_METHOD_CASE}) AS signup_method,
              u.email_verified_at, u.created_at
       ${UsersAdminService.BASE_FROM}
       ${whereSql}
       ORDER BY ${sortColumn} ${order}, u.id ${order}
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      listParams,
    );

    return {
      items: rows.rows.map((r) => ({
        id: r.id,
        username: r.username,
        emailMasked: maskEmail(r.email),
        displayName: r.display_name,
        status: r.status,
        signupMethod: r.signup_method,
        emailVerified: r.email_verified_at != null,
        createdAt: new Date(r.created_at).toISOString(),
      })),
      page,
      pageSize,
      totalCount,
      totalPages: Math.max(1, Math.ceil(totalCount / pageSize)),
    };
  }

  async get(id: string): Promise<AdminUserDetail | null> {
    this.assertDb();
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
      return null;
    }
    const rows = await this.db.query<{
      id: string;
      username: string | null;
      email: string | null;
      phone_e164: string | null;
      display_name: string | null;
      declared_name: string | null;
      status: string;
      signup_method: AdminUserSignupMethod;
      email_verified_at: Date | null;
      phone_verified_at: Date | null;
      onboarding_stage: string | null;
      created_at: Date;
      updated_at: Date;
    }>(
      `SELECT u.id::text, u.username, u.email, u.phone_e164, p.display_name, p.declared_name,
              u.status, (${UsersAdminService.SIGNUP_METHOD_CASE}) AS signup_method,
              u.email_verified_at, u.phone_verified_at, p.onboarding_stage,
              u.created_at, u.updated_at
       ${UsersAdminService.BASE_FROM}
       WHERE u.id = $1::uuid`,
      [id],
    );
    const row = rows.rows[0];
    if (!row) return null;
    return {
      id: row.id,
      username: row.username,
      email: row.email,
      phoneE164: row.phone_e164,
      displayName: row.display_name,
      declaredName: row.declared_name,
      status: row.status,
      signupMethod: row.signup_method,
      emailVerified: row.email_verified_at != null,
      emailVerifiedAt: row.email_verified_at ? new Date(row.email_verified_at).toISOString() : null,
      phoneVerified: row.phone_verified_at != null,
      onboardingStage: row.onboarding_stage,
      createdAt: new Date(row.created_at).toISOString(),
      updatedAt: new Date(row.updated_at).toISOString(),
    };
  }
}
