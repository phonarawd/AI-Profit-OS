/**
 * Share API spam counter only · Money §51.5
 * sharePerUserPerDay ≠ invite-count cap (R7 / R14)
 */

import {
  HttpException,
  HttpStatus,
  Injectable,
} from "@nestjs/common";
import { InProcessEventBus } from "../events/in-process.bus";
import { PostgresService } from "../db/postgres";
import { REFERRAL_EVENTS } from "./referral.events";
import { ReferralProgramService } from "./referral.program.service";

@Injectable()
export class ReferralShareService {
  constructor(
    private readonly db: PostgresService,
    private readonly bus: InProcessEventBus,
    private readonly program: ReferralProgramService,
  ) {}

  async recordShare(userId: string): Promise<{
    shareCount: number;
    limit: number;
    remaining: number;
  }> {
    const cfg = await this.program.get();
    const limit = cfg.sharePerUserPerDay;
    const dayUtc = new Date().toISOString().slice(0, 10);

    const r = await this.db.query<{ share_count: number }>(
      `INSERT INTO public.referral_share_daily (user_id, day_utc, share_count)
       VALUES ($1::uuid, $2::date, 1)
       ON CONFLICT (user_id, day_utc) DO UPDATE
         SET share_count = public.referral_share_daily.share_count + 1,
             updated_at = now()
       RETURNING share_count`,
      [userId, dayUtc],
    );
    const shareCount = r.rows[0]?.share_count ?? 1;

    if (shareCount > limit) {
      // roll back the increment beyond limit
      await this.db.query(
        `UPDATE public.referral_share_daily
            SET share_count = $3
          WHERE user_id = $1::uuid AND day_utc = $2::date`,
        [userId, dayUtc, limit],
      );
      this.bus.emit(REFERRAL_EVENTS.shareLimited, {
        userId,
        toastCode: "REFERRAL_SHARE_LIMIT",
        limit,
      });
      throw new HttpException(
        {
          code: "REFERRAL_SHARE_LIMIT",
          toastCode: "REFERRAL_CAP",
          message: "sharePerUserPerDay exceeded (spam only · not invite cap)",
          limit,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    return {
      shareCount,
      limit,
      remaining: Math.max(0, limit - shareCount),
    };
  }
}
