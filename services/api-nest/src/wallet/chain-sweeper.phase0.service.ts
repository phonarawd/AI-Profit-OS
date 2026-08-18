/**
 * §43.2 Phase0 chain-sweeper — Nest in-process Energy + Treasury sweep.
 * Emit path = InProcessEventBus (NATS ≠ Day-1).
 *
 * Guards: Admin pause · TRX stake min · DETECTED forbidden · min amount · grace.
 * User ledger credit unchanged by sweep (internal treasury move only).
 */

import { Injectable, Logger } from "@nestjs/common";
import { InProcessEventBus } from "../events/in-process.bus";
import { PostgresService } from "../db/postgres";
import { DepositConfigService } from "./deposit-config.service";
import {
  DAY1_MIN_TRX_STAKE_FOR_SWEEPER,
  SWEEP_GRACE_SEC,
  buildEnergySweepPlan,
  evaluateSweepEligibility,
  evaluateTrxGuard,
  type SweepPlan,
  type TrxGuardDecision,
} from "./chain-sweeper.guards";
import { WALLET_EVENTS } from "./wallet.events";

type CreditedRow = {
  id: string;
  user_id: string;
  tx_hash: string;
  to_address: string;
  amount_usdt: string;
  status: string;
  credited_at: Date | null;
};

export type SweepExecutor = (plan: SweepPlan) => Promise<{
  ok: boolean;
  broadcast: boolean;
  sweepTxHash?: string;
}>;

@Injectable()
export class ChainSweeperPhase0Service {
  private readonly log = new Logger(ChainSweeperPhase0Service.name);
  private lastGuard: TrxGuardDecision | null = null;
  private lastAutoPauseAt: string | null = null;

  constructor(
    private readonly db: PostgresService,
    private readonly depositConfig: DepositConfigService,
    private readonly bus: InProcessEventBus,
  ) {}

  describe() {
    return {
      phase: 0 as const,
      bus: "in-process" as const,
      nats: false,
      graceSec: SWEEP_GRACE_SEC,
      day1MinTrxStake: DAY1_MIN_TRX_STAKE_FOR_SWEEPER,
      lastGuard: this.lastGuard,
      lastAutoPauseAt: this.lastAutoPauseAt,
      userBalanceUnchanged: true as const,
    };
  }

