/**
 * PUTDUK continuation session, Step 7.4 - "evaluatePayoutFeasibility() has
 * no real connection to SYS:OPPORTUNITY_POOL's actual balance - code
 * existence and fixture PASS are not proof of real funds" regression.
 *
 * NOT wired into AppModule - invoked only by
 * tooling/verify/trades-payout-reserve.runtime.cjs via
 * `node dist/trades/trades.payout-reserve.selftest.js` after a scoped
 * tsc build (same compiled-dist convention as trades.execution.race.
 * selftest.ts).
 *
 * Bug this guards: resolveSimulationPayoutFeasible's fallback (used
 * whenever no per-opportunity simulation report exists yet - the common
 * case for a freshly published opportunity) called evaluatePayoutFeasibility()
 * from services/simulation-engine, which - confirmed by reading it, not
 * assumed - unconditionally returns payoutFeasible:true whenever
 * compareReady is true and no forceInfeasible/explicit override is
 * supplied. settlement_rule.cjs's own R8
 * (ctx.simulationPayoutFeasible !== true -> BELOW_MIN_PROFIT) is the ONLY
 * rule standing between a match and a profit credit SYS:OPPORTUNITY_POOL
 * cannot actually back - with the stub always answering true, that gate
 * was permanently open regardless of the pool's real balance (confirmed
 * live: 0.00 USDT via Supabase execute_sql at the time this fix was
 * written).
 */
import { TradeExecutionService } from "./trades.execution.service";
import type { PostgresService } from "../db/postgres";
import type { SimulationAdminService } from "../simulation/simulation.admin.service";

type QueryHandler = (sql: string, params: unknown[]) => { rows: unknown[] } | null;

class FakeReserveDb {
  poolBalance: string | null = "0";
  runningExposureTotal = "0";

  configured(): boolean {
    return true;
  }

  async query<T>(sql: string, params: unknown[] = []): Promise<{ rows: T[] }> {
    if (sql.includes("FROM public.ledger_accounts") && sql.includes("code = $1")) {
      if (this.poolBalance == null) return { rows: [] as unknown as T[] };
      return { rows: [{ balance_usdt: this.poolBalance }] as unknown as T[] };
    }
    if (sql.includes("FROM public.trade_executions") && sql.includes("sum(expected_profit_usdt)")) {
      return { rows: [{ total: this.runningExposureTotal }] as unknown as T[] };
    }
    throw new Error("FakeReserveDb: unrecognized query: " + sql + " " + JSON.stringify(params));
  }
}

class FakeSimulationAdminService {
  report: unknown = null;
  async latestOrNull(): Promise<{ report: unknown } | null> {
    return this.report === null ? null : { report: this.report };
  }
}

function makeService(db: FakeReserveDb, simulation: FakeSimulationAdminService): TradeExecutionService {
  return new TradeExecutionService(
    db as unknown as PostgresService,
    undefined as never,
    undefined as never,
    undefined as never,
    undefined as never,
    simulation as unknown as SimulationAdminService,
    undefined as never,
  );
}

async function callResolve(
  svc: TradeExecutionService,
  opportunityId: string,
  compareReady: boolean,
): Promise<boolean> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (svc as any).resolveSimulationPayoutFeasible(opportunityId, compareReady);
}

type CheckResult = { name: string; ok: boolean; detail: string };
const results: CheckResult[] = [];
const record = (name: string, ok: boolean, detail: string) =>
  results.push({ name, ok, detail });

async function main() {
  // 1. Pool has enough to cover every in-flight promise -> feasible.
  {
    const db = new FakeReserveDb();
    db.poolBalance = "100.00";
    db.runningExposureTotal = "80.00";
    const svc = makeService(db, new FakeSimulationAdminService());
    const feasible = await callResolve(svc, "opp-1", true);
    record(
      "pool balance >= total in-flight exposure -> feasible",
      feasible === true,
      `feasible=${feasible}`,
    );
  }

  // 2. THE core bug this fix closes: pool cannot cover total in-flight
  //    exposure (confirmed live state: pool is exactly 0.00) -> infeasible,
  //    not the old stub's unconditional true.
  {
    const db = new FakeReserveDb();
    db.poolBalance = "0.00";
    db.runningExposureTotal = "5.00";
    const svc = makeService(db, new FakeSimulationAdminService());
    const feasible = await callResolve(svc, "opp-2", true);
    record(
      "pool balance 0.00 with any in-flight exposure -> infeasible (the confirmed live case)",
      feasible === false,
      `feasible=${feasible}`,
    );
  }

  // 3. Pool exactly covers total exposure (boundary, >= not >) -> feasible.
  {
    const db = new FakeReserveDb();
    db.poolBalance = "5.00";
    db.runningExposureTotal = "5.00";
    const svc = makeService(db, new FakeSimulationAdminService());
    const feasible = await callResolve(svc, "opp-3", true);
    record(
      "pool balance exactly equal to total exposure -> feasible (boundary)",
      feasible === true,
      `feasible=${feasible}`,
    );
  }

  // 4. Missing SYS:OPPORTUNITY_POOL account row -> fail closed, never
  //    treat "unknown" as funded.
  {
    const db = new FakeReserveDb();
    db.poolBalance = null;
    const svc = makeService(db, new FakeSimulationAdminService());
    const feasible = await callResolve(svc, "opp-4", true);
    record(
      "missing pool account row -> fail closed (infeasible), not fail open",
      feasible === false,
      `feasible=${feasible}`,
    );
  }

  // 5. compareReady===false short-circuits to infeasible before even
  //    querying the pool - preserves the stub's old compareReady branch.
  {
    const db = new FakeReserveDb();
    db.poolBalance = "1000.00";
    db.runningExposureTotal = "0";
    const svc = makeService(db, new FakeSimulationAdminService());
    const feasible = await callResolve(svc, "opp-5", false);
    record(
      "compareReady=false stays infeasible even with a well-funded pool",
      feasible === false,
      `feasible=${feasible}`,
    );
  }

  // 6. A simulation report with a matching per-opportunity entry still
  //    takes precedence over the real-pool fallback (unchanged behavior -
  //    this fix only replaces the NO-REPORT fallback, not the reporting
  //    path itself).
  {
    const db = new FakeReserveDb();
    db.poolBalance = "0.00"; // would be infeasible via the real-pool path
    const simulation = new FakeSimulationAdminService();
    simulation.report = {
      feasibility: [{ opportunityId: "opp-6", payoutFeasible: true }],
    };
    const svc = makeService(db, simulation);
    const feasible = await callResolve(svc, "opp-6", true);
    record(
      "an existing simulation report entry still takes precedence over the live pool fallback",
      feasible === true,
      `feasible=${feasible}`,
    );
  }

  for (const r of results) {
    // eslint-disable-next-line no-console
    console.log(`${r.ok ? "PASS" : "FAIL"} - ${r.name} (${r.detail})`);
  }
  const failed = results.filter((r) => !r.ok);
  if (failed.length > 0) {
    process.exit(1);
  }
  // eslint-disable-next-line no-console
  console.log(
    "[trades.payout-reserve.selftest] ALL PASS - real payout-reserve feasibility gate verified",
  );
}

main().catch((e) => {
  // eslint-disable-next-line no-console
  console.error("[trades.payout-reserve.selftest] FATAL", e);
  process.exit(1);
});
