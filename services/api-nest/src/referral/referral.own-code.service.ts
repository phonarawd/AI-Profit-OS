/**
 * 세션 유저의 권위 초대 코드. Production ensure write 0.
 */

import { Injectable } from "@nestjs/common";
import { loadPhase0Env } from "../config/phase0.env";
import { PostgresService } from "../db/postgres";
import {
  allowsReferralCodeEnsure,
  classifyOwnReferralCode,
  mintReferralCode,
  uniqueViolationTarget,
  type ReferralCodePolicy,
} from "./referral-code.util";

type UserCodeRow = {
  status: string | null;
  referral_code: string | null;
};

@Injectable()
export class ReferralOwnCodeService {
  constructor(private readonly db: PostgresService) {}

  async readForUser(userId: string): Promise<{
    policy: ReferralCodePolicy;
    referralCode: string | null;
  }> {
    const res = await this.db.query<UserCodeRow>(
      `SELECT status, referral_code FROM public.users WHERE id = $1::uuid`,
      [userId],
    );
    const row = res.rows[0];
    if (!row) return { policy: "missing", referralCode: null };
    return classifyOwnReferralCode({
      status: row.status,
      referralCode: row.referral_code,
    });
  }

  /**
   * 스테이징 opt-in만 NULL → persist. Production 연결이면 SELECT만.
   */
  async ensureForUser(userId: string): Promise<{
    policy: ReferralCodePolicy;
    referralCode: string | null;
  }> {
    const current = await this.readForUser(userId);
    if (current.policy !== "missing") return current;
    const env = loadPhase0Env();
    if (
      !allowsReferralCodeEnsure({
        ensureFlag: process.env.REFERRAL_CODE_ENSURE ?? null,
        databaseUrl: env.databaseUrl,
        supabaseUrl: env.supabaseUrl,
        supabaseProjectRef: env.supabaseProjectRef,
      })
    ) {
      return current;
    }
    for (let attempt = 0; attempt < 8; attempt++) {
      const code = mintReferralCode();
      try {
        const res = await this.db.query<UserCodeRow>(
          `UPDATE public.users
              SET referral_code = $2, updated_at = now()
            WHERE id = $1::uuid
              AND referral_code IS NULL
              AND status = 'active'
            RETURNING status, referral_code`,
          [userId, code],
        );
        const row = res.rows[0];
        if (!row) return this.readForUser(userId);
        return classifyOwnReferralCode({
          status: row.status,
          referralCode: row.referral_code,
        });
      } catch (err) {
        if (uniqueViolationTarget(err) === "referral_code") continue;
        throw err;
      }
    }
    return this.readForUser(userId);
  }
}
