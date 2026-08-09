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

@Injectable()
export class PostgresService implements OnModuleDestroy {
  private pool: Pool | null = null;

  private ensurePool(): Pool | null {
    if (this.pool) return this.pool;
    const url = loadPhase0Env().databaseUrl;
    if (!url) return null;
    this.pool = new Pool({
      connectionString: url,
      max: 3,
      idleTimeoutMillis: 10_000,
      connectionTimeoutMillis: 5_000,
      ssl: url.includes("supabase.co") ? { rejectUnauthorized: false } : undefined,
    });
    return this.pool;
  }

  configured(): boolean {
    return Boolean(loadPhase0Env().databaseUrl);
  }

  async ping(): Promise<{ ok: boolean; detail: string }> {
    const pool = this.ensurePool();
    if (!pool) return { ok: false, detail: "DATABASE_URL unset" };
    try {
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
      await this.pool.end();
      this.pool = null;
    }
  }
}
