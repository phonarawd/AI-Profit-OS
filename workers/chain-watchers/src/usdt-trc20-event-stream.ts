/**
 * §43.1 usdt-trc20-event-stream — USDT contract Transfer **single stream**.
 *
 * FORBIDDEN: per-address high-frequency polling / getTransactionsFromAddress fan-out.
 * Day-1 free path = TronGrid contract events API on USDT only + local AddressIndex match.
 * Mode lock: event_stream (never poll-per-address).
 */

import { AddressIndex } from "./address-index";
import {
  CHAIN_WATCHER_MODE,
  DEFAULT_TRONGRID_BASE,
  USDT_DUST_MIN,
  USDT_TRC20_CONTRACT,
} from "./constants";
import { RateLimitBudgeter } from "./rate-limit-budgeter";

export type Trc20TransferObservation = {
  txHash: string;
  toAddress: string;
  fromAddress?: string;
  amountUsdt: string;
  /** Block confirmations if known; Nest may refresh */
  confirmations: number;
  blockTimestamp?: number;
  userId?: string;
};

export type EventStreamConfig = {
  tronGridBaseUrl?: string;
  tronGridApiKey?: string;
  usdtContract?: string;
  /** fingerprint / pagination cursor from prior pull */
  fingerprint?: string | null;
  limit?: number;
  onlyConfirmed?: boolean;
  fetchImpl?: typeof fetch;
  budgeter?: RateLimitBudgeter;
};

export type EventStreamPullResult = {
  mode: typeof CHAIN_WATCHER_MODE;
  contract: string;
  /** Matched to known deposit addresses only */
  matched: Trc20TransferObservation[];
  /** Raw transfer count before address filter (observability) */
  scanned: number;
  fingerprint: string | null;
  budget: ReturnType<RateLimitBudgeter["snapshot"]>;
};

/**
 * Pull Transfer events for the **USDT contract only** (one stream).
 * Match locally via AddressIndex — never N address RPCs.
 */
export async function pullUsdtTransferStream(
  addressIndex: AddressIndex,
  cfg: EventStreamConfig = {},
): Promise<EventStreamPullResult> {
  const budgeter = cfg.budgeter ?? new RateLimitBudgeter();
  const contract = cfg.usdtContract ?? USDT_TRC20_CONTRACT;
  const base = (cfg.tronGridBaseUrl ?? DEFAULT_TRONGRID_BASE).replace(
    /\/$/,
    "",
  );
  const limit = Math.min(200, Math.max(1, cfg.limit ?? 50));
  const fetchImpl = cfg.fetchImpl ?? fetch;

  if (!budgeter.tryAcquire(1)) {
    return {
      mode: CHAIN_WATCHER_MODE,
      contract,
      matched: [],
      scanned: 0,
      fingerprint: cfg.fingerprint ?? null,
      budget: budgeter.snapshot(),
    };
  }

  const url = new URL(`${base}/v1/contracts/${contract}/events`);
  url.searchParams.set("event_name", "Transfer");
  url.searchParams.set("only_confirmed", cfg.onlyConfirmed === false ? "false" : "true");
  url.searchParams.set("limit", String(limit));
  if (cfg.fingerprint) {
    url.searchParams.set("fingerprint", cfg.fingerprint);
  }

  const headers: Record<string, string> = {
    Accept: "application/json",
  };
  if (cfg.tronGridApiKey) {
    headers["TRON-PRO-API-KEY"] = cfg.tronGridApiKey;
  }

  const res = await fetchImpl(url.toString(), { headers });
  if (res.status === 429) {
    budgeter.noteUpstreamThrottle(15_000);
    return {
      mode: CHAIN_WATCHER_MODE,
      contract,
      matched: [],
      scanned: 0,
      fingerprint: cfg.fingerprint ?? null,
      budget: budgeter.snapshot(),
    };
  }
  if (!res.ok) {
    throw new Error(`trongrid events HTTP ${res.status}`);
  }

  const body = (await res.json()) as {
    data?: unknown[];
    meta?: { fingerprint?: string };
  };
  const rows = Array.isArray(body.data) ? body.data : [];
  const matched: Trc20TransferObservation[] = [];

  for (const row of rows) {
    const obs = parseTransferEvent(row);
    if (!obs) continue;
    if (cmpDecimal(obs.amountUsdt, USDT_DUST_MIN) < 0) continue;
    const userId = addressIndex.resolveUserId(obs.toAddress);
    if (!userId) continue;
    matched.push({ ...obs, userId });
  }

  return {
    mode: CHAIN_WATCHER_MODE,
    contract,
    matched,
    scanned: rows.length,
    fingerprint: body.meta?.fingerprint ?? cfg.fingerprint ?? null,
    budget: budgeter.snapshot(),
  };
}

