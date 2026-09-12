/**
 * 입금 확정·KRW 승인·settlement.completed → resolveMembership 재적용.
 * 정산 저널/Rule과 분리 — 실패해도 원장 되돌리지 않음.
 */

import { Injectable, OnModuleInit } from "@nestjs/common";
import { InProcessEventBus } from "../events/in-process.bus";
import { SETTLEMENT_EVENTS } from "../missions/mission.events";
import { WALLET_EVENTS } from "../wallet/wallet.events";
import { MembershipRuntimeService } from "./membership.runtime.service";

@Injectable()
export class MembershipHooks implements OnModuleInit {
  constructor(
    private readonly bus: InProcessEventBus,
    private readonly runtime: MembershipRuntimeService,
  ) {}

  onModuleInit() {
    this.bus.on(WALLET_EVENTS.depositConfirmed, (payload) => {
      void this.reapplyFromPayload(payload, "depositConfirmed");
    });
    this.bus.on(WALLET_EVENTS.krwDepositApproved, (payload) => {
      void this.reapplyFromPayload(payload, "krwDepositApproved");
    });
    this.bus.on(SETTLEMENT_EVENTS.completed, (payload) => {
      void this.reapplyFromPayload(payload, "settlement.completed");
    });
  }

  private async reapplyFromPayload(
    payload: unknown,
    source: string,
  ): Promise<void> {
    const p = payload as { userId?: string; creditLedger?: boolean };
    if (!p?.userId) return;
    if (source === "depositConfirmed" && p.creditLedger === false) return;
    try {
      await this.runtime.reapplyFromLedger(p.userId);
    } catch (err) {
      console.error(
        "[MembershipHooks] reapplyFromLedger failed (ledger unchanged)",
        source,
        err instanceof Error ? err.message : err,
      );
    }
  }
}
