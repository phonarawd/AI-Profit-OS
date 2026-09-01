/**
 * §41.2 — per-user TRC20 deposit address (lazy create).
 * Shared deposit address FORBIDDEN · Admin manual edit FORBIDDEN.
 */

import {
  BadRequestException,
  Injectable,
  ConflictException,
  ServiceUnavailableException,
} from "@nestjs/common";
import { KillSwitchService } from "../kill-switch/kill-switch.service";
import { PostgresService } from "../db/postgres";
import { DepositConfigService } from "./deposit-config.service";
import {
  TRON_HD_DERIVATION_UNAVAILABLE,
  allocateCanonicalTrc20Address,
  requireCanonicalTrc20Deriver,
  TronHdDerivationUnavailableError,
} from "./tron-address";
import type { UserDepositAddressV1 } from "./wallet.types";

type AddressRow = {
  user_id: string;
  trc20_address: string;
  derivation_index: number;
  qr_payload: string;
  last_seen_tx_at: Date | null;
  created_at: Date;
};

@Injectable()
export class DepositAddressService {
  constructor(
    private readonly db: PostgresService,
    private readonly depositConfig: DepositConfigService,
    private readonly killSwitch: KillSwitchService,
  ) {}

  /** GET /wallet/my-deposit-address — auth · lazy-create */
  async getOrCreate(userId: string): Promise<UserDepositAddressV1> {
    if (!userId || userId.length < 1) {
      throw new BadRequestException("userId required");
    }

    await this.killSwitch.assertPath("deposit");
    await this.depositConfig.requirePersisted();
    const existing = await this.fetch(userId);
    if (existing) return this.toV1(existing);

    return this.createForUser(userId);
  }

  /** §43.1 address-index lookup — O(1) match after stream filter */
  async resolveUserIdByAddress(trc20Address: string): Promise<string | null> {
    const addr = (trc20Address ?? "").trim();
    if (!addr) return null;
    const r = await this.db.query<{ user_id: string }>(
      `SELECT user_id::text AS user_id
         FROM public.user_deposit_addresses
        WHERE trc20_address = $1`,
      [addr],
    );
    return r.rows[0]?.user_id ?? null;
  }

  /** Full depositAddress → userId set for single-stream matcher */
  async loadAddressIndex(): Promise<
    Array<{ trc20Address: string; userId: string }>
  > {
    const r = await this.db.query<{
      trc20_address: string;
      user_id: string;
    }>(
      `SELECT trc20_address, user_id::text AS user_id
         FROM public.user_deposit_addresses`,
    );
    return r.rows.map((row) => ({
      trc20Address: row.trc20_address,
      userId: row.user_id,
    }));
  }

  private async createForUser(userId: string): Promise<UserDepositAddressV1> {
    const cfg = await this.depositConfig.requirePersisted();
    const secretRef = cfg.usdtOnchain.hotWalletXpubRef;
    if (!secretRef) {
      throw new ServiceUnavailableException(TRON_HD_DERIVATION_UNAVAILABLE);
    }

    try {
      requireCanonicalTrc20Deriver();
    } catch (e) {
      if (e instanceof TronHdDerivationUnavailableError) {
        throw new ServiceUnavailableException(TRON_HD_DERIVATION_UNAVAILABLE);
      }
      throw e;
    }

    for (let attempt = 0; attempt < 5; attempt += 1) {
      // Re-check race
      const raced = await this.fetch(userId);
      if (raced) return this.toV1(raced);

      const nextIdx = await this.nextDerivationIndex();
      let derived;
      try {
        derived = allocateCanonicalTrc20Address({
          derivationIndex: nextIdx,
          persist: (row) => row,
        });
      } catch (e) {
        if (e instanceof TronHdDerivationUnavailableError) {
          throw new ServiceUnavailableException(TRON_HD_DERIVATION_UNAVAILABLE);
        }
        throw e;
      }

      try {
        const ins = await this.db.query<AddressRow>(
          `INSERT INTO public.user_deposit_addresses (
             user_id, trc20_address, derivation_index, qr_payload
           ) VALUES ($1::uuid, $2, $3, $4)
           ON CONFLICT (user_id) DO NOTHING
           RETURNING user_id::text, trc20_address, derivation_index, qr_payload,
                     last_seen_tx_at, created_at`,
          [userId, derived.trc20Address, nextIdx, derived.qrPayload],
        );
        if (ins.rows[0]) return this.toV1(ins.rows[0]);
        const again = await this.fetch(userId);
        if (again) return this.toV1(again);
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        if (/unique|duplicate/i.test(msg)) continue;
        throw e;
      }
    }
    throw new ConflictException("unable to allocate unique TRC20 address");
  }

  private async fetch(userId: string): Promise<AddressRow | null> {
    const r = await this.db.query<AddressRow>(
      `SELECT user_id::text, trc20_address, derivation_index, qr_payload,
              last_seen_tx_at, created_at
         FROM public.user_deposit_addresses
        WHERE user_id = $1::uuid`,
      [userId],
    );
    return r.rows[0] ?? null;
  }

  private async nextDerivationIndex(): Promise<number> {
    const r = await this.db.query<{ next: string }>(
      `SELECT COALESCE(MAX(derivation_index), -1) + 1 AS next
         FROM public.user_deposit_addresses`,
    );
    return Number(r.rows[0]?.next ?? 0);
  }

  private toV1(row: AddressRow): UserDepositAddressV1 {
    return {
      userId: row.user_id,
      trc20Address: row.trc20_address,
      derivationIndex: row.derivation_index,
      qrPayload: row.qr_payload,
      createdAt: row.created_at.toISOString(),
      lastSeenTxAt: row.last_seen_tx_at
        ? row.last_seen_tx_at.toISOString()
        : undefined,
    };
  }
}
