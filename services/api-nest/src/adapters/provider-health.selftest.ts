/**
 * PTF-00C-R1 §2/§10 — real runtime proof of ProviderHealthService's tick
 * idempotency contract, DB-free. Standalone lifecycle proof in the same
 * spirit as postgres-recovery.selftest.ts: it drives the ACTUAL
 * `ProviderHealthService.recordTick()` TypeScript method (real SQL text,
 * real await chains, real circuit-transition calls) against a tiny
 * hand-rolled in-memory Postgres double that implements exactly the two
 * statements this service issues — not a static regex over the source, and
 * not a canned fixture pretending to be the result.
 *
 * NOT wired into AppModule — invoked only by
 * tooling/verify/ebay-resilience.cjs via
 * `node dist/adapters/provider-health.selftest.js` after the existing
 * scoped `services/api-nest` tsc build.
 *
 * The end-to-end proof that a REAL HTTP ingest call durably updates the
 * REAL Nest+Postgres path lives in the CI-only live fault-injection harness
 * (tooling/ebay-resilience/run-fault-injection.cjs) — this is the fast,
 * local, DB-free regression guard for the dedup logic itself.
 */
import "reflect-metadata";
import type { QueryResultRow } from "pg";
import { ProviderHealthService, type RecordTickInput } from "./provider-health.service";

type CheckResult = { name: string; ok: boolean; detail: string };
const results: CheckResult[] = [];
const record = (name: string, ok: boolean, detail: string) => results.push({ name, ok, detail });

type FakeRow = {
  provider_id: string;
  marketplace_id: string;
  circuit_state: string;
  consecutive_failures: number;
  opened_at: Date | null;
  attempted_count: number;
  success_count: number;
  failure_count: number;
  last_success_at: Date | null;
  last_failure_at: Date | null;
  last_error_class: string | null;
  last_tick_at: Date;
  last_tick_had_partial_failure: boolean;
};

/**
 * Minimal in-memory double for the ONLY two SQL shapes
 * ProviderHealthService issues. Throws on anything unrecognized so this
 * fake cannot silently drift from the real service's query surface.
 */
class FakeProviderHealthDb {
  private ledger = new Set<string>();
  private health = new Map<string, FakeRow>();

  configured(): boolean {
    return true;
  }

  async query<T extends QueryResultRow = QueryResultRow>(
    text: string,
    params: unknown[] = [],
  ): Promise<{ rows: T[]; rowCount: number | null }> {
    if (text.includes("INSERT INTO public.provider_tick_ledger")) {
      const [providerId, marketplaceId, tickId] = params as [string, string, string];
      const key = `${providerId}\u0000${marketplaceId}\u0000${tickId}`;
      if (this.ledger.has(key)) {
        return { rows: [] as unknown as T[], rowCount: 0 };
      }
      this.ledger.add(key);
      return { rows: [{ claimed: 1 }] as unknown as T[], rowCount: 1 };
    }

    if (text.includes("INSERT INTO public.provider_runtime_health")) {
      const [
        providerId,
        marketplaceId,
        circuitState,
        consecutiveFailures,
        openedAt,
        attemptedCount,
        successCount,
        failureCount,
        lastSuccessAt,
        lastFailureAt,
        lastErrorClass,
        lastTickAt,
        partialFailure,
      ] = params as [
        string,
        string,
        string,
        number,
        string | null,
        number,
        number,
        number,
        string | null,
        string | null,
        string | null,
        string,
        boolean,
      ];
      this.health.set(`${providerId}\u0000${marketplaceId}`, {
        provider_id: providerId,
        marketplace_id: marketplaceId,
        circuit_state: circuitState,
        consecutive_failures: consecutiveFailures,
        opened_at: openedAt ? new Date(openedAt) : null,
        attempted_count: attemptedCount,
        success_count: successCount,
        failure_count: failureCount,
        last_success_at: lastSuccessAt ? new Date(lastSuccessAt) : null,
        last_failure_at: lastFailureAt ? new Date(lastFailureAt) : null,
        last_error_class: lastErrorClass,
        last_tick_at: new Date(lastTickAt),
        last_tick_had_partial_failure: partialFailure,
      });
      return { rows: [] as unknown as T[], rowCount: 1 };
    }

    if (text.includes("SELECT") && text.includes("FROM public.provider_runtime_health")) {
      if (text.includes("marketplace_id = $2")) {
        const [providerId, marketplaceId] = params as [string, string];
        const row = this.health.get(`${providerId}\u0000${marketplaceId}`);
        return { rows: (row ? [row] : []) as unknown as T[], rowCount: row ? 1 : 0 };
      }
      if (text.includes("marketplace_id <> ''")) {
        const [providerId] = params as [string];
        const rows = [...this.health.values()]
          .filter((r) => r.provider_id === providerId && r.marketplace_id !== "")
          .sort((a, b) => (a.marketplace_id < b.marketplace_id ? -1 : 1));
        return { rows: rows as unknown as T[], rowCount: rows.length };
      }
    }

    throw new Error(`FakeProviderHealthDb: unhandled query shape: ${text.slice(0, 120)}`);
  }
}

