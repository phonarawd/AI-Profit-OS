/**
 * §41.3 · §43.3 — KRW PG-free deposit request + Admin approve/reject.
 * Day-1: Admin 통장 확인 후 승인/거절 · CSV Auto-Recon = L2+ (not here).
 * Approve: Debit SYS:OPS_POOL / Credit User principal · deposit_krw · 1회.
 * Reject: ledger 분개 0 · reason≥10.
 * Implementation host = krw-deposit.apply.ts
 */

import { Injectable } from "@nestjs/common";
import { InProcessEventBus } from "../events/in-process.bus";
import { PostgresService } from "../db/postgres";
import { LedgerPostingService } from "../ledger/ledger.posting.service";
import { LedgerProvisionService } from "../ledger/ledger.provision.service";
import { KrwDepositHost, type KrwDepositDb } from "./krw-deposit.apply";
import { krwToUsdt as convertKrwToUsdt } from "./krw-deposit.money";
import type {
  KrwDepositDecideResult,
  KrwDepositRequestV1,
  KrwDepositStatus,
} from "./wallet.types";

@Injectable()
export class KrwDepositService {
  private readonly host: KrwDepositHost;

  constructor(
    db: PostgresService,
    posting: LedgerPostingService,
    provision: LedgerProvisionService,
    bus: InProcessEventBus,
  ) {
    this.host = new KrwDepositHost({
      db: db as unknown as KrwDepositDb,
      posting,
      provision,
      bus,
    });
  }

  async createRequest(input: {
    userId: string;
    requestedAmountKrw: number;
    depositorName: string;
    idempotencyKey: string;
  }): Promise<KrwDepositRequestV1> {
    return this.host.createRequest(input);
  }

  async list(opts: {
    status?: KrwDepositStatus;
    limit?: number;
  }): Promise<{ items: KrwDepositRequestV1[] }> {
    return this.host.list(opts);
  }

  async listForUser(input: {
    userId: string;
    limit?: number;
  }): Promise<{ items: KrwDepositRequestV1[] }> {
    return this.host.listForUser(input);
  }

  async getForUser(userId: string, id: string): Promise<KrwDepositRequestV1> {
    return this.host.getForUser(userId, id);
  }

  async approve(input: {
    id: string;
    adminId: string;
    idempotencyKey: string;
    fxSnapshotId?: string;
  }): Promise<KrwDepositDecideResult> {
    return this.host.approve(input);
  }

  async reject(input: {
    id: string;
    adminId: string;
    idempotencyKey: string;
    reason: string;
  }): Promise<KrwDepositDecideResult> {
    return this.host.reject(input);
  }

  async getById(id: string): Promise<KrwDepositRequestV1> {
    return this.host.getById(id);
  }

  /**
   * creditedUsdt = trunc18(payableKrw / usdtKrw).
   * usdtKrw = fx_snapshots.usd_krw = KRW per 1 USDT. 별도 USD≈USDT 곱 없음.
   */
  krwToUsdt(payableKrw: number, usdtKrw: string): string {
    return convertKrwToUsdt(payableKrw, usdtKrw);
  }
}
