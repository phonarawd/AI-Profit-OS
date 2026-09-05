/**
 * PUTDUK continuation session, Step 7.3 - "durable server-side termination
 * independent of the user's browser" regression.
 *
 * NOT wired into AppModule - invoked only by
 * tooling/verify/trades-reconcile.runtime.cjs via
 * `node dist/trades/trades.reconcile.selftest.js` after a scoped tsc
 * build (same compiled-dist convention as trades.execution.race.
 * selftest.ts - TradeExecutionService uses TypeScript parameter
 * properties).
 *
 * Scope of this suite: reconcileStuckTrades()'s OWN logic - which rows it
 * selects (status + hard-deadline-plus-grace cutoff) and how it aggregates
 * results. executeTick() itself (the settlement Rule evaluation, the
 * claim-before-post atomicity from Step 7.2) already has its own coverage
 * in trades.execution.race.selftest.ts and verify:execute-rule-loop, so
 * this suite stubs executeTick directly rather than re-faking its entire
 * dependency graph (RiskService/MoneyCircuitService/ExecutionPolicy
 * AdminService/SimulationAdminService) a second time.
 */
import { TradeExecutionService } from "./trades.execution.service";
import type { PostgresService } from "../db/postgres";
import type { TradeExecutionState } from "./trades.execution.service";

type CapturedQuery = { sql: string; params: unknown[] };

class FakeReconcileDb {
  rows: Array<{ id: string; user_id: string }> = [];
  queries: CapturedQuery[] = [];

  configured(): boolean {
    return true;
  }

  async query<T>(sql: string, params: unknown[] = []): Promise<{ rows: T[] }> {
    this.queries.push({ sql, params });
    if (sql.includes("FROM public.trade_executions") && sql.includes("status IN")) {
      const limit = Number(params[1]);
      return { rows: this.rows.slice(0, limit) as unknown as T[] };
    }
    throw new Error("FakeReconcileDb: unrecognized query: " + sql);
  }
}

function makeService(db: FakeReconcileDb): TradeExecutionService {
  return new TradeExecutionService(
    db as unknown as PostgresService,
    undefined as never,
    undefined as never,
    undefined as never,
    undefined as never,
    undefined as never,
    { nowMs: () => Date.parse("2026-09-06T00:10:00.000Z") } as never,
  );
}

function stubExecuteTick(
  svc: TradeExecutionService,
  impl: (userId: string, tradeId: string) => Promise<TradeExecutionState>,
): void {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (svc as any).executeTick = impl;
}

type CheckResult = { name: string; ok: boolean; detail: string };
const results: CheckResult[] = [];
const record = (name: string, ok: boolean, detail: string) =>
  results.push({ name, ok, detail });

