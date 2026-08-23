/**
 * Money §49.9 — risk signals · user state · Admin risk?tab=queue.
 */

import {
  BadRequestException,
  ForbiddenException,
  HttpException,
  Injectable,
  ServiceUnavailableException,
} from "@nestjs/common";
import { InProcessEventBus } from "../events/in-process.bus";
import { PostgresService } from "../db/postgres";
import { LedgerBucketsService } from "../ledger/ledger.buckets.service";
import { KillSwitchService } from "../kill-switch/kill-switch.service";
import { MoneyCircuitService } from "./money-circuit.service";
import { P49_ALL_RULES, getP49Rule } from "./rules/p49_catalog";
import {
  assertPracticeNotWithdrawable,
  assertPrincipalConfirm,
  assertWithdrawBucketCeilings,
  assertWithdrawRateLimit,
  exceedsRestrictedPrincipalCap,
  type WithdrawGuardInput,
} from "./rules/p49_guards";
import { effectsForRiskStatus, toastForRiskBlock } from "./rules/p49_status";
import { RISK_EVENTS } from "./risk.events";
import type {
  P49RuleCode,
  RiskQueueV1,
  RiskSignalV1,
  RiskStatus,
  UserRiskStateV1,
} from "./risk.types";

type SignalRow = {
  id: string;
  user_id: string | null;
  rule_code: string;
  severity: string;
  queue_status: string;
  detail: Record<string, unknown>;
  freeze_linked: boolean;
  created_at: Date;
  resolved_at: Date | null;
};

type StateRow = {
  user_id: string;
  status: RiskStatus;
  reason: string | null;
  updated_at: Date;
};

@Injectable()
export class RiskService {
  constructor(
    private readonly db: PostgresService,
    private readonly bus: InProcessEventBus,
    private readonly circuit: MoneyCircuitService,
    private readonly buckets: LedgerBucketsService,
    private readonly killSwitch: KillSwitchService,
  ) {}

  catalog() {
    return {
      version: 1 as const,
      abuse: P49_ALL_RULES.filter((r) => r.kind === "abuse"),
      errors: P49_ALL_RULES.filter((r) => r.kind === "error"),
      codes: P49_ALL_RULES.map((r) => r.code),
    };
  }

  async listQueue(opts?: {
    status?: string;
    limit?: number;
  }): Promise<RiskQueueV1> {
    const status = opts?.status || "open";
    const limit = Math.min(Math.max(opts?.limit ?? 50, 1), 200);
    const statuses =
      status === "open"
        ? ["open", "auto_frozen"]
        : status === "all"
          ? ["open", "acked", "resolved", "auto_frozen"]
          : [status];

    const r = await this.db.query<SignalRow>(
      `SELECT id, user_id::text, rule_code, severity, queue_status,
              detail, freeze_linked, created_at, resolved_at
         FROM public.risk_signals
        WHERE queue_status = ANY($1::text[])
        ORDER BY created_at DESC
        LIMIT $2`,
      [statuses, limit],
    );
    const circuit = await this.circuit.getState();
    return {
      version: 1,
      tab: "queue",
      moneyCircuitOpen: circuit.open === true,
      items: r.rows.map((row) => this.toSignal(row)),
    };
  }

  async raiseSignal(input: {
    userId?: string | null;
    ruleCode: P49RuleCode;
    detail?: Record<string, unknown>;
    autoFreeze?: boolean;
  }): Promise<RiskSignalV1> {
    const def = getP49Rule(input.ruleCode);
    if (!def) throw new BadRequestException(`unknown rule ${input.ruleCode}`);

    const freeze =
      input.autoFreeze === true || def.freezeOnHit === true;
    const queueStatus = freeze && input.userId ? "auto_frozen" : "open";

    const ins = await this.db.query<SignalRow>(
      `INSERT INTO public.risk_signals (
         user_id, rule_code, severity, queue_status, detail, freeze_linked
       ) VALUES (
         $1::uuid, $2, $3, $4, $5::jsonb, $6
       )
       RETURNING id, user_id::text, rule_code, severity, queue_status,
                 detail, freeze_linked, created_at, resolved_at`,
      [
        input.userId ?? null,
        input.ruleCode,
        def.severity,
        queueStatus,
        JSON.stringify(input.detail ?? {}),
        freeze,
      ],
    );
    const signal = this.toSignal(ins.rows[0]!);

    if (freeze && input.userId) {
      await this.setUserStatus({
        userId: input.userId,
        status: "frozen",
        reason: `auto-freeze ${input.ruleCode}: ${def.title}`.slice(0, 200),
        adminId: null,
        idempotencyKey: `auto-freeze:${signal.id}`,
        signalId: signal.id,
      });
    }

    this.bus.emit(RISK_EVENTS.signalRaised, signal);
    this.bus.emit(RISK_EVENTS.queueUpdated, { tab: "queue", id: signal.id });
    return signal;
  }

