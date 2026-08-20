/**
 * REL-015 — 유저 JWT 스코프 원장 조회. 잔액 변경 경로 0.
 */

import {
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { createRequire } from "node:module";
import { join } from "node:path";
import { PostgresService } from "../db/postgres";

const req = createRequire(__filename);
const core = req(join(__dirname, "..", "..", "ledger-user-query.core.cjs")) as {
  FORBIDDEN_KO: string;
  clampPaging: (
    limit: unknown,
    offset: unknown,
  ) => { limit: number; offset: number };
  decideJournalAccess: (
    requesterUserId: string,
    ownerUserIds: string[],
  ) => { ok: boolean; status: number; code?: string; messageKo?: string };
  toUserJournalView: (
    journal: Record<string, unknown>,
    requesterUserId: string,
  ) => Record<string, unknown>;
};

type JournalHeader = {
  id: string;
  journal_type: string;
  created_at: Date;
  reference_type: string | null;
  reference_id: string | null;
};

type EntryJoin = {
  id: string;
  direction: "debit" | "credit";
  amount_usdt: string;
  owner_user_id: string | null;
  owner_type: string;
  account_kind: string;
  bucket: string | null;
};

@Injectable()
export class LedgerUserQueryService {
  constructor(private readonly db: PostgresService) {}

  async listForUser(
    userId: string,
    paging: { limit?: string; offset?: string },
  ) {
    if (!userId) throw new UnauthorizedException("AUTH_REQUIRED");
    const { limit, offset } = core.clampPaging(paging.limit, paging.offset);

    const ids = await this.db.query<{ id: string; total: string }>(
      `WITH j AS (
         SELECT DISTINCT j.id, j.created_at
           FROM public.ledger_journals j
           JOIN public.ledger_entries e ON e.journal_id = j.id
           JOIN public.ledger_accounts a ON a.id = e.account_id
          WHERE a.owner_user_id = $1::uuid
       )
       SELECT id, COUNT(*) OVER()::text AS total
         FROM j
        ORDER BY created_at DESC
        LIMIT $2 OFFSET $3`,
      [userId, limit, offset],
    );

    const items = [];
    for (const row of ids.rows) {
      items.push(await this.loadView(userId, row.id));
    }
    return {
      items,
      total: Number(ids.rows[0]?.total ?? 0),
      limit,
      offset,
    };
  }

  async getForUser(userId: string, journalId: string) {
    if (!userId) throw new UnauthorizedException("AUTH_REQUIRED");
    const owners = await this.db.query<{ owner_user_id: string }>(
      `SELECT DISTINCT a.owner_user_id::text AS owner_user_id
         FROM public.ledger_entries e
         JOIN public.ledger_accounts a ON a.id = e.account_id
        WHERE e.journal_id = $1::uuid
          AND a.owner_user_id IS NOT NULL`,
      [journalId],
    );
    const access = core.decideJournalAccess(
      userId,
      owners.rows.map((r) => r.owner_user_id),
    );
    if (!access.ok) {
      throw new ForbiddenException(core.FORBIDDEN_KO);
    }
    return this.loadView(userId, journalId);
  }

  private async loadView(userId: string, journalId: string) {
    const header = await this.db.query<JournalHeader>(
      `SELECT id, journal_type, created_at, reference_type, reference_id
         FROM public.ledger_journals
        WHERE id = $1::uuid`,
      [journalId],
    );
    const j = header.rows[0];
    if (!j) throw new ForbiddenException(core.FORBIDDEN_KO);

    const entries = await this.db.query<EntryJoin>(
      `SELECT e.id,
              e.direction,
              e.amount_usdt::text AS amount_usdt,
              a.owner_user_id::text AS owner_user_id,
              a.owner_type,
              a.account_kind,
              a.bucket
         FROM public.ledger_entries e
         JOIN public.ledger_accounts a ON a.id = e.account_id
        WHERE e.journal_id = $1::uuid
        ORDER BY e.id ASC`,
      [journalId],
    );

    return core.toUserJournalView(
      {
        id: j.id,
        journalType: j.journal_type,
        createdAt: j.created_at.toISOString(),
        referenceType: j.reference_type,
        referenceId: j.reference_id,
        entries: entries.rows.map((e) => ({
          id: e.id,
          direction: e.direction,
          amountUsdt: e.amount_usdt,
          ownerUserId: e.owner_user_id,
          ownerType: e.owner_type,
          accountKind: e.account_kind,
          bucket: e.bucket,
        })),
      },
      userId,
    );
  }
}