function newService(): ProviderHealthService {
  const fakeDb = new FakeProviderHealthDb();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return new ProviderHealthService(fakeDb as any);
}

function baseInput(overrides: Partial<RecordTickInput> = {}): RecordTickInput {
  return {
    providerId: "ebay",
    marketplaceId: "EBAY_US",
    attempted: 5,
    successCount: 5,
    failureCount: 0,
    errorClass: null,
    observedAt: new Date().toISOString(),
    ...overrides,
  };
}

async function checkOneTickOneBatch(): Promise<void> {
  const svc = newService();
  const snap = await svc.recordTick(baseInput({ providerTickId: "tick-1" }));
  record(
    "1 tick + 1 batch -> health counted once",
    snap.attemptedCount === 5 && snap.successCount === 5,
    JSON.stringify(snap),
  );
}

async function checkOneTickThreeBatches(): Promise<void> {
  const svc = newService();
  await svc.recordTick(baseInput({ providerTickId: "tick-2" }));
  await svc.recordTick(baseInput({ providerTickId: "tick-2" }));
  const third = await svc.recordTick(baseInput({ providerTickId: "tick-2" }));
  record(
    "1 tick + 3 batches (same providerTickId) -> health counted once, not 3x",
    third.attemptedCount === 5 && third.successCount === 5,
    JSON.stringify(third),
  );
}

async function checkDuplicateIngestRetry(): Promise<void> {
  const svc = newService();
  await svc.recordTick(baseInput({ providerTickId: "tick-3" }));
  const retry = await svc.recordTick(baseInput({ providerTickId: "tick-3" }));
  record(
    "duplicate ingest retry (identical providerTickId) -> counted once",
    retry.attemptedCount === 5,
    JSON.stringify(retry),
  );
}

async function checkOutOfOrderBatches(): Promise<void> {
  const svc = newService();
  // "batch 2" delivered before "batch 1" — dedup key is content-addressed,
  // not sequence-addressed, so arrival order must not matter.
  await svc.recordTick(baseInput({ providerTickId: "tick-4", observedAt: "2026-08-14T00:00:02.000Z" }));
  const afterSecondArrival = await svc.recordTick(
    baseInput({ providerTickId: "tick-4", observedAt: "2026-08-14T00:00:01.000Z" }),
  );
  record(
    "batches arrive out of order (same providerTickId) -> still counted once",
    afterSecondArrival.attemptedCount === 5,
    JSON.stringify(afterSecondArrival),
  );
}

async function checkZeroListingTick(): Promise<void> {
  const svc = newService();
  const first = await svc.recordTick(
    baseInput({ providerTickId: "tick-5", attempted: 0, successCount: 0, failureCount: 0 }),
  );
  const replay = await svc.recordTick(
    baseInput({ providerTickId: "tick-5", attempted: 0, successCount: 0, failureCount: 0 }),
  );
  record(
    "zero-listing tick -> health counted once (vacuous success, no double no-op drift)",
    first.attemptedCount === 0 &&
      replay.attemptedCount === 0 &&
      replay.circuitState === "CLOSED" &&
      replay.consecutiveFailures === 0,
    JSON.stringify({ first, replay }),
  );
}

