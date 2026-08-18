/**
 * §41.3 · §43.3 — KRW PG-free deposit request + Admin approve/reject.
 * Day-1: Admin 통장 확인 후 승인/거절 · CSV Auto-Recon = L2+ (not here).
 * Approve: Debit SYS:OPS_POOL / Credit User principal · deposit_krw · 1회.
 * Reject: ledger 분개 0 · reason≥10.
 * Quote = request-time estimate only. Final credit = approval-time FX.
 */

import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from "@nestjs/common";
import { randomBytes } from "node:crypto";
import { formatAmount, parseAmount } from "../ledger/ledger.money";
import {
  SYSTEM_ACCOUNT_CODES,
  type LedgerJournalRow,
  type PostJournalInput,
} from "../ledger/ledger.types";
import {
  loadDepositFxById,
  loadLatestDepositFx,
  resolveDepositFx,
  toIso,
  type DepositFxContext,
} from "./krw-deposit.fx";
import { krwToUsdt as convertKrwToUsdt } from "./krw-deposit.money";
import { WALLET_EVENTS } from "./wallet.events";
import {
  KRW_DEPOSIT_TTL_MIN,
  KRW_REJECT_REASON_MIN,
  PAYABLE_SUFFIX_ROLE,
  type KrwDepositDecideResult,
  type KrwDepositFinalV1,
  type KrwDepositQuoteV1,
  type KrwDepositRequestV1,
  type KrwDepositStatus,
} from "./wallet.types";

type RequestRow = {
  id: string;
  user_id: string;
  requested_amount_krw: number;
  payable_amount_krw: number;
  unique_suffix_krw: number;
  deposit_code: string;
  depositor_name: string;
  status: KrwDepositStatus;
  expires_at: Date | string;
  admin_note: string | null;
  ledger_journal_id: string | null;
  idempotency_key: string;
  decided_at: Date | string | null;
  decided_by_admin_id: string | null;
  created_at: Date | string;
  quote_fx_snapshot_id: string | null;
  quote_usdt_krw: string | null;
  quote_formula_id: string | null;
  quote_fx_captured_at: Date | string | null;
  estimated_usdt: string | null;
  applied_fx_snapshot_id: string | null;
  applied_usdt_krw: string | null;
  applied_formula_id: string | null;
  applied_fx_captured_at: Date | string | null;
  credited_usdt: string | null;
};

const LEDGER_APPROVE_KEY_PREFIX = "krw_deposit_approve:";

export type KrwDepositDb = {
  query<T extends Record<string, unknown> = Record<string, unknown>>(
    text: string,
    params?: unknown[],
  ): Promise<{ rows: T[]; rowCount: number | null }>;
  withTransaction<T>(fn: (client: KrwDepositDb) => Promise<T>): Promise<T>;
};

export type KrwDepositPosting = {
  postJournal(input: PostJournalInput): Promise<LedgerJournalRow>;
  getByIdempotencyKey(key: string): Promise<LedgerJournalRow | null>;
  getJournal(journalId: string): Promise<LedgerJournalRow>;
};

export type KrwDepositHostDeps = {
  db: KrwDepositDb;
  posting: KrwDepositPosting;
  provision: { provisionUserBucketAccounts(userId: string): Promise<void> };
  bus: { emit(name: string, payload: unknown): void };
};

export class KrwDepositHost {
  private db: KrwDepositDb;
  private posting: KrwDepositPosting;
  private provision: KrwDepositHostDeps["provision"];
  private bus: KrwDepositHostDeps["bus"];

  constructor(deps: KrwDepositHostDeps) {
    this.db = deps.db;
    this.posting = deps.posting;
    this.provision = deps.provision;
    this.bus = deps.bus;
  }

