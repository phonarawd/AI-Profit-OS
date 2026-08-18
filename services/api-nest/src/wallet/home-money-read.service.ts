/**
 * Money v7.23 R1 · HomeMoneyRead adapter
 * Reuses LedgerBucketsService + DayPulseService only · mutation/DDL 0
 */

import { Injectable, NotFoundException } from "@nestjs/common";
import { DayPulseService } from "../loop/day-pulse.service";
import { LedgerBucketsService } from "../ledger/ledger.buckets.service";
import { PostgresService } from "../db/postgres";
import { mapHomeMoneyReadV1 } from "./home-money-read.map";
import type { HomeMoneyReadV1 } from "./home-money-read.types";

@Injectable()
export class HomeMoneyReadService {
  constructor(
    private readonly buckets: LedgerBucketsService,
    private readonly dayPulse: DayPulseService,
    private readonly db: PostgresService,
  ) {}

  async getForUser(userId: string): Promise<HomeMoneyReadV1> {
    const pulse = await this.dayPulse.getToday();
    const asOfSettlementIso = pulse.asOf;

    try {
      const buckets = await this.buckets.getUserBuckets(userId);
      const asOfPrincipalIso = await this.resolvePrincipalAsOfIso(
        buckets.asOfLedgerEntryId,
      );
      return mapHomeMoneyReadV1({
        principalUsdt: buckets.principalUsdt,
        settlementCompletedTodayCount: pulse.settlementCompletedToday,
        asOfPrincipalIso,
        asOfSettlementIso,
      });
    } catch (err) {
      if (err instanceof NotFoundException) {
        // zero≠absent — values are not Fact when state=recoverable_error
        const now = new Date().toISOString();
        return mapHomeMoneyReadV1({
          principalUsdt: "0",
          settlementCompletedTodayCount: pulse.settlementCompletedToday,
          asOfPrincipalIso: now,
          asOfSettlementIso,
          forceState: "recoverable_error",
          reasonCode: "money.home.buckets_missing",
        });
      }
      throw err;
    }
  }

  /** Per-field ISO asOf · ledger entry created_at or projection clock */
  private async resolvePrincipalAsOfIso(
    asOfLedgerEntryId: string,
  ): Promise<string> {
    if (!asOfLedgerEntryId || asOfLedgerEntryId === "none") {
      return new Date().toISOString();
    }
    if (!this.db.configured()) {
      return new Date().toISOString();
    }
    const { rows } = await this.db.query<{ created_at: string }>(
      `SELECT created_at AT TIME ZONE 'UTC' AS created_at
         FROM public.ledger_entries
        WHERE id = $1::uuid
        LIMIT 1`,
      [asOfLedgerEntryId],
    );
    const raw = rows[0]?.created_at;
    if (!raw) return new Date().toISOString();
    const d = new Date(raw);
    return Number.isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
  }
}
