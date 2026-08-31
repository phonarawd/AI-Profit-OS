/**
 * §43.1 Phase0 chain-watcher — Nest in-process single USDT Transfer stream.
 * Emit path = InProcessEventBus via UsdtDepositService (NATS ≠ Day-1).
 *
 * FORBIDDEN: per-address high-frequency polling.
 */

import { Injectable, Logger } from "@nestjs/common";
import { DepositAddressService } from "./deposit-address.service";
import { DepositConfigService } from "./deposit-config.service";
import { UsdtDepositService } from "./usdt-deposit.service";
import {
  CHAIN_WATCHER_MODE,
  USDT_LEDGER_CONFIRMATIONS,
  USDT_UI_CONFIRMATIONS,
} from "./chain-watcher.stages";

type BudgetState = {
  windowStartMs: number;
  windowCount: number;
  dayKey: string;
  dayCount: number;
  circuitOpenUntilMs: number;
};

const QPS = 12;
const DAILY = 80_000;

@Injectable()
export class ChainWatcherPhase0Service {
  private readonly log = new Logger(ChainWatcherPhase0Service.name);
  private fingerprint: string | null = null;
  private readonly budget: BudgetState = {
    windowStartMs: 0,
    windowCount: 0,
    dayKey: "",
    dayCount: 0,
    circuitOpenUntilMs: 0,
  };

  constructor(
    private readonly depositConfig: DepositConfigService,
    private readonly addresses: DepositAddressService,
    private readonly usdtDeposit: UsdtDepositService,
  ) {}

  describe() {
    return {
      phase: 0 as const,
      bus: "in-process" as const,
      mode: CHAIN_WATCHER_MODE,
      usdtUiConfirmations: USDT_UI_CONFIRMATIONS,
      usdtLedgerConfirmations: USDT_LEDGER_CONFIRMATIONS,
      perAddressPoll: false,
      fingerprint: this.fingerprint,
      budget: { ...this.budget },
    };
  }

  /**
   * One tick: pull USDT contract events (single stream) → local address match → observe.
   */
  async tick(opts?: {
    fetchImpl?: typeof fetch;
    limit?: number;
  }): Promise<{
    ok: true;
    mode: typeof CHAIN_WATCHER_MODE;
    scanned: number;
    matched: number;
    processed: number;
    fingerprint: string | null;
  }> {
    const cfg = await this.depositConfig.requirePersisted();
    const onchain = cfg.usdtOnchain;
    if (onchain.chainWatcherMode !== CHAIN_WATCHER_MODE) {
      throw new Error("chainWatcherMode must be event_stream");
    }

    const index = await this.addresses.loadAddressIndex();
    const byAddr = new Map(
      index.map((e) => [e.trc20Address, e.userId] as const),
    );

    if (!this.tryAcquireBudget()) {
      return {
        ok: true,
        mode: CHAIN_WATCHER_MODE,
        scanned: 0,
        matched: 0,
        processed: 0,
        fingerprint: this.fingerprint,
      };
    }

    const base = onchain.tronGridBaseUrl.replace(/\/$/, "");
    const contract = onchain.usdtContract;
    const limit = Math.min(200, Math.max(1, opts?.limit ?? 50));
    const url = new URL(`${base}/v1/contracts/${contract}/events`);
    url.searchParams.set("event_name", "Transfer");
    url.searchParams.set("only_confirmed", "true");
    url.searchParams.set("limit", String(limit));
    if (this.fingerprint) {
      url.searchParams.set("fingerprint", this.fingerprint);
    }

    const headers: Record<string, string> = { Accept: "application/json" };
    if (onchain.tronGridApiKey) {
      headers["TRON-PRO-API-KEY"] = onchain.tronGridApiKey;
    }

    const fetchImpl = opts?.fetchImpl ?? fetch;
    const res = await fetchImpl(url.toString(), { headers });
    if (res.status === 429) {
      this.budget.circuitOpenUntilMs = Date.now() + 15_000;
      return {
        ok: true,
        mode: CHAIN_WATCHER_MODE,
        scanned: 0,
        matched: 0,
        processed: 0,
        fingerprint: this.fingerprint,
      };
    }
    if (!res.ok) {
      this.log.warn(`TronGrid events HTTP ${res.status}`);
      throw new Error(`trongrid events HTTP ${res.status}`);
    }

    const body = (await res.json()) as {
      data?: unknown[];
      meta?: { fingerprint?: string };
    };
    const rows = Array.isArray(body.data) ? body.data : [];
    if (body.meta?.fingerprint) this.fingerprint = body.meta.fingerprint;

    let matched = 0;
    let processed = 0;
    for (const row of rows) {
      const parsed = parseTransferRow(row);
      if (!parsed) continue;
      const userId = byAddr.get(parsed.toAddress);
      if (!userId) continue;
      matched += 1;
      await this.usdtDeposit.observe({
        txHash: parsed.txHash,
        toAddress: parsed.toAddress,
        amountUsdt: parsed.amountUsdt,
        confirmations: parsed.confirmations,
        userId,
      });
      processed += 1;
    }

    return {
      ok: true,
      mode: CHAIN_WATCHER_MODE,
      scanned: rows.length,
      matched,
      processed,
      fingerprint: this.fingerprint,
    };
  }

  private tryAcquireBudget(): boolean {
    const t = Date.now();
    if (t < this.budget.circuitOpenUntilMs) return false;
    const day = new Date(t).toISOString().slice(0, 10);
    if (day !== this.budget.dayKey) {
      this.budget.dayKey = day;
      this.budget.dayCount = 0;
    }
    if (this.budget.dayCount + 1 > DAILY) {
      this.budget.circuitOpenUntilMs = t + 30_000;
      return false;
    }
    if (t - this.budget.windowStartMs >= 1000) {
      this.budget.windowStartMs = t;
      this.budget.windowCount = 0;
    }
    if (this.budget.windowCount + 1 > QPS) return false;
    this.budget.windowCount += 1;
    this.budget.dayCount += 1;
    return true;
  }
}

function parseTransferRow(row: unknown): {
  txHash: string;
  toAddress: string;
  amountUsdt: string;
  confirmations: number;
} | null {
  if (!row || typeof row !== "object") return null;
  const r = row as Record<string, unknown>;
  const result = (r.result ?? r) as Record<string, unknown>;
  const toRaw = result.to ?? result.to_address;
  const valueRaw = result.value ?? result.amount;
  const txHash = String(r.transaction_id ?? r.txID ?? "");
  if (!txHash || toRaw == null || valueRaw == null) return null;
  const toAddress = String(toRaw).trim();
  if (!toAddress.startsWith("T")) return null;
  const amountUsdt = usdtFromRaw(valueRaw);
  if (!amountUsdt) return null;
  const confirmations = Number(r.confirmations ?? 1) || 1;
  return {
    txHash,
    toAddress,
    amountUsdt,
    confirmations: Math.max(1, confirmations),
  };
}

function usdtFromRaw(raw: unknown): string | null {
  const s = String(raw).trim();
  if (!s) return null;
  if (/^\d+$/.test(s)) {
    const n = BigInt(s);
    const whole = n / 1_000_000n;
    const frac = (n % 1_000_000n)
      .toString()
      .padStart(6, "0")
      .replace(/0+$/, "");
    return frac ? `${whole}.${frac}` : whole.toString();
  }
  if (!/^\d+(\.\d+)?$/.test(s)) return null;
  return s;
}
