/**
 * User Twin Nest store — Redis hot + PG ai_user_profile
 * Engine §47.3 · money Fact cache FORBIDDEN
 */

import { BadRequestException, Injectable } from "@nestjs/common";
import { PostgresService } from "../db/postgres";
import { UpstashRedisService } from "../redis/upstash";
import {
  assertNoTwinMoneyKeys,
  buildTwin,
  fromAiUserProfileRow,
  patchTwin,
  toAiUserProfileRow,
  twinRedisKey,
  TWIN_REDIS_TTL_SEC,
} from "./ai.engine";

@Injectable()
export class UserTwinService {
  constructor(
    private readonly db: PostgresService,
    private readonly redis: UpstashRedisService,
  ) {}

  async get(userId: string) {
    if (!userId) throw new BadRequestException("userId_required");

    const hotKey = twinRedisKey(userId);
    const cached = await this.redis.get(hotKey);
    if (cached) {
      try {
        const parsed = JSON.parse(cached) as Record<string, unknown>;
        assertNoTwinMoneyKeys(parsed);
        return buildTwin(parsed);
      } catch {
        await this.redis.del(hotKey);
      }
    }

    const res = await this.db.query(
      `SELECT user_id::text, preferred_capital_band, category_interest,
              tone_band, objection_patterns, twin_snapshot_id, payload, updated_at
         FROM public.ai_user_profile
        WHERE user_id = $1::uuid`,
      [userId],
    );
    const twin = fromAiUserProfileRow(res.rows[0] || null);
    if (twin) {
      await this.redis.set(
        hotKey,
        JSON.stringify(twin),
        TWIN_REDIS_TTL_SEC,
      );
    }
    return twin;
  }

  async upsert(userId: string, patch: Record<string, unknown>) {
    if (!userId) throw new BadRequestException("userId_required");
    try {
      assertNoTwinMoneyKeys(patch);
    } catch (e) {
      throw new BadRequestException(
        e instanceof Error ? e.message : "TWIN_MONEY_CACHE_FORBIDDEN",
      );
    }

    const prev = await this.get(userId);
    const twin = patchTwin(prev, { ...patch, userId });
    const row = toAiUserProfileRow(twin);

    await this.db.query(
      `INSERT INTO public.ai_user_profile (
         user_id, preferred_capital_band, category_interest, tone_band,
         objection_patterns, twin_snapshot_id, payload, updated_at
       ) VALUES (
         $1::uuid, $2, $3::text[], $4, $5::text[], $6, $7::jsonb, $8::timestamptz
       )
       ON CONFLICT (user_id) DO UPDATE SET
         preferred_capital_band = EXCLUDED.preferred_capital_band,
         category_interest = EXCLUDED.category_interest,
         tone_band = EXCLUDED.tone_band,
         objection_patterns = EXCLUDED.objection_patterns,
         twin_snapshot_id = EXCLUDED.twin_snapshot_id,
         payload = EXCLUDED.payload,
         updated_at = EXCLUDED.updated_at`,
      [
        row.user_id,
        row.preferred_capital_band,
        row.category_interest,
        row.tone_band,
        row.objection_patterns,
        row.twin_snapshot_id,
        JSON.stringify(row.payload),
        row.updated_at,
      ],
    );

    await this.redis.set(
      twinRedisKey(userId),
      JSON.stringify(twin),
      TWIN_REDIS_TTL_SEC,
    );
    return twin;
  }
}