/** Parse TronGrid contract event row → Transfer observation */
export function parseTransferEvent(row: unknown): Trc20TransferObservation | null {
  if (!row || typeof row !== "object") return null;
  const r = row as Record<string, unknown>;
  const result = (r.result ?? r) as Record<string, unknown>;
  const toRaw =
    result.to ?? result.to_address ?? result["0"] ?? result["_to"];
  const valueRaw =
    result.value ?? result.amount ?? result["1"] ?? result["_value"];
  const txHash = String(r.transaction_id ?? r.txID ?? r.tx_hash ?? "");
  if (!txHash || toRaw == null || valueRaw == null) return null;

  const toAddress = tronHexOrBase58(String(toRaw));
  if (!toAddress) return null;

  const amountUsdt = usdtAmountFromRaw(valueRaw);
  if (!amountUsdt) return null;

  const confirmations = Number(r.confirmations ?? r.confirmed ? 19 : 1) || 1;
  const blockTimestamp = Number(r.block_timestamp ?? r.blockTimestamp ?? 0) || undefined;

  return {
    txHash,
    toAddress,
    fromAddress: result.from
      ? tronHexOrBase58(String(result.from)) ?? undefined
      : undefined,
    amountUsdt,
    confirmations: Math.max(1, confirmations),
    blockTimestamp,
  };
}

function usdtAmountFromRaw(raw: unknown): string | null {
  try {
    const s = String(raw).trim();
    if (!s) return null;
    // TronGrid often returns integer sun-like 6-decimal raw for USDT
    if (/^\d+$/.test(s)) {
      const n = BigInt(s);
      const whole = n / 1_000_000n;
      const frac = (n % 1_000_000n).toString().padStart(6, "0").replace(/0+$/, "");
      return frac ? `${whole}.${frac}` : whole.toString();
    }
    if (!/^\d+(\.\d+)?$/.test(s)) return null;
    return s;
  } catch {
    return null;
  }
}

/** Accept base58 T… or 41-hex / 0x41… → leave base58 as-is; hex kept normalized for index match */
function tronHexOrBase58(v: string): string | null {
  const s = v.trim();
  if (!s) return null;
  if (s.startsWith("T") && s.length >= 30) return s;
  // Hex form without base58 decode in Worker — Nest address index uses base58.
  // Skip non-base58; TronGrid Transfer `to` is typically base58 in events API.
  if (/^41[0-9a-fA-F]{40}$/.test(s) || /^0x41[0-9a-fA-F]{40}$/i.test(s)) {
    return null;
  }
  return s.length >= 30 ? s : null;
}

function cmpDecimal(a: string, b: string): number {
  const [aw, af = ""] = a.split(".");
  const [bw, bf = ""] = b.split(".");
  const aBig = BigInt(aw + af.padEnd(18, "0").slice(0, 18));
  const bBig = BigInt(bw + bf.padEnd(18, "0").slice(0, 18));
  if (aBig === bBig) return 0;
  return aBig > bBig ? 1 : -1;
}
