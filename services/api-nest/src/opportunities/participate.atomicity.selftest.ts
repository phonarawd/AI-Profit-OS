/**
 * PUTDUK continuation session, Step 7.1 - "the lock journal and the trade/
 * participate_request rows that account for it must commit as one atomic
 * unit; a failure partway through must never leave locked capital with no
 * matching trade."
 *
 * NOT wired into AppModule - invoked only by
 * tooling/verify/participate-atomicity.runtime.cjs via
 * `node dist/opportunities/participate.atomicity.selftest.js` after a
 * scoped tsc build (same compiled-dist convention as
 * trades.execution.race.selftest.ts / session-rotation.reuse.selftest.ts -
 * ParticipateService uses TypeScript parameter properties).
 *
 * Bug this guards: the previous insertAccepted() posted the participate_
 * lock journal (principal->locked) via postJournal() - its OWN, already-
 * committed transaction - and only THEN opened a SEPARATE transaction for
 * the trade_executions/participate_requests insert. If that second
 * transaction failed for any reason, the first transaction's principal-
 * >locked move had already durably committed with no compensation and no
 * reconciler - the user's principal was orphaned in "locked" forever. The
 * fix wraps both the lock journal (via the new postJournalInTransaction)
 * and the trade/participate_request insert in ONE transaction via
 * this.db.withTransaction, so a failure anywhere rolls everything back.
 *
 * FakeParticipateStore models a single Postgres connection's transaction
 * semantics directly (a "committed" state plus a per-transaction "stage"
 * that either replaces committed on success or is discarded on failure) -
 * both the fake LedgerPostingService and the raw client.query() calls
 * insertAccepted() itself issues mutate the SAME stage object per
 * transaction, so the atomicity property under test is real, not assumed.
 */
import { ParticipateService } from "./participate.service";
import type { PostgresService } from "../db/postgres";
import type { LedgerPostingService } from "../ledger/ledger.posting.service";
import type { LedgerBucketsService } from "../ledger/ledger.buckets.service";
import type { InProcessEventBus } from "../events/in-process.bus";

type Stage = {
  balances: Map<string, string>; // `${userId}:${bucket}` -> amountUsdt
  journalsByKey: Map<string, { id: string }>;
  trades: Map<string, Record<string, unknown>>;
  participateRequestsByKey: Map<string, { id: string }>;
  membership: Map<string, { daily_matches_used: number }>;
  seq: number;
};

function cloneStage(s: Stage): Stage {
  return {
    balances: new Map(s.balances),
    journalsByKey: new Map(s.journalsByKey),
    trades: new Map(s.trades),
    participateRequestsByKey: new Map(s.participateRequestsByKey),
    membership: new Map(s.membership),
    seq: s.seq,
  };
}

function freshStage(): Stage {
  return {
    balances: new Map(),
    journalsByKey: new Map(),
    trades: new Map(),
    participateRequestsByKey: new Map(),
    membership: new Map(),
    seq: 0,
  };
}

class FakeClient {
  constructor(public stage: Stage) {}
  async query<T>(sql: string, params: unknown[] = []): Promise<{ rows: T[] }> {
    const p = params as unknown[];
    if (sql.includes("INSERT INTO public.trade_executions")) {
      if ((globalThis as unknown as { __forceTradeInsertFailure?: boolean })
        .__forceTradeInsertFailure) {
        throw new Error("simulated trade_executions insert failure");
      }
      this.stage.seq += 1;
      const id = "trade-" + this.stage.seq;
      this.stage.trades.set(id, { id, asset: p[5] });
      return { rows: [{ id } as unknown as T] };
    }
    if (sql.includes("UPDATE public.trade_executions")) {
      return { rows: [] as unknown as T[] };
    }
    if (sql.includes("INSERT INTO public.participate_requests")) {
      this.stage.seq += 1;
      const id = "pr-" + this.stage.seq;
      const idemKey = p[6] as string;
      this.stage.participateRequestsByKey.set(idemKey, { id });
      return { rows: [{ id } as unknown as T] };
    }
    if (sql.includes("UPDATE public.user_membership")) {
      const userId = p[0] as string;
      const cur = this.stage.membership.get(userId) ?? { daily_matches_used: 0 };
      this.stage.membership.set(userId, {
        daily_matches_used: cur.daily_matches_used + 1,
      });
      return { rows: [] as unknown as T[] };
    }
    throw new Error("FakeClient: unrecognized query: " + sql);
  }
}

