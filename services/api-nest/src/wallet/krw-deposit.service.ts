/**
 * §41.3 · §43.3 — KRW PG-free deposit request + Admin approve/reject.
 * Day-1: Admin 통장 확인 후 승인/거절 · CSV Auto-Recon = L2+ (not here).
 * Approve: Debit SYS:OPS_POOL / Credit User principal · deposit_krw · 1회.
 * Reject: ledger 분개 0 · reason≥10.
 */

import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { randomBytes, randomInt } from "node:crypto";
import { InProcessEventBus } from "../events/in-process.bus";
import { PostgresService } from "../db/postgres";
import {
  assertFingerprintMatch,
  fingerprintPayload,
  krwDepositSemantic,
} from "../ledger/idempotency-fingerprint";
import { formatAmount, parseAmount } from "../ledger/ledger.money";
import { LedgerPostingService } from "../ledger/ledger.posting.service";
import { LedgerProvisionService } from "../ledger/ledger.provision.service";
import { SYSTEM_ACCOUNT_CODES } from "../ledger/ledger.types";
import { KillSwitchService } from "../kill-switch/kill-switch.service";
import { DepositConfigService } from "./deposit-config.service";
import { WALLET_EVENTS } from "./wallet.events";
import {
  KRW_DEPOSIT_TTL_MIN,
  KRW_REJECT_REASON_MIN,
  type KrwDepositDecideResult,
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
  expires_at: Date;
  admin_note: string | null;
  ledger_journal_id: string | null;
  idempotency_key: string;
  decided_at: Date | null;
  decided_by_admin_id: string | null;
  created_at: Date;
};

@Injectable()
export class KrwDepositService {
  constructor(
    private readonly db: PostgresService,
    private readonly posting: LedgerPostingService,
    private readonly provision: LedgerProvisionService,
    private readonly bus: InProcessEventBus,
    private readonly killSwitch: KillSwitchService,
    private readonly depositConfig: DepositConfigService,
  ) {}

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

    await this.killSwitch.assertPath("deposit");
    await this.depositConfig.requirePersisted();
    await this.expireStale();

    const existing = await this.db.query<RequestRow>(
      `SELECT ${this.columns()}
         FROM public.krw_deposit_requests
        WHERE idempotency_key = $1`,
      [input.idempotencyKey],
    );
    if (existing.rows[0]) {
      this.assertSameKrwIntent(existing.rows[0], input, name);
      return this.toV1(existing.rows[0]);
    }

