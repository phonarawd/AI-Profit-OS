/**
 * chain-watchers — §43.1 USDT Transfer single stream.
 *
 * Phase0: Nest runs equivalent tick in-process (emit=InProcessEventBus).
 * Phase1+: this Worker is deployed (cron/fetch) and POSTs observations to Nest.
 *
 * Per-address high-frequency polling FORBIDDEN.
 */

import { AddressIndex, type DepositAddressEntry } from "./address-index";
import {
  CHAIN_WATCHER_MODE,
  USDT_LEDGER_CONFIRMATIONS,
  USDT_UI_CONFIRMATIONS,
} from "./constants";
import { RateLimitBudgeter } from "./rate-limit-budgeter";
import { pullUsdtTransferStream } from "./usdt-trc20-event-stream";

export interface Env {
  SERVICE: string;
  PHASE: string;
  /** Nest ingest URL for Phase1 observe fan-in */
  NEST_USDT_OBSERVE_URL?: string;
  /** Optional shared secret header — Nest observe requires x-internal-wallet-token */
  WATCHER_INGEST_TOKEN?: string;
  INTERNAL_WALLET_TICK_TOKEN?: string;
  TRONGRID_BASE_URL?: string;
  TRONGRID_API_KEY?: string;
  /** JSON array of { trc20Address, userId } — Phase1 bootstrap; Nest is SoT */
  DEPOSIT_ADDRESS_INDEX_JSON?: string;
}

const budgeter = new RateLimitBudgeter();

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/health") {
      return Response.json({
        ok: true,
        service: env.SERVICE ?? "chain-watchers",
        phase: env.PHASE ?? "1",
        mode: CHAIN_WATCHER_MODE,
        usdtUiConfirmations: USDT_UI_CONFIRMATIONS,
        usdtLedgerConfirmations: USDT_LEDGER_CONFIRMATIONS,
        perAddressPoll: false,
      });
    }

    if (url.pathname === "/tick" && request.method === "POST") {
      const result = await runTick(env);
      return Response.json(result);
    }

    return Response.json(
      {
        ok: true,
        service: env.SERVICE ?? "chain-watchers",
        phase: env.PHASE ?? "1",
        status: "deploy_ready",
        mode: CHAIN_WATCHER_MODE,
        note: "Phase0 emit=Nest in-process · Phase1 deploy this worker",
      },
      { status: 200 },
    );
  },

  /** Cloudflare Cron — single contract stream pull */
  async scheduled(_event: unknown, env: Env): Promise<void> {
    await runTick(env);
  },
};

async function runTick(env: Env) {
  const entries = parseAddressIndex(env.DEPOSIT_ADDRESS_INDEX_JSON);
  const index = new AddressIndex(entries);
  const pull = await pullUsdtTransferStream(index, {
    tronGridBaseUrl: env.TRONGRID_BASE_URL,
    tronGridApiKey: env.TRONGRID_API_KEY,
    budgeter,
  });

  const observeUrl = env.NEST_USDT_OBSERVE_URL;
  let forwarded = 0;
  if (observeUrl && pull.matched.length > 0) {
    for (const obs of pull.matched) {
      const res = await fetch(observeUrl, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...(env.INTERNAL_WALLET_TICK_TOKEN || env.WATCHER_INGEST_TOKEN
            ? {
                "x-internal-wallet-token":
                  env.INTERNAL_WALLET_TICK_TOKEN || env.WATCHER_INGEST_TOKEN,
              }
            : {}),
        },
        body: JSON.stringify({
          txHash: obs.txHash,
          toAddress: obs.toAddress,
          amountUsdt: obs.amountUsdt,
          confirmations: obs.confirmations,
        }),
      });
      if (res.ok) forwarded += 1;
    }
  }

  return {
    ok: true,
    mode: pull.mode,
    scanned: pull.scanned,
    matched: pull.matched.length,
    forwarded,
    fingerprint: pull.fingerprint,
    budget: pull.budget,
    addressIndexSize: index.size(),
  };
}

function parseAddressIndex(raw?: string): DepositAddressEntry[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as DepositAddressEntry[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}
