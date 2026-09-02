/**
 * Phase0 in-process wallet tick scheduler.
 * Enabled only when WALLET_TICK_SCHEDULER=1 and INTERNAL_WALLET_TICK_TOKEN is set.
 * No public inbound port — runs inside Nest process.
 */

import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from "@nestjs/common";
import { loadPhase0Env } from "../config/phase0.env";
import { ChainSweeperPhase0Service } from "./chain-sweeper.phase0.service";
import { ChainWatcherPhase0Service } from "./chain-watcher.phase0.service";
import { UsdtWithdrawBroadcastService } from "./usdt-withdraw-broadcast.service";

@Injectable()
export class WalletTickSchedulerService
  implements OnModuleInit, OnModuleDestroy
{
  private readonly log = new Logger(WalletTickSchedulerService.name);
  private timer: ReturnType<typeof setInterval> | null = null;
  private running = false;

  constructor(
    private readonly watcher: ChainWatcherPhase0Service,
    private readonly sweeper: ChainSweeperPhase0Service,
    private readonly withdrawBroadcast: UsdtWithdrawBroadcastService,
  ) {}

  onModuleInit(): void {
    const enabled = (process.env.WALLET_TICK_SCHEDULER ?? "").trim() === "1";
    const token = loadPhase0Env().internalWalletTickToken;
    if (!enabled || !token) {
      this.log.log("wallet tick scheduler idle (WALLET_TICK_SCHEDULER!=1 or token unset)");
      return;
    }
    const ms = Math.max(
      5_000,
      Number(process.env.WALLET_TICK_INTERVAL_MS ?? 15_000) || 15_000,
    );
    this.timer = setInterval(() => {
      void this.safeTick();
    }, ms);
    this.log.log(`wallet tick scheduler live intervalMs=${ms}`);
  }

  onModuleDestroy(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  describe() {
    return {
      live: this.timer != null,
      running: this.running,
    };
  }

  private async safeTick(): Promise<void> {
    if (this.running) return;
    this.running = true;
    try {
      await this.watcher.tick();
      await this.sweeper.tick({
        executor: (plan) => this.withdrawBroadcast.sweepToTreasury(plan),
      });
      await this.withdrawBroadcast.drainApprovedWithdrawals();
    } catch (err) {
      this.log.warn(`wallet tick failed: ${String(err)}`);
    } finally {
      this.running = false;
    }
  }
}
