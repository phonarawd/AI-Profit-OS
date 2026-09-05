/**
 * PUTDUK continuation session, Step 7.2 - "success vs safe-stop, success vs
 * timeout, two successes, two failures, all racing concurrently" regression.
 *
 * NOT wired into AppModule - invoked only by
 * tooling/verify/trades-execution-race.runtime.cjs via
 * `node dist/trades/trades.execution.race.selftest.js` after a scoped tsc
 * build (same convention as session-rotation.reuse.selftest.ts /
 * jwt-guard.selftest.ts - TradeExecutionService uses TypeScript parameter
 * properties, so node:test against the raw .ts source cannot run it
 * directly).
 *
 * Bug this guards: finalizeMatchSuccess and finalizeSafeStop used to post
 * their ledger journal (settlement:<tradeId> / participate_unlock:<tradeId>
 * - two DIFFERENT idempotency keys) BEFORE the status-guarded UPDATE that
 * claims the terminal transition. Two concurrent executeTick calls racing
 * on the same still-"running" trade (duplicate poll tick, or a client
 * retry-after-timeout overlapping the original in-flight request) could
 * each decide a different terminal outcome and each unconditionally post
 * their own journal - double-crediting principal (once via settlement's
 * capital-unlock line, once via participate_unlock's) while only a single
 * capital amount was ever locked. The fix reorders both methods to claim
 * the terminal transition FIRST via the atomic single-statement UPDATE,
 * and only the caller that actually wins that claim (1 row affected) may
 * post a journal at all.
 *
 * Uses a FakeTradeDb that recognizes exactly the SQL shapes
 * trades.execution.service.ts issues (copied verbatim from its source) and
 * a FakePostingService that mimics postJournal's real idempotency-key
 * dedup - no real Postgres needed. Both finalize methods are private,
 * called here via an `as any` cast (TS-only access control, none at
 * runtime) so each race can be exercised directly without also having to
 * fake the settlement_rule.cjs Rust bridge and every executeTick dependency.
 */
import { TradeExecutionService } from "./trades.execution.service";
import type { PostgresService } from "../db/postgres";
import type { LedgerPostingService } from "../ledger/ledger.posting.service";

type Row = {
  id: string;
  user_id: string;
  opportunity_id: string;
  pricing_version: number;
  status: string;
  result_code: string | null;
  step_index: number;
  progress_pct: string;
  log_line: string | null;
  expected_profit_usdt: string;
  settled_profit_usdt: string | null;
  ledger_journal_id: string | null;
  idempotency_key: string;
  asset: Record<string, unknown>;
  created_at: Date;
  updated_at: Date;
};

function freshRow(id: string): Row {
  return {
    id,
    user_id: "user-" + id,
    opportunity_id: "opp-" + id,
    pricing_version: 1,
    status: "running",
    result_code: null,
    step_index: 1,
    progress_pct: "10",
    log_line: null,
    expected_profit_usdt: "5.00",
    settled_profit_usdt: null,
    ledger_journal_id: null,
    idempotency_key: "idem-" + id,
    asset: { id: "asset-" + id, label: "test asset" },
    created_at: new Date(),
    updated_at: new Date(),
  };
}

class FakeTradeDb {
  row: Row;
  queryLog: string[] = [];

  constructor(row: Row) {
    this.row = row;
  }

  configured(): boolean {
    return true;
  }

