/**
 * UI §50.1n — notification prefs · signup ALL true
 */

import { Injectable } from "@nestjs/common";
import { PostgresService } from "../db/postgres";
import {
  NOTIFICATION_PREFS_DEFAULTS,
  type NotificationPrefsV1,
  type NotifyPushChannel,
  shouldSendPush,
} from "./notification-prefs.defaults";

type PrefsRow = {
  user_id: string;
  master: boolean;
  opportunity: boolean;
  wallet: boolean;
  notice: boolean;
  campaign: boolean;
  ops_message: boolean;
  strategy_match: boolean;
  updated_at: Date;
};

@Injectable()
export class NotificationPrefsService {
  constructor(private readonly db: PostgresService) {}

  /** Called on signup isNew — DDL defaults are true; INSERT ensures row. */
  async ensureDefaultsForUser(userId: string): Promise<void> {
    await this.db.query(
      `INSERT INTO public.notification_prefs (user_id)
       VALUES ($1::uuid)
       ON CONFLICT (user_id) DO NOTHING`,
      [userId],
    );
  }

  async getForUser(userId: string): Promise<NotificationPrefsV1> {
    await this.ensureDefaultsForUser(userId);
    const res = await this.db.query<PrefsRow>(
      `SELECT user_id::text, master, opportunity, wallet, notice, campaign,
              ops_message, strategy_match, updated_at
         FROM public.notification_prefs
        WHERE user_id = $1::uuid`,
      [userId],
    );
    const row = res.rows[0];
    if (!row) {
      return { userId, ...NOTIFICATION_PREFS_DEFAULTS };
    }
    return this.mapRow(row);
  }

  async putForUser(
    userId: string,
    patch: Partial<Omit<NotificationPrefsV1, "userId" | "updatedAt">>,
  ): Promise<NotificationPrefsV1> {
    await this.ensureDefaultsForUser(userId);
    const current = await this.getForUser(userId);
    const next = {
      master: patch.master ?? current.master,
      opportunity: patch.opportunity ?? current.opportunity,
      wallet: patch.wallet ?? current.wallet,
      notice: patch.notice ?? current.notice,
      campaign: patch.campaign ?? current.campaign,
      opsMessage: patch.opsMessage ?? current.opsMessage,
      strategyMatch: patch.strategyMatch ?? current.strategyMatch,
    };
    await this.db.query(
      `UPDATE public.notification_prefs SET
         master = $2,
         opportunity = $3,
         wallet = $4,
         notice = $5,
         campaign = $6,
         ops_message = $7,
         strategy_match = $8,
         updated_at = now()
       WHERE user_id = $1::uuid`,
      [
        userId,
        next.master,
        next.opportunity,
        next.wallet,
        next.notice,
        next.campaign,
        next.opsMessage,
        next.strategyMatch,
      ],
    );
    return this.getForUser(userId);
  }

  async allowPush(
    userId: string,
    channel: NotifyPushChannel,
  ): Promise<boolean> {
    const prefs = await this.getForUser(userId);
    return shouldSendPush(prefs, channel);
  }

  private mapRow(row: PrefsRow): NotificationPrefsV1 {
    return {
      userId: row.user_id,
      master: row.master === true,
      opportunity: row.opportunity === true,
      wallet: row.wallet === true,
      notice: row.notice === true,
      campaign: row.campaign === true,
      opsMessage: row.ops_message === true,
      strategyMatch: row.strategy_match === true,
      updatedAt: row.updated_at?.toISOString?.() ?? String(row.updated_at),
    };
  }
}
