/**
 * Money §49.3 — WithdrawIntent create with fixed guard order.
 * Guard #1 withdrawApplyBlocked · #2 KYC · #3 step-up · mode/confirm checks.
 * Ledger posting (auth_ok → ledger_posted) = principal-profit-withdraw follow-up.
 * 매칭 수익은 내부 장부 잔액이다. 실USDT/실KRW는 이 출금 경로의 broadcast에서만 나간다.
 * broadcast 전에 hot wallet/treasury 실잔액이 출금액보다 부족하면 fail-closed.
 */

import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
} from "@nestjs/common";
import type { PoolClient } from "pg";
import { InProcessEventBus } from "../events/in-process.bus";
import { PostgresService } from "../db/postgres";
import {
  assertFingerprintMatch,
  fingerprintPayload,
  withdrawIntentSemantic,
} from "../ledger/idempotency-fingerprint";
import { assertAmountUsdt, cmpAmount, parseAmount } from "../ledger/ledger.money";
import { RiskService } from "../risk/risk.service";
import {
  assertWithdrawApplyAllowed,
  WITHDRAW_APPLY_BLOCKED,
} from "./withdraw-apply-block";
import { MinHoldingService } from "./min-holding.service";
import { WALLET_EVENTS } from "./wallet.events";
import { WithdrawFeeService } from "./withdraw-fee.service";
import { WithdrawKycGuard } from "./withdraw-kyc.guard";
import { WithdrawStepUpService } from "./withdraw-stepup.service";
import type { WithdrawAsset, WithdrawMode } from "./wallet.types";
import type { WithdrawStepUpMethod } from "./withdraw-stepup.policy";
import {
  assertCanBroadcast,
  type TreasurySolvencyInput,
} from "./withdraw-treasury-solvency";
import {
  WITHDRAW_IN_FLIGHT_STATUSES,
  WITHDRAW_RESERVE_LOCK_KEY,
  evaluateWithdrawReservation,
  readTreasuryObservation,
} from "./withdraw-coverage";

type CapabilityRow = {
  withdraw_apply_blocked: boolean;
};

type IntentRow = {
  id: string;
  user_id: string;
  mode: WithdrawMode;
  amount_usdt: string;
  asset: WithdrawAsset;
  debit_profit_usdt: string;
  debit_principal_usdt: string;
  require_principal_confirm: boolean;
  principal_confirm_token: string | null;
  status: string;
  idempotency_key: string;
  withdraw_fee_usdt: string | null;
  step_up_method: WithdrawStepUpMethod | null;
  step_up_verified_at: Date | null;
  created_at: Date;
  destination: string | null;
};

export type WithdrawIntentCreateInput = {
  userId: string;
  mode?: WithdrawMode;
  amountUsdt: string;
  asset: WithdrawAsset;
  debitProfitUsdt?: string;
  debitPrincipalUsdt?: string;
  principalConfirmToken?: string;
  /** §51.7 / §49 P1 — client tried to debit practice */
  practiceDebitAttempt?: boolean;
  requestedBucket?: string;
  idempotencyKey: string;
  stepUpToken: string;
  destination?: string;
};

export type WithdrawIntentV1 = {
  id: string;
  userId: string;
  mode: WithdrawMode;
  amountUsdt: string;
  asset: WithdrawAsset;
  debitProfitUsdt: string;
  debitPrincipalUsdt: string;
  requirePrincipalConfirm: boolean;
  principalConfirmToken?: string;
  idempotencyKey: string;
  withdrawFeeUsdt: string;
  status: string;
  stepUpMethod?: WithdrawStepUpMethod;
  createdAt: string;
  toastCode: "WITHDRAW_SUBMITTED";
};

@Injectable()
export class WithdrawIntentService {
  constructor(
    private readonly db: PostgresService,
    private readonly kycGuard: WithdrawKycGuard,
    private readonly stepUp: WithdrawStepUpService,
    private readonly fee: WithdrawFeeService,
    private readonly risk: RiskService,
    private readonly minHolding: MinHoldingService,
    private readonly bus: InProcessEventBus,
  ) {}

  /** 실자금 전송 직전. 잔액 미관측·스테일·부족·서명기 미바인딩이면 전송 0. */
  evaluateBroadcastReadiness(
    input: TreasurySolvencyInput & { signerBound: boolean },
  ) {
    return assertCanBroadcast(input);
  }

