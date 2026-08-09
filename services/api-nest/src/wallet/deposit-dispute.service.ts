/**
 * Money §41.6 · §51.11 — wrong-chain / 오입금 disputes.
 * User: /me/support?category=deposit · Admin: /admin/wallet?tab=disputes
 * Credit = admin_adjust ledger · reject = journal 0 · every decide audited.
 */

import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InProcessEventBus } from "../events/in-process.bus";
import { PostgresService } from "../db/postgres";
import { formatAmount, parseAmount } from "../ledger/ledger.money";
import { LedgerPostingService } from "../ledger/ledger.posting.service";
import { LedgerProvisionService } from "../ledger/ledger.provision.service";
import { SYSTEM_ACCOUNT_CODES } from "../ledger/ledger.types";
import { containsForbiddenNetworkJargon } from "./network-plain-ko";
import { WALLET_EVENTS } from "./wallet.events";
import {
  DEPOSIT_DISPUTE_REASON_MIN,
  type DepositDisputeDecideResult,
  type DepositDisputeKind,
  type DepositDisputeStatus,
  type DepositDisputeV1,
} from "./wallet.types";

type DisputeRow = {
  id: string;
  user_id: string;
  support_ticket_id: string | null;
  kind: DepositDisputeKind;
  status: DepositDisputeStatus;
  linked_tx_hash: string;
  network_claimed_ko: string | null;
  amount_usdt: string | null;
  ledger_journal_id: string | null;
  decided_at: Date | null;
  decided_by_admin_id: string | null;
  decision_reason: string | null;
  idempotency_key: string;
  created_at: Date;
  updated_at: Date;
};

@Injectable()
export class DepositDisputeService {
  constructor(
    private readonly db: PostgresService,
    private readonly posting: LedgerPostingService,
    private readonly provision: LedgerProvisionService,
    private readonly bus: InProcessEventBus,
  ) {}

  /** POST /wallet/deposit-disputes — CS entry from §41.6 wrong-sent */
  async create(input: {
    userId: string;
    kind?: DepositDisputeKind;
    linkedTxHash: string;
    networkClaimedKo?: string;
    idempotencyKey: string;
  }): Promise<DepositDisputeV1> {
    if (!input.userId) throw new BadRequestException("userId required");
    const tx = (input.linkedTxHash ?? "").trim();
    if (tx.length < 8) {
      throw new BadRequestException("linkedTxHash minLength 8");
    }
    if (!input.idempotencyKey || input.idempotencyKey.length < 8) {
      throw new BadRequestException("idempotencyKey minLength 8");
    }
    const kind: DepositDisputeKind =
      input.kind === "mis_deposit" ? "mis_deposit" : "wrong_chain";
    const claimed = (input.networkClaimedKo ?? "").trim() || null;
    if (claimed && containsForbiddenNetworkJargon(claimed)) {
      throw new BadRequestException(
        "networkClaimedKo must be plain Korean (TRC20 forbidden)",
      );
    }

    const existing = await this.db.query<DisputeRow>(
      `SELECT ${this.columns()}
         FROM public.deposit_disputes
        WHERE idempotency_key = $1`,
      [input.idempotencyKey],
    );
    if (existing.rows[0]) return this.toV1(existing.rows[0]);

    const ticket = await this.db.query<{ id: string }>(
      `INSERT INTO public.support_tickets (
         user_id, category, subject_ko, body_ko, status,
         linked_tx_hash, sla_due_at
       ) VALUES (
         $1::uuid, 'deposit', $2, $3, 'open', $4,
         now() + interval '24 hours'
       )
       RETURNING id::text AS id`,
      [
        input.userId,
        kind === "wrong_chain" ? "잘못 보낸 입금" : "오입금 문의",
        `tx=${tx}${claimed ? ` · claimed=${claimed}` : ""}`,
        tx,
      ],
    );

    const ins = await this.db.query<DisputeRow>(
      `INSERT INTO public.deposit_disputes (
         user_id, support_ticket_id, kind, status, linked_tx_hash,
         network_claimed_ko, idempotency_key
       ) VALUES (
         $1::uuid, $2::uuid, $3, 'open', $4, $5, $6
       )
       RETURNING ${this.columns()}`,
      [
        input.userId,
        ticket.rows[0]?.id ?? null,
        kind,
        tx,
        claimed,
        input.idempotencyKey,
      ],
    );
    const row = ins.rows[0];
    if (!row) throw new ConflictException("unable to create dispute");

    const dispute = this.toV1(row);
    this.bus.emit(WALLET_EVENTS.depositDisputeSubmitted, {
      id: dispute.id,
      userId: dispute.userId,
      kind: dispute.kind,
      toastCode: "DEPOSIT_DISPUTE_SUBMITTED" as const,
    });
    return dispute;
  }