async function checkDifferentTickIdCountsAsNew(): Promise<void> {
  const svc = newService();
  await svc.recordTick(baseInput({ providerTickId: "tick-6a" }));
  const second = await svc.recordTick(baseInput({ providerTickId: "tick-6b" }));
  record(
    "different providerTickId -> new tick counted (cumulative 5+5=10)",
    second.attemptedCount === 10 && second.successCount === 10,
    JSON.stringify(second),
  );
}

async function checkNoFalseCircuitTripFromDuplicateDelivery(): Promise<void> {
  const svc = newService();
  const failing = (tickId: string) =>
    baseInput({ providerTickId: tickId, attempted: 1, successCount: 0, failureCount: 1, errorClass: "server_error" });

  await svc.recordTick(failing("tick-7a"));
  await svc.recordTick(failing("tick-7b"));
  const tripped = await svc.recordTick(failing("tick-7c"));
  record(
    "3 distinct failing ticks trip the circuit OPEN (sanity precondition)",
    tripped.circuitState === "OPEN" && tripped.consecutiveFailures === 3,
    JSON.stringify(tripped),
  );

  // Redeliver an ALREADY-RECORDED tick (network retry of tick-7b's ingest).
  const redelivered = await svc.recordTick(failing("tick-7b"));
  record(
    "no false circuit trip from duplicate delivery (consecutiveFailures stays 3, still OPEN)",
    redelivered.circuitState === "OPEN" && redelivered.consecutiveFailures === 3,
    JSON.stringify(redelivered),
  );
}

async function checkLegacyCallerWithoutTickIdUnchanged(): Promise<void> {
  const svc = newService();
  // No providerTickId supplied at all (older/manual caller) — pre-R1
  // behavior preserved exactly: every call is always applied.
  await svc.recordTick(baseInput());
  const second = await svc.recordTick(baseInput());
  record(
    "caller without providerTickId -> no dedup requested, both calls apply (backward compatible)",
    second.attemptedCount === 10 && second.successCount === 10,
    JSON.stringify(second),
  );
}

async function checkAggregateAndMarketplaceIndependent(): Promise<void> {
  const svc = newService();
  const marketplaceSnap = await svc.recordTick(
    baseInput({ providerTickId: "tick-8", marketplaceId: "EBAY_US" }),
  );
  const aggregateSnap = await svc.recordTick(baseInput({ providerTickId: "tick-8", marketplaceId: null }));
  record(
    "SAME providerTickId for a marketplace row AND the provider-level aggregate row -> both apply independently",
    marketplaceSnap.attemptedCount === 5 && aggregateSnap.attemptedCount === 5,
    JSON.stringify({ marketplaceSnap, aggregateSnap }),
  );
}

async function checkUpstreamGatingHonesty(): Promise<void> {
  const svc = newService();
  const snap = await svc.recordTick(baseInput({ providerTickId: "tick-9" }));
  record(
    "§5 honesty: upstreamGating is always NONE (circuit state never claims to gate upstream calls)",
    snap.upstreamGating === "NONE",
    JSON.stringify(snap),
  );
}

async function main(): Promise<void> {
  await checkOneTickOneBatch();
  await checkOneTickThreeBatches();
  await checkDuplicateIngestRetry();
  await checkOutOfOrderBatches();
  await checkZeroListingTick();
  await checkDifferentTickIdCountsAsNew();
  await checkNoFalseCircuitTripFromDuplicateDelivery();
  await checkLegacyCallerWithoutTickIdUnchanged();
  await checkAggregateAndMarketplaceIndependent();
  await checkUpstreamGatingHonesty();

  for (const r of results) {
    // eslint-disable-next-line no-console
    console.log(`${r.ok ? "PASS" : "FAIL"} - ${r.name} (${r.detail})`);
  }
  if (results.some((r) => !r.ok)) process.exit(1);
  // eslint-disable-next-line no-console
  console.log(
    `[provider-health.selftest] ALL PASS — tick idempotency contract verified (${results.length} checks)`,
  );
}

main().catch((e) => {
  // eslint-disable-next-line no-console
  console.error("[provider-health.selftest] FATAL", e);
  process.exit(1);
});
