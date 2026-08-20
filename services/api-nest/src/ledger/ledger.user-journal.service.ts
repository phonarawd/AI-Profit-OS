/**
 * Consumer read projection of existing ledger journals.
 * Owner = ledger_journals/ledger_entries. Does not post, adjust, or invent money.
 */

import { BadRequestException, Injectable } from "@nestjs/common";
import { PostgresService } from "../db/postgres";
import {
  projectUserJournalItems,
  type UserJournalLineRow,
  type WalletUserJournalItemV1,
} from "./ledger.user-journal.project";

@Injectable()
export class LedgerUserJournalService {
  constructor(private readonly db: PostgresService) {}

  async listForUser(input: {
    userId: string;
    limit?: number;
    offset?: number;
  }): Promise<{ items: WalletUserJournalItemV1[] }> {
    if (!input.userId) throw new BadRequestException("userId required");
    const limit = Math.min(Math.max(input.limit ?? 50, 1), 200);
    const offset = Math.max(input.offset ?? 0, 0);

    const r = await this.db.query<UserJournalLineRow>(
      `WITH scoped AS (
         SELECT j.id, j.created_at
           FROM public.ledger_journals j
           JOIN public.ledger_entries e ON e.journal_id = j.id
           JOIN public.ledger_accounts a ON a.id = e.account_id
          WHERE a.owner_user_id = $1::uuid
            AND a.account_kind = 'user_bucket'
          GROUP BY j.id, j.created_at
          ORDER BY j.created_at DESC
          LIMIT $2 OFFSET $3
       )
       SELECT j.id,
              j.journal_type,
              j.reference_type,
              j.reference_id,
              j.created_at,
              a.owner_user_id::text AS owner_user_id,
              a.bucket,
              e.direction,
              e.amount_usdt::text AS amount_usdt
         FROM scoped s
         JOIN public.ledger_journals j ON j.id = s.id
         JOIN public.ledger_entries e ON e.journal_id = j.id
         JOIN public.ledger_accounts a ON a.id = e.account_id
        WHERE a.owner_user_id = $1::uuid
          AND a.account_kind = 'user_bucket'
        ORDER BY j.created_at DESC, e.id ASC`,
      [input.userId, limit, offset],
    );

    return {
      items: projectUserJournalItems(r.rows, input.userId),
    };
  }
}
