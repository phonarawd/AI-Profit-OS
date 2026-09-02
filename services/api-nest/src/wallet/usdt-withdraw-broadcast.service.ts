/**
 * USDT TRC20 withdraw + Treasury sweep via Tatum API + local KMS signatureId.
 * Nest never holds private keys / mnemonics.
 */

import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from "@nestjs/common";
import { PostgresService } from "../db/postgres";
import { isTrc20AddressFormat } from "./tron-address";
import type { SweepPlan } from "./chain-sweeper.guards";
import { USDT_CONTRACT_TRC20 } from "./deposit-config.ready";

export const KMS_UNAVAILABLE = "KMS_UNAVAILABLE" as const;
export const TREASURY_ADDRESS_INVALID = "TREASURY_ADDRESS_INVALID" as const;

type TatumEnv = {
  apiKey: string;
  baseUrl: string;
  signatureId: string;
  testnet: boolean;
};

@Injectable()
export class UsdtWithdrawBroadcastService {
  private readonly log = new Logger(UsdtWithdrawBroadcastService.name);

  constructor(private readonly db: PostgresService) {}

  resolveTatumEnv(opts?: { preferTestnet?: boolean }): TatumEnv | null {
    const preferTestnet =
      opts?.preferTestnet === true ||
      (process.env.TATUM_NETWORK ?? "").trim().toLowerCase() === "testnet";
    const apiKey = preferTestnet
      ? (process.env.TATUM_TESTNET_API_KEY ?? "").trim()
      : (process.env.TATUM_MAINNET_API_KEY ?? "").trim();
    const signatureId = (process.env.TATUM_KMS_SIGNATURE_ID ?? "").trim();
    if (!apiKey || !signatureId) return null;
    return {
      apiKey,
      signatureId,
      testnet: preferTestnet,
      baseUrl: "https://api.tatum.io",
    };
  }

  treasuryAddress(): string | null {
    const addr = (process.env.TRON_TREASURY_ADDRESS ?? "").trim();
    return isTrc20AddressFormat(addr) ? addr : null;
  }

  async drainApprovedWithdrawals(opts?: {
    limit?: number;
    fetchImpl?: typeof fetch;
  }): Promise<{ attempted: number; queued: number; skipped: number }> {
    const tatum = this.resolveTatumEnv();
    if (!tatum) {
      return { attempted: 0, queued: 0, skipped: 0 };
    }
    const limit = Math.min(20, Math.max(1, opts?.limit ?? 5));
    const rows = await this.db.query<{
      id: string;
      destination: string | null;
      amount_usdt: string;
      broadcast_tx_hash: string | null;
      broadcast_idempotency_key: string | null;
    }>(
      `SELECT id::text, destination, amount_usdt::text,
              broadcast_tx_hash, broadcast_idempotency_key
         FROM public.withdraw_intents
        WHERE status = 'queued'
          AND asset = 'USDT'
          AND destination IS NOT NULL
          AND (broadcast_tx_hash IS NULL OR broadcast_tx_hash = '')
        ORDER BY updated_at ASC
        LIMIT $1`,
      [limit],
    );

    let queued = 0;
    let skipped = 0;
    for (const row of rows.rows) {
      if (!row.destination || !isTrc20AddressFormat(row.destination)) {
        skipped += 1;
        continue;
      }
      try {
        const result = await this.queueTrc20Transfer({
          to: row.destination,
          amountUsdt: row.amount_usdt,
          idempotencyKey: row.broadcast_idempotency_key ?? `wd:${row.id}`,
          index: 0,
          fetchImpl: opts?.fetchImpl,
        });
        await this.db.query(
          `UPDATE public.withdraw_intents
              SET broadcast_tx_hash = $2,
                  broadcast_status = $3,
                  status = CASE WHEN $3 = 'broadcast' THEN 'broadcasting' ELSE status END,
                  updated_at = now()
            WHERE id = $1::uuid
              AND status = 'queued'
              AND (broadcast_tx_hash IS NULL OR broadcast_tx_hash = '')`,
          [row.id, result.txId, result.status],
        );
        queued += 1;
      } catch (err) {
        this.log.warn(`withdraw broadcast fail id=${row.id}`);
        skipped += 1;
      }
    }
    return { attempted: rows.rows.length, queued, skipped };
  }

  async sweepToTreasury(plan: SweepPlan): Promise<{
    ok: boolean;
    broadcast: boolean;
    sweepTxHash?: string;
  }> {
    const treasury = this.treasuryAddress();
    if (!treasury) {
      throw new ServiceUnavailableException(TREASURY_ADDRESS_INVALID);
    }
    if (!this.resolveTatumEnv()) {
      throw new ServiceUnavailableException(KMS_UNAVAILABLE);
    }
    if (plan.userDepositAddress === treasury) {
      return { ok: false, broadcast: false };
    }
    const result = await this.queueTrc20Transfer({
      to: treasury,
      amountUsdt: plan.amountUsdt,
      idempotencyKey: `sweep:${plan.depositEventId}`,
      fromAddress: plan.userDepositAddress,
    });
    return {
      ok: true,
      broadcast: true,
      sweepTxHash: result.txId,
    };
  }

  async queueTrc20Transfer(opts: {
    to: string;
    amountUsdt: string;
    idempotencyKey: string;
    fromAddress?: string;
    index?: number;
    fetchImpl?: typeof fetch;
  }): Promise<{ txId: string; status: string }> {
    const tatum = this.resolveTatumEnv();
    if (!tatum) {
      throw new ServiceUnavailableException(KMS_UNAVAILABLE);
    }
    if (!isTrc20AddressFormat(opts.to)) {
      throw new ServiceUnavailableException("DESTINATION_INVALID");
    }
    const body: Record<string, unknown> = {
      to: opts.to,
      tokenAddress: USDT_CONTRACT_TRC20,
      amount: opts.amountUsdt,
      feeLimit: 100_000_000,
      signatureId: tatum.signatureId,
    };
    if (typeof opts.index === "number") {
      body.index = opts.index;
    }
    if (opts.fromAddress) {
      body.from = opts.fromAddress;
    }

    const fetchImpl = opts.fetchImpl ?? fetch;
    const url = `${tatum.baseUrl}/v3/tron/trc20/transaction`;
    const res = await fetchImpl(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": tatum.apiKey,
        "Idempotency-Key": opts.idempotencyKey,
      },
      body: JSON.stringify(body),
    });
    if (res.status === 429 || res.status >= 500) {
      throw new ServiceUnavailableException(KMS_UNAVAILABLE);
    }
    if (!res.ok) {
      throw new ServiceUnavailableException(`TATUM_HTTP_${res.status}`);
    }
    const json = (await res.json()) as {
      txId?: string;
      signatureId?: string;
      id?: string;
    };
    const txId = String(json.txId ?? json.signatureId ?? json.id ?? "").trim();
    if (!txId) {
      throw new ServiceUnavailableException(KMS_UNAVAILABLE);
    }
    return {
      txId,
      status: json.txId ? "broadcast" : "kms_pending",
    };
  }
}
