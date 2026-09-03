/**
 * PostgreSQL pool — Supabase Seoul (ADR-001) or optional Compose.
 * Supabase Auth clients are forbidden here (ADR-006).
 */

import { Injectable, OnModuleDestroy } from "@nestjs/common";
import { Pool, type PoolClient, type QueryResultRow } from "pg";
import { loadPhase0Env } from "../config/phase0.env";

export type DbQuerier = {
  query<T extends QueryResultRow = QueryResultRow>(
    text: string,
    params?: unknown[],
  ): Promise<{ rows: T[]; rowCount: number | null }>;
};

export type PoolErrorRecord = {
  at: string;
  code: string | null;
  message: string;
};

export type PoolHealth = {
  poolCreated: boolean;
  errorListenerCount: number;
  backgroundErrorCount: number;
  lastBackgroundError: PoolErrorRecord | null;
};

type DatabasePoolTlsConfig = {
  connectionString: string;
  ssl?: { ca: string; rejectUnauthorized: true };
};

const DATABASE_SSL_QUERY_PARAMS = [
  "sslmode",
  "sslcert",
  "sslkey",
  "sslrootcert",
] as const;

function isSupabaseDatabaseHost(hostname: string): boolean {
  const host = hostname.toLowerCase();
  return (
    (host.startsWith("db.") && host.endsWith(".supabase.co")) ||
    host.endsWith(".pooler.supabase.com")
  );
}

function normalizeDatabaseCaPem(raw: string | null): string | null {
  if (!raw) return null;
  const normalized = raw.replace(/\\n/g, "\n").trim();
  return normalized.includes("-----BEGIN CERTIFICATE-----") &&
    normalized.includes("-----END CERTIFICATE-----")
    ? normalized + "\n"
    : null;
}

/**
 * Supabase DB TLS is always certificate-verified.
 * Connection-string SSL query params are removed so pg-connection-string
 * cannot override the explicit trusted-CA configuration.
 */
export function resolveDatabasePoolTls(
  databaseUrl: string,
  databaseSslCaPem: string | null,
): DatabasePoolTlsConfig {
  let parsed: URL;
  try {
    parsed = new URL(databaseUrl);
  } catch {
    throw new Error("DATABASE_URL invalid");
  }

  if (!isSupabaseDatabaseHost(parsed.hostname)) {
    return { connectionString: databaseUrl };
  }

  const ca = normalizeDatabaseCaPem(databaseSslCaPem);
  if (!ca) {
    throw new Error(
      "DATABASE_SSL_CA_PEM required for Supabase database TLS verification",
    );
  }

  for (const key of DATABASE_SSL_QUERY_PARAMS) parsed.searchParams.delete(key);

  return {
    connectionString: parsed.toString(),
    ssl: { ca, rejectUnauthorized: true },
  };
}

/** Strip `//user:password@` credentials from anything we are about to log. */
function redactCredentials(text: string): string {
  return String(text).replace(/\/\/[^\s/@]*:[^\s/@]*@/g, "//[redacted]@");
}

@Injectable()
export class PostgresService implements OnModuleDestroy {
  private pool: Pool | null = null;
  private backgroundErrorCount = 0;
  private lastBackgroundError: PoolErrorRecord | null = null;

  private ensurePool(): Pool | null {
    if (this.pool) return this.pool;
    const env = loadPhase0Env();
    const url = env.databaseUrl;
    if (!url) return null;
    const dbTls = resolveDatabasePoolTls(url, env.databaseSslCaPem);
    const pool = new Pool({
      ...dbTls,
      max: 3,
      idleTimeoutMillis: 10_000,
      connectionTimeoutMillis: 5_000,
    });
    // node-postgres emits 'error' on idle/background clients. Without a listener
    // that is an unhandled EventEmitter error and Node terminates the whole API
    // process whenever Postgres briefly disappears. Registered once per Pool.
    pool.on("error", (err) => this.recordBackgroundError(err));
    this.pool = pool;
    return pool;
  }

  /**
   * Observes a background connection failure. It must never mark an in-flight
   * request as succeeded — callers still receive the rejection from their own
   * query — and the pool stays usable, so the next `query()` acquires a fresh
   * connection once Postgres is back.
   */
  private recordBackgroundError(err: unknown): void {
    this.backgroundErrorCount += 1;
    const message = redactCredentials(
      err instanceof Error ? err.message : String(err),
    );
    const code =
      err && typeof err === "object" && typeof (err as { code?: unknown }).code === "string"
        ? (err as { code: string }).code
        : null;
    this.lastBackgroundError = {
      at: new Date().toISOString(),
      code,
      message,
    };
    // eslint-disable-next-line no-console
    console.error(
      `[postgres] background client error — pool retained, process alive (code=${code ?? "none"}): ${message}`,
    );
  }

  /** Operational read-out — no connection string, no credentials. */
  poolHealth(): PoolHealth {
    return {
      poolCreated: this.pool !== null,
      errorListenerCount: this.pool ? this.pool.listenerCount("error") : 0,
      backgroundErrorCount: this.backgroundErrorCount,
      lastBackgroundError: this.lastBackgroundError,
    };
  }

  configured(): boolean {
    return Boolean(loadPhase0Env().databaseUrl);
  }

  async ping(): Promise<{ ok: boolean; detail: string }> {
    try {
      const pool = this.ensurePool();
      if (!pool) return { ok: false, detail: "DATABASE_URL unset" };
      const r = await pool.query<{ ok: number }>("select 1 as ok");
      return r.rows[0]?.ok === 1
        ? { ok: true, detail: "up" }
        : { ok: false, detail: "unexpected" };
    } catch (e) {
      return {
        ok: false,
        detail: e instanceof Error ? e.message : "pg ping failed",
      };
    }
  }

  async query<T extends QueryResultRow = QueryResultRow>(
    text: string,
    params?: unknown[],
  ) {
    const pool = this.ensurePool();
    if (!pool) throw new Error("DATABASE_URL unset");
    return pool.query<T>(text, params);
  }

  /** Serializable money TX helper — caller must set app.ledger_posting inside when mutating balances. */
  async withTransaction<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
    const pool = this.ensurePool();
    if (!pool) throw new Error("DATABASE_URL unset");
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const result = await fn(client);
      await client.query("COMMIT");
      return result;
    } catch (e) {
      try {
        await client.query("ROLLBACK");
      } catch {
        /* ignore rollback errors */
      }
      throw e;
    } finally {
      client.release();
    }
  }

  async onModuleDestroy() {
    if (this.pool) {
      const pool = this.pool;
      // Drop the reference first so a late background error during shutdown
      // cannot resurrect a half-ended pool, then detach the listener.
      this.pool = null;
      try {
        await pool.end();
      } finally {
        pool.removeAllListeners("error");
      }
    }
  }
}
