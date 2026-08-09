/**
 * Engine §48.13.4 · Money §51.8a — MissionRewardEvaluator (Nest async).
 *
 * Boundary (삭제 금지):
 * 1. Runs AFTER domain events (settlement.completed / deposit.confirmed / …)
 * 2. Delay · crash · retry MUST NOT change settlement journals · trade state · R1~R10
 * 3. G4/demo/ticker/presentation → accrual path 0
 * 4. settlement_rule.rs / match-success-rule-engine 범위에 포함 금지
 * 5. Accrual/Pool/clawback Owns = Money §51.8a
 */

import { Injectable, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { InProcessEventBus } from "../events/in-process.bus";
import { PostgresService } from "../db/postgres";
import { cmpAmount, formatAmount, parseAmount } from "../ledger/ledger.money";
import { WALLET_EVENTS } from "../wallet/wallet.events";
import { COMPLIANCE_EVENTS } from "../compliance/compliance.events";
import { MissionAccrualService } from "./mission.accrual.service";
import { SETTLEMENT_EVENTS } from "./mission.events";
import { MissionProgramService } from "./mission.program.service";
import type {
  MissionDefinitionRow,
  MissionEvaluateContext,
  SettlementCompletedPayload,
} from "./mission.types";

@Injectable()
export class MissionRewardEvaluator implements OnModuleInit, OnModuleDestroy {
  private unsubs: Array<() => void> = [];

  constructor(
    private readonly bus: InProcessEventBus,
    private readonly db: PostgresService,
    private readonly program: MissionProgramService,
    private readonly accruals: MissionAccrualService,
  ) {}

  onModuleInit() {
    // Fire-and-forget — never await into the emitter / ledger path (§48.13.4)
    this.unsubs.push(
      this.bus.on(SETTLEMENT_EVENTS.completed, (payload) => {
        void this.safeEvaluateSettlement(payload);
      }),
    );
    this.unsubs.push(
      this.bus.on(WALLET_EVENTS.depositConfirmed, (payload) => {
        void this.safeEvaluateDeposit(payload);
      }),
    );
    this.unsubs.push(
      this.bus.on(WALLET_EVENTS.krwDepositApproved, (payload) => {
        void this.safeEvaluateDeposit({
          ...(payload as object),
          creditLedger: true,
        });
      }),
    );
    this.unsubs.push(
      this.bus.on(COMPLIANCE_EVENTS.kycSubmitted, (payload) => {
        void this.safeEvaluateGeneric("kyc.submitted", payload);
      }),
    );
  }

  onModuleDestroy() {
    for (const off of this.unsubs) off();
    this.unsubs = [];
  }

  describe() {
    return {
      name: "MissionRewardEvaluator",
      mode: "async" as const,
      listens: [
        SETTLEMENT_EVENTS.completed,
        WALLET_EVENTS.depositConfirmed,
        WALLET_EVENTS.krwDepositApproved,
        COMPLIANCE_EVENTS.kycSubmitted,
      ],
      owns: "Money §51.8a accrual · Engine §48.13.4 fanout only",
      settlementLedgerImmutable: true as const,
      ruleEngineCoupling: false as const,
      g4TickerPresentationCoupling: false as const,
    };
  }

  /** Test/introspection entry — production path is bus subscription only. */
  async match(ctx: MissionEvaluateContext): Promise<{ matched: number }> {
    if (!this.db.configured()) return { matched: 0 };
    const defs = await this.loadLiveDefinitions(ctx.event);
    let matched = 0;
    for (const def of defs) {
      const ok = await this.evaluateOne(def, ctx);
      if (ok) matched += 1;
    }
    return { matched };
  }

  private async safeEvaluateSettlement(payload: unknown): Promise<void> {
    try {
      const p = payload as SettlementCompletedPayload;
      if (!p?.userId || !p.journalId) return;
      // settlementLedgerImmutable — we only read the event; never mutate journal
      if (p.settlementLedgerImmutable !== true) return;

      const isFirst = await this.isFirstSettlementJournal(
        p.userId,
        p.journalId,
      );
      await this.match({
        event: SETTLEMENT_EVENTS.completed,
        userId: p.userId,
        sourceEventId: `settlement:${p.journalId}`,
        amountUsdt: p.userNetProfitUsdt,
        isFirstSettlement: isFirst,
      });
    } catch (err) {
      // ME7 — outbox-safe via idempotency on retry; never throw to bus
      console.error(
        "[MissionRewardEvaluator] settlement.completed failed (ledger unchanged)",
        err instanceof Error ? err.message : err,
      );
    }
  }

  private async safeEvaluateDeposit(payload: unknown): Promise<void> {
    try {
      const p = payload as {
        userId?: string;
        id?: string;
        amountUsdt?: string;
        creditLedger?: boolean;
      };
      if (!p?.userId || !p.amountUsdt || p.creditLedger === false) return;
      const sourceEventId = p.id
        ? `deposit:${p.id}`
        : `deposit:${p.userId}:${p.amountUsdt}`;
      const isFirst = await this.isFirstDeposit(p.userId);
      await this.match({
        event: "deposit.confirmed",
        userId: p.userId,
        sourceEventId,
        amountUsdt: p.amountUsdt,
        isFirstDeposit: isFirst,
      });
    } catch (err) {
      console.error(
        "[MissionRewardEvaluator] deposit.confirmed failed (wallet ledger unchanged)",
        err instanceof Error ? err.message : err,
      );
    }
  }

  private async safeEvaluateGeneric(
    event: string,
    payload: unknown,
  ): Promise<void> {
    try {
      const p = payload as { userId?: string; submissionId?: string; id?: string };
      if (!p?.userId) return;
      const sourceEventId =
        p.submissionId ?? p.id ?? `${event}:${p.userId}:${Date.now()}`;
      await this.match({
        event,
        userId: p.userId,
        sourceEventId: String(sourceEventId),
      });
    } catch (err) {
      console.error(
        `[MissionRewardEvaluator] ${event} failed`,
        err instanceof Error ? err.message : err,
      );
    }
  }

  private async evaluateOne(
    def: MissionDefinitionRow,
    ctx: MissionEvaluateContext,
  ): Promise<boolean> {
    const cfg = await this.program.getConfig();
    if (!(await this.predicateOk(def, ctx, cfg))) return false;

    const moneyReward = def.reward_kind !== "none";

    // Do NOT insert skipped rows for gate-offs — that would burn one_time idempotency
    // (Day-1 rewardsEnabled=false must leave M05/M07 claimable after Growth ON).
    if (moneyReward && def.growth_required && !cfg.rewardsEnabled) {
      return false;
    }
    if (moneyReward && cfg.accrualHalted) {
      return false;
    }
    if (await this.isUserBlocked(ctx.userId)) {
      return false;
    }

    const amount = this.resolveAmountSnap(def, cfg);
    if (moneyReward && cmpAmount(amount, "0") <= 0) {
      return false;
    }

    const holdHours = this.resolveHoldHours(def, cfg);
    const result = await this.accruals.insertAccrual({
      userId: ctx.userId,
      definition: def,
      amountUsdtSnap: amount,
      sourceEventId: ctx.sourceEventId,
      holdHours,
    });
    return Boolean(result && !result.reused);
  }

  private async predicateOk(
    def: MissionDefinitionRow,
    ctx: MissionEvaluateContext,
    cfg: Awaited<ReturnType<MissionProgramService["getConfig"]>>,
  ): Promise<boolean> {
    const pred = def.trigger_predicate ?? {};
    if (pred.firstSettlement === true && ctx.isFirstSettlement !== true) {
      return false;
    }
    if (pred.firstDeposit === true && ctx.isFirstDeposit !== true) {
      return false;
    }
    if (def.id === "M05" && ctx.amountUsdt) {
      if (cmpAmount(ctx.amountUsdt, cfg.m05MinDepositUsdt) < 0) return false;
    }
    if (typeof pred.minDepositUsdt === "string" && ctx.amountUsdt) {
      if (cmpAmount(ctx.amountUsdt, String(pred.minDepositUsdt)) < 0) {
        return false;
      }
    }
    return true;
  }

  private resolveAmountSnap(
    def: MissionDefinitionRow,
    cfg: Awaited<ReturnType<MissionProgramService["getConfig"]>>,
  ): string {
    if (def.reward_kind === "none") return "0";
    if (def.id === "M07") return cfg.m07FirstSettlementUsdt;
    if (def.id === "D03") return cfg.d03DailyParticipateUsdt;
    // M05 bonus amount = definition.reward_amount_usdt (Admin) · min gate = m05MinDepositUsdt
    if (def.reward_amount_usdt) {
      return formatAmount(parseAmount(def.reward_amount_usdt));
    }
    return "0";
  }

  private resolveHoldHours(
    def: MissionDefinitionRow,
    cfg: Awaited<ReturnType<MissionProgramService["getConfig"]>>,
  ): number {
    if (def.id === "M07") return cfg.releaseHoldHoursM07;
    if (def.id === "M05") return cfg.releaseHoldHoursM05;
    return def.release_hold_hours ?? 0;
  }

  private async loadLiveDefinitions(
    event: string,
  ): Promise<MissionDefinitionRow[]> {
    const r = await this.db.query<{
      id: string;
      section: string;
      title_ko: string;
      body_ko: string;
      trigger_event: string;
      trigger_predicate: Record<string, unknown> | string;
      reward_kind: MissionDefinitionRow["reward_kind"];
      reward_amount_usdt: string | null;
      auto_claim: boolean;
      growth_required: boolean;
      release_hold_hours: number;
      status: MissionDefinitionRow["status"];
    }>(
      `SELECT id, section, title_ko, body_ko, trigger_event,
              trigger_predicate, reward_kind, reward_amount_usdt::text,
              auto_claim, growth_required, release_hold_hours, status
         FROM public.mission_definitions
        WHERE status = 'live'
          AND trigger_event = $1
        ORDER BY sort_order ASC, id ASC`,
      [event],
    );
    return r.rows.map((row) => ({
      ...row,
      trigger_predicate:
        typeof row.trigger_predicate === "string"
          ? (JSON.parse(row.trigger_predicate) as Record<string, unknown>)
          : (row.trigger_predicate ?? {}),
    }));
  }

  private async isFirstSettlementJournal(
    userId: string,
    journalId: string,
  ): Promise<boolean> {
    const r = await this.db.query<{ cnt: string }>(
      `SELECT COUNT(*)::text AS cnt
         FROM public.ledger_entries e
         JOIN public.ledger_accounts a ON a.id = e.account_id
         JOIN public.ledger_journals j ON j.id = e.journal_id
        WHERE j.journal_type = 'settlement'
          AND e.direction = 'credit'
          AND a.account_kind = 'user_bucket'
          AND a.bucket = 'profit'
          AND a.owner_user_id = $1::uuid
          AND j.id <> $2::uuid`,
      [userId, journalId],
    );
    return Number(r.rows[0]?.cnt ?? "0") === 0;
  }

  private async isFirstDeposit(userId: string): Promise<boolean> {
    // Idempotency: any prior non-skipped M05 means not first
    const prior = await this.db.query<{ cnt: string }>(
      `SELECT COUNT(*)::text AS cnt
         FROM public.mission_accruals
        WHERE user_id = $1::uuid
          AND mission_id = 'M05'
          AND status <> 'skipped'`,
      [userId],
    );
    if (Number(prior.rows[0]?.cnt ?? "0") > 0) return false;

    // Current deposit already posted → count==1 means first qualifying deposit
    const deps = await this.db.query<{ cnt: string }>(
      `SELECT COUNT(*)::text AS cnt
         FROM public.ledger_entries e
         JOIN public.ledger_accounts a ON a.id = e.account_id
         JOIN public.ledger_journals j ON j.id = e.journal_id
        WHERE j.journal_type IN ('deposit_usdt', 'deposit_krw')
          AND e.direction = 'credit'
          AND a.owner_user_id = $1::uuid
          AND a.bucket = 'principal'`,
      [userId],
    );
    return Number(deps.rows[0]?.cnt ?? "0") <= 1;
  }

  private async isUserBlocked(userId: string): Promise<boolean> {
    const u = await this.db.query<{ status: string }>(
      `SELECT status FROM public.users WHERE id = $1::uuid`,
      [userId],
    );
    if (u.rows[0]?.status === "banned" || u.rows[0]?.status === "deleted") {
      return true;
    }
    const risk = await this.db.query<{ status: string }>(
      `SELECT status FROM public.user_risk_state WHERE user_id = $1::uuid`,
      [userId],
    );
    const s = risk.rows[0]?.status;
    return s === "frozen" || s === "banned";
  }
}