    for (let attempt = 0; attempt < 12; attempt += 1) {
      const uniqueSuffixKrw = this.randomSuffix();
      const payableAmountKrw = input.requestedAmountKrw + uniqueSuffixKrw;
      const depositCode = this.randomDepositCode();
      const expiresAt = new Date(
        Date.now() + KRW_DEPOSIT_TTL_MIN * 60 * 1000,
      );

      try {
        const ins = await this.db.query<RequestRow>(
          `INSERT INTO public.krw_deposit_requests (
             user_id, requested_amount_krw, payable_amount_krw,
             unique_suffix_krw, deposit_code, depositor_name,
             status, expires_at, idempotency_key
           ) VALUES (
             $1::uuid, $2, $3, $4, $5, $6, 'pending', $7, $8
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
          if (again.rows[0]) {
            this.assertSameKrwIntent(again.rows[0], input, name);
            return this.toV1(again.rows[0]);
          }
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

  /** POST /admin/wallet/krw-deposits/:id/approve — credit 1회 */
  async approve(input: {
    id: string;
    adminId: string;
    idempotencyKey: string;
    fxSnapshotId?: string;
  }): Promise<KrwDepositDecideResult> {
    if (!input.adminId) throw new BadRequestException("adminId required");
    await this.depositConfig.requirePersisted();
    if (!input.idempotencyKey || input.idempotencyKey.length < 8) {
      throw new BadRequestException("idempotencyKey minLength 8");
    }

    await this.expireStale();

    const locked = await this.requireRow(input.id);
    if (locked.status === "approved" && locked.ledger_journal_id) {
      const journal = await this.posting.getJournal(locked.ledger_journal_id);
      const creditEntry = journal.entries.find((e) => e.direction === "credit");
      return {
        ok: true,
        decision: "approved",
        request: this.toV1(locked, creditEntry?.id),
        journalId: journal.id,
        ledgerEntryId: creditEntry?.id,
        amountUsdt: creditEntry?.amountUsdt,
        reused: true,
        toastCode: "KRW_DEPOSIT_APPROVED",
        auditAction: "admin.krw_deposit.approved",
      };
    }
    if (locked.status !== "pending" && locked.status !== "matched") {
      throw new ConflictException(
        `cannot approve status=${locked.status}`,
      );
    }
    if (locked.expires_at.getTime() <= Date.now()) {
      await this.markExpired(locked.id);
      throw new ConflictException("request expired");
    }

    const fx = await this.resolveFx(input.fxSnapshotId);
    const amountUsdt = this.krwToUsdt(locked.payable_amount_krw, fx.usdKrw);
    await this.provision.provisionUserBucketAccounts(locked.user_id);

    // Ledger key locked to request id → approve credit exactly once
    const ledgerIdempotencyKey = `krw_deposit_approve:${locked.id}`;
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

    const creditEntry = journal.entries.find((e) => e.direction === "credit");
    const upd = await this.db.query<RequestRow>(
      `UPDATE public.krw_deposit_requests SET
         status = 'approved',
         ledger_journal_id = $2::uuid,
         decided_at = now(),
         decided_by_admin_id = $3::uuid,
         admin_note = COALESCE(admin_note, 'approved')
       WHERE id = $1::uuid
         AND status IN ('pending', 'matched')
       RETURNING ${this.columns()}`,
      [locked.id, journal.id, input.adminId],
    );
    if (!upd.rows[0]) {
      const again = await this.requireRow(input.id);
      return {
        ok: true,
        decision: "approved",
        request: this.toV1(again, creditEntry?.id),
        journalId: journal.id,
        ledgerEntryId: creditEntry?.id,
        amountUsdt,
        reused: journal.reused,
        toastCode: "KRW_DEPOSIT_APPROVED",
        auditAction: "admin.krw_deposit.approved",
      };
    }

    const request = this.toV1(upd.rows[0], creditEntry?.id);
    this.bus.emit(WALLET_EVENTS.krwDepositApproved, {
      id: request.id,
      userId: request.userId,
      journalId: journal.id,
      ledgerEntryId: creditEntry?.id,
      amountUsdt,
      toastCode: "KRW_DEPOSIT_APPROVED" as const,
      auditAction: "admin.krw_deposit.approved" as const,
    });

    return {
      ok: true,
      decision: "approved",
      request,
      journalId: journal.id,
      ledgerEntryId: creditEntry?.id,
      amountUsdt,
      reused: journal.reused,
      toastCode: "KRW_DEPOSIT_APPROVED",
      auditAction: "admin.krw_deposit.approved",
    };
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

    const locked = await this.requireRow(input.id);
    if (locked.status === "rejected") {
      return {
        ok: true,
        decision: "rejected",
        request: this.toV1(locked),
        reused: true,
        toastCode: "KRW_DEPOSIT_REJECTED",
        auditAction: "admin.krw_deposit.rejected",
      };
    }
    if (locked.status === "approved") {
      throw new ConflictException("already approved · cannot reject");
    }
    if (locked.status !== "pending" && locked.status !== "matched") {
      throw new ConflictException(`cannot reject status=${locked.status}`);
    }

    const upd = await this.db.query<RequestRow>(
      `UPDATE public.krw_deposit_requests SET
         status = 'rejected',
         admin_note = $2,
         decided_at = now(),
         decided_by_admin_id = $3::uuid
       WHERE id = $1::uuid
         AND status IN ('pending', 'matched')
       RETURNING ${this.columns()}`,
      [locked.id, reason, input.adminId],
    );
    if (!upd.rows[0]) {
      throw new ConflictException("reject race · reload");
    }

    const request = this.toV1(upd.rows[0]);
    // Explicit: no ledger posting on reject (credit 0)
    this.bus.emit(WALLET_EVENTS.krwDepositRejected, {
      id: request.id,
      userId: request.userId,
      reason,
      toastCode: "KRW_DEPOSIT_REJECTED" as const,
      auditAction: "admin.krw_deposit.rejected" as const,
      ledgerCredit: false,
    });

    return {
      ok: true,
      decision: "rejected",
      request,
      reused: false,
      toastCode: "KRW_DEPOSIT_REJECTED",
      auditAction: "admin.krw_deposit.rejected",
    };
  }

  async getById(id: string): Promise<KrwDepositRequestV1> {
    return this.toV1(await this.requireRow(id));
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

  private async expireStale(): Promise<void> {
    await this.db.query(
      `UPDATE public.krw_deposit_requests
          SET status = 'expired'
        WHERE status = 'pending'
          AND expires_at <= now()`,
    );
  }

  private async markExpired(id: string): Promise<void> {
    await this.db.query(
      `UPDATE public.krw_deposit_requests
          SET status = 'expired'
        WHERE id = $1::uuid AND status = 'pending'`,
      [id],
    );
  }

  private async resolveFx(fxSnapshotId?: string): Promise<{
    id: string;
    usdKrw: string;
  }> {
    if (fxSnapshotId) {
      const r = await this.db.query<{ id: string; usd_krw: string }>(
        `SELECT id, usd_krw::text FROM public.fx_snapshots WHERE id = $1`,
        [fxSnapshotId],
      );
      if (!r.rows[0]) throw new BadRequestException("fxSnapshotId not found");
      return { id: r.rows[0].id, usdKrw: r.rows[0].usd_krw };
    }
    const r = await this.db.query<{ id: string; usd_krw: string }>(
      `SELECT id, usd_krw::text FROM public.fx_snapshots
        ORDER BY captured_at DESC LIMIT 1`,
    );
    if (!r.rows[0]) throw new ConflictException("FX snapshot unavailable");
    return { id: r.rows[0].id, usdKrw: r.rows[0].usd_krw };
  }

  /** USDT ≈ USD · amountUsdt = payableKrw / usd_krw (오차0 decimal string). */
  krwToUsdt(payableKrw: number, usdKrw: string): string {
    if (!Number.isInteger(payableKrw) || payableKrw < 1) {
      throw new BadRequestException("payableAmountKrw invalid");
    }
    const rate = parseAmount(usdKrw);
    if (rate <= 0n) throw new BadRequestException("usd_krw must be > 0");
    // (payable * 10^18) / rate  with rate already scaled 18
    // payable has scale 0 → payable * 10^18 / rate
    const SCALE = 18n;
    const pow = 10n ** SCALE;
    const numer = BigInt(payableKrw) * pow * pow;
    const usdt = numer / rate;
    if (usdt <= 0n) throw new BadRequestException("converted amountUsdt ≤ 0");
    return formatAmount(usdt);
  }

  private randomSuffix(): number {
    // 1..99 — crypto.randomInt uses rejection sampling, avoiding modulo bias.
    return randomInt(1, 100);
  }

  private randomDepositCode(): string {
    return randomBytes(4).toString("hex").slice(0, 8);
  }

  private assertSameKrwIntent(
    row: RequestRow,
    input: { userId: string; requestedAmountKrw: number },
    name: string,
  ): void {
    const stored = fingerprintPayload(
      krwDepositSemantic({
        userId: String(row.user_id),
        requestedAmountKrw: Number(row.requested_amount_krw),
        depositorName: String(row.depositor_name ?? ""),
      }),
    );
    const incoming = fingerprintPayload(
      krwDepositSemantic({
        userId: input.userId,
        requestedAmountKrw: input.requestedAmountKrw,
        depositorName: name,
      }),
    );
    assertFingerprintMatch(stored, incoming, "krw_deposit_request");
  }

  private columns(): string {
    return `id, user_id, requested_amount_krw, payable_amount_krw,
      unique_suffix_krw, deposit_code, depositor_name, status, expires_at,
      admin_note, ledger_journal_id, idempotency_key,
      decided_at, decided_by_admin_id, created_at`;
  }

  private toV1(row: RequestRow, ledgerEntryId?: string): KrwDepositRequestV1 {
    return {
      id: row.id,
      userId: row.user_id,
      requestedAmountKrw: Number(row.requested_amount_krw),
      payableAmountKrw: Number(row.payable_amount_krw),
      uniqueSuffixKrw: Number(row.unique_suffix_krw),
      depositCode: row.deposit_code,
      depositorName: row.depositor_name,
      status: row.status,
      expiresAt: row.expires_at.toISOString(),
      adminNote: row.admin_note ?? undefined,
      ledgerJournalId: row.ledger_journal_id ?? undefined,
      ledgerEntryId,
      idempotencyKey: row.idempotency_key,
      decidedAt: row.decided_at?.toISOString(),
      decidedByAdminId: row.decided_by_admin_id ?? undefined,
      createdAt: row.created_at.toISOString(),
    };
  }
}