  async getUserState(userId: string): Promise<UserRiskStateV1> {
    const r = await this.db.query<StateRow>(
      `SELECT user_id::text, status, reason, updated_at
         FROM public.user_risk_state
        WHERE user_id = $1::uuid`,
      [userId],
    );
    const row = r.rows[0];
    const status: RiskStatus = row?.status ?? "active";
    return {
      userId,
      status,
      reason: row?.reason ?? undefined,
      updatedAt: row
        ? new Date(row.updated_at).toISOString()
        : new Date(0).toISOString(),
      effects: effectsForRiskStatus(status),
    };
  }

  async setUserStatus(input: {
    userId: string;
    status: RiskStatus;
    reason: string;
    adminId: string | null;
    idempotencyKey: string;
    signalId?: string;
  }): Promise<UserRiskStateV1> {
    if (!input.userId) throw new BadRequestException("userId required");
    if (input.status !== "active" && (!input.reason || input.reason.trim().length < 10)) {
      throw new BadRequestException("reason must be ≥10 characters");
    }
    if (!input.idempotencyKey || input.idempotencyKey.length < 8) {
      throw new BadRequestException("idempotencyKey minLength 8");
    }

    await this.db.query(
      `INSERT INTO public.user_risk_state (
         user_id, status, reason, updated_by_admin_id, updated_at
       ) VALUES (
         $1::uuid, $2, $3, $4::uuid, now()
       )
       ON CONFLICT (user_id) DO UPDATE SET
         status = EXCLUDED.status,
         reason = EXCLUDED.reason,
         updated_by_admin_id = EXCLUDED.updated_by_admin_id,
         updated_at = now()`,
      [
        input.userId,
        input.status,
        input.status === "active" ? null : input.reason.trim(),
        input.adminId,
      ],
    );

    const action =
      input.status === "frozen"
        ? "freeze"
        : input.status === "active"
          ? "unfreeze"
          : input.status === "restricted"
            ? "restrict"
            : input.status === "flagged"
              ? "flag"
              : "ban";

    await this.db.query(
      `INSERT INTO public.risk_signal_actions (
         signal_id, user_id, action, admin_id, reason, idempotency_key
       ) VALUES (
         $1::uuid, $2::uuid, $3, $4::uuid, $5, $6
       )
       ON CONFLICT (idempotency_key) DO NOTHING`,
      [
        input.signalId ?? null,
        input.userId,
        action,
        input.adminId,
        input.reason,
        input.idempotencyKey,
      ],
    );

    const state = await this.getUserState(input.userId);
    this.bus.emit(RISK_EVENTS.userStatusChanged, state);
    if (input.status === "frozen") {
      this.bus.emit(RISK_EVENTS.freezeApplied, state);
    }
    if (input.status === "active") {
      this.bus.emit(RISK_EVENTS.unfreezeApplied, state);
    }
    return state;
  }

  async ackSignal(input: {
    signalId: string;
    adminId: string;
    idempotencyKey: string;
  }) {
    return this.transitionSignal({
      ...input,
      queueStatus: "acked",
      action: "ack",
    });
  }

  async resolveSignal(input: {
    signalId: string;
    adminId: string;
    idempotencyKey: string;
    reason: string;
  }) {
    if (!input.reason || input.reason.trim().length < 10) {
      throw new BadRequestException("reason must be ≥10 characters");
    }
    return this.transitionSignal({
      ...input,
      queueStatus: "resolved",
      action: "resolve",
      reason: input.reason,
    });
  }