  async query<T>(sql: string, params: unknown[] = []): Promise<{ rows: T[] }> {
    const p = params as unknown[];

    // finalizeMatchSuccess's claim UPDATE.
    if (sql.includes("SET status = 'success'")) {
      this.queryLog.push("claim-success");
      const [id, logLine, expectedProfit, assetJson] = p as [
        string,
        string,
        string,
        string,
      ];
      if (id !== this.row.id || !["running", "requeue"].includes(this.row.status)) {
        return { rows: [] };
      }
      this.row = {
        ...this.row,
        status: "success",
        result_code: "MATCH_SUCCESS",
        step_index: 4,
        progress_pct: "100",
        log_line: logLine,
        expected_profit_usdt: expectedProfit,
        settled_profit_usdt: expectedProfit,
        asset: JSON.parse(assetJson) as Record<string, unknown>,
        updated_at: new Date(),
      };
      return { rows: [{ ...this.row } as unknown as T] };
    }

    // finalizeSafeStop's claim UPDATE.
    if (sql.includes("SET status = $2")) {
      this.queryLog.push("claim-safe-stop");
      const [id, status, resultCode, stepIndex, progressPct] = p as [
        string,
        string,
        string,
        number,
        number,
      ];
      if (id !== this.row.id || !["running", "requeue"].includes(this.row.status)) {
        return { rows: [] };
      }
      this.row = {
        ...this.row,
        status,
        result_code: resultCode,
        step_index: stepIndex,
        progress_pct: String(progressPct),
        log_line: resultCode,
        updated_at: new Date(),
      };
      return { rows: [{ ...this.row } as unknown as T] };
    }

    // Journal-id attach UPDATE (runs only after a claim already won).
    if (sql.includes("SET ledger_journal_id")) {
      this.queryLog.push("attach-journal");
      const [id, journalId] = p as [string, string];
      if (id === this.row.id) {
        this.row = { ...this.row, ledger_journal_id: journalId, updated_at: new Date() };
      }
      return { rows: [{ ...this.row } as unknown as T] };
    }

    // reloadTrade (race loser re-reads the winner's committed row).
    if (sql.trim().toUpperCase().startsWith("SELECT")) {
      this.queryLog.push("reload");
      return { rows: [{ ...this.row } as unknown as T] };
    }

    throw new Error("FakeTradeDb: unrecognized query: " + sql);
  }
}

class FakePostingService {
  calls: Array<{ idempotencyKey: string; journalType: string }> = [];
  private byKey = new Map<string, { id: string }>();

  async postJournal(input: {
    idempotencyKey: string;
    journalType: string;
    [key: string]: unknown;
  }): Promise<{ id: string }> {
    this.calls.push({ idempotencyKey: input.idempotencyKey, journalType: input.journalType });
    const existing = this.byKey.get(input.idempotencyKey);
    if (existing) return existing;
    const journal = { id: "journal-" + (this.byKey.size + 1) };
    this.byKey.set(input.idempotencyKey, journal);
    return journal;
  }
}

function makeService(db: FakeTradeDb, posting: FakePostingService): TradeExecutionService {
  return new TradeExecutionService(
    db as unknown as PostgresService,
    posting as unknown as LedgerPostingService,
    undefined as never,
    undefined as never,
    undefined as never,
    undefined as never,
    undefined as never,
  );
}

function successInput(row: Row) {
  return {
    nowMs: Date.now(),
    acceptedAtMs: row.created_at.getTime(),
    expectedProfitUsdt: row.expected_profit_usdt,
    capitalUsdt: "10.00",
    platformMarginUsdt: "0",
    fxSnapshotId: "fx-1",
    rematchCount: 0,
  };
}

type CheckResult = { name: string; ok: boolean; detail: string };
const results: CheckResult[] = [];
const record = (name: string, ok: boolean, detail: string) =>
  results.push({ name, ok, detail });

