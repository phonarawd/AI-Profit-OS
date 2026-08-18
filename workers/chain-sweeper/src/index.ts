/**
 * chain-sweeper — §43.2 Energy delegate + Treasury sweep.
 *
 * Phase0: Nest runs equivalent tick in-process (emit=InProcessEventBus).
 * Phase1+: this Worker is deployed (cron) and POSTs sweep intents to Nest.
 *
 * NATS ≠ Day-1. DETECTED-stage sweep FORBIDDEN.
 */

import { DAY1_MIN_TRX_STAKE_FOR_SWEEPER, SWEEP_GRACE_SEC } from "./constants";
import {
  buildEnergySweepPlan,
  executeSweepPlanDry,
} from "./energy-delegate";
import { evaluateSweepEligibility } from "./sweep-eligibility";
import { evaluateTrxGuard } from "./trx-guard";

export interface Env {
  SERVICE: string;
  PHASE: string;
  NEST_SWEEP_TICK_URL?: string;
  WATCHER_INGEST_TOKEN?: string;
  /** Injected for health / dry tests — decimal TRX */
  TREASURY_TRX_BALANCE?: string;
  MIN_TRX_STAKE_FOR_SWEEPER?: string;
  SWEEPER_PAUSED?: string;
  ENERGY_DELEGATE_ENABLED?: string;
  SWEEPER_KEYS_HSM_REF?: string;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/health") {
      return Response.json({
        ok: true,
        service: env.SERVICE ?? "chain-sweeper",
        phase: env.PHASE ?? "1",
        busNote: "Phase0 emit=Nest in-process · Phase1 deploy this worker",
        minTrxStakeForSweeper:
          env.MIN_TRX_STAKE_FOR_SWEEPER ?? DAY1_MIN_TRX_STAKE_FOR_SWEEPER,
        graceSec: SWEEP_GRACE_SEC,
        nats: false,
      });
    }

    if (url.pathname === "/tick" && request.method === "POST") {
      const result = await runTick(env);
      return Response.json(result);
    }

    return Response.json(
      {
        ok: true,
        service: env.SERVICE ?? "chain-sweeper",
        phase: env.PHASE ?? "1",
        status: "deploy_ready",
        note: "Phase0 emit=Nest in-process · Phase1 deploy this worker · NATS Day-1 0",
      },
      { status: 200 },
    );
  },

  async scheduled(_event: unknown, env: Env): Promise<void> {
    await runTick(env);
  },
};

async function runTick(env: Env) {
  const nestUrl = env.NEST_SWEEP_TICK_URL;
  if (nestUrl) {
    const res = await fetch(nestUrl, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(env.WATCHER_INGEST_TOKEN
          ? { "x-watcher-token": env.WATCHER_INGEST_TOKEN }
          : {}),
      },
      body: JSON.stringify({ source: "chain-sweeper-worker" }),
    });
    const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    return { ok: res.ok, forwarded: true, nest: body };
  }

  // Local / verify dry path — TRX guard must short-circuit before any plan execute
  const guard = evaluateTrxGuard({
    adminPaused: env.SWEEPER_PAUSED === "true" || env.SWEEPER_PAUSED === "1",
    energyDelegateEnabled: env.ENERGY_DELEGATE_ENABLED !== "false",
    treasuryTrxBalance: env.TREASURY_TRX_BALANCE ?? "0",
    minTrxStakeForSweeper:
      env.MIN_TRX_STAKE_FOR_SWEEPER ?? DAY1_MIN_TRX_STAKE_FOR_SWEEPER,
  });

  let sweepCalls = 0;
  if (!guard.allowSweep) {
    return {
      ok: true,
      forwarded: false,
      guard,
      sweepCalls,
      note: "TRX/admin guard blocked — executeSweep 0",
    };
  }

  // No candidates in dry worker tick without Nest — still prove guard path
  const eligibility = evaluateSweepEligibility({
    depositEventId: "dry",
    status: "ledger_credited",
    amountUsdt: "1",
    creditedAt: new Date(Date.now() - (SWEEP_GRACE_SEC + 1) * 1000),
  });

  if (eligibility.eligible) {
    const plan = buildEnergySweepPlan({
      depositEventId: "dry",
      userDepositAddress: "TDRY",
      treasuryHotAddressRef: "secret:treasury-hot",
      amountUsdt: "1",
      energyDelegateEnabled: true,
      sweeperKeysHsmRef: env.SWEEPER_KEYS_HSM_REF,
    });
    executeSweepPlanDry(plan);
    sweepCalls = 1;
  }

  return {
    ok: true,
    forwarded: false,
    guard,
    eligibility,
    sweepCalls,
  };
}
