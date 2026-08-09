/**
 * Money §51.5 — subscribe wallet deposit credits → L2 ladder (Phase0 in-process).
 * Decoupled from WalletModule imports to avoid cycles.
 */

import { Injectable, OnModuleInit } from "@nestjs/common";
import { InProcessEventBus } from "../events/in-process.bus";
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
}
