/**
 * Money §11.2 — minHoldingHours wash guard.
 * Applies to principal|combined principal portion only.
 * mode=profit · merge → 미적용 (24h 내에도 allow / HTTP 200).
 * Alias compliance.minHoldingHours FORBIDDEN — use deposit-config.withdrawGuards only.
 */

import { BadRequestException, Injectable } from "@nestjs/common";
import { PostgresService } from "../db/postgres";
import {
  assertAmountUsdt,
  cmpAmount,
  parseAmount,
} from "../ledger/ledger.money";
import { DepositConfigService } from "./deposit-config.service";
import type {
  MinHoldingCheckInput,
  MinHoldingCheckResult,
  WithdrawMode,
} from "./wallet.types";

const MIN_HOLDING_TOAST =
  "⏳ 원금은 충전 후 {hours}시간이 지나야 출금할 수 있어요";

@Injectable()
export class MinHoldingService {
  constructor(
    private readonly db: PostgresService,
    private readonly depositConfig: DepositConfigService,
  ) {}

  /** True when mode includes principal debit that must be holding-checked. */
  appliesToMode(mode: WithdrawMode): boolean {
    // mode === "profit" → 미적용 (24h 내에도 200)
    if (mode === "profit") return false;
    return mode === "principal" || mode === "combined";
  }

  async check(input: MinHoldingCheckInput): Promise<MinHoldingCheckResult> {
    // profit-only · merge path callers must pass mode=profit → skip
    if (!this.appliesToMode(input.mode)) {
      return { allowed: true, applied: false };
    }

    const principalRaw = input.debitPrincipalUsdt ?? "0";
    if (principalRaw === "0" || parseAmount(principalRaw) === 0n) {
      // combined with zero principal portion — treat as profit-only
      return { allowed: true, applied: false };
    }
    const debitPrincipalUsdt = assertAmountUsdt(
      principalRaw,
      "debitPrincipalUsdt",
    );

    const cfg = await this.depositConfig.requirePersisted();
    const minHoldingHours = cfg.withdrawGuards.minHoldingHours;
    const now = input.now ?? new Date();

    if (minHoldingHours === 0) {
      return {
        allowed: true,
        applied: true,
        minHoldingHours: 0,
        oldestLotConfirmedAt: now.toISOString(),
      };
    }

    const lots = await this.loadPrincipalLotsFifo(input.userId);
    if (lots.length === 0) {
      throw new BadRequestException("NO_PRINCIPAL_LOTS");
    }

    // FIFO: consume lots until covering debitPrincipalUsdt; gate on newest lot needed
    let remaining = debitPrincipalUsdt;
    let gateLotConfirmedAt: Date | null = null;
    for (const lot of lots) {
      if (cmpAmount(remaining, "0") <= 0) break;
      const take =
        cmpAmount(lot.amountUsdt, remaining) <= 0
          ? lot.amountUsdt
          : remaining;
      remaining = (() => {
        const a = parseAmount(remaining);
        const b = parseAmount(take);
        return formatNonNeg(a - b);
      })();
      gateLotConfirmedAt = lot.confirmedAt;
    }

    if (cmpAmount(remaining, "0") > 0) {
      throw new BadRequestException("INSUFFICIENT_PRINCIPAL_LOTS");
    }
    if (!gateLotConfirmedAt) {
      throw new BadRequestException("NO_PRINCIPAL_LOTS");
    }

    const unlockAt = new Date(
      gateLotConfirmedAt.getTime() + minHoldingHours * 3600_000,
    );
    if (now.getTime() >= unlockAt.getTime()) {
      return {
        allowed: true,
        applied: true,
        minHoldingHours,
        oldestLotConfirmedAt: gateLotConfirmedAt.toISOString(),
      };
    }

    const remainingMs = unlockAt.getTime() - now.getTime();
    const remainingHours = Math.max(1, Math.ceil(remainingMs / 3600_000));
    return {
      allowed: false,
      applied: true,
      code: "MIN_HOLDING",
      minHoldingHours,
      remainingHours,
      oldestLotConfirmedAt: gateLotConfirmedAt.toISOString(),
      toastKo: MIN_HOLDING_TOAST.replace("{hours}", String(minHoldingHours)),
    };
  }

  /**
   * Principal lots from credited deposits (USDT + KRW approved), FIFO by confirmedAt.
   * Amounts are deposit credits into principal bucket.
   */
  private async loadPrincipalLotsFifo(
    userId: string,
  ): Promise<Array<{ amountUsdt: string; confirmedAt: Date }>> {
    const usdt = await this.db.query<{
      amount_usdt: string;
      confirmed_at: Date;
    }>(
      `SELECT amount_usdt::text AS amount_usdt,
              COALESCE(credited_at, observed_at) AS confirmed_at
         FROM public.usdt_deposit_events
        WHERE user_id = $1::uuid
          AND status = 'ledger_credited'
          AND amount_usdt > 0
        ORDER BY COALESCE(credited_at, observed_at) ASC, id ASC`,
      [userId],
    );

    // KRW approved → principal credit via ledger journal; use decided_at as confirmedAt
    // Amount is KRW→USDT at credit time — store is ledger journal linked.
    // Until wallet KRW todo lands full FX link, approximate via journals of type deposit_krw.
    const krw = await this.db.query<{
      amount_usdt: string;
      confirmed_at: Date;
    }>(
      `SELECT e.amount_usdt::text AS amount_usdt, j.created_at AS confirmed_at
         FROM public.ledger_journals j
         JOIN public.ledger_entries e ON e.journal_id = j.id
         JOIN public.ledger_accounts a ON a.id = e.account_id
        WHERE j.journal_type = 'deposit_krw'
          AND a.owner_user_id = $1::uuid
          AND a.bucket = 'principal'
          AND e.direction = 'credit'
          AND e.amount_usdt > 0
        ORDER BY j.created_at ASC, e.id ASC`,
      [userId],
    );

    const lots = [
      ...usdt.rows.map((r) => ({
        amountUsdt: r.amount_usdt,
        confirmedAt: r.confirmed_at,
      })),
      ...krw.rows.map((r) => ({
        amountUsdt: r.amount_usdt,
        confirmedAt: r.confirmed_at,
      })),
    ].sort((a, b) => a.confirmedAt.getTime() - b.confirmedAt.getTime());

    return lots;
  }
}

function formatNonNeg(n: bigint): string {
  if (n < 0n) return "0";
  // reuse ledger formatter via string path
  const SCALE = 18;
  const s = n.toString().padStart(SCALE + 1, "0");
  const whole = s.slice(0, -SCALE) || "0";
  let frac = s.slice(-SCALE).replace(/0+$/, "");
  return frac.length ? `${whole}.${frac}` : whole;
}

/** Pure helper for verify:min-holding-scope — profit mode never blocked. */
export function minHoldingApplies(mode: WithdrawMode): boolean {
  return mode === "principal" || mode === "combined";
}
