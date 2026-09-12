/**
 * Money §51.5 — subscribe wallet deposit credits → L2 ladder (Phase0 in-process).
 * L3 = settlement.completed (MATCH_SUCCESS 정산 후) · rewardsEnabled=false면 현금 0.
 * Decoupled from WalletModule imports to avoid cycles.
 */

import { Injectable, OnModuleInit } from "@nestjs/common";
import { InProcessEventBus } from "../events/in-process.bus";
import { SETTLEMENT_EVENTS } from "../missions/mission.events";
import { WALLET_EVENTS } from "../wallet/wallet.events";
import { ReferralLadderService } from "./referral.ladder.service";

@Injectable()
export class ReferralHooks implements OnModuleInit {
  constructor(
    private readonly bus: InProcessEventBus,
    private readonly ladder: ReferralLadderService,
  ) {}

  onModuleInit() {
    this.bus.on(WALLET_EVENTS.depositConfirmed, (payload) => {
      void this.onUsdtConfirmed(payload);
    });
    this.bus.on(WALLET_EVENTS.krwDepositApproved, (payload) => {
      void this.onKrwApproved(payload);
    });
    this.bus.on(SETTLEMENT_EVENTS.completed, (payload) => {
      void this.onSettlementCompleted(payload);
    });
  }

  private async onUsdtConfirmed(payload: unknown) {
    const p = payload as {
      userId?: string;
      amountUsdt?: string;
      creditLedger?: boolean;
    };
    if (!p?.userId || !p.amountUsdt || p.creditLedger === false) return;
    await this.ladder.onQualifyingDeposit({
      refereeUserId: p.userId,
      qualifyingDepositUsdt: String(p.amountUsdt),
      source: "usdt_deposit_confirmed",
    });
  }

  private async onKrwApproved(payload: unknown) {
    const p = payload as { userId?: string; amountUsdt?: string };
    if (!p?.userId || !p.amountUsdt) return;
    await this.ladder.onQualifyingDeposit({
      refereeUserId: p.userId,
      qualifyingDepositUsdt: String(p.amountUsdt),
      source: "krw_admin_approve",
    });
  }

  /** L3 호출부만 연결 · Day-1 rewardsEnabled=false 유지(현금 ON 아님). */
  private async onSettlementCompleted(payload: unknown) {
    const p = payload as { userId?: string };
    if (!p?.userId) return;
    try {
      await this.ladder.onMatchSuccess({ refereeUserId: p.userId });
    } catch (err) {
      console.error(
        "[ReferralHooks] onMatchSuccess failed (settlement journal unchanged)",
        err instanceof Error ? err.message : err,
      );
    }
  }
}