  /**
   * §49.3 server guards (order fixed):
   * 1 withdrawApplyBlocked · 2 KYC · 3 step-up · §49.9 risk · minHolding · insert
   */
  async create(input: WithdrawIntentCreateInput): Promise<WithdrawIntentV1> {
    if (!input.userId) throw new BadRequestException("userId required");
    if (!input.idempotencyKey || input.idempotencyKey.length < 8) {
      throw new BadRequestException("idempotencyKey minLength 8");
    }
    if (!input.stepUpToken) {
      throw new ForbiddenException({
        code: "WITHDRAW_STEP_UP_REQUIRED",
        toastCode: "WITHDRAW_STEP_UP_REQUIRED",
        statusCode: 403,
      });
    }

    const mode: WithdrawMode = input.mode ?? "profit";
    if (mode !== "profit" && mode !== "principal" && mode !== "combined") {
      throw new BadRequestException("invalid mode");
    }
    if (input.asset !== "USDT" && input.asset !== "KRW") {
      throw new BadRequestException("invalid asset");
    }

    const amountUsdt = assertAmountUsdt(input.amountUsdt, "amountUsdt");
    if (parseAmount(amountUsdt) <= 0n) {
      throw new BadRequestException("amountUsdt must be > 0");
    }

    // ── Guard #1 · Admin §9.8.4a ─────────────────────────────
    await this.assertNotApplyBlocked(input.userId);

    // ── Guard #2 · KYC §42 ──────────────────────────────────
    await this.kycGuard.assertBeforeWithdraw(input.userId);

    // ── Guard #3 · WebAuthn/OTP/PIN §43.6 ────────────────────
    this.stepUp.assertStepUpToken({
      userId: input.userId,
      stepUpToken: input.stepUpToken,
    });

    const { debitProfitUsdt, debitPrincipalUsdt, requirePrincipalConfirm } =
      this.resolveDebits(mode, amountUsdt, input);

    // ── §49.9 / §51.7 P1 — practice path 403 PRACTICE_NOT_WITHDRAWABLE ──
    await this.risk.assertBeforeWithdraw({
      userId: input.userId,
      mode,
      amountUsdt,
      debitProfitUsdt,
      debitPrincipalUsdt,
      principalConfirmToken: input.principalConfirmToken,
      practiceDebitAttempt: input.practiceDebitAttempt === true,
      requestedBucket: input.requestedBucket,
    });

    if (requirePrincipalConfirm) {
      const tok = (input.principalConfirmToken || "").trim();
      if (!tok || tok.length < 8) {
        throw new ForbiddenException({
          code: "PRINCIPAL_CONFIRM_REQUIRED",
          toastCode: "WITHDRAW_PRINCIPAL_WARN",
          statusCode: 403,
        });
      }
    }

    // ── P8 · §11.2 minHolding (principal|combined only) ──
    const holding = await this.minHolding.check({
      userId: input.userId,
      mode,
      debitPrincipalUsdt,
    });
    if (!holding.allowed) {
      throw new ForbiddenException({
        code: "MIN_HOLDING",
        toastCode: "MIN_HOLDING",
        statusCode: 403,
        ruleCode: "P8",
        toastKo: holding.toastKo,
        remainingHours: holding.remainingHours,
      });
    }

    const feeQuote = await this.fee.quote({
      asset: input.asset,
      mode,
    });

    const existing = await this.db.query<IntentRow>(
      `SELECT ${this.columns()}
         FROM public.withdraw_intents
        WHERE idempotency_key = $1`,
      [input.idempotencyKey],
    );
    if (existing.rows[0]) {
      this.assertSameWithdrawIntent(existing.rows[0], {
        userId: input.userId,
        mode,
        asset: input.asset,
        amountUsdt,
        destination: input.destination ?? null,
        debitProfitUsdt,
        debitPrincipalUsdt,
      });
      return this.toV1(existing.rows[0], feeQuote.withdrawFeeUsdt);
    }

    const step = await this.stepUp.consumeStepUpToken({
      userId: input.userId,
      stepUpToken: input.stepUpToken,
    });

    try {
      const { row, reserved } = await this.db.withTransaction(async (client) => {
        await client.query("SELECT pg_advisory_xact_lock($1)", [
          WITHDRAW_RESERVE_LOCK_KEY,
        ]);
        const raced = await client.query<IntentRow>(
          `SELECT ${this.columns()}
             FROM public.withdraw_intents
            WHERE idempotency_key = $1`,
          [input.idempotencyKey],
        );
        if (raced.rows[0]) {
          return { row: raced.rows[0], reserved: false };
        }
        const snapshot = await this.loadCoverageSnapshot(client);
        const decision = evaluateWithdrawReservation({
          ...snapshot,
          requestAmountUsdt: amountUsdt,
          requestFeeUsdt: feeQuote.withdrawFeeUsdt,
        });
        if (!decision.ok) {
          throw new ForbiddenException({
            code: decision.code,
            toastCode: decision.code,
            statusCode: 403,
          });
        }
        const ins = await client.query<IntentRow>(
          `INSERT INTO public.withdraw_intents (
             user_id, mode, amount_usdt, asset,
             debit_profit_usdt, debit_principal_usdt,
             require_principal_confirm, principal_confirm_token,
             status, destination, idempotency_key, withdraw_fee_usdt,
             step_up_method, step_up_verified_at
           ) VALUES (
             $1::uuid, $2, $3::numeric, $4,
             $5::numeric, $6::numeric,
             $7, $8,
             'auth_ok', $9, $10, $11::numeric,
             $12, now()
           )
           RETURNING ${this.columns()}`,
          [
            input.userId,
            mode,
            amountUsdt,
            input.asset,
            debitProfitUsdt,
            debitPrincipalUsdt,
            requirePrincipalConfirm,
            input.principalConfirmToken ?? null,
            input.destination ?? null,
            input.idempotencyKey,
            feeQuote.withdrawFeeUsdt,
            step.method,
          ],
        );
        return { row: ins.rows[0]!, reserved: true };
      });
      this.assertSameWithdrawIntent(row, {
        userId: input.userId,
        mode,
        asset: input.asset,
        amountUsdt,
        destination: input.destination ?? null,
        debitProfitUsdt,
        debitPrincipalUsdt,
      });
      const v1 = this.toV1(row, feeQuote.withdrawFeeUsdt);
      if (reserved) {
        this.bus.emit(WALLET_EVENTS.withdrawIntentCreated, {
          id: v1.id,
          userId: v1.userId,
          mode: v1.mode,
          amountUsdt: v1.amountUsdt,
          stepUpMethod: step.method,
          toastCode: "WITHDRAW_SUBMITTED" as const,
          auditAction: "wallet.withdraw_intent.created",
        });
      }
      return v1;
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      if (/idempotency_key/i.test(msg)) {
        const again = await this.db.query<IntentRow>(
          `SELECT ${this.columns()}
             FROM public.withdraw_intents
            WHERE idempotency_key = $1`,
          [input.idempotencyKey],
        );
        if (again.rows[0]) {
          this.assertSameWithdrawIntent(again.rows[0], {
            userId: input.userId,
            mode,
            asset: input.asset,
            amountUsdt,
            destination: input.destination ?? null,
            debitProfitUsdt,
            debitPrincipalUsdt,
          });
          return this.toV1(again.rows[0], feeQuote.withdrawFeeUsdt);
        }
        throw new ConflictException("idempotency conflict");
      }
      throw e;
    }
  }