  /** POST /wallet/krw-deposit-requests */
  async createRequest(input: {
    userId: string;
    requestedAmountKrw: number;
    depositorName: string;
    idempotencyKey: string;
  }): Promise<KrwDepositRequestV1> {
    if (!input.userId) throw new BadRequestException("userId required");
    if (
      !Number.isInteger(input.requestedAmountKrw) ||
      input.requestedAmountKrw < 1
    ) {
      throw new BadRequestException("requestedAmountKrw must be integer ≥1");
    }
    const name = (input.depositorName ?? "").trim();
    if (name.length < 1) {
      throw new BadRequestException("depositorName required");
    }
    if (!input.idempotencyKey || input.idempotencyKey.length < 8) {
      throw new BadRequestException("idempotencyKey minLength 8");
    }

    await this.expireStale();

    const existing = await this.db.query<RequestRow>(
      `SELECT ${this.columns()}
         FROM public.krw_deposit_requests
        WHERE idempotency_key = $1`,
      [input.idempotencyKey],
    );
    if (existing.rows[0]) return this.toV1(existing.rows[0]);

    const quoteFx = await loadLatestDepositFx(this.db);
    if (!quoteFx) {
      throw new BadRequestException("FX_SNAPSHOT_REQUIRED");
    }

    for (let attempt = 0; attempt < 12; attempt += 1) {
      const uniqueSuffixKrw = this.randomSuffix();
      const payableAmountKrw = input.requestedAmountKrw + uniqueSuffixKrw;
      const estimatedUsdt = this.krwToUsdt(payableAmountKrw, quoteFx.usdtKrw);
      const depositCode = this.randomDepositCode();
      const expiresAt = new Date(
        Date.now() + KRW_DEPOSIT_TTL_MIN * 60 * 1000,
      );

      try {
        const ins = await this.db.query<RequestRow>(
          `INSERT INTO public.krw_deposit_requests (
             user_id, requested_amount_krw, payable_amount_krw,
             unique_suffix_krw, deposit_code, depositor_name,
             status, expires_at, idempotency_key,
             quote_fx_snapshot_id, quote_usdt_krw, quote_formula_id,
             quote_fx_captured_at, estimated_usdt
           ) VALUES (
             $1::uuid, $2, $3, $4, $5, $6, 'pending', $7, $8,
             $9, $10::numeric, $11, $12::timestamptz, $13::numeric
           )
           RETURNING ${this.columns()}`,
          [
            input.userId,
            input.requestedAmountKrw,
            payableAmountKrw,
            uniqueSuffixKrw,
            depositCode,
            name,
            expiresAt.toISOString(),
            input.idempotencyKey,
            quoteFx.id,
            quoteFx.usdtKrw,
            quoteFx.formulaId,
            quoteFx.capturedAt,
            estimatedUsdt,
          ],
        );
        const row = ins.rows[0];
        const v1 = this.toV1(row);
        this.bus.emit(WALLET_EVENTS.krwDepositPending, {
          id: v1.id,
          userId: v1.userId,
          payableAmountKrw: v1.payableAmountKrw,
          toastCode: "KRW_DEPOSIT_SUBMITTED" as const,
        });
        return v1;
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        if (/idempotency_key/i.test(msg)) {
          const again = await this.db.query<RequestRow>(
            `SELECT ${this.columns()}
               FROM public.krw_deposit_requests
              WHERE idempotency_key = $1`,
            [input.idempotencyKey],
          );
          if (again.rows[0]) return this.toV1(again.rows[0]);
        }
        if (/payable_amount|unique/i.test(msg)) continue;
        throw e;
      }
    }
    throw new ConflictException("unable to allocate unique payableAmountKrw");
  }

  /** GET /admin/wallet/krw-deposit-requests */
  async list(opts: {
    status?: KrwDepositStatus;
    limit?: number;
  }): Promise<{ items: KrwDepositRequestV1[] }> {
    await this.expireStale();
    const limit = Math.min(opts.limit ?? 50, 200);
    const status = opts.status ?? "pending";
    const r = await this.db.query<RequestRow>(
      `SELECT ${this.columns()}
         FROM public.krw_deposit_requests
        WHERE status = $1
        ORDER BY created_at ASC
        LIMIT $2`,
      [status, limit],
    );
    return { items: r.rows.map((row) => this.toV1(row)) };
  }

