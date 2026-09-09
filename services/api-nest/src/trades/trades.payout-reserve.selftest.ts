/**
 * 매칭 수익 = 내부 장부 지급. SYS:OPPORTUNITY_POOL 잔액이 0이어도
 * MATCH_SUCCESS 지급을 막지 않는다. 실자금 부족은 출금에서만 차단한다.
 *
 * NOT wired into AppModule — tooling/verify/trades-payout-reserve.runtime.cjs
 */
import { TradeExecutionService } from "./trades.execution.service";
import { PayoutReservationService } from "../ledger/payout-reservation.service";
import type { PostgresService } from "../db/postgres";
import type { SimulationAdminService } from "../simulation/simulation.admin.service";

class FakeReserveDb {
  poolBalance: string | null = "0";

  configured(): boolean {
    return true;
  }

  async query<T>(sql: string, params: unknown[] = []): Promise<{ rows: T[] }> {
    if (sql.includes("FROM public.ledger_accounts") && sql.includes("code = $1")) {
      if (this.poolBalance == null) return { rows: [] as unknown as T[] };
      return { rows: [{ balance_usdt: this.poolBalance }] as unknown as T[] };
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

function makeService(
  db: FakeReserveDb,
  simulation: FakeSimulationAdminService,
): TradeExecutionService {
  return new TradeExecutionService(
    db as unknown as PostgresService,
    undefined as never,
    undefined as never,
    undefined as never,
    undefined as never,
    simulation as unknown as SimulationAdminService,
    undefined as never,
    new PayoutReservationService(),
  );
}

async function callResolve(
  svc: TradeExecutionService,
  opportunityId: string,
  compareReady: boolean,
): Promise<boolean> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (svc as any).resolveSimulationPayoutFeasible("trade-1", opportunityId, compareReady);
}

type CheckResult = { name: string; ok: boolean; detail: string };
const results: CheckResult[] = [];
const record = (name: string, ok: boolean, detail: string) =>
  results.push({ name, ok, detail });

async function main() {
  {
    const db = new FakeReserveDb();
    db.poolBalance = "100.00";
    const svc = makeService(db, new FakeSimulationAdminService());
    const feasible = await callResolve(svc, "opp-1", true);
    record(
      "virtual match profit: pool balance does not block match payout feasibility",
      feasible === true,
      `feasible=${feasible}`,
    );
  }

  {
    const db = new FakeReserveDb();
    db.poolBalance = "0.00";
    const svc = makeService(db, new FakeSimulationAdminService());
    const feasible = await callResolve(svc, "opp-2", true);
    record(
      "pool balance 0.00 still feasible for virtual match profit",
      feasible === true,
      `feasible=${feasible}`,
    );
  }

  {
    const db = new FakeReserveDb();
    db.poolBalance = null;
    const svc = makeService(db, new FakeSimulationAdminService());
    const feasible = await callResolve(svc, "opp-4", true);
    record(
      "missing pool account still feasible for virtual match profit",
      feasible === true,
      `feasible=${feasible}`,
    );
  }

  {
    const db = new FakeReserveDb();
    db.poolBalance = "1000.00";
    const svc = makeService(db, new FakeSimulationAdminService());
    const feasible = await callResolve(svc, "opp-5", false);
    record(
      "compareReady=false stays infeasible (price gate, not pool)",
      feasible === false,
      `feasible=${feasible}`,
    );
  }

  {
    const db = new FakeReserveDb();
    db.poolBalance = "0.00";
    const simulation = new FakeSimulationAdminService();
    simulation.report = {
      feasibility: [{ opportunityId: "opp-6", payoutFeasible: false }],
    };
    const svc = makeService(db, simulation);
    const feasible = await callResolve(svc, "opp-6", true);
    record(
      "admin simulation infeasible stays extra fail-closed",
      feasible === false,
      `feasible=${feasible}`,
    );
  }

  {
    const db = new FakeReserveDb();
    db.poolBalance = "0.00";
    const simulation = new FakeSimulationAdminService();
    simulation.report = {
      feasibility: [{ opportunityId: "opp-7", payoutFeasible: true }],
    };
    const svc = makeService(db, simulation);
    const feasible = await callResolve(svc, "opp-7", true);
    record(
      "simulation feasible + pool 0 still allowed for in-app profit",
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
