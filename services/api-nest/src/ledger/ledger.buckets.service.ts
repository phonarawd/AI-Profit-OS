/**
 * §49 wallet buckets read model — projection only (ledger SoT).
 * Invariant: principal + profit + locked + practice = liabilityUsdt
 */

import { Injectable, NotFoundException } from "@nestjs/common";
import { PostgresService } from "../db/postgres";
import { addAmount, cmpAmount, formatAmount, parseAmount } from "./ledger.money";
import type { WalletBucketsView } from "./ledger.types";

@Injectable()
export class LedgerBucketsService {
  constructor(private readonly db: PostgresService) {}

  async getUserBuckets(userId: string): Promise<WalletBucketsView> {
    const r = await this.db.query<{
      user_id: string;
      principal_usdt: string;
      profit_usdt: string;
      locked_usdt: string;
      practice_usdt: string;
      liability_usdt: string;
    }>(
      `SELECT user_id::text,
              principal_usdt::text,
              profit_usdt::text,
              locked_usdt::text,
              practice_usdt::text,
              liability_usdt::text
         FROM public.wallet_buckets
        WHERE user_id = $1::uuid`,
      [userId],
    );
    const row = r.rows[0];
    if (!row) throw new NotFoundException("user buckets not found");

    const principalUsdt = formatAmount(parseAmount(row.principal_usdt));
    const profitUsdt = formatAmount(parseAmount(row.profit_usdt));
    const lockedUsdt = formatAmount(parseAmount(row.locked_usdt));
    const practiceUsdt = formatAmount(parseAmount(row.practice_usdt));
    const liabilityUsdt = formatAmount(parseAmount(row.liability_usdt));

    const sum = addAmount(
      addAmount(addAmount(principalUsdt, profitUsdt), lockedUsdt),
      practiceUsdt,
    );
    if (cmpAmount(sum, liabilityUsdt) !== 0) {
      throw new Error(
        `bucket-invariant FAIL user=${userId} sum=${sum} liability=${liabilityUsdt}`,
      );
    }

    const asOf = await this.db.query<{ id: string }>(
      `SELECT e.id::text AS id
         FROM public.ledger_entries e
         JOIN public.ledger_accounts a ON a.id = e.account_id
        WHERE a.owner_user_id = $1::uuid
        ORDER BY e.created_at DESC, e.id DESC
        LIMIT 1`,
      [userId],
    );

    return {
      userId: row.user_id,
      principalUsdt,
      profitUsdt,
      lockedUsdt,
      practiceUsdt,
      liabilityUsdt,
      asOfLedgerEntryId: asOf.rows[0]?.id ?? "none",
    };
  }
}
