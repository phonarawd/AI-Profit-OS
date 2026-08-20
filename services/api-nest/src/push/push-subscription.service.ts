/**
 * REL-020 구독 등록. user_id당 endpoint 최대 5.
 */

import { BadRequestException, Injectable } from "@nestjs/common";
import { PostgresService } from "../db/postgres";

export type PushSubscriptionInput = {
  endpoint: string;
  p256dh: string;
  auth: string;
  platform?: string;
  userAgent?: string;
};

type SubRow = {
  endpoint: string;
  p256dh: string;
  auth: string;
  platform: string;
};

const MAX_PER_USER = 5;

@Injectable()
export class PushSubscriptionService {
  constructor(private readonly db: PostgresService) {}

  async upsert(
    userId: string,
    input: PushSubscriptionInput,
  ): Promise<{ ok: true; endpoint: string }> {
    const endpoint = String(input.endpoint || "").trim();
    const p256dh = String(input.p256dh || "").trim();
    const auth = String(input.auth || "").trim();
    if (!endpoint.startsWith("https://") || p256dh.length < 8 || auth.length < 8) {
      throw new BadRequestException("INVALID_SUBSCRIPTION");
    }
    const platform = this.safePlatform(input.platform);
    await this.db.query(
      `INSERT INTO public.push_subscriptions (
         user_id, endpoint, p256dh, auth, platform, user_agent
       ) VALUES ($1::uuid, $2, $3, $4, $5, $6)
       ON CONFLICT (user_id, endpoint) DO UPDATE SET
         p256dh = EXCLUDED.p256dh,
         auth = EXCLUDED.auth,
         platform = EXCLUDED.platform,
         user_agent = EXCLUDED.user_agent,
         updated_at = now()`,
      [userId, endpoint, p256dh, auth, platform, input.userAgent ?? null],
    );
    await this.db.query(
      `DELETE FROM public.push_subscriptions
        WHERE user_id = $1::uuid
          AND id NOT IN (
            SELECT id FROM public.push_subscriptions
             WHERE user_id = $1::uuid
             ORDER BY updated_at DESC
             LIMIT $2
          )`,
      [userId, MAX_PER_USER],
    );
    return { ok: true, endpoint };
  }

  async remove(userId: string, endpoint: string): Promise<{ ok: true }> {
    await this.db.query(
      `DELETE FROM public.push_subscriptions
        WHERE user_id = $1::uuid AND endpoint = $2`,
      [userId, endpoint],
    );
    return { ok: true };
  }

  async listForUser(userId: string): Promise<SubRow[]> {
    const r = await this.db.query<SubRow>(
      `SELECT endpoint, p256dh, auth, platform
         FROM public.push_subscriptions
        WHERE user_id = $1::uuid`,
      [userId],
    );
    return r.rows;
  }

  private safePlatform(raw?: string): string {
    const allowed = new Set(["web", "ios_pwa", "android_pwa", "desktop"]);
    const v = String(raw || "web");
    return allowed.has(v) ? v : "web";
  }
}
