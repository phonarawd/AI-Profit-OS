/**
 * Money §51.8a — mission program config (rewardsEnabled · hold · Day-1 amounts).
 * missionsRewardsEnabled = rewards_enabled (분리 스위치 0).
 */

import { Injectable } from "@nestjs/common";
import { PostgresService } from "../db/postgres";
import { formatAmount, parseAmount } from "../ledger/ledger.money";
import {
  DAY1_MISSION_PROGRAM_DEFAULTS,
  type MissionProgramConfig,
} from "./mission.types";

type ConfigRow = {
  rewards_enabled: boolean;
  accrual_halted: boolean;
  m05_min_deposit_usdt: string;
  m07_first_settlement_usdt: string;
  d03_daily_participate_usdt: string;
  release_hold_hours_m05: number;
  release_hold_hours_m07: number;
  system_mission_payout_cap_per_day_usdt: string | null;
  clawback_hours_mission: number;
};

@Injectable()
export class MissionProgramService {
  constructor(private readonly db: PostgresService) {}

  async getConfig(): Promise<MissionProgramConfig> {
    if (!this.db.configured()) return { ...DAY1_MISSION_PROGRAM_DEFAULTS };
    const r = await this.db.query<ConfigRow>(
      `SELECT rewards_enabled, accrual_halted,
              m05_min_deposit_usdt::text,
              m07_first_settlement_usdt::text,
              d03_daily_participate_usdt::text,
              release_hold_hours_m05,
              release_hold_hours_m07,
              system_mission_payout_cap_per_day_usdt::text,
              clawback_hours_mission
         FROM public.mission_program_config
        WHERE id = 1`,
    );
    const row = r.rows[0];
    if (!row) return { ...DAY1_MISSION_PROGRAM_DEFAULTS };
    return {
      rewardsEnabled: row.rewards_enabled === true,
      accrualHalted: row.accrual_halted === true,
      m05MinDepositUsdt: formatAmount(parseAmount(row.m05_min_deposit_usdt)),
      m07FirstSettlementUsdt: formatAmount(
        parseAmount(row.m07_first_settlement_usdt),
      ),
      d03DailyParticipateUsdt: formatAmount(
        parseAmount(row.d03_daily_participate_usdt),
      ),
      releaseHoldHoursM05: row.release_hold_hours_m05,
      releaseHoldHoursM07: row.release_hold_hours_m07,
      systemMissionPayoutCapPerDayUsdt:
        row.system_mission_payout_cap_per_day_usdt == null
          ? null
          : formatAmount(
              parseAmount(row.system_mission_payout_cap_per_day_usdt),
            ),
      clawbackHoursMission: row.clawback_hours_mission,
    };
  }

  /** Cash money accruals require Growth rewards ON and not halted. */
  async canAccrueCash(): Promise<boolean> {
    const cfg = await this.getConfig();
    return cfg.rewardsEnabled === true && cfg.accrualHalted !== true;
  }
}