  /** GET /wallet/krw-deposit-requests — session user only */
  async listForUser(input: {
    userId: string;
    limit?: number;
  }): Promise<{ items: KrwDepositRequestV1[] }> {
    if (!input.userId) throw new BadRequestException("userId required");
    await this.expireStale();
    const limit = Math.min(input.limit ?? 50, 200);
    const r = await this.db.query<RequestRow>(
      `SELECT ${this.columns()}
         FROM public.krw_deposit_requests
        WHERE user_id = $1::uuid
        ORDER BY created_at DESC
        LIMIT $2`,
      [input.userId, limit],
    );
    return { items: r.rows.map((row) => this.toV1(row)) };
  }

  /** GET /wallet/krw-deposit-requests/:id — own row only · else 404 */
  async getForUser(userId: string, id: string): Promise<KrwDepositRequestV1> {
    if (!userId) throw new BadRequestException("userId required");
    await this.expireStale();
    const r = await this.db.query<RequestRow>(
      `SELECT ${this.columns()}
         FROM public.krw_deposit_requests
        WHERE id = $1::uuid AND user_id = $2::uuid`,
      [id, userId],
    );
    if (!r.rows[0]) throw new NotFoundException("krw deposit request not found");
    return this.toV1(r.rows[0]);
  }

  /** POST /admin/wallet/krw-deposits/:id/approve — credit 1회 */
  async approve(input: {
    id: string;
    adminId: string;
    idempotencyKey: string;
    fxSnapshotId?: string;
  }): Promise<KrwDepositDecideResult> {
    if (!input.adminId) throw new BadRequestException("adminId required");
    if (!input.idempotencyKey || input.idempotencyKey.length < 8) {
      throw new BadRequestException("idempotencyKey minLength 8");
    }

    await this.expireStale();

    return this.db.withTransaction(async (client) => {
      const locked = await this.lockRow(client, input.id);
      const ledgerIdempotencyKey = `${LEDGER_APPROVE_KEY_PREFIX}${locked.id}`;
      const existingJournal =
        await this.posting.getByIdempotencyKey(ledgerIdempotencyKey);

      if (existingJournal) {
        const finalized = await this.finalizeFromJournal(
          client,
          locked,
          existingJournal,
          input.adminId,
        );
        return this.approvedResult(finalized, existingJournal, true);
      }

      if (locked.status === "approved" && locked.ledger_journal_id) {
        const journal = await this.posting.getJournal(locked.ledger_journal_id);
        return this.approvedResult(this.toV1(locked, this.creditEntryId(journal)), journal, true);
      }

      if (locked.status !== "pending" && locked.status !== "matched") {
        throw new ConflictException(`cannot approve status=${locked.status}`);
      }
      if (this.asDate(locked.expires_at).getTime() <= Date.now()) {
        await this.markExpired(locked.id);
        throw new ConflictException("request expired");
      }

      const fx = await this.requireFx(input.fxSnapshotId);
      const amountUsdt = this.krwToUsdt(locked.payable_amount_krw, fx.usdtKrw);
      await this.provision.provisionUserBucketAccounts(locked.user_id);

      const journal = await this.posting.postJournal({
        idempotencyKey: ledgerIdempotencyKey,
        journalType: "deposit_krw",
        lines: [
          {
            account: { systemCode: SYSTEM_ACCOUNT_CODES.OPS_POOL },
            direction: "debit",
            amountUsdt,
          },
          {
            account: { userId: locked.user_id, bucket: "principal" },
            direction: "credit",
            amountUsdt,
          },
        ],
        referenceType: "krw_deposit_request",
        referenceId: locked.id,
        memo: `KRW deposit approve payable=${locked.payable_amount_krw} · apiKey=${input.idempotencyKey}`,
        fxSnapshotId: fx.id,
        createdBy: input.adminId,
      });

      const finalized = await this.finalizeFromJournal(
        client,
        locked,
        journal,
        input.adminId,
        journal.reused ? undefined : fx,
      );
      const result = this.approvedResult(finalized, journal, journal.reused);
      if (!journal.reused) {
        this.bus.emit(WALLET_EVENTS.krwDepositApproved, {
          id: finalized.id,
          userId: finalized.userId,
          journalId: journal.id,
          ledgerEntryId: result.ledgerEntryId,
          amountUsdt: result.amountUsdt,
          toastCode: "KRW_DEPOSIT_APPROVED" as const,
          auditAction: "admin.krw_deposit.approved" as const,
        });
      }
      return result;
    });
  }