  /** GET /admin/wallet/deposit-disputes */
  async list(input: {
    status?: DepositDisputeStatus;
    limit?: number;
  }): Promise<{ items: DepositDisputeV1[] }> {
    const limit = Math.min(Math.max(input.limit ?? 50, 1), 200);
    const status = input.status;
    const r = status
      ? await this.db.query<DisputeRow>(
          `SELECT ${this.columns()}
             FROM public.deposit_disputes
            WHERE status = $1
            ORDER BY created_at DESC
            LIMIT $2`,
          [status, limit],
        )
      : await this.db.query<DisputeRow>(
          `SELECT ${this.columns()}
             FROM public.deposit_disputes
            ORDER BY created_at DESC
            LIMIT $1`,
          [limit],
        );
    return { items: r.rows.map((row) => this.toV1(row)) };
  }

  /** POST .../credit — ledger admin_adjust 1회 · audit */
  async credit(input: {
    id: string;
    adminId: string;
    amountUsdt: string;
    reason: string;
    idempotencyKey: string;
  }): Promise<DepositDisputeDecideResult> {
    if (!input.adminId) throw new BadRequestException("adminId required");
    if (!input.idempotencyKey || input.idempotencyKey.length < 8) {
      throw new BadRequestException("idempotencyKey minLength 8");
    }
    const reason = (input.reason ?? "").trim();
    if (reason.length < DEPOSIT_DISPUTE_REASON_MIN) {
      throw new BadRequestException(
        `reason minLength ${DEPOSIT_DISPUTE_REASON_MIN}`,
      );
    }
    let amount: string;
    try {
      amount = formatAmount(parseAmount(String(input.amountUsdt ?? "")));
    } catch {
      throw new BadRequestException("amountUsdt invalid");
    }
    if (parseAmount(amount) <= 0n) {
      throw new BadRequestException("amountUsdt must be > 0");
    }

    const locked = await this.requireRow(input.id);
    if (locked.status === "credited" && locked.ledger_journal_id) {
      return {
        ok: true,
        decision: "credited",
        dispute: this.toV1(locked),
        journalId: locked.ledger_journal_id,
        reused: true,
        toastCode: "DEPOSIT_DISPUTE_CREDITED",
        auditAction: "admin.deposit_dispute.credited",
      };
    }
    if (locked.status !== "open") {
      throw new ConflictException(`cannot credit status=${locked.status}`);
    }

    await this.provision.provisionUserBucketAccounts(locked.user_id);
    const ledgerKey = `deposit_dispute_credit:${locked.id}`;
    const journal = await this.posting.postJournal({
      idempotencyKey: ledgerKey,
      journalType: "admin_adjust",
      lines: [
        {
          account: { systemCode: SYSTEM_ACCOUNT_CODES.OPS_POOL },
          direction: "debit",
          amountUsdt: amount,
        },
        {
          account: { userId: locked.user_id, bucket: "principal" },
          direction: "credit",
          amountUsdt: amount,
        },
      ],
      referenceType: "deposit_dispute",
      referenceId: locked.id,
      memo: `wrong-chain credit tx=${locked.linked_tx_hash} · ${reason}`,
      createdBy: input.adminId,
    });

    const upd = await this.db.query<DisputeRow>(
      `UPDATE public.deposit_disputes SET
         status = 'credited',
         amount_usdt = $2::numeric,
         ledger_journal_id = $3::uuid,
         decided_at = now(),
         decided_by_admin_id = $4::uuid,
         decision_reason = $5,
         updated_at = now()
       WHERE id = $1::uuid AND status = 'open'
       RETURNING ${this.columns()}`,
      [locked.id, amount, journal.id, input.adminId, reason],
    );
    if (!upd.rows[0]) {
      throw new ConflictException("credit race — retry");
    }

    await this.db.query(
      `INSERT INTO public.deposit_dispute_decisions (
         dispute_id, decision, admin_id, reason, ledger_journal_id,
         amount_usdt, idempotency_key
       ) VALUES ($1::uuid, 'credit', $2::uuid, $3, $4::uuid, $5::numeric, $6)`,
      [
        locked.id,
        input.adminId,
        reason,
        journal.id,
        amount,
        input.idempotencyKey,
      ],
    );

    const dispute = this.toV1(upd.rows[0]);
    this.bus.emit(WALLET_EVENTS.depositDisputeCredited, {
      id: dispute.id,
      userId: dispute.userId,
      journalId: journal.id,
      amountUsdt: amount,
      toastCode: "DEPOSIT_DISPUTE_CREDITED" as const,
      auditAction: "admin.deposit_dispute.credited" as const,
    });

    return {
      ok: true,
      decision: "credited",
      dispute,
      journalId: journal.id,
      amountUsdt: amount,
      reused: journal.reused,
      toastCode: "DEPOSIT_DISPUTE_CREDITED",
      auditAction: "admin.deposit_dispute.credited",
    };
  }

