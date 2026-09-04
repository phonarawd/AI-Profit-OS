/**
 * §41 · §43.1 — USDT on-chain deposit observe → 1conf UI / 19conf ledger.
 * Phase0 emit = InProcessEventBus (NATS Day-1 필수 0).
 */

import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InProcessEventBus } from "../events/in-process.bus";
import { PostgresService } from "../db/postgres";
import { LedgerPostingService } from "../ledger/ledger.posting.service";
import { LedgerProvisionService } from "../ledger/ledger.provision.service";
import { DepositAddressService } from "./deposit-address.service";
import { DepositConfigService } from "./deposit-config.service";
import {
  decideDepositStage,
  USDT_DUST_MIN,
  USDT_LEDGER_CONFIRMATIONS,
  USDT_UI_CONFIRMATIONS,
} from "./chain-watcher.stages";
import { WALLET_EVENTS } from "./wallet.events";
import type { UsdtDepositEventV1, UsdtDepositObserveResult } from "./wallet.types";

type EventRow = {
  id: string;
  user_id: string;
  tx_hash: string;
  to_address: string;
  amount_usdt: string;
  confirmations: number;
  status: string;
  ledger_journal_id: string | null;
  idempotency_key: string;
  observed_at: Date;
  credited_at: Date | null;
  created_at: Date;
};

@Injectable()
export class UsdtDepositService {
  constructor(
    private readonly db: PostgresService,
    private readonly addresses: DepositAddressService,
    private readonly depositConfig: DepositConfigService,
    private readonly posting: LedgerPostingService,
    private readonly provision: LedgerProvisionService,
    private readonly bus: InProcessEventBus,
  ) {}

  /**
   * Ingest a Transfer observation (Phase0 tick or Phase1 worker POST).
   * 1 conf → DEPOSIT_DETECTED · ledger 0
   * 19 conf → deposit_usdt Double-Entry · DEPOSIT_CONFIRMED
   */
  async observe(input: {
    txHash: string;
    toAddress: string;
    amountUsdt: string;
    confirmations: number;
    reorg?: boolean;
  }): Promise<UsdtDepositObserveResult> {
    const txHash = (input.txHash ?? "").trim();
    const toAddress = (input.toAddress ?? "").trim();
    const amountUsdt = (input.amountUsdt ?? "").trim();
    if (!txHash || txHash.length < 8) {
      throw new BadRequestException("txHash required");
    }
    if (!toAddress) throw new BadRequestException("toAddress required");
    await this.depositConfig.requirePersisted();
    if (!/^\d+(\.\d+)?$/.test(amountUsdt)) {
      throw new BadRequestException("amountUsdt invalid");
    }
    if (cmpDecimal(amountUsdt, USDT_DUST_MIN) < 0) {
      return {
        ok: true,
        action: "ignored_dust",
        event: null,
        ledgerJournalId: undefined,
        toastCode: undefined,
        creditLedger: false,
      };
    }

    const resolved = await this.addresses.resolveUserIdByAddress(toAddress);
    if (!resolved) {
      return {
        ok: true,
        action: "unmatched_address",
        event: null,
        ledgerJournalId: undefined,
        toastCode: undefined,
        creditLedger: false,
      };
    }

    const existing = await this.findByTx(txHash, toAddress);

    if (input.reorg) {
      return this.applyReorg(existing, resolved, txHash, toAddress, amountUsdt);
    }

    const confirmations = Math.max(0, Math.floor(input.confirmations));
    const alreadyCredited =
      existing?.status === "ledger_credited" && !!existing.ledger_journal_id;
    const decision = decideDepositStage({
      confirmations,
      alreadyLedgerCredited: alreadyCredited,
    });

    if (alreadyCredited && existing) {
      return {
        ok: true,
        action: "reuse_credited",
        event: this.toV1(existing),
        ledgerJournalId: existing.ledger_journal_id ?? undefined,
        toastCode: undefined,
        creditLedger: false,
        reused: true,
      };
    }

    // Upsert observation row (idempotent on tx_hash+to_address)
    const row = existing
      ? await this.bumpConfirmations(existing, confirmations)
      : await this.insertSeen({
          userId: resolved,
          txHash,
          toAddress,
          amountUsdt,
          confirmations,
        });

    // 1conf UI — pending observation · NO ledger
    if (decision.stage === "detected" || (decision.emitDetected && !decision.creditLedger)) {
      if (row.status === "seen" || row.status === "ui_confirmed") {
        const updated = await this.markUiConfirmed(row, confirmations);
        if (row.status === "seen") {
          this.bus.emit(WALLET_EVENTS.depositDetected, {
            id: updated.id,
            userId: updated.user_id,
            txHash: updated.tx_hash,
            amountUsdt: updated.amount_usdt,
            confirmations: updated.confirmations,
            toastCode: "DEPOSIT_DETECTED" as const,
            creditLedger: false,
            uiConfirmations: USDT_UI_CONFIRMATIONS,
            ledgerConfirmations: USDT_LEDGER_CONFIRMATIONS,
          });
        }
        return {
          ok: true,
          action: "detected",
          event: this.toV1(updated),
          toastCode: "DEPOSIT_DETECTED",
          creditLedger: false,
        };
      }
    }

    // 19conf — Double-Entry credit (only path that posts deposit_usdt)
    if (decision.creditLedger) {
      return this.creditLedger(row, confirmations);
    }

    return {
      ok: true,
      action: "seen",
      event: this.toV1(row),
      toastCode: undefined,
      creditLedger: false,
    };
  }