  /** POST /admin/wallet/krw-deposits/:id/reject — credit 0 */
  async reject(input: {
    id: string;
    adminId: string;
    idempotencyKey: string;
    reason: string;
  }): Promise<KrwDepositDecideResult> {
    if (!input.adminId) throw new BadRequestException("adminId required");
    if (!input.idempotencyKey || input.idempotencyKey.length < 8) {
      throw new BadRequestException("idempotencyKey minLength 8");
    }
    const reason = (input.reason ?? "").trim();
    if (reason.length < KRW_REJECT_REASON_MIN) {
      throw new BadRequestException(
        `reason minLength ${KRW_REJECT_REASON_MIN}`,
      );
    }

    await this.expireStale();

    return this.db.withTransaction(async (client) => {
      const locked = await this.lockRow(client, input.id);
      const existingJournal = await this.posting.getByIdempotencyKey(
        `${LEDGER_APPROVE_KEY_PREFIX}${locked.id}`,
      );
      if (existingJournal) {
        await this.finalizeFromJournal(
          client,
          locked,
          existingJournal,
          input.adminId,
        );
        throw new ConflictException("already credited · cannot reject");
      }
      if (locked.status === "rejected") {
        return {
          ok: true as const,
          decision: "rejected" as const,
          request: this.toV1(locked),
          reused: true,
          toastCode: "KRW_DEPOSIT_REJECTED" as const,
          auditAction: "admin.krw_deposit.rejected" as const,
        };
      }
      if (locked.status === "approved") {
        throw new ConflictException("already approved · cannot reject");
      }
      if (locked.status !== "pending" && locked.status !== "matched") {
        throw new ConflictException(`cannot reject status=${locked.status}`);
      }

      const upd = await client.query<RequestRow>(
        `UPDATE public.krw_deposit_requests SET
           status = 'rejected',
           admin_note = $2,
           decided_at = now(),
           decided_by_admin_id = $3::uuid,
           applied_fx_snapshot_id = NULL,
           applied_usdt_krw = NULL,
           applied_formula_id = NULL,
           applied_fx_captured_at = NULL,
           credited_usdt = NULL
         WHERE id = $1::uuid
           AND status IN ('pending', 'matched')
         RETURNING ${this.columns()}`,
        [locked.id, reason, input.adminId],
      );
      if (!upd.rows[0]) {
        throw new ConflictException("reject race · reload");
      }

      const request = this.toV1(upd.rows[0]);
      this.bus.emit(WALLET_EVENTS.krwDepositRejected, {
        id: request.id,
        userId: request.userId,
        reason,
        toastCode: "KRW_DEPOSIT_REJECTED" as const,
        auditAction: "admin.krw_deposit.rejected" as const,
        ledgerCredit: false,
      });

      return {
        ok: true as const,
        decision: "rejected" as const,
        request,
        reused: false,
        toastCode: "KRW_DEPOSIT_REJECTED" as const,
        auditAction: "admin.krw_deposit.rejected" as const,
      };
    });
  }

  async getById(id: string): Promise<KrwDepositRequestV1> {
    return this.toV1(await this.requireRow(id));
  }

  /**
   * creditedUsdt = trunc18(payableKrw / usdtKrw).
   * usdtKrw = fx_snapshots.usd_krw = KRW per 1 USDT. 별도 USD≈USDT 곱 없음.
   */
  krwToUsdt(payableKrw: number, usdtKrw: string): string {
    return convertKrwToUsdt(payableKrw, usdtKrw);
  }