  /** POST .../reject — ledger 0 · audit */
  async reject(input: {
    id: string;
    adminId: string;
    reason: string;
    idempotencyKey: string;
  }): Promise<DepositDisputeDecideResult> {
    if (!input.adminId) throw new BadRequestException("adminId required");
    if (!input.idempotencyKey || input.idempotencyKey.length < 8) {
      throw new BadRequestException("idempotencyKey minLength 8");
    }
    const reason = (input.reason ?? "").trim();
    if (reason.length < DEPOSIT_DISPUTE_REASON_MIN) {
      throw new BadRequestException(
        `reason minLength ${DEPOSIT_DISPUTE_REASON_MIN}`,
      );
    }

    const locked = await this.requireRow(input.id);
    if (locked.status === "rejected") {
      return {
        ok: true,
        decision: "rejected",
        dispute: this.toV1(locked),
        reused: true,
        toastCode: "DEPOSIT_DISPUTE_REJECTED",
        auditAction: "admin.deposit_dispute.rejected",
      };
    }
    if (locked.status !== "open") {
      throw new ConflictException(`cannot reject status=${locked.status}`);
    }

    const upd = await this.db.query<DisputeRow>(
      `UPDATE public.deposit_disputes SET
         status = 'rejected',
         decided_at = now(),
         decided_by_admin_id = $2::uuid,
         decision_reason = $3,
         updated_at = now()
       WHERE id = $1::uuid AND status = 'open'
       RETURNING ${this.columns()}`,
      [locked.id, input.adminId, reason],
    );
    if (!upd.rows[0]) {
      throw new ConflictException("reject race — retry");
    }

    await this.db.query(
      `INSERT INTO public.deposit_dispute_decisions (
         dispute_id, decision, admin_id, reason, idempotency_key
       ) VALUES ($1::uuid, 'reject', $2::uuid, $3, $4)`,
      [locked.id, input.adminId, reason, input.idempotencyKey],
    );

    const dispute = this.toV1(upd.rows[0]);
    this.bus.emit(WALLET_EVENTS.depositDisputeRejected, {
      id: dispute.id,
      userId: dispute.userId,
      toastCode: "DEPOSIT_DISPUTE_REJECTED" as const,
      auditAction: "admin.deposit_dispute.rejected" as const,
    });

    return {
      ok: true,
      decision: "rejected",
      dispute,
      reused: false,
      toastCode: "DEPOSIT_DISPUTE_REJECTED",
      auditAction: "admin.deposit_dispute.rejected",
    };
  }

  private async requireRow(id: string): Promise<DisputeRow> {
    const r = await this.db.query<DisputeRow>(
      `SELECT ${this.columns()}
         FROM public.deposit_disputes
        WHERE id = $1::uuid`,
      [id],
    );
    if (!r.rows[0]) throw new NotFoundException("dispute not found");
    return r.rows[0];
  }

  private columns(): string {
    return `id::text AS id,
      user_id::text AS user_id,
      support_ticket_id::text AS support_ticket_id,
      kind, status, linked_tx_hash, network_claimed_ko,
      amount_usdt::text AS amount_usdt,
      ledger_journal_id::text AS ledger_journal_id,
      decided_at, decided_by_admin_id::text AS decided_by_admin_id,
      decision_reason, idempotency_key, created_at, updated_at`;
  }

  private toV1(row: DisputeRow): DepositDisputeV1 {
    return {
      id: row.id,
      userId: row.user_id,
      kind: row.kind,
      status: row.status,
      linkedTxHash: row.linked_tx_hash,
      supportCategory: "deposit",
      supportTicketId: row.support_ticket_id ?? undefined,
      networkClaimedKo: row.network_claimed_ko ?? undefined,
      amountUsdt: row.amount_usdt ?? undefined,
      ledgerJournalId: row.ledger_journal_id ?? undefined,
      decidedAt: row.decided_at?.toISOString(),
      decidedByAdminId: row.decided_by_admin_id ?? undefined,
      decisionReason: row.decision_reason ?? undefined,
      createdAt: row.created_at.toISOString(),
      updatedAt: row.updated_at.toISOString(),
    };
  }
}