  /**
   * Pre-withdraw / pre-merge gate stack for §49.9:
   * circuit → risk status → practice → ceilings → confirm → rate limit → restricted cap
   */
  async assertBeforeWithdraw(input: {
    userId: string;
    mode: "profit" | "principal" | "combined";
    amountUsdt: string;
    debitProfitUsdt: string;
    debitPrincipalUsdt: string;
    principalConfirmToken?: string;
    practiceDebitAttempt?: boolean;
    requestedBucket?: string;
  }): Promise<void> {
    await this.killSwitch.assertPath("withdraw");
    try {
      await this.circuit.assertMoneyOpsAllowed();
    } catch {
      throw new ServiceUnavailableException({
        code: "CIRCUIT_OPEN",
        toastCode: "CIRCUIT_OPEN",
        statusCode: 503,
      });
    }

    const state = await this.getUserState(input.userId);
    if (state.effects.withdrawBlocked) {
      const toast = toastForRiskBlock(state.status) ?? "ACCOUNT_FROZEN";
      throw new ForbiddenException({
        code: toast,
        toastCode: toast,
        statusCode: 403,
        ruleCode: "P18",
      });
    }

    const buckets = await this.buckets.getUserBuckets(input.userId);
    const guardInput: WithdrawGuardInput = {
      mode: input.mode,
      amountUsdt: input.amountUsdt,
      debitProfitUsdt: input.debitProfitUsdt,
      debitPrincipalUsdt: input.debitPrincipalUsdt,
      principalConfirmToken: input.principalConfirmToken,
      practiceDebitAttempt: input.practiceDebitAttempt,
      buckets: {
        principalUsdt: buckets.principalUsdt,
        profitUsdt: buckets.profitUsdt,
        lockedUsdt: buckets.lockedUsdt,
        practiceUsdt: buckets.practiceUsdt,
      },
    };

    const practiceHit = assertPracticeNotWithdrawable({
      ...guardInput,
      requestedBucket: input.requestedBucket,
    });
    if (practiceHit) {
      await this.raiseSignal({
        userId: input.userId,
        ruleCode: practiceHit.ruleCode,
        detail: { code: practiceHit.code },
      });
      throw new ForbiddenException(practiceHit);
    }

    const ceil = assertWithdrawBucketCeilings(guardInput);
    if (ceil) {
      await this.raiseSignal({
        userId: input.userId,
        ruleCode: ceil.ruleCode,
        detail: { code: ceil.code },
      });
      throw new ForbiddenException(ceil);
    }

    const confirm = assertPrincipalConfirm(guardInput);
    if (confirm) {
      throw new ForbiddenException(confirm);
    }

    const recent = await this.countRecentWithdraws(input.userId);
    const rate = assertWithdrawRateLimit(recent);
    if (rate) {
      await this.raiseSignal({
        userId: input.userId,
        ruleCode: "P9",
        detail: { count: recent },
      });
      throw new HttpException(rate, 429);
    }

    if (
      state.effects.principalWithdrawCapped &&
      Number(input.debitPrincipalUsdt) > 0
    ) {
      const today = await this.sumPrincipalWithdrawnToday(input.userId);
      if (exceedsRestrictedPrincipalCap(input.debitPrincipalUsdt, today)) {
        throw new ForbiddenException({
          code: "WITHDRAW_BLOCKED",
          toastCode: "WITHDRAW_BLOCKED",
          statusCode: 403,
          ruleCode: "P8",
        });
      }
    }
  }

  async assertBeforeMerge(userId: string): Promise<void> {
    await this.killSwitch.assertPath("merge");
    try {
      await this.circuit.assertMoneyOpsAllowed();
    } catch {
      throw new ServiceUnavailableException({
        code: "CIRCUIT_OPEN",
        toastCode: "CIRCUIT_OPEN",
        statusCode: 503,
      });
    }
    const state = await this.getUserState(userId);
    if (state.effects.mergeBlocked) {
      const toast = toastForRiskBlock(state.status) ?? "ACCOUNT_FROZEN";
      throw new ForbiddenException({
        code: toast,
        toastCode: toast,
        statusCode: 403,
      });
    }
  }