  private approvedResult(
    request: KrwDepositRequestV1,
    journal: LedgerJournalRow,
    reused: boolean,
  ): KrwDepositDecideResult {
    const credit = journal.entries.find((e) => e.direction === "credit");
    return {
      ok: true,
      decision: "approved",
      request,
      journalId: journal.id,
      ledgerEntryId: credit?.id,
      amountUsdt: credit?.amountUsdt,
      reused,
      toastCode: "KRW_DEPOSIT_APPROVED",
      auditAction: "admin.krw_deposit.approved",
    };
  }

  private creditEntryId(journal: LedgerJournalRow): string | undefined {
    return journal.entries.find((e) => e.direction === "credit")?.id;
  }

  private async finalizeFromJournal(
    client: KrwDepositDb,
    locked: RequestRow,
    journal: LedgerJournalRow,
    adminId: string,
    knownFx?: DepositFxContext,
  ): Promise<KrwDepositRequestV1> {
    const credit = journal.entries.find((e) => e.direction === "credit");
    if (!credit) {
      throw new ConflictException("deposit journal missing credit line");
    }
    const creditedUsdt = formatAmount(parseAmount(credit.amountUsdt));
    const applied = await this.appliedFxFromJournal(journal, knownFx);

    const upd = await client.query<RequestRow>(
      `UPDATE public.krw_deposit_requests SET
         status = 'approved',
         ledger_journal_id = $2::uuid,
         decided_at = COALESCE(decided_at, now()),
         decided_by_admin_id = COALESCE(decided_by_admin_id, $3::uuid),
         admin_note = COALESCE(admin_note, 'approved'),
         applied_fx_snapshot_id = $4,
         applied_usdt_krw = $5::numeric,
         applied_formula_id = $6,
         applied_fx_captured_at = $7::timestamptz,
         credited_usdt = $8::numeric
       WHERE id = $1::uuid
       RETURNING ${this.columns()}`,
      [
        locked.id,
        journal.id,
        adminId,
        applied.id,
        applied.usdtKrw,
        applied.formulaId,
        applied.capturedAt,
        creditedUsdt,
      ],
    );
    if (!upd.rows[0]) {
      throw new ConflictException("approve finalize race · reload");
    }
    return this.toV1(upd.rows[0], credit.id);
  }

  private async appliedFxFromJournal(
    journal: LedgerJournalRow,
    knownFx?: DepositFxContext,
  ): Promise<DepositFxContext> {
    if (knownFx && (!journal.fxSnapshotId || knownFx.id === journal.fxSnapshotId)) {
      return knownFx;
    }
    if (journal.fxSnapshotId) {
      const loaded = await loadDepositFxById(this.db, journal.fxSnapshotId);
      if (loaded) return loaded;
      if (knownFx) return knownFx;
      throw new BadRequestException("fxSnapshotId not found");
    }
    if (knownFx) return knownFx;
    throw new BadRequestException("FX_SNAPSHOT_REQUIRED");
  }

  private async requireFx(fxSnapshotId?: string): Promise<DepositFxContext> {
    if (fxSnapshotId) {
      const found = await loadDepositFxById(this.db, fxSnapshotId);
      if (!found) throw new BadRequestException("fxSnapshotId not found");
      return found;
    }
    const latest = await resolveDepositFx(this.db);
    if (!latest) throw new BadRequestException("FX_SNAPSHOT_REQUIRED");
    return latest;
  }

  private async requireRow(id: string): Promise<RequestRow> {
    const r = await this.db.query<RequestRow>(
      `SELECT ${this.columns()}
         FROM public.krw_deposit_requests WHERE id = $1::uuid`,
      [id],
    );
    if (!r.rows[0]) throw new NotFoundException("krw deposit request not found");
    return r.rows[0];
  }

  private async lockRow(client: KrwDepositDb, id: string): Promise<RequestRow> {
    const r = await client.query<RequestRow>(
      `SELECT ${this.columns()}
         FROM public.krw_deposit_requests
        WHERE id = $1::uuid
        FOR UPDATE`,
      [id],
    );
    if (!r.rows[0]) throw new NotFoundException("krw deposit request not found");
    return r.rows[0];
  }