  private async creditLedger(
    row: EventRow,
    confirmations: number,
  ): Promise<UsdtDepositObserveResult> {
    if (row.status === "ledger_credited" && row.ledger_journal_id) {
      return {
        ok: true,
        action: "reuse_credited",
        event: this.toV1(row),
        ledgerJournalId: row.ledger_journal_id,
        toastCode: undefined,
        creditLedger: false,
        reused: true,
      };
    }

    await this.provision.provisionUserBucketAccounts(row.user_id);

    const ledgerIdempotencyKey = `usdt_deposit_confirm:${row.tx_hash}:${row.to_address}`;
    const journal = await this.posting.postJournal({
      idempotencyKey: ledgerIdempotencyKey,
      journalType: "deposit_usdt",
      lines: [
        {
          account: { systemCode: "SYS:TREASURY" },
          direction: "debit",
          amountUsdt: row.amount_usdt,
        },
        {
          account: { userId: row.user_id, bucket: "principal" },
          direction: "credit",
          amountUsdt: row.amount_usdt,
        },
      ],
      referenceType: "usdt_deposit_event",
      referenceId: row.id,
      memo: `USDT TRC20 confirmations=${confirmations} tx=${row.tx_hash}`,
    });

    const upd = await this.db.query<EventRow>(
      `UPDATE public.usdt_deposit_events SET
         status = 'ledger_credited',
         confirmations = GREATEST(confirmations, $2),
         ledger_journal_id = $3::uuid,
         credited_at = COALESCE(credited_at, now())
       WHERE id = $1::uuid
         AND status <> 'ledger_credited'
       RETURNING ${this.columns()}`,
      [row.id, confirmations, journal.id],
    );

    const finalRow = upd.rows[0] ?? (await this.requireRow(row.id));

    this.bus.emit(WALLET_EVENTS.depositConfirmed, {
      id: finalRow.id,
      userId: finalRow.user_id,
      txHash: finalRow.tx_hash,
      amountUsdt: finalRow.amount_usdt,
      confirmations: finalRow.confirmations,
      journalId: journal.id,
      toastCode: "DEPOSIT_CONFIRMED" as const,
      creditLedger: true,
      uiConfirmations: USDT_UI_CONFIRMATIONS,
      ledgerConfirmations: USDT_LEDGER_CONFIRMATIONS,
    });

    return {
      ok: true,
      action: "confirmed",
      event: this.toV1(finalRow),
      ledgerJournalId: journal.id,
      toastCode: "DEPOSIT_CONFIRMED",
      creditLedger: true,
      reused: journal.reused,
    };
  }

  private async applyReorg(
    existing: EventRow | null,
    userId: string,
    txHash: string,
    toAddress: string,
    amountUsdt: string,
  ): Promise<UsdtDepositObserveResult> {
    if (existing?.status === "ledger_credited") {
      // CONFIRMED is final for spendable balance — do not void ledger here
      return {
        ok: true,
        action: "reorg_ignored_after_credit",
        event: this.toV1(existing),
        ledgerJournalId: existing.ledger_journal_id ?? undefined,
        toastCode: undefined,
        creditLedger: false,
      };
    }

    let row = existing;
    if (!row) {
      row = await this.insertSeen({
        userId,
        txHash,
        toAddress,
        amountUsdt,
        confirmations: 0,
      });
    }

    const upd = await this.db.query<EventRow>(
      `UPDATE public.usdt_deposit_events SET
         status = 'ignored',
         confirmations = 0
       WHERE id = $1::uuid
         AND status IN ('seen', 'ui_confirmed')
       RETURNING ${this.columns()}`,
      [row.id],
    );
    const finalRow = upd.rows[0] ?? row;

    this.bus.emit(WALLET_EVENTS.depositReorgVoided, {
      id: finalRow.id,
      userId: finalRow.user_id,
      txHash: finalRow.tx_hash,
      amountUsdt: finalRow.amount_usdt,
      toastCode: undefined,
      creditLedger: false,
    });

    return {
      ok: true,
      action: "reorg_voided",
      event: this.toV1(finalRow),
      toastCode: undefined,
      creditLedger: false,
    };
  }