  /**
   * One cron tick. TRX/admin guard failure ⇒ sweepCalls === 0 (CI lock).
   */
  async tick(opts?: {
    treasuryTrxBalance?: string;
    now?: Date;
    limit?: number;
    /** Injected executor — default dry (no chain broadcast) */
    executor?: SweepExecutor;
    fetchImpl?: typeof fetch;
  }): Promise<{
    ok: true;
    bus: "in-process";
    guard: TrxGuardDecision;
    candidates: number;
    eligible: number;
    sweepCalls: number;
    swept: number;
    skipped: number;
    autoPaused: boolean;
  }> {
    const cfg = await this.depositConfig.get();
    const onchain = cfg.usdtOnchain;
    const adminPaused = onchain.sweeperPaused === true;

    const treasuryTrx =
      opts?.treasuryTrxBalance ??
      (await this.fetchTreasuryTrxBalance({
        treasuryHotAddressRef: onchain.treasuryHotAddressRef,
        tronGridBaseUrl: onchain.tronGridBaseUrl,
        tronGridApiKey: onchain.tronGridApiKey,
        fetchImpl: opts?.fetchImpl,
      }));

    const guard = evaluateTrxGuard({
      adminPaused,
      energyDelegateEnabled: onchain.energyDelegateEnabled !== false,
      treasuryTrxBalance: treasuryTrx,
      minTrxStakeForSweeper:
        onchain.minTrxStakeForSweeper ?? DAY1_MIN_TRX_STAKE_FOR_SWEEPER,
    });
    this.lastGuard = guard;

    if (!guard.allowSweep) {
      let autoPaused = false;
      if (guard.autoPause && !adminPaused) {
        try {
          await this.depositConfig.systemPauseSweeper({
            reason: `trx_guard:${guard.reason}:bal=${guard.treasuryTrxBalance}:min=${guard.minTrxStakeForSweeper}`,
          });
          autoPaused = true;
          this.lastAutoPauseAt = new Date().toISOString();
        } catch (err) {
          this.log.error(
            `systemPauseSweeper failed (sweep still blocked): ${String(err)}`,
          );
        }
        this.bus.emit(WALLET_EVENTS.sweepPausedTrxLow, {
          reason: guard.reason,
          treasuryTrxBalance: guard.treasuryTrxBalance,
          minTrxStakeForSweeper: guard.minTrxStakeForSweeper,
          toastCode: "SWEEPER_TRX_LOW" as const,
          sweepCalls: 0,
        });
      }
      this.log.warn(
        `sweeper blocked reason=${guard.reason} sweepCalls=0 trx=${guard.treasuryTrxBalance}/${guard.minTrxStakeForSweeper}`,
      );
      return {
        ok: true,
        bus: "in-process",
        guard,
        candidates: 0,
        eligible: 0,
        sweepCalls: 0,
        swept: 0,
        skipped: 0,
        autoPaused,
      };
    }

    const limit = Math.min(50, Math.max(1, opts?.limit ?? 20));
    const graceSec = SWEEP_GRACE_SEC;
    const now = opts?.now ?? new Date();
    const cutoff = new Date(now.getTime() - graceSec * 1000);

    const rows = await this.db.query<CreditedRow>(
      `SELECT id, user_id, tx_hash, to_address, amount_usdt::text, status, credited_at
         FROM public.usdt_deposit_events
        WHERE status = 'ledger_credited'
          AND credited_at IS NOT NULL
          AND credited_at <= $1
        ORDER BY credited_at ASC
        LIMIT $2`,
      [cutoff.toISOString(), limit],
    );

    const executor: SweepExecutor =
      opts?.executor ??
      (async (plan) => ({
        ok: true,
        broadcast: false,
        sweepTxHash: `dry:${plan.depositEventId}`,
      }));

    let eligible = 0;
    let sweepCalls = 0;
    let swept = 0;
    let skipped = 0;

    for (const row of rows.rows) {
      const elig = evaluateSweepEligibility({
        status: row.status,
        amountUsdt: row.amount_usdt,
        creditedAt: row.credited_at,
        now,
        graceSec,
      });
      if (!elig.eligible) {
        skipped += 1;
        continue;
      }
      eligible += 1;

      // Guard re-check immediately before execute — CI: min 미달 시 호출 0
      if (!guard.allowSweep || guard.sweepCallsAllowed === 0) {
        break;
      }

      const plan = buildEnergySweepPlan({
        depositEventId: row.id,
        userDepositAddress: row.to_address,
        treasuryHotAddressRef: onchain.treasuryHotAddressRef,
        amountUsdt: row.amount_usdt,
        energyDelegateEnabled: onchain.energyDelegateEnabled !== false,
      });

      sweepCalls += 1;
      const exec = await executor(plan);
      if (!exec.ok) {
        skipped += 1;
        continue;
      }

      const marked = await this.markSwept(row.id, exec.sweepTxHash);
      if (!marked) {
        skipped += 1;
        continue;
      }

      swept += 1;
      this.bus.emit(WALLET_EVENTS.sweepCompleted, {
        depositEventId: row.id,
        userId: row.user_id,
        txHash: row.tx_hash,
        amountUsdt: row.amount_usdt,
        sweepTxHash: exec.sweepTxHash,
        broadcast: exec.broadcast,
        userBalanceUnchanged: true,
        steps: plan.steps,
      });
    }

    return {
      ok: true,
      bus: "in-process",
      guard,
      candidates: rows.rows.length,
      eligible,
      sweepCalls,
      swept,
      skipped,
      autoPaused: false,
    };
  }

  /**
   * Resolve Treasury TRX. Secret refs without live address → "0" (forces pause
   * until Admin supplies balance override / real address binding).
   */
  async fetchTreasuryTrxBalance(opts: {
    treasuryHotAddressRef: string;
    tronGridBaseUrl: string;
    tronGridApiKey?: string;
    fetchImpl?: typeof fetch;
  }): Promise<string> {
    const addr = opts.treasuryHotAddressRef;
    // secret: refs are not on-chain addresses — require inject or env override
    if (!addr || addr.startsWith("secret:") || !/^T[1-9A-HJ-NP-Za-km-z]{33}$/.test(addr)) {
      const fromEnv = process.env.TREASURY_TRX_BALANCE;
      if (fromEnv && /^[0-9]+(\.[0-9]+)?$/.test(fromEnv)) return fromEnv;
      return "0";
    }

    const base = opts.tronGridBaseUrl.replace(/\/$/, "");
    const url = `${base}/v1/accounts/${addr}`;
    const headers: Record<string, string> = { Accept: "application/json" };
    if (opts.tronGridApiKey) {
      headers["TRON-PRO-API-KEY"] = opts.tronGridApiKey;
    }
    const fetchImpl = opts.fetchImpl ?? fetch;
    try {
      const res = await fetchImpl(url, { headers });
      if (!res.ok) return "0";
      const body = (await res.json()) as {
        data?: Array<{ balance?: number }>;
      };
      const sun = Number(body.data?.[0]?.balance ?? 0);
      if (!Number.isFinite(sun) || sun < 0) return "0";
      // 1 TRX = 1e6 sun
      const trx = sun / 1_000_000;
      return String(trx);
    } catch {
      return "0";
    }
  }

  private async markSwept(
    depositEventId: string,
    sweepTxHash?: string,
  ): Promise<boolean> {
    const r = await this.db.query<{ id: string }>(
      `UPDATE public.usdt_deposit_events SET
         status = 'swept',
         swept_at = now(),
         sweep_tx_hash = COALESCE($2, sweep_tx_hash)
       WHERE id = $1::uuid
         AND status = 'ledger_credited'
       RETURNING id`,
      [depositEventId, sweepTxHash ?? null],
    );
    return Boolean(r.rows[0]);
  }
}
