/**
 * Money §49.2a — wallet.deposit.confirmed → feed cache invalidate signal.
 * Reclassification Owns = engine:§0.0.5.1 (Engine plan pointer only).
 * This service NEVER mutates ledger balances.
 */

import { Injectable, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { InProcessEventBus } from "../events/in-process.bus";
import { BALANCE_AWARE_CLASSIFICATION_OWNER } from "./balance-aware-fact";
import { WALLET_EVENTS } from "./wallet.events";

export type FeedCacheInvalidatePayload = {
  reason: typeof WALLET_EVENTS.depositConfirmed;
  userId: string;
  depositEventId?: string;
  classificationOwner: typeof BALANCE_AWARE_CLASSIFICATION_OWNER;
  /** Explicit: Money does not reclassify — Engine consumes this signal */
  ledgerMutated: false;
};

@Injectable()
export class FeedCacheInvalidateService
  implements OnModuleInit, OnModuleDestroy
{
  private unsubscribe: (() => void) | null = null;

  constructor(private readonly bus: InProcessEventBus) {}

  onModuleInit() {
    this.unsubscribe = this.bus.on(
      WALLET_EVENTS.depositConfirmed,
      (payload: unknown) => {
        const p = (payload ?? {}) as {
          userId?: string;
          id?: string;
        };
        const userId = String(p.userId ?? "").trim();
        if (!userId) return;

        const out: FeedCacheInvalidatePayload = {
          reason: WALLET_EVENTS.depositConfirmed,
          userId,
          depositEventId: typeof p.id === "string" ? p.id : undefined,
          classificationOwner: BALANCE_AWARE_CLASSIFICATION_OWNER,
          ledgerMutated: false,
        };
        this.bus.emit(WALLET_EVENTS.feedCacheInvalidate, out);
      },
    );
  }

  onModuleDestroy() {
    this.unsubscribe?.();
    this.unsubscribe = null;
  }

  /** Introspection for verify / health — not a user API */
  describe() {
    return {
      listens: WALLET_EVENTS.depositConfirmed,
      emits: WALLET_EVENTS.feedCacheInvalidate,
      classificationOwner: BALANCE_AWARE_CLASSIFICATION_OWNER,
      ledgerMutated: false as const,
    };
  }
}
