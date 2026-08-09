/**
 * Engine §48.13.4 / P7 → P7c — emit `settlement.completed` AFTER ledger post.
 *
 * Boundary (결함0):
 * - Listens to `ledger.journal.posted` only (settlement journal already committed)
 * - Fanout failure MUST NOT reverse/retry/gate settlement journal or Rule R1~R10
 * - G4/demo/ticker presentation paths are never inputs here
 */

import { Injectable, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { InProcessEventBus } from "../events/in-process.bus";
import { PostgresService } from "../db/postgres";
import { LEDGER_EVENTS } from "../ledger/ledger.events";
import { SETTLEMENT_EVENTS } from "./mission.events";
import type { SettlementCompletedPayload } from "./mission.types";

@Injectable()
export class SettlementCompletedFanout
  implements OnModuleInit, OnModuleDestroy
{
  private unsubscribe: (() => void) | null = null;

  constructor(
    private readonly bus: InProcessEventBus,
    private readonly db: PostgresService,
  ) {}

  onModuleInit() {
    this.unsubscribe = this.bus.on(LEDGER_EVENTS.journalPosted, (payload) => {
      void this.onJournalPosted(payload).catch((err) => {
        // ME7 / §48.13.4 — isolate from ledger path
        console.error(
          "[SettlementCompletedFanout] emit failed (settlement journal unchanged)",
          err instanceof Error ? err.message : err,
        );
      });
    });
  }

  onModuleDestroy() {
    this.unsubscribe?.();
    this.unsubscribe = null;
  }

  describe() {
    return {
      listens: LEDGER_EVENTS.journalPosted,
      emits: SETTLEMENT_EVENTS.completed,
      settlementLedgerImmutable: true as const,
      ruleEngineCoupling: false as const,
      g4TickerCoupling: false as const,
    };
  }

  private async onJournalPosted(payload: unknown): Promise<void> {
    const p = (payload ?? {}) as {
      journalId?: string;
      journalType?: string;
    };
    if (p.journalType !== "settlement" || !p.journalId) return;
    if (!this.db.configured()) return;

    const user = await this.resolveSettlementUser(p.journalId);
    if (!user) return;

    const out: SettlementCompletedPayload = {
      event: SETTLEMENT_EVENTS.completed,
      journalId: p.journalId,
      userId: user.userId,
      tradeId: user.tradeId,
      userNetProfitUsdt: user.userNetProfitUsdt,
      settlementLedgerImmutable: true,
      source: "ledger.journal.posted",
    };
    this.bus.emit(SETTLEMENT_EVENTS.completed, out);
  }

  /**
   * Settlement journals credit user profit (Money §49).
   * Resolve owner from ledger_accounts — never trust client payload.
   */
  private async resolveSettlementUser(journalId: string): Promise<{
    userId: string;
    tradeId?: string;
    userNetProfitUsdt?: string;
  } | null> {
    const r = await this.db.query<{
      owner_user_id: string;
      amount_usdt: string;
      reference_type: string | null;
      reference_id: string | null;
    }>(
      `SELECT a.owner_user_id::text,
              e.amount_usdt::text,
              j.reference_type,
              j.reference_id
         FROM public.ledger_entries e
         JOIN public.ledger_accounts a ON a.id = e.account_id
         JOIN public.ledger_journals j ON j.id = e.journal_id
        WHERE e.journal_id = $1::uuid
          AND e.direction = 'credit'
          AND a.account_kind = 'user_bucket'
          AND a.bucket = 'profit'
          AND a.owner_user_id IS NOT NULL
        ORDER BY e.amount_usdt DESC
        LIMIT 1`,
      [journalId],
    );
    const row = r.rows[0];
    if (!row?.owner_user_id) return null;
    return {
      userId: row.owner_user_id,
      tradeId:
        row.reference_type === "trade" && row.reference_id
          ? row.reference_id
          : undefined,
      userNetProfitUsdt: row.amount_usdt,
    };
  }
}
