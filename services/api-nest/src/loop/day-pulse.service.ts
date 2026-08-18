/**
 * UI §51.24.1 / §51.24.4 — DayPulse live aggregates
 * Source = trade_executions only · G4 merge 0
 * Presence default OFF (presence_live flag + real sessions only)
 */

import { Inject, Injectable } from "@nestjs/common";
import { CLOCK, kstDayStartMs, type Clock } from "../common/clock";
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
  constructor(
    private readonly db: PostgresService,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async getToday(): Promise<DayPulseDto> {
    const nowMs = this.clock.nowMs();
    const empty: DayPulseDto = {
      asOf: new Date(nowMs).toISOString(),
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

    // Day boundary comes from the domain Clock, not the database wall clock, so
    // the "today" decision is deterministic under acceptance time control.
    const { rows } = await this.db.query<{
      safe_stop: string;
      settled: string;
    }>(
      `SELECT
         COUNT(*) FILTER (WHERE status = 'safe_stop')::text AS safe_stop,
         COUNT(*) FILTER (WHERE status = 'success')::text AS settled
         FROM public.trade_executions
        WHERE created_at >= $1::timestamptz`,
      [new Date(kstDayStartMs(nowMs)).toISOString()],
    );

    const row = rows[0];
    return {
      ...empty,
      asOf: new Date(nowMs).toISOString(),
      platformSafeStopToday: Math.max(0, Number(row?.safe_stop ?? 0) || 0),
      settlementCompletedToday: Math.max(0, Number(row?.settled ?? 0) || 0),
      presence: PRESENCE_LIVE
        ? { enabled: true, liveSessionCount: 0 }
        : { enabled: false, liveSessionCount: null },
    };
  }
}