async function main() {
  // 1. Candidates found are passed to executeTick with their OWN owning
  //    user_id (not the caller's - there is no caller, this is a system
  //    sweep), and a real terminal result (safe_stop from MATCH_TIMEOUT)
  //    counts as reconciled.
  {
    const db = new FakeReconcileDb();
    db.rows = [
      { id: "trade-1", user_id: "user-1" },
      { id: "trade-2", user_id: "user-2" },
    ];
    const svc = makeService(db);
    const calls: Array<{ userId: string; tradeId: string }> = [];
    stubExecuteTick(svc, async (userId, tradeId) => {
      calls.push({ userId, tradeId });
      return {
        tradeId,
        opportunityId: "opp-1",
        pricingVersion: 1,
        status: "safe_stop",
        resultCode: "MATCH_TIMEOUT",
        stepIndex: 4,
        progressPct: 100,
        expectedProfitUsdt: "5.00",
        softDeadlineAt: new Date().toISOString(),
        hardDeadlineAt: new Date().toISOString(),
        transport: "polling",
        asset: { id: "a", label: "l" },
      };
    });
    const result = await svc.reconcileStuckTrades();
    record(
      "candidates are reconciled via executeTick using their own owning userId",
      result.candidates === 2 &&
        result.reconciled === 2 &&
        calls.length === 2 &&
        calls[0].userId === "user-1" &&
        calls[0].tradeId === "trade-1",
      `candidates=${result.candidates} reconciled=${result.reconciled} calls=${JSON.stringify(calls)}`,
    );
  }

  // 2. A trade that executeTick could not actually finalize (bug, race,
  //    still not past deadline for some other reason) is NOT counted as
  //    reconciled - "candidates found" and "reconciled" must stay honestly
  //    different when a stuck trade stays stuck.
  {
    const db = new FakeReconcileDb();
    db.rows = [{ id: "trade-3", user_id: "user-3" }];
    const svc = makeService(db);
    stubExecuteTick(svc, async (_userId, tradeId) => ({
      tradeId,
      opportunityId: "opp-1",
      pricingVersion: 1,
      status: "running",
      stepIndex: 2,
      progressPct: 40,
      expectedProfitUsdt: "5.00",
      softDeadlineAt: new Date().toISOString(),
      hardDeadlineAt: new Date().toISOString(),
      transport: "polling",
      asset: { id: "a", label: "l" },
    }));
    const result = await svc.reconcileStuckTrades();
    record(
      "a trade that stays running/requeue after executeTick is not counted as reconciled",
      result.candidates === 1 && result.reconciled === 0,
      `candidates=${result.candidates} reconciled=${result.reconciled}`,
    );
  }

  // 3. executeTick throwing for one trade does not stop the batch, and the
  //    failure is neither silently dropped nor miscounted as reconciled.
  {
    const db = new FakeReconcileDb();
    db.rows = [
      { id: "trade-4", user_id: "user-4" },
      { id: "trade-5", user_id: "user-5" },
    ];
    const svc = makeService(db);
    stubExecuteTick(svc, async (_userId, tradeId) => {
      if (tradeId === "trade-4") throw new Error("simulated executeTick failure");
      return {
        tradeId,
        opportunityId: "opp-1",
        pricingVersion: 1,
        status: "failed",
        resultCode: "SYSTEM_FAILED",
        stepIndex: 4,
        progressPct: 100,
        expectedProfitUsdt: "5.00",
        softDeadlineAt: new Date().toISOString(),
        hardDeadlineAt: new Date().toISOString(),
        transport: "polling",
        asset: { id: "a", label: "l" },
      };
    });
    const result = await svc.reconcileStuckTrades();
    record(
      "one executeTick failure does not abort the batch and is not counted as reconciled",
      result.candidates === 2 && result.reconciled === 1,
      `candidates=${result.candidates} reconciled=${result.reconciled}`,
    );
  }

  // 4. The SQL cutoff is HARD_SEC + graceSec seconds before "now" (default
   // grace 30s) - this is the property that makes the sweep safe (never
   // races a trade that could still legitimately be polled) yet real
   // (still finds trades genuinely past their hard deadline).
  {
    const db = new FakeReconcileDb();
    db.rows = [];
    const svc = makeService(db);
    await svc.reconcileStuckTrades({ graceSec: 45 });
    const q = db.queries[0];
    const cutoffIso = q?.params?.[0] as string;
    const cutoffMs = Date.parse(cutoffIso);
    const nowMs = Date.parse("2026-09-06T00:10:00.000Z");
    const expectedCutoffMs = nowMs - (90 + 45) * 1000;
    record(
      "reconcile cutoff is exactly HARD_SEC(90s) + graceSec before now",
      q?.sql.includes("status IN") === true && cutoffMs === expectedCutoffMs,
      `cutoffMs=${cutoffMs} expected=${expectedCutoffMs}`,
    );
  }

  // 5. limit is respected and clamped to a sane maximum (never an
  //    unbounded sweep in one call).
  {
    const db = new FakeReconcileDb();
    db.rows = Array.from({ length: 10 }, (_, i) => ({
      id: "trade-many-" + i,
      user_id: "user-many-" + i,
    }));
    const svc = makeService(db);
    stubExecuteTick(svc, async (_userId, tradeId) => ({
      tradeId,
      opportunityId: "opp-1",
      pricingVersion: 1,
      status: "safe_stop",
      resultCode: "MATCH_TIMEOUT",
      stepIndex: 4,
      progressPct: 100,
      expectedProfitUsdt: "5.00",
      softDeadlineAt: new Date().toISOString(),
      hardDeadlineAt: new Date().toISOString(),
      transport: "polling",
      asset: { id: "a", label: "l" },
    }));
    const result = await svc.reconcileStuckTrades({ limit: 3 });
    record(
      "limit option bounds how many candidates are processed in one call",
      result.candidates === 3 && result.reconciled === 3,
      `candidates=${result.candidates}`,
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
    "[trades.reconcile.selftest] ALL PASS - durable server-side reconcile-tick verified",
  );
}

main().catch((e) => {
  // eslint-disable-next-line no-console
  console.error("[trades.reconcile.selftest] FATAL", e);
  process.exit(1);
});