  /** Guard #1 only — used by adapters / verify */
  async assertNotApplyBlocked(userId: string): Promise<void> {
    const r = await this.db.query<CapabilityRow>(
      `SELECT withdraw_apply_blocked
         FROM public.user_capability
        WHERE user_id = $1::uuid`,
      [userId],
    );
    const blocked = r.rows[0]?.withdraw_apply_blocked === true;
    const problem = assertWithdrawApplyAllowed({
      withdrawApplyBlocked: blocked,
    });
    if (problem) {
      throw new ForbiddenException({
        code: WITHDRAW_APPLY_BLOCKED,
        toastCode: WITHDRAW_APPLY_BLOCKED,
        message: WITHDRAW_APPLY_BLOCKED,
        statusCode: 403,
      });
    }
  }

  private resolveDebits(
    mode: WithdrawMode,
    amountUsdt: string,
    input: WithdrawIntentCreateInput,
  ): {
    debitProfitUsdt: string;
    debitPrincipalUsdt: string;
    requirePrincipalConfirm: boolean;
  } {
    if (mode === "profit") {
      return {
        debitProfitUsdt: amountUsdt,
        debitPrincipalUsdt: "0",
        requirePrincipalConfirm: false,
      };
    }
    if (mode === "principal") {
      return {
        debitProfitUsdt: "0",
        debitPrincipalUsdt: amountUsdt,
        requirePrincipalConfirm: true,
      };
    }
    // combined — client may split; server validates sum
    const profit = assertAmountUsdt(
      input.debitProfitUsdt ?? "0",
      "debitProfitUsdt",
    );
    const principal = assertAmountUsdt(
      input.debitPrincipalUsdt ?? "0",
      "debitPrincipalUsdt",
    );
    const sum = parseAmount(profit) + parseAmount(principal);
    if (sum !== parseAmount(amountUsdt)) {
      throw new BadRequestException(
        "combined debitProfitUsdt+debitPrincipalUsdt must equal amountUsdt",
      );
    }
    if (cmpAmount(principal, "0") <= 0) {
      throw new BadRequestException(
        "combined requires debitPrincipalUsdt > 0",
      );
    }
    return {
      debitProfitUsdt: profit,
      debitPrincipalUsdt: principal,
      requirePrincipalConfirm: true,
    };
  }

