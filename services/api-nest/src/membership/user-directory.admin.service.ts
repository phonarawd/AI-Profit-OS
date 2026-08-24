import { BadRequestException, Injectable } from "@nestjs/common";
import { PostgresService } from "../db/postgres";

type UserDirectoryRow = {
  id: string;
  email: string | null;
  phone_e164: string | null;
  status: string;
  display_name: string | null;
  membership: string | null;
  kyc_status: string | null;
  match_blocked: boolean | null;
  withdraw_apply_blocked: boolean | null;
  last_seen_at: Date | null;
  created_at: Date;
  total_count: string;
};

export type UserDirectoryItem = {
  id: string;
  email: string | null;
  phoneE164: string | null;
  displayName: string | null;
  status: string;
  membership: string | null;
  kycStatus: string | null;
  matchBlocked: boolean;
  withdrawApplyBlocked: boolean;
  lastSeenAt: string | null;
  createdAt: string;
};

@Injectable()
export class UserDirectoryAdminService {
  constructor(private readonly db: PostgresService) {}

  async list(input: {
    q?: string;
    status?: string;
    limit?: number;
    offset?: number;
  }): Promise<{
    items: UserDirectoryItem[];
    total: number;
    limit: number;
    offset: number;
    nextOffset: number | null;
  }> {
    const q = this.normalizeQuery(input.q);
    const status = this.normalizeStatus(input.status);
    const limit = Math.min(Math.max(Number(input.limit) || 50, 1), 100);
    const offset = Math.min(Math.max(Number(input.offset) || 0, 0), 100000);

    const { rows } = await this.db.query<UserDirectoryRow>(
      `SELECT
         u.id::text,
         u.email,
         u.phone_e164,
         u.status,
         p.display_name,
         m.membership,
         k.kyc_status,
         c.match_blocked,
         c.withdraw_apply_blocked,
         s.last_seen_at,
         u.created_at,
         count(*) OVER()::text AS total_count
       FROM public.users u
       LEFT JOIN public.user_profiles p ON p.user_id = u.id
       LEFT JOIN public.user_membership m ON m.user_id = u.id
       LEFT JOIN public.kyc_status k ON k.user_id = u.id
       LEFT JOIN public.user_capability c ON c.user_id = u.id
       LEFT JOIN LATERAL (
         SELECT max(issued_at) AS last_seen_at
           FROM public.auth_sessions a
          WHERE a.user_id = u.id
            AND a.revoked = false
       ) s ON true
       WHERE (
         $1::text IS NULL
         OR u.id::text = $1
         OR lower(COALESCE(u.email, '')) LIKE '%' || lower($1) || '%'
         OR COALESCE(u.phone_e164, '') LIKE '%' || $1 || '%'
         OR lower(COALESCE(p.display_name, '')) LIKE '%' || lower($1) || '%'
       )
       AND ($2::text IS NULL OR u.status = $2)
       ORDER BY u.created_at DESC, u.id DESC
       LIMIT $3 OFFSET $4`,
      [q, status, limit, offset],
    );

    const total = Number(rows[0]?.total_count ?? 0);
    return {
      items: rows.map((row) => ({
        id: row.id,
        email: row.email,
        phoneE164: row.phone_e164,
        displayName: row.display_name,
        status: row.status,
        membership: row.membership,
        kycStatus: row.kyc_status,
        matchBlocked: row.match_blocked === true,
        withdrawApplyBlocked: row.withdraw_apply_blocked === true,
        lastSeenAt: row.last_seen_at ? new Date(row.last_seen_at).toISOString() : null,
        createdAt: new Date(row.created_at).toISOString(),
      })),
      total,
      limit,
      offset,
      nextOffset: offset + rows.length < total ? offset + rows.length : null,
    };
  }

  private normalizeQuery(value: string | undefined): string | null {
    const q = typeof value === "string" ? value.trim() : "";
    if (!q) return null;
    if (q.length > 120) throw new BadRequestException("q maxLength 120");
    return q;
  }

  private normalizeStatus(value: string | undefined): string | null {
    const status = typeof value === "string" ? value.trim() : "";
    if (!status || status === "all") return null;
    if (!["active", "banned", "deleted"].includes(status)) {
      throw new BadRequestException("status invalid");
    }
    return status;
  }
}
