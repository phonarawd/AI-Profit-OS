/**
 * Money §49.2/§49.7 — POST /wallet/profit/merge
 * profit → principal via double-entry only (never balance+=).
 */

import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from "@nestjs/common";
import { InProcessEventBus } from "../events/in-process.bus";
import { LedgerBucketsService } from "../ledger/ledger.buckets.service";
import { assertAmountUsdt, cmpAmount } from "../ledger/ledger.money";
import { LedgerPostingService } from "../ledger/ledger.posting.service";
import type { WalletBucketsView } from "../ledger/ledger.types";
import { RiskService } from "../risk/risk.service";
import { WALLET_EVENTS } from "./wallet.events";

export type ProfitMergeInput = {
  userId: string;
  amountUsdt: string;
  idempotencyKey: string;
};

export type ProfitMergeResult = {
  ok: true;
  journalId: string;
  amountUsdt: string;
  buckets: WalletBucketsView;
  reused: boolean;
  toastCode: "MERGE_PROFIT_OK";
};

@Injectable()
export class ProfitMergeService {
  constructor(
    private readonly posting: LedgerPostingService,
    private readonly buckets: LedgerBucketsService,
    private readonly risk: RiskService,
    private readonly bus: InProcessEventBus,
  ) {}

  async merge(input: ProfitMergeInput): Promise<ProfitMergeResult> {
    if (!input.userId) throw new BadRequestException("userId required");
    if (!input.idempotencyKey || input.idempotencyKey.length < 8) {
      throw new BadRequestException("idempotencyKey minLength 8");
    }
    const amountUsdt = assertAmountUsdt(input.amountUsdt, "amountUsdt");

    // §49.9 — circuit · frozen blocks merge (P15 race uses ledger lock)
    await this.risk.assertBeforeMerge(input.userId);

    const before = await this.buckets.getUserBuckets(input.userId);
    if (cmpAmount(amountUsdt, before.profitUsdt) > 0) {
      throw new ForbiddenException({
        code: "INSUFFICIENT_PROFIT",
        toastCode: "INSUFFICIENT_PROFIT",
        statusCode: 403,
      });
    }

    const journal = await this.posting.postJournal({
      idempotencyKey: input.idempotencyKey,
      journalType: "merge_profit_to_principal",
      referenceType: "wallet_profit_merge",
      referenceId: input.userId,
      memo: "profit→principal merge",
      createdBy: input.userId,
      lines: [
        {
          account: { userId: input.userId, bucket: "profit" },
          direction: "debit",
          amountUsdt,
        },
        {
          account: { userId: input.userId, bucket: "principal" },
          direction: "credit",
          amountUsdt,
        },
      ],
    });

    const after = await this.buckets.getUserBuckets(input.userId);

    if (!journal.reused) {
      this.bus.emit(WALLET_EVENTS.profitMerged, {
        userId: input.userId,
        amountUsdt,
        journalId: journal.id,
        toastCode: "MERGE_PROFIT_OK" as const,
      });
    }

    return {
      ok: true,
      journalId: journal.id,
      amountUsdt,
      buckets: after,
      reused: journal.reused,
      toastCode: "MERGE_PROFIT_OK",
    };
  }
}