class FakePostgresService {
  committed: Stage = freshStage();

  configured(): boolean {
    return true;
  }

  async query<T>(): Promise<{ rows: T[] }> {
    throw new Error("FakePostgresService.query: not used by this selftest");
  }

  async withTransaction<T>(fn: (client: FakeClient) => Promise<T>): Promise<T> {
    const stage = cloneStage(this.committed);
    const client = new FakeClient(stage);
    const result = await fn(client); // throws -> stage discarded, no commit
    this.committed = stage; // "COMMIT"
    return result;
  }
}

class FakeLedgerPostingService {
  calls: Array<{ idempotencyKey: string }> = [];
  drainCalls = 0;

  async postJournalInTransaction(
    client: FakeClient,
    input: { idempotencyKey: string; lines: Array<{ account: { userId?: string; bucket?: string }; direction: string; amountUsdt: string }> },
  ): Promise<{ id: string; reused: boolean }> {
    this.calls.push({ idempotencyKey: input.idempotencyKey });
    const existing = client.stage.journalsByKey.get(input.idempotencyKey);
    if (existing) {
      return { id: existing.id, reused: true };
    }
    for (const line of input.lines) {
      const key = `${line.account.userId}:${line.account.bucket}`;
      const cur = Number(client.stage.balances.get(key) ?? "0");
      const amt = Number(line.amountUsdt);
      const next = line.direction === "credit" ? cur + amt : cur - amt;
      client.stage.balances.set(key, String(next));
    }
    client.stage.seq += 1;
    const id = "journal-" + client.stage.seq;
    client.stage.journalsByKey.set(input.idempotencyKey, { id });
    return { id, reused: false };
  }

  async drainOutboxAfterCommit(): Promise<void> {
    this.drainCalls += 1;
  }
}

function makeService(db: FakePostgresService, posting: FakeLedgerPostingService) {
  const bus = { emit: () => undefined };
  const svc = new ParticipateService(
    db as unknown as PostgresService,
    {} as unknown as LedgerBucketsService,
    posting as unknown as LedgerPostingService,
    undefined as never,
    undefined as never,
    bus as unknown as InProcessEventBus,
    undefined as never,
    { nowMs: () => Date.now() } as never,
  );
  return svc;
}

function baseInput(idempotencyKey: string) {
  return {
    userId: "11111111-1111-4111-8111-111111111111",
    opportunityId: "22222222-2222-4222-8222-222222222222",
    pricingVersion: 1,
    minProfitUsdt: "1.00",
    amountUsdt: "10.00",
    expectedProfitUsdt: "5.00",
    buyPriceUsdt: "100.00",
    sellPriceUsdt: "105.00",
    idempotencyKey,
    requestFingerprint: "fp-" + idempotencyKey,
    priceSoftAccept: false,
    asset: {
      assetId: "asset-1",
      label: "test asset",
      category: "watch",
      fxSnapshotId: "fx-1",
    },
  };
}

type CheckResult = { name: string; ok: boolean; detail: string };
const results: CheckResult[] = [];
const record = (name: string, ok: boolean, detail: string) =>
  results.push({ name, ok, detail });

function balanceOf(db: FakePostgresService, bucket: string): number {
  return Number(
    db.committed.balances.get(`11111111-1111-4111-8111-111111111111:${bucket}`) ?? "0",
  );
}

