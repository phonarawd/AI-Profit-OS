/**
 * PostgreSQL pool — Supabase Seoul (ADR-001) or optional Compose.
 * Supabase Auth clients are forbidden here (ADR-006).
 */

import { Injectable, OnModuleDestroy } from "@nestjs/common";
import { Pool, type QueryResultRow } from "pg";
import { loadPhase0Env } from "../config/phase0.env";

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

  async onModuleDestroy() {
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
    }
  }
}