  private async expireStale(): Promise<void> {
    await this.db.query(
      `UPDATE public.krw_deposit_requests r
          SET status = 'expired'
        WHERE r.status = 'pending'
          AND r.expires_at <= now()
          AND r.ledger_journal_id IS NULL
          AND NOT EXISTS (
            SELECT 1
              FROM public.ledger_journals j
             WHERE j.idempotency_key = $1 || r.id::text
          )`,
      [LEDGER_APPROVE_KEY_PREFIX],
    );
  }

  private async markExpired(id: string): Promise<void> {
    await this.db.query(
      `UPDATE public.krw_deposit_requests
          SET status = 'expired'
        WHERE id = $1::uuid AND status = 'pending'
          AND ledger_journal_id IS NULL`,
      [id],
    );
  }

  private randomSuffix(): number {
    return (randomBytes(1)[0] % 99) + 1;
  }

  private randomDepositCode(): string {
    return randomBytes(4).toString("hex").slice(0, 8);
  }

  private asDate(value: Date | string): Date {
    return value instanceof Date ? value : new Date(value);
  }

  private positiveAmount(raw: string | null | undefined): string | undefined {
    if (raw == null || raw === "") return undefined;
    const formatted = formatAmount(parseAmount(String(raw)));
    if (formatted === "0") return undefined;
    return formatted;
  }

  private columns(): string {
    return `id::text, user_id::text, requested_amount_krw, payable_amount_krw,
            unique_suffix_krw, deposit_code, depositor_name, status,
            expires_at, admin_note, ledger_journal_id::text, idempotency_key,
            decided_at, decided_by_admin_id::text, created_at,
            quote_fx_snapshot_id, quote_usdt_krw::text, quote_formula_id,
            quote_fx_captured_at, estimated_usdt::text,
            applied_fx_snapshot_id, applied_usdt_krw::text, applied_formula_id,
            applied_fx_captured_at, credited_usdt::text`;
  }

  private toV1(row: RequestRow, ledgerEntryId?: string): KrwDepositRequestV1 {
    const estimatedUsdt = this.positiveAmount(row.estimated_usdt);
    const creditedUsdt = this.positiveAmount(row.credited_usdt);
    const quote: KrwDepositQuoteV1 | null =
      row.quote_fx_snapshot_id && row.quote_usdt_krw && estimatedUsdt
        ? {
            fxSnapshotId: row.quote_fx_snapshot_id,
            usdtKrw: row.quote_usdt_krw,
            estimatedUsdt,
            formulaId: row.quote_formula_id ?? undefined,
            capturedAt: toIso(row.quote_fx_captured_at),
          }
        : null;
    const final: KrwDepositFinalV1 | null =
      row.status === "approved" &&
      row.applied_fx_snapshot_id &&
      row.applied_usdt_krw &&
      creditedUsdt
        ? {
            appliedFxSnapshotId: row.applied_fx_snapshot_id,
            appliedUsdtKrw: row.applied_usdt_krw,
            creditedUsdt,
            appliedFormulaId: row.applied_formula_id ?? undefined,
            appliedFxCapturedAt: toIso(row.applied_fx_captured_at),
            decidedAt: toIso(row.decided_at),
            ledgerJournalId: row.ledger_journal_id ?? undefined,
          }
        : null;
    return {
      id: row.id,
      userId: row.user_id,
      requestedAmountKrw: row.requested_amount_krw,
      payableAmountKrw: row.payable_amount_krw,
      uniqueSuffixKrw: row.unique_suffix_krw,
      payableSuffixRole: PAYABLE_SUFFIX_ROLE,
      depositCode: row.deposit_code,
      depositorName: row.depositor_name,
      status: row.status,
      expiresAt: this.asDate(row.expires_at).toISOString(),
      adminNote: row.admin_note ?? undefined,
      ledgerEntryId,
      ledgerJournalId: row.ledger_journal_id ?? undefined,
      estimatedUsdt,
      quote,
      final,
      idempotencyKey: row.idempotency_key,
      createdAt: this.asDate(row.created_at).toISOString(),
      decidedAt: toIso(row.decided_at),
      decidedByAdminId: row.decided_by_admin_id ?? undefined,
    };
  }
}
