"use strict";
/**
 * §41.3 · §43.3 — KRW PG-free deposit request + Admin approve/reject.
 * Day-1: Admin 통장 확인 후 승인/거절 · CSV Auto-Recon = L2+ (not here).
 * Approve: Debit SYS:OPS_POOL / Credit User principal · deposit_krw · 1회.
 * Reject: ledger 분개 0 · reason≥10.
 * Quote = request-time estimate only. Final credit = approval-time FX.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.KrwDepositHost = void 0;
const common_1 = require("@nestjs/common");
const node_crypto_1 = require("node:crypto");
const ledger_money_1 = require("../ledger/ledger.money");
const ledger_types_1 = require("../ledger/ledger.types");
const krw_deposit_fx_1 = require("./krw-deposit.fx");
const krw_deposit_money_1 = require("./krw-deposit.money");
const wallet_events_1 = require("./wallet.events");
const wallet_types_1 = require("./wallet.types");
const LEDGER_APPROVE_KEY_PREFIX = "krw_deposit_approve:";
class KrwDepositHost {
    db;
    posting;
    provision;
    bus;
    constructor(deps) {
        this.db = deps.db;
        this.posting = deps.posting;
        this.provision = deps.provision;
        this.bus = deps.bus;
    }
    /** POST /wallet/krw-deposit-requests */
    async createRequest(input) {
        if (!input.userId)
            throw new common_1.BadRequestException("userId required");
        if (!Number.isInteger(input.requestedAmountKrw) ||
            input.requestedAmountKrw < 1) {
            throw new common_1.BadRequestException("requestedAmountKrw must be integer ≥1");
        }
        const name = (input.depositorName ?? "").trim();
        if (name.length < 1) {
            throw new common_1.BadRequestException("depositorName required");
        }
        if (!input.idempotencyKey || input.idempotencyKey.length < 8) {
            throw new common_1.BadRequestException("idempotencyKey minLength 8");
        }
        await this.expireStale();
        const existing = await this.db.query(`SELECT ${this.columns()}
         FROM public.krw_deposit_requests
        WHERE idempotency_key = $1`, [input.idempotencyKey]);
        if (existing.rows[0])
            return this.toV1(existing.rows[0]);
        const quoteFx = await (0, krw_deposit_fx_1.loadLatestDepositFx)(this.db);
        if (!quoteFx) {
            throw new common_1.BadRequestException("FX_SNAPSHOT_REQUIRED");
        }
        for (let attempt = 0; attempt < 12; attempt += 1) {
            const uniqueSuffixKrw = this.randomSuffix();
            const payableAmountKrw = input.requestedAmountKrw + uniqueSuffixKrw;
            const estimatedUsdt = this.krwToUsdt(payableAmountKrw, quoteFx.usdtKrw);
            const depositCode = this.randomDepositCode();
            const expiresAt = new Date(Date.now() + wallet_types_1.KRW_DEPOSIT_TTL_MIN * 60 * 1000);
            try {
                const ins = await this.db.query(`INSERT INTO public.krw_deposit_requests (
             user_id, requested_amount_krw, payable_amount_krw,
             unique_suffix_krw, deposit_code, depositor_name,
             status, expires_at, idempotency_key,
             quote_fx_snapshot_id, quote_usdt_krw, quote_formula_id,
             quote_fx_captured_at, estimated_usdt
           ) VALUES (
             $1::uuid, $2, $3, $4, $5, $6, 'pending', $7, $8,
             $9, $10::numeric, $11, $12::timestamptz, $13::numeric
           )
           RETURNING ${this.columns()}`, [
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
                ]);
                const row = ins.rows[0];
                const v1 = this.toV1(row);
                this.bus.emit(wallet_events_1.WALLET_EVENTS.krwDepositPending, {
                    id: v1.id,
                    userId: v1.userId,
                    payableAmountKrw: v1.payableAmountKrw,
                    toastCode: "KRW_DEPOSIT_SUBMITTED",
                });
                return v1;
            }
            catch (e) {
                const msg = e instanceof Error ? e.message : String(e);
                if (/idempotency_key/i.test(msg)) {
                    const again = await this.db.query(`SELECT ${this.columns()}
               FROM public.krw_deposit_requests
              WHERE idempotency_key = $1`, [input.idempotencyKey]);
                    if (again.rows[0])
                        return this.toV1(again.rows[0]);
                }
                if (/payable_amount|unique/i.test(msg))
                    continue;
                throw e;
            }
        }
        throw new common_1.ConflictException("unable to allocate unique payableAmountKrw");
    }
    /** GET /admin/wallet/krw-deposit-requests */
    async list(opts) {
        await this.expireStale();
        const limit = Math.min(opts.limit ?? 50, 200);
        const status = opts.status ?? "pending";
        const r = await this.db.query(`SELECT ${this.columns()}
         FROM public.krw_deposit_requests
        WHERE status = $1
        ORDER BY created_at ASC
        LIMIT $2`, [status, limit]);
        return { items: r.rows.map((row) => this.toV1(row)) };
    }
    /** GET /wallet/krw-deposit-requests — session user only */
    async listForUser(input) {
        if (!input.userId)
            throw new common_1.BadRequestException("userId required");
        await this.expireStale();
        const limit = Math.min(input.limit ?? 50, 200);
        const r = await this.db.query(`SELECT ${this.columns()}
         FROM public.krw_deposit_requests
        WHERE user_id = $1::uuid
        ORDER BY created_at DESC
        LIMIT $2`, [input.userId, limit]);
        return { items: r.rows.map((row) => this.toV1(row)) };
    }
    /** GET /wallet/krw-deposit-requests/:id — own row only · else 404 */
    async getForUser(userId, id) {
        if (!userId)
            throw new common_1.BadRequestException("userId required");
        await this.expireStale();
        const r = await this.db.query(`SELECT ${this.columns()}
         FROM public.krw_deposit_requests
        WHERE id = $1::uuid AND user_id = $2::uuid`, [id, userId]);
        if (!r.rows[0])
            throw new common_1.NotFoundException("krw deposit request not found");
        return this.toV1(r.rows[0]);
    }
    /** POST /admin/wallet/krw-deposits/:id/approve — credit 1회 */
    async approve(input) {
        if (!input.adminId)
            throw new common_1.BadRequestException("adminId required");
        if (!input.idempotencyKey || input.idempotencyKey.length < 8) {
            throw new common_1.BadRequestException("idempotencyKey minLength 8");
        }
        await this.expireStale();
        return this.db.withTransaction(async (client) => {
            const locked = await this.lockRow(client, input.id);
            const ledgerIdempotencyKey = `${LEDGER_APPROVE_KEY_PREFIX}${locked.id}`;
            const existingJournal = await this.posting.getByIdempotencyKey(ledgerIdempotencyKey);
            if (existingJournal) {
                const finalized = await this.finalizeFromJournal(client, locked, existingJournal, input.adminId);
                return this.approvedResult(finalized, existingJournal, true);
            }
            if (locked.status === "approved" && locked.ledger_journal_id) {
                const journal = await this.posting.getJournal(locked.ledger_journal_id);
                return this.approvedResult(this.toV1(locked, this.creditEntryId(journal)), journal, true);
            }
            if (locked.status !== "pending" && locked.status !== "matched") {
                throw new common_1.ConflictException(`cannot approve status=${locked.status}`);
            }
            if (this.asDate(locked.expires_at).getTime() <= Date.now()) {
                await this.markExpired(locked.id);
                throw new common_1.ConflictException("request expired");
            }
            const fx = await this.requireFx(input.fxSnapshotId);
            const amountUsdt = this.krwToUsdt(locked.payable_amount_krw, fx.usdtKrw);
            await this.provision.provisionUserBucketAccounts(locked.user_id);
            const journal = await this.posting.postJournal({
                idempotencyKey: ledgerIdempotencyKey,
                journalType: "deposit_krw",
                lines: [
                    {
                        account: { systemCode: ledger_types_1.SYSTEM_ACCOUNT_CODES.OPS_POOL },
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
            const finalized = await this.finalizeFromJournal(client, locked, journal, input.adminId, journal.reused ? undefined : fx);
            const result = this.approvedResult(finalized, journal, journal.reused);
            if (!journal.reused) {
                this.bus.emit(wallet_events_1.WALLET_EVENTS.krwDepositApproved, {
                    id: finalized.id,
                    userId: finalized.userId,
                    journalId: journal.id,
                    ledgerEntryId: result.ledgerEntryId,
                    amountUsdt: result.amountUsdt,
                    toastCode: "KRW_DEPOSIT_APPROVED",
                    auditAction: "admin.krw_deposit.approved",
                });
            }
            return result;
        });
    }
    /** POST /admin/wallet/krw-deposits/:id/reject — credit 0 */
    async reject(input) {
        if (!input.adminId)
            throw new common_1.BadRequestException("adminId required");
        if (!input.idempotencyKey || input.idempotencyKey.length < 8) {
            throw new common_1.BadRequestException("idempotencyKey minLength 8");
        }
        const reason = (input.reason ?? "").trim();
        if (reason.length < wallet_types_1.KRW_REJECT_REASON_MIN) {
            throw new common_1.BadRequestException(`reason minLength ${wallet_types_1.KRW_REJECT_REASON_MIN}`);
        }
        await this.expireStale();
        return this.db.withTransaction(async (client) => {
            const locked = await this.lockRow(client, input.id);
            const existingJournal = await this.posting.getByIdempotencyKey(`${LEDGER_APPROVE_KEY_PREFIX}${locked.id}`);
            if (existingJournal) {
                await this.finalizeFromJournal(client, locked, existingJournal, input.adminId);
                throw new common_1.ConflictException("already credited · cannot reject");
            }
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
                throw new common_1.ConflictException("already approved · cannot reject");
            }
            if (locked.status !== "pending" && locked.status !== "matched") {
                throw new common_1.ConflictException(`cannot reject status=${locked.status}`);
            }
            const upd = await client.query(`UPDATE public.krw_deposit_requests SET
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
         RETURNING ${this.columns()}`, [locked.id, reason, input.adminId]);
            if (!upd.rows[0]) {
                throw new common_1.ConflictException("reject race · reload");
            }
            const request = this.toV1(upd.rows[0]);
            this.bus.emit(wallet_events_1.WALLET_EVENTS.krwDepositRejected, {
                id: request.id,
                userId: request.userId,
                reason,
                toastCode: "KRW_DEPOSIT_REJECTED",
                auditAction: "admin.krw_deposit.rejected",
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
        });
    }
    async getById(id) {
        return this.toV1(await this.requireRow(id));
    }
    /**
     * creditedUsdt = trunc18(payableKrw / usdtKrw).
     * usdtKrw = fx_snapshots.usd_krw = KRW per 1 USDT. 별도 USD≈USDT 곱 없음.
     */
    krwToUsdt(payableKrw, usdtKrw) {
        return (0, krw_deposit_money_1.krwToUsdt)(payableKrw, usdtKrw);
    }
    approvedResult(request, journal, reused) {
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
    creditEntryId(journal) {
        return journal.entries.find((e) => e.direction === "credit")?.id;
    }
    async finalizeFromJournal(client, locked, journal, adminId, knownFx) {
        const credit = journal.entries.find((e) => e.direction === "credit");
        if (!credit) {
            throw new common_1.ConflictException("deposit journal missing credit line");
        }
        const creditedUsdt = (0, ledger_money_1.formatAmount)((0, ledger_money_1.parseAmount)(credit.amountUsdt));
        const applied = await this.appliedFxFromJournal(journal, knownFx);
        const upd = await client.query(`UPDATE public.krw_deposit_requests SET
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
       RETURNING ${this.columns()}`, [
            locked.id,
            journal.id,
            adminId,
            applied.id,
            applied.usdtKrw,
            applied.formulaId,
            applied.capturedAt,
            creditedUsdt,
        ]);
        if (!upd.rows[0]) {
            throw new common_1.ConflictException("approve finalize race · reload");
        }
        return this.toV1(upd.rows[0], credit.id);
    }
    async appliedFxFromJournal(journal, knownFx) {
        if (knownFx && (!journal.fxSnapshotId || knownFx.id === journal.fxSnapshotId)) {
            return knownFx;
        }
        if (journal.fxSnapshotId) {
            const loaded = await (0, krw_deposit_fx_1.loadDepositFxById)(this.db, journal.fxSnapshotId);
            if (loaded)
                return loaded;
            if (knownFx)
                return knownFx;
            throw new common_1.BadRequestException("fxSnapshotId not found");
        }
        if (knownFx)
            return knownFx;
        throw new common_1.BadRequestException("FX_SNAPSHOT_REQUIRED");
    }
    async requireFx(fxSnapshotId) {
        if (fxSnapshotId) {
            const found = await (0, krw_deposit_fx_1.loadDepositFxById)(this.db, fxSnapshotId);
            if (!found)
                throw new common_1.BadRequestException("fxSnapshotId not found");
            return found;
        }
        const latest = await (0, krw_deposit_fx_1.resolveDepositFx)(this.db);
        if (!latest)
            throw new common_1.BadRequestException("FX_SNAPSHOT_REQUIRED");
        return latest;
    }
    async requireRow(id) {
        const r = await this.db.query(`SELECT ${this.columns()}
         FROM public.krw_deposit_requests WHERE id = $1::uuid`, [id]);
        if (!r.rows[0])
            throw new common_1.NotFoundException("krw deposit request not found");
        return r.rows[0];
    }
    async lockRow(client, id) {
        const r = await client.query(`SELECT ${this.columns()}
         FROM public.krw_deposit_requests
        WHERE id = $1::uuid
        FOR UPDATE`, [id]);
        if (!r.rows[0])
            throw new common_1.NotFoundException("krw deposit request not found");
        return r.rows[0];
    }
    async expireStale() {
        await this.db.query(`UPDATE public.krw_deposit_requests r
          SET status = 'expired'
        WHERE r.status = 'pending'
          AND r.expires_at <= now()
          AND r.ledger_journal_id IS NULL
          AND NOT EXISTS (
            SELECT 1
              FROM public.ledger_journals j
             WHERE j.idempotency_key = $1 || r.id::text
          )`, [LEDGER_APPROVE_KEY_PREFIX]);
    }
    async markExpired(id) {
        await this.db.query(`UPDATE public.krw_deposit_requests
          SET status = 'expired'
        WHERE id = $1::uuid AND status = 'pending'
          AND ledger_journal_id IS NULL`, [id]);
    }
    randomSuffix() {
        return ((0, node_crypto_1.randomBytes)(1)[0] % 99) + 1;
    }
    randomDepositCode() {
        return (0, node_crypto_1.randomBytes)(4).toString("hex").slice(0, 8);
    }
    asDate(value) {
        return value instanceof Date ? value : new Date(value);
    }
    positiveAmount(raw) {
        if (raw == null || raw === "")
            return undefined;
        const formatted = (0, ledger_money_1.formatAmount)((0, ledger_money_1.parseAmount)(String(raw)));
        if (formatted === "0")
            return undefined;
        return formatted;
    }
    columns() {
        return `id::text, user_id::text, requested_amount_krw, payable_amount_krw,
            unique_suffix_krw, deposit_code, depositor_name, status,
            expires_at, admin_note, ledger_journal_id::text, idempotency_key,
            decided_at, decided_by_admin_id::text, created_at,
            quote_fx_snapshot_id, quote_usdt_krw::text, quote_formula_id,
            quote_fx_captured_at, estimated_usdt::text,
            applied_fx_snapshot_id, applied_usdt_krw::text, applied_formula_id,
            applied_fx_captured_at, credited_usdt::text`;
    }
    toV1(row, ledgerEntryId) {
        const estimatedUsdt = this.positiveAmount(row.estimated_usdt);
        const creditedUsdt = this.positiveAmount(row.credited_usdt);
        const quote = row.quote_fx_snapshot_id && row.quote_usdt_krw && estimatedUsdt
            ? {
                fxSnapshotId: row.quote_fx_snapshot_id,
                usdtKrw: row.quote_usdt_krw,
                estimatedUsdt,
                formulaId: row.quote_formula_id ?? undefined,
                capturedAt: (0, krw_deposit_fx_1.toIso)(row.quote_fx_captured_at),
            }
            : null;
        const final = row.status === "approved" &&
            row.applied_fx_snapshot_id &&
            row.applied_usdt_krw &&
            creditedUsdt
            ? {
                appliedFxSnapshotId: row.applied_fx_snapshot_id,
                appliedUsdtKrw: row.applied_usdt_krw,
                creditedUsdt,
                appliedFormulaId: row.applied_formula_id ?? undefined,
                appliedFxCapturedAt: (0, krw_deposit_fx_1.toIso)(row.applied_fx_captured_at),
                decidedAt: (0, krw_deposit_fx_1.toIso)(row.decided_at),
                ledgerJournalId: row.ledger_journal_id ?? undefined,
            }
            : null;
        return {
            id: row.id,
            userId: row.user_id,
            requestedAmountKrw: row.requested_amount_krw,
            payableAmountKrw: row.payable_amount_krw,
            uniqueSuffixKrw: row.unique_suffix_krw,
            payableSuffixRole: wallet_types_1.PAYABLE_SUFFIX_ROLE,
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
            decidedAt: (0, krw_deposit_fx_1.toIso)(row.decided_at),
            decidedByAdminId: row.decided_by_admin_id ?? undefined,
        };
    }
}
exports.KrwDepositHost = KrwDepositHost;