  private async loadCoverageSnapshot(
    client: PoolClient,
  ): Promise<{
    principalUsdt: string;
    profitUsdt: string;
    lockedUsdt: string;
    pendingRefundUsdt: string;
    otherReturnableUsdt: string;
    reservedWithdrawalUsdt: string;
    treasurySpendableUsdt: string | null;
    treasurySourceFresh: boolean;
    worstCaseFeeUsdt: string;
    safetyBufferUsdt: string;
  }> {
    const observed = readTreasuryObservation();
    let principalUsdt = "0";
    let profitUsdt = "0";
    let lockedUsdt = "0";
    try {
      const buckets = await client.query<{
        principal: string;
        profit: string;
        locked: string;
      }>(
        `SELECT COALESCE(SUM(principal_usdt), 0)::text AS principal,
                COALESCE(SUM(profit_usdt), 0)::text AS profit,
                COALESCE(SUM(locked_usdt), 0)::text AS locked
           FROM public.wallet_buckets`,
      );
      principalUsdt = buckets.rows[0]?.principal ?? "0";
      profitUsdt = buckets.rows[0]?.profit ?? "0";
      lockedUsdt = buckets.rows[0]?.locked ?? "0";
    } catch {
      throw new ForbiddenException({
        code: "TREASURY_BALANCE_UNKNOWN",
        toastCode: "TREASURY_BALANCE_UNKNOWN",
        statusCode: 403,
      });
    }
    const reserved = await client.query<{
      amt: string;
      fee: string;
    }>(
      `SELECT COALESCE(SUM(amount_usdt), 0)::text AS amt,
              COALESCE(SUM(withdraw_fee_usdt), 0)::text AS fee
         FROM public.withdraw_intents
        WHERE status = ANY($1::text[])`,
      [WITHDRAW_IN_FLIGHT_STATUSES],
    );
    return {
      principalUsdt,
      profitUsdt,
      lockedUsdt,
      pendingRefundUsdt: "0",
      otherReturnableUsdt: "0",
      reservedWithdrawalUsdt: reserved.rows[0]?.amt ?? "0",
      treasurySpendableUsdt: observed.treasurySpendableUsdt,
      treasurySourceFresh: observed.treasurySourceFresh,
      worstCaseFeeUsdt: reserved.rows[0]?.fee ?? "0",
      safetyBufferUsdt: observed.safetyBufferUsdt,
    };
  }

  private columns(): string {
    return `id, user_id, mode, amount_usdt::text, asset,
            debit_profit_usdt::text, debit_principal_usdt::text,
            require_principal_confirm, principal_confirm_token,
            status, destination, idempotency_key, withdraw_fee_usdt::text,
            step_up_method, step_up_verified_at, created_at`;
  }

  private assertSameWithdrawIntent(
    row: IntentRow,
    incoming: {
      userId: string;
      mode: WithdrawMode;
      asset: WithdrawAsset;
      amountUsdt: string;
      destination: string | null;
      debitProfitUsdt: string;
      debitPrincipalUsdt: string;
    },
  ): void {
    assertFingerprintMatch({
      stored: fingerprintPayload(
        withdrawIntentSemantic({
          userId: String(row.user_id),
          mode: row.mode,
          asset: row.asset,
          amountUsdt: String(row.amount_usdt),
          destination: row.destination ?? null,
          debitProfitUsdt: String(row.debit_profit_usdt),
          debitPrincipalUsdt: String(row.debit_principal_usdt),
        }),
      ),
      incoming: fingerprintPayload(withdrawIntentSemantic(incoming)),
    });
  }

  private toV1(row: IntentRow, feeFallback: string): WithdrawIntentV1 {
    return {
      id: row.id,
      userId: row.user_id,
      mode: row.mode,
      amountUsdt: row.amount_usdt,
      asset: row.asset,
      debitProfitUsdt: row.debit_profit_usdt,
      debitPrincipalUsdt: row.debit_principal_usdt,
      requirePrincipalConfirm: row.require_principal_confirm,
      principalConfirmToken: row.principal_confirm_token ?? undefined,
      idempotencyKey: row.idempotency_key,
      withdrawFeeUsdt: row.withdraw_fee_usdt ?? feeFallback,
      status: row.status,
      stepUpMethod: row.step_up_method ?? undefined,
      createdAt: new Date(row.created_at).toISOString(),
      toastCode: "WITHDRAW_SUBMITTED",
    };
  }
}
