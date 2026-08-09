/**
 * Money §49.9 E1/P24 — singleton money-ops circuit.
 * Open ⇒ withdraw / merge / participate block + CIRCUIT_OPEN toast.
 */

import {
  BadRequestException,
  Injectable,
  OnModuleInit,
} from "@nestjs/common";
import { InProcessEventBus } from "../events/in-process.bus";
import { LEDGER_EVENTS } from "../ledger/ledger.events";
import { PostgresService } from "../db/postgres";
import {
  CIRCUIT_REASON_BUCKET_INVARIANT,
  shouldOpenCircuitFromRecon,
  type CircuitState,
} from "./rules/p49_circuit";
import { RISK_EVENTS } from "./risk.events";
import type { P49RuleCode } from "./risk.types";

@Injectable()
export class MoneyCircuitService implements OnModuleInit {
  constructor(
    private readonly db: PostgresService,
    private readonly bus: InProcessEventBus,
  ) {}

  onModuleInit() {
    this.bus.on(LEDGER_EVENTS.reconMismatch, (payload) => {
      void this.onReconMismatch(payload);
    });
  }

  async getState(): Promise<CircuitState> {
    const r = await this.db.query<{
      open: boolean;
      reason_code: string | null;
      detail: string | null;
      opened_at: Date | null;
    }>(
      `SELECT open, reason_code, detail, opened_at
         FROM public.money_circuit WHERE id = 1`,
    );
    const row = r.rows[0];
    if (!row) return { open: false };
    return {
      open: row.open === true,
      reasonCode: row.reason_code,
      detail: row.detail,
      openedAt: row.opened_at ? new Date(row.opened_at).toISOString() : null,
    };
  }

  async assertMoneyOpsAllowed(): Promise<void> {
    const st = await this.getState();
    if (st.open) {
      const err = new Error("CIRCUIT_OPEN");
      (err as Error & { code: string; toastCode: string; statusCode: number }).code =
        "CIRCUIT_OPEN";
      (
        err as Error & { code: string; toastCode: string; statusCode: number }
      ).toastCode = "CIRCUIT_OPEN";
      (
        err as Error & { code: string; toastCode: string; statusCode: number }
      ).statusCode = 503;
      throw err;
    }
  }

  async open(input: {
    reasonCode: string;
    detail?: string;
    ruleCode: P49RuleCode;
    userId?: string;
  }): Promise<CircuitState> {
    await this.db.query(
      `UPDATE public.money_circuit
          SET open = true,
              reason_code = $1,
              detail = $2,
              opened_at = COALESCE(opened_at, now()),
              updated_at = now()
        WHERE id = 1`,
      [input.reasonCode, input.detail ?? null],
    );
    this.bus.emit(RISK_EVENTS.circuitOpened, {
      reasonCode: input.reasonCode,
      ruleCode: input.ruleCode,
      userId: input.userId,
      toastCode: "CIRCUIT_OPEN",
    });
    return this.getState();
  }

  async close(input: {
    adminId: string;
    reason: string;
    idempotencyKey: string;
  }): Promise<CircuitState> {
    if (!input.adminId) {
      throw new BadRequestException("adminId required");
    }
    if (!input.reason || input.reason.trim().length < 10) {
      throw new BadRequestException("reason must be ≥10 characters");
    }
    if (!input.idempotencyKey || input.idempotencyKey.length < 8) {
      throw new BadRequestException("idempotencyKey minLength 8");
    }
    await this.db.query(
      `UPDATE public.money_circuit
          SET open = false,
              reason_code = NULL,
              detail = NULL,
              opened_at = NULL,
              updated_at = now()
        WHERE id = 1`,
    );
    await this.db.query(
      `INSERT INTO public.risk_signal_actions (
         user_id, action, admin_id, reason, idempotency_key
       ) VALUES (
         NULL, 'circuit_close', $1::uuid, $2, $3
       )
       ON CONFLICT (idempotency_key) DO NOTHING`,
      [input.adminId, input.reason, input.idempotencyKey],
    );
    this.bus.emit(RISK_EVENTS.circuitClosed, {
      adminId: input.adminId,
      toastCode: "CIRCUIT_OPEN",
    });
    return this.getState();
  }

  private async onReconMismatch(payload: unknown): Promise<void> {
    const report = payload as {
      mismatches?: Array<{ code: string; userId?: string; detail?: string }>;
    };
    const mismatches = report.mismatches ?? [];
    const decision = shouldOpenCircuitFromRecon(mismatches);
    if (!decision) return;

    await this.open({
      reasonCode: CIRCUIT_REASON_BUCKET_INVARIANT,
      detail: mismatches.map((m) => `${m.code}:${m.detail ?? ""}`).join("; "),
      ruleCode: decision.ruleCode,
      userId: mismatches.find((m) => m.userId)?.userId,
    });

    // Raise queue signal for Admin risk?tab=queue
    const userId = mismatches.find((m) => m.userId)?.userId ?? null;
    await this.db.query(
      `INSERT INTO public.risk_signals (
         user_id, rule_code, severity, queue_status, detail, freeze_linked
       ) VALUES (
         $1::uuid, $2, 'p0', 'open', $3::jsonb, true
       )`,
      [
        userId,
        decision.ruleCode,
        JSON.stringify({
          reasonCode: CIRCUIT_REASON_BUCKET_INVARIANT,
          mismatches,
        }),
      ],
    );
  }
}