async function main() {
  // 1. Sequential sanity: a single success finalize posts exactly one
  //    settlement journal and persists ledger_journal_id.
  {
    const row = freshRow("seq-success");
    const db = new FakeTradeDb(row);
    const posting = new FakePostingService();
    const svc = makeService(db, posting);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (svc as any).finalizeMatchSuccess(row, successInput(row));
    record(
      "single finalizeMatchSuccess posts exactly one settlement journal",
      posting.calls.length === 1 &&
        posting.calls[0].idempotencyKey === `settlement:${row.id}` &&
        db.row.status === "success" &&
        db.row.ledger_journal_id === "journal-1",
      `calls=${posting.calls.length} status=${db.row.status} journalId=${db.row.ledger_journal_id}`,
    );
  }

  // 2. Sequential sanity: a single safe-stop finalize posts exactly one
  //    participate_unlock journal.
  {
    const row = freshRow("seq-safestop");
    const db = new FakeTradeDb(row);
    const posting = new FakePostingService();
    const svc = makeService(db, posting);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (svc as any).finalizeSafeStop(row, "PRICE_MOVED", Date.now(), row.created_at.getTime(), "10.00");
    record(
      "single finalizeSafeStop posts exactly one participate_unlock journal",
      posting.calls.length === 1 &&
        posting.calls[0].idempotencyKey === `participate_unlock:${row.id}` &&
        db.row.status === "safe_stop" &&
        db.row.ledger_journal_id === "journal-1",
      `calls=${posting.calls.length} status=${db.row.status} journalId=${db.row.ledger_journal_id}`,
    );
  }

  // 3. The core race: concurrent success + safe-stop on the same running
  //    trade, success claiming first. At most one journal, ever.
  {
    const row = freshRow("race-success-first");
    const db = new FakeTradeDb(row);
    const posting = new FakePostingService();
    const svc = makeService(db, posting);
    await Promise.all([
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (svc as any).finalizeMatchSuccess(row, successInput(row)),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (svc as any).finalizeSafeStop(row, "MATCH_TIMEOUT", Date.now(), row.created_at.getTime(), "10.00"),
    ]);
    const settlementCalls = posting.calls.filter((c) => c.journalType === "settlement");
    const unlockCalls = posting.calls.filter((c) => c.journalType === "participate_unlock");
    record(
      "concurrent success+safe-stop (success first): exactly one journal total, never both",
      posting.calls.length === 1 &&
        settlementCalls.length + unlockCalls.length === 1 &&
        ["success", "safe_stop"].includes(db.row.status),
      `calls=${posting.calls.length} settlement=${settlementCalls.length} unlock=${unlockCalls.length} status=${db.row.status}`,
    );
  }

  // 4. Same race, opposite call order (safe-stop claims first) - the fix
  //    must hold regardless of which side happens to win.
  {
    const row = freshRow("race-safestop-first");
    const db = new FakeTradeDb(row);
    const posting = new FakePostingService();
    const svc = makeService(db, posting);
    await Promise.all([
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (svc as any).finalizeSafeStop(row, "CIRCUIT_OPEN", Date.now(), row.created_at.getTime(), "10.00"),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (svc as any).finalizeMatchSuccess(row, successInput(row)),
    ]);
    const settlementCalls = posting.calls.filter((c) => c.journalType === "settlement");
    const unlockCalls = posting.calls.filter((c) => c.journalType === "participate_unlock");
    record(
      "concurrent safe-stop+success (safe-stop first): exactly one journal total, never both",
      posting.calls.length === 1 &&
        settlementCalls.length + unlockCalls.length === 1 &&
        ["success", "safe_stop"].includes(db.row.status),
      `calls=${posting.calls.length} settlement=${settlementCalls.length} unlock=${unlockCalls.length} status=${db.row.status}`,
    );
  }

  // 5. Two success calls racing (e.g. duplicate poll tick) - exactly one
  //    settlement journal, not two.
  {
    const row = freshRow("race-double-success");
    const db = new FakeTradeDb(row);
    const posting = new FakePostingService();
    const svc = makeService(db, posting);
    await Promise.all([
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (svc as any).finalizeMatchSuccess(row, successInput(row)),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (svc as any).finalizeMatchSuccess(row, successInput(row)),
    ]);
    record(
      "two concurrent finalizeMatchSuccess calls post exactly one settlement journal",
      posting.calls.length === 1 && db.row.status === "success",
      `calls=${posting.calls.length} status=${db.row.status}`,
    );
  }

  // 6. Two failure calls racing - exactly one participate_unlock journal,
  //    not two (no double principal credit for one locked amount).
  {
    const row = freshRow("race-double-failure");
    const db = new FakeTradeDb(row);
    const posting = new FakePostingService();
    const svc = makeService(db, posting);
    await Promise.all([
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (svc as any).finalizeSafeStop(row, "SYSTEM_FAILED", Date.now(), row.created_at.getTime(), "10.00"),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (svc as any).finalizeSafeStop(row, "SYSTEM_FAILED", Date.now(), row.created_at.getTime(), "10.00"),
    ]);
    record(
      "two concurrent finalizeSafeStop calls post exactly one participate_unlock journal",
      posting.calls.length === 1 && db.row.status === "failed",
      `calls=${posting.calls.length} status=${db.row.status}`,
    );
  }

  // 7. Idempotent guard: a trade that already has a ledger_journal_id
  //    (already finalized) must never post a second journal even if
  //    finalizeMatchSuccess is invoked again on it directly.
  {
    const row = freshRow("already-final");
    row.status = "success";
    row.ledger_journal_id = "journal-existing";
    const db = new FakeTradeDb(row);
    const posting = new FakePostingService();
    const svc = makeService(db, posting);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (svc as any).finalizeMatchSuccess(row, successInput(row));
    record(
      "finalizeMatchSuccess on an already-finalized trade posts no journal",
      posting.calls.length === 0,
      `calls=${posting.calls.length}`,
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
    "[trades.execution.race.selftest] ALL PASS - settlement/safe-stop claim-before-post race verified",
  );
}

main().catch((e) => {
  // eslint-disable-next-line no-console
  console.error("[trades.execution.race.selftest] FATAL", e);
  process.exit(1);
});