  private async insertSeen(input: {
    userId: string;
    txHash: string;
    toAddress: string;
    amountUsdt: string;
    confirmations: number;
  }): Promise<EventRow> {
    const idempotencyKey = `usdt_deposit:${input.txHash}:${input.toAddress}`;
    try {
      const ins = await this.db.query<EventRow>(
        `INSERT INTO public.usdt_deposit_events (
           user_id, tx_hash, to_address, amount_usdt, confirmations,
           status, idempotency_key
         ) VALUES ($1::uuid, $2, $3, $4::numeric, $5, 'seen', $6)
         ON CONFLICT (tx_hash, to_address) DO UPDATE SET
           confirmations = GREATEST(public.usdt_deposit_events.confirmations, EXCLUDED.confirmations)
         RETURNING ${this.columns()}`,
        [
          input.userId,
          input.txHash,
          input.toAddress,
          input.amountUsdt,
          input.confirmations,
          idempotencyKey,
        ],
      );
      if (!ins.rows[0]) throw new Error("insert usdt_deposit_events failed");
      return ins.rows[0];
    } catch (e: unknown) {
      const again = await this.findByTx(input.txHash, input.toAddress);
      if (again) return again;
      throw e;
    }
  }

  private async bumpConfirmations(
    row: EventRow,
    confirmations: number,
  ): Promise<EventRow> {
    const r = await this.db.query<EventRow>(
      `UPDATE public.usdt_deposit_events SET
         confirmations = GREATEST(confirmations, $2)
       WHERE id = $1::uuid
       RETURNING ${this.columns()}`,
      [row.id, confirmations],
    );
    return r.rows[0] ?? row;
  }

  private async markUiConfirmed(
    row: EventRow,
    confirmations: number,
  ): Promise<EventRow> {
    const r = await this.db.query<EventRow>(
      `UPDATE public.usdt_deposit_events SET
         status = CASE
           WHEN status = 'ledger_credited' THEN status
           ELSE 'ui_confirmed'
         END,
         confirmations = GREATEST(confirmations, $2)
       WHERE id = $1::uuid
       RETURNING ${this.columns()}`,
      [row.id, confirmations],
    );
    return r.rows[0] ?? row;
  }

  private async findByTx(
    txHash: string,
    toAddress: string,
  ): Promise<EventRow | null> {
    const r = await this.db.query<EventRow>(
      `SELECT ${this.columns()}
         FROM public.usdt_deposit_events
        WHERE tx_hash = $1 AND to_address = $2`,
      [txHash, toAddress],
    );
    return r.rows[0] ?? null;
  }

  private async requireRow(id: string): Promise<EventRow> {
    const r = await this.db.query<EventRow>(
      `SELECT ${this.columns()} FROM public.usdt_deposit_events WHERE id = $1::uuid`,
      [id],
    );
    if (!r.rows[0]) throw new NotFoundException("usdt deposit event not found");
    return r.rows[0];
  }

  private columns(): string {
    return `id::text, user_id::text, tx_hash, to_address, amount_usdt::text,
            confirmations, status, ledger_journal_id::text, idempotency_key,
            observed_at, credited_at, created_at`;
  }

  private toV1(row: EventRow): UsdtDepositEventV1 {
    return {
      id: row.id,
      userId: row.user_id,
      txHash: row.tx_hash,
      toAddress: row.to_address,
      amountUsdt: row.amount_usdt,
      confirmations: row.confirmations,
      status: row.status as UsdtDepositEventV1["status"],
      ledgerJournalId: row.ledger_journal_id ?? undefined,
      idempotencyKey: row.idempotency_key,
      observedAt: row.observed_at.toISOString(),
      creditedAt: row.credited_at ? row.credited_at.toISOString() : undefined,
      createdAt: row.created_at.toISOString(),
    };
  }
}

function cmpDecimal(a: string, b: string): number {
  const [aw, af = ""] = a.split(".");
  const [bw, bf = ""] = b.split(".");
  const aBig = BigInt(aw + af.padEnd(18, "0").slice(0, 18));
  const bBig = BigInt(bw + bf.padEnd(18, "0").slice(0, 18));
  if (aBig === bBig) return 0;
  return aBig > bBig ? 1 : -1;
}