async function main() {
  // 1. Sequential sanity: a normal call locks principal->locked and
  //    creates the trade + participate_request in the same commit.
  {
    const db = new FakePostgresService();
    const posting = new FakeLedgerPostingService();
    const svc = makeService(db, posting);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await (svc as any).insertAccepted(baseInput("idem-seq-1"));
    record(
      "normal insertAccepted locks exactly amountUsdt and creates trade+participate_request",
      result.ok === true &&
        balanceOf(db, "principal") === -10 &&
        balanceOf(db, "locked") === 10 &&
        db.committed.trades.size === 1 &&
        db.committed.participateRequestsByKey.size === 1,
      `principal=${balanceOf(db, "principal")} locked=${balanceOf(db, "locked")} trades=${db.committed.trades.size}`,
    );
  }

  // 2. THE core fix: trade_executions insert fails AFTER the lock journal
  //    already ran inside the same attempt - the whole transaction must
  //    roll back, so principal/locked must be UNCHANGED (not just "locked
  //    stays locked forever" - genuinely as if the attempt never happened).
  {
    const db = new FakePostgresService();
    const posting = new FakeLedgerPostingService();
    const svc = makeService(db, posting);
    (globalThis as unknown as { __forceTradeInsertFailure?: boolean }).__forceTradeInsertFailure =
      true;
    let threw = false;
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (svc as any).insertAccepted(baseInput("idem-fail-1"));
    } catch {
      threw = true;
    } finally {
      (globalThis as unknown as { __forceTradeInsertFailure?: boolean }).__forceTradeInsertFailure =
        false;
    }
    record(
      "trade insert failure rolls back the lock journal too - principal/locked stay at zero, no orphan",
      threw &&
        balanceOf(db, "principal") === 0 &&
        balanceOf(db, "locked") === 0 &&
        db.committed.trades.size === 0 &&
        db.committed.journalsByKey.size === 0,
      `threw=${threw} principal=${balanceOf(db, "principal")} locked=${balanceOf(db, "locked")} journals=${db.committed.journalsByKey.size}`,
    );
  }

  // 3. Retry after a rolled-back failure succeeds cleanly (no leftover
  //    half-state from the failed attempt blocks the retry).
  {
    const db = new FakePostgresService();
    const posting = new FakeLedgerPostingService();
    const svc = makeService(db, posting);
    (globalThis as unknown as { __forceTradeInsertFailure?: boolean }).__forceTradeInsertFailure =
      true;
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (svc as any).insertAccepted(baseInput("idem-retry-1"));
    } catch {
      /* expected */
    }
    (globalThis as unknown as { __forceTradeInsertFailure?: boolean }).__forceTradeInsertFailure =
      false;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await (svc as any).insertAccepted(baseInput("idem-retry-1"));
    record(
      "retrying the same idempotencyKey after a rolled-back failure succeeds and locks exactly once",
      result.ok === true && balanceOf(db, "locked") === 10 && posting.calls.length === 2,
      `ok=${result.ok} locked=${balanceOf(db, "locked")} postingCalls=${posting.calls.length}`,
    );
  }

  // 4. Idempotent replay of an ALREADY-SUCCEEDED key must not lock a
  //    second time (drainOutboxAfterCommit/emit only fire once).
  {
    const db = new FakePostgresService();
    const posting = new FakeLedgerPostingService();
    const svc = makeService(db, posting);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (svc as any).insertAccepted(baseInput("idem-dup-1"));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (svc as any).insertAccepted(baseInput("idem-dup-1"));
    record(
      "replaying an already-successful idempotencyKey does not double-lock or double-drain",
      balanceOf(db, "locked") === 10 && posting.drainCalls === 1,
      `locked=${balanceOf(db, "locked")} drainCalls=${posting.drainCalls}`,
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
    "[participate.atomicity.selftest] ALL PASS - lock+trade atomic commit/rollback verified",
  );
}

main().catch((e) => {
  // eslint-disable-next-line no-console
  console.error("[participate.atomicity.selftest] FATAL", e);
  process.exit(1);
});
