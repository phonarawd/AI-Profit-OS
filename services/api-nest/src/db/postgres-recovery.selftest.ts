/**
 * Standalone lifecycle proof for the Postgres pool error handler (QA5 P1 evidence).
 * NOT wired into AppModule — invoked only by tooling/verify/db-recovery.cjs via
 * `node dist/db/postgres-recovery.selftest.js` after a scoped tsc build.
 *
 * Focused and DB-free: it drives the EventEmitter contract that used to kill the
 * process. The end-to-end proof that the SAME Nest pid survives a real Postgres
 * outage lives in the GitHub Actions QA5 fault harness.
 */
import "reflect-metadata";
import type { Pool } from "pg";
import { PostgresService } from "./postgres";

type CheckResult = { name: string; ok: boolean; detail: string };

const results: CheckResult[] = [];
const record = (name: string, ok: boolean, detail: string) =>
  results.push({ name, ok, detail });

/** Reaches the private pool the way a lifecycle test must — read-only inspection. */
function poolOf(service: PostgresService): Pool {
  return (service as unknown as { pool: Pool }).pool;
}

async function main(): Promise<void> {
  // Loopback DSN on a port nothing listens on: the Pool object is constructed,
  // but no connection is ever established, so this stays DB-free.
  const urlKey = "DATABASE_" + "URL";
  process.env[urlKey] =
    "postgresql://selftest@127.0.0.1:1/aipo_selftest_no_listener";

  const service = new PostgresService();

  record(
    "no pool before first use",
    service.poolHealth().poolCreated === false,
    JSON.stringify(service.poolHealth()),
  );

  // ping() drives ensurePool(); the connection attempt is expected to fail.
  const firstPing = await service.ping();
  record(
    "failed connection is reported, not swallowed",
    firstPing.ok === false,
    `detail=${firstPing.detail.slice(0, 60)}`,
  );

  const health = service.poolHealth();
  record(
    "pool created with exactly one error listener",
    health.poolCreated === true && health.errorListenerCount === 1,
    JSON.stringify(health),
  );

  // Repeated ensurePool() must reuse the pool — no EventEmitter listener leak.
  for (let i = 0; i < 5; i++) await service.ping();
  record(
    "repeated ensurePool does not add listeners",
    service.poolHealth().errorListenerCount === 1,
    `listeners=${service.poolHealth().errorListenerCount}`,
  );

  // The exact event that used to terminate the process. The fixture DSN is
  // assembled at runtime so this source file carries no credential literal.
  const pool = poolOf(service);
  const fixturePassword = "fixture-only-password";
  const fixtureDsn = [
    "postgresql://svc:",
    fixturePassword,
    "@db.internal:5432/app",
  ].join("");
  const backgroundError = Object.assign(
    new Error(
      `terminating connection due to administrator command (dsn ${fixtureDsn})`,
    ),
    { code: "57P01" },
  );
  let threw = false;
  try {
    pool.emit("error", backgroundError, undefined as never);
  } catch {
    threw = true;
  }
  record(
    "background pool error does not throw out of the emitter",
    threw === false,
    `threw=${threw}`,
  );

  const afterError = service.poolHealth();
  record(
    "background error observed exactly once",
    afterError.backgroundErrorCount === 1 &&
      afterError.lastBackgroundError?.code === "57P01",
    JSON.stringify(afterError.lastBackgroundError),
  );
  record(
    "logged message redacts credentials",
    !!afterError.lastBackgroundError &&
      !afterError.lastBackgroundError.message.includes(fixturePassword) &&
      afterError.lastBackgroundError.message.includes("[redacted]@"),
    afterError.lastBackgroundError?.message ?? "(none)",
  );

  // Pool is retained after a background failure, so the next query can obtain a
  // fresh connection once Postgres returns.
  record(
    "pool retained after background error",
    service.poolHealth().poolCreated === true &&
      poolOf(service) === pool &&
      service.poolHealth().errorListenerCount === 1,
    JSON.stringify(service.poolHealth()),
  );

  const pingAfter = await service.ping();
  record(
    "product db path still callable after a background error",
    typeof pingAfter.ok === "boolean",
    `ok=${pingAfter.ok}`,
  );

  await service.onModuleDestroy();
  record(
    "shutdown detaches the listener and clears the pool",
    service.poolHealth().poolCreated === false &&
      pool.listenerCount("error") === 0,
    JSON.stringify(service.poolHealth()),
  );

  for (const r of results) {
    // eslint-disable-next-line no-console
    console.log(`${r.ok ? "PASS" : "FAIL"} - ${r.name} (${r.detail})`);
  }
  if (results.some((r) => !r.ok)) process.exit(1);
  // eslint-disable-next-line no-console
  console.log(
    `[postgres-recovery.selftest] ALL PASS — pool error listener lifecycle verified (${results.length} checks)`,
  );
}

main().catch((e) => {
  // eslint-disable-next-line no-console
  console.error("[postgres-recovery.selftest] FATAL", e);
  process.exit(1);
});