  /**
   * §51.7 / §49 P1 — practice cannot fund real participate.
   * Engine participate path must call this when practiceDebitAttempt.
   */
  async assertBeforeParticipate(input: {
    userId: string;
    practiceDebitAttempt?: boolean;
    requestedBucket?: string;
  }): Promise<void> {
    const practiceHit = assertPracticeNotWithdrawable({
      practiceDebitAttempt: input.practiceDebitAttempt,
      requestedBucket: input.requestedBucket,
      buckets: {
        principalUsdt: "0",
        profitUsdt: "0",
        lockedUsdt: "0",
        practiceUsdt: "0",
      },
    });
    if (practiceHit) {
      await this.raiseSignal({
        userId: input.userId,
        ruleCode: practiceHit.ruleCode,
        detail: { code: practiceHit.code, path: "participate" },
      });
      throw new ForbiddenException(practiceHit);
    }

    await this.killSwitch.assertPath("matching");
    try {
      await this.circuit.assertMoneyOpsAllowed();
    } catch {
      throw new ServiceUnavailableException({
        code: "CIRCUIT_OPEN",
        toastCode: "CIRCUIT_OPEN",
        statusCode: 503,
      });
    }
    const state = await this.getUserState(input.userId);
    if (state.effects.participateBlocked) {
      const toast = toastForRiskBlock(state.status) ?? "ACCOUNT_FROZEN";
      throw new ForbiddenException({
        code: toast,
        toastCode: toast,
        statusCode: 403,
      });
    }
  }

  private async transitionSignal(input: {
    signalId: string;
    adminId: string;
    idempotencyKey: string;
    queueStatus: "acked" | "resolved";
    action: "ack" | "resolve";
    reason?: string;
  }) {
    const upd = await this.db.query<SignalRow>(
      `UPDATE public.risk_signals
          SET queue_status = $2,
              resolved_at = CASE WHEN $2 = 'resolved' THEN now() ELSE resolved_at END,
              resolved_by_admin_id = $3::uuid
        WHERE id = $1::uuid
        RETURNING id, user_id::text, rule_code, severity, queue_status,
                  detail, freeze_linked, created_at, resolved_at`,
      [input.signalId, input.queueStatus, input.adminId],
    );
    if (!upd.rows[0]) throw new BadRequestException("signal not found");
    const actionReason =
      input.reason && input.reason.trim().length >= 10
        ? input.reason.trim()
        : input.action === "resolve"
          ? "resolved after admin review"
          : null;

    await this.db.query(
      `INSERT INTO public.risk_signal_actions (
         signal_id, user_id, action, admin_id, reason, idempotency_key
       ) VALUES (
         $1::uuid, $2::uuid, $3, $4::uuid, $5, $6
       )
       ON CONFLICT (idempotency_key) DO NOTHING`,
      [
        input.signalId,
        upd.rows[0].user_id,
        input.action,
        input.adminId,
        actionReason,
        input.idempotencyKey,
      ],
    );
    const signal = this.toSignal(upd.rows[0]);
    this.bus.emit(RISK_EVENTS.queueUpdated, { tab: "queue", id: signal.id });
    return signal;
  }

  private async countRecentWithdraws(userId: string): Promise<number> {
    const r = await this.db.query<{ c: string }>(
      `SELECT count(*)::text AS c
         FROM public.withdraw_intents
        WHERE user_id = $1::uuid
          AND created_at > now() - interval '1 minute'`,
      [userId],
    );
    return Number(r.rows[0]?.c ?? 0);
  }

  private async sumPrincipalWithdrawnToday(userId: string): Promise<string> {
    const r = await this.db.query<{ s: string }>(
      `SELECT COALESCE(sum(debit_principal_usdt), 0)::text AS s
         FROM public.withdraw_intents
        WHERE user_id = $1::uuid
          AND created_at::date = (now() AT TIME ZONE 'Asia/Seoul')::date
          AND status NOT IN ('rejected', 'failed_refund_buckets')`,
      [userId],
    );
    return r.rows[0]?.s ?? "0";
  }

  private toSignal(row: SignalRow): RiskSignalV1 {
    return {
      id: row.id,
      userId: row.user_id,
      ruleCode: row.rule_code as P49RuleCode,
      severity: row.severity as RiskSignalV1["severity"],
      queueStatus: row.queue_status as RiskSignalV1["queueStatus"],
      detail: row.detail ?? {},
      freezeLinked: row.freeze_linked === true,
      createdAt: new Date(row.created_at).toISOString(),
      resolvedAt: row.resolved_at
        ? new Date(row.resolved_at).toISOString()
        : null,
    };
  }
}
