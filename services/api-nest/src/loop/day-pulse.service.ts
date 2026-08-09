/**
 * UI §51.24.1 / §51.24.4 — DayPulse live aggregates
 * Source = trade_executions only · G4 merge 0
 * Presence default OFF (presence_live flag + real sessions only)
 */

import { Injectable } from "@nestjs/common";
import { PostgresService } from "../db/postgres";

export type DayPulseDto = {
  asOf: string;
  tz: "Asia/Seoul";
  source: "live";
  g4Merge: false;
  platformSafeStopToday: number;
  settlementCompletedToday: number;
  scope: "platform";
  presence: {
    enabled: boolean;
    liveSessionCount: number | null;
  };
};

/** Feature flag · Day-1 OFF (L3/L5) */
const PRESENCE_LIVE = false;

@Injectable()
export class DayPulseService {
  constructor(private readonly db: PostgresService) {}

  async getToday(): Promise<DayPulseDto> {
    const empty: DayPulseDto = {
      asOf: new Date().toISOString(),
      tz: "Asia/Seoul",
      source: "live",
      g4Merge: false,
      platformSafeStopToday: 0,
      settlementCompletedToday: 0,
      scope: "platform",
      presence: {
        enabled: false,
        liveSessionCount: null,
      },
    };

    if (!this.db.configured()) return empty;

    const { rows } = await this.db.query<{
      safe_stop: string;
      settled: string;
    }>(
      `SELECT
         COUNT(*) FILTER (WHERE status = 'safe_stop')::text AS safe_stop,
         COUNT(*) FILTER (WHERE status = 'success')::text AS settled
         FROM public.trade_executions
        WHERE created_at >= date_trunc('day', now() AT TIME ZONE 'Asia/Seoul')
              AT TIME ZONE 'Asia/Seoul'`,
    );

    const row = rows[0];
    return {
      ...empty,
      asOf: new Date().toISOString(),
      platformSafeStopToday: Math.max(0, Number(row?.safe_stop ?? 0) || 0),
      settlementCompletedToday: Math.max(0, Number(row?.settled ?? 0) || 0),
      presence: PRESENCE_LIVE
        ? { enabled: true, liveSessionCount: 0 }
        : { enabled: false, liveSessionCount: null },
    };
  }
}
