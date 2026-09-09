#!/usr/bin/env node
/**
 * Founder Track C: fixture committedUnapplied 만 프로덕션에 적용한다.
 * s3_33 · trial 재적용 0. 연결 문자열·secret 출력 0.
 *
 *   APPLY_PRODUCTION_UNAPPLIED=YES node tooling/dev/apply-production-unapplied.cjs
 */
"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { Client } = require("../../services/api-nest/node_modules/pg");
const { loadDotEnv, root } = require("../deploy/lib/env.cjs");

loadDotEnv();

const PRODUCTION_REF = "mgsytcetsiecllmhcyox";
const STAGING_SERVICE = "srv-dabph32fngtc73esj8rg";
const PRODUCTION_SERVICE = "srv-da5r1tqjobas73fl16dg";
const FIXTURE = path.join(root, "tooling/verify/fixtures/migrations-applied.v1.json");
const NEVER_REAPPLY = new Set(["20260906150000", "20260909060000"]);

function redact(err) {
  const msg = err && err.message ? String(err.message) : String(err);
  return msg
    .replace(/postgres(?:ql)?:\/\/[^\s)]+/gi, "postgres://redacted")
    .replace(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+/g, "redacted@host");
}

function normalizeDbUrl(url) {
  return String(url || "")
    .replace(":6543/", ":5432/")
    .replace("?pgbouncer=true", "")
    .replace("&pgbouncer=true", "");
}

function assertProductionUrl(url) {
  let host = "";
  try {
    host = new URL(url).hostname;
  } catch {
    throw new Error("DATABASE_URL is not a URL");
  }
  if (!host) throw new Error("DATABASE_URL host empty");
  if (!host.toLowerCase().includes(PRODUCTION_REF) && !url.toLowerCase().includes(PRODUCTION_REF)) {
    throw new Error("refused: DATABASE_URL is not production ref");
  }
}

function pendingVersions() {
  const fixture = JSON.parse(fs.readFileSync(FIXTURE, "utf8"));
  return (fixture.committedUnapplied || []).map((row) => ({
    version: row.version,
    name: row.name,
  }));
}

function readSql(version) {
  const dir = path.join(root, "supabase/migrations");
  const match = fs.readdirSync(dir).find((f) => f.startsWith(version + "_") && f.endsWith(".sql"));
  if (!match) throw new Error("migration file missing for " + version);
  return {
    file: match,
    name: match.slice(version.length + 1, -4),
    sql: fs.readFileSync(path.join(dir, match), "utf8"),
  };
}

async function productionDatabaseUrl() {
  const fromEnv = normalizeDbUrl(process.env.DATABASE_URL || "");
  if (fromEnv) {
    assertProductionUrl(fromEnv);
    return fromEnv;
  }
  const token = process.env.RENDER_API_KEY || "";
  if (!token) throw new Error("DATABASE_URL and RENDER_API_KEY both missing");
  const serviceId = process.env.RENDER_PRODUCTION_SERVICE_ID || PRODUCTION_SERVICE;
  if (serviceId === STAGING_SERVICE) throw new Error("refused: staging service id");
  if (serviceId !== PRODUCTION_SERVICE) throw new Error("refused: unknown service id");
  const res = await fetch("https://api.render.com/v1/services/" + serviceId + "/env-vars?limit=100", {
    headers: { authorization: "Bearer " + token, accept: "application/json" },
  });
  if (!res.ok) throw new Error("render http " + res.status);
  const payload = await res.json();
  let url = "";
  for (const row of Array.isArray(payload) ? payload : []) {
    const ev = row && (row.envVar || row);
    if (ev && ev.key === "DATABASE_URL" && typeof ev.value === "string") url = ev.value;
  }
  if (!url) throw new Error("production service has no DATABASE_URL");
  url = normalizeDbUrl(url);
  assertProductionUrl(url);
  return url;
}

async function main() {
  if (process.env.APPLY_PRODUCTION_UNAPPLIED !== "YES") {
    throw new Error("refused: set APPLY_PRODUCTION_UNAPPLIED=YES");
  }
  const pending = pendingVersions();
  if (pending.length === 0) {
    process.stdout.write(JSON.stringify({ target: "production", applied: [], skippedAlready: [] }) + "\n");
    return;
  }
  for (const row of pending) {
    if (NEVER_REAPPLY.has(row.version)) {
      throw new Error("refused: would reapply mapped version " + row.version);
    }
  }
  const url = await productionDatabaseUrl();
  const client = new Client({
    connectionString: url,
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();
  const applied = [];
  const skipped = [];
  try {
    for (const row of pending) {
      const exists = await client.query(
        "select 1 from supabase_migrations.schema_migrations where version = $1",
        [row.version],
      );
      if (exists.rowCount > 0) {
        skipped.push(row.version);
        continue;
      }
      const mig = readSql(row.version);
      await client.query("begin");
      try {
        await client.query(mig.sql);
        await client.query(
          "insert into supabase_migrations.schema_migrations(version, name) values ($1, $2)",
          [row.version, mig.name],
        );
        await client.query("commit");
        applied.push(row.version);
        process.stderr.write("[apply-production-unapplied] applied " + row.version + "\n");
      } catch (err) {
        try {
          await client.query("rollback");
        } catch {
          /* ignore */
        }
        throw new Error(row.version + " " + redact(err));
      }
    }
    const raw = await client.query("select count(*)::int as n from supabase_migrations.schema_migrations");
    const profit = await client.query(
      "select 1 from public.ledger_accounts where code = $1",
      ["SYS:MATCH_PROFIT_EXPENSE"],
    );
    const onboarding = await client.query(
      "select 1 from information_schema.tables where table_schema = 'public' and table_name = 'product_onboarding'",
    );
    process.stdout.write(
      JSON.stringify(
        {
          target: "production",
          projectRef: PRODUCTION_REF,
          applied,
          skippedAlready: skipped,
          rawCount: raw.rows[0].n,
          matchProfitExpense: profit.rowCount > 0,
          productOnboardingTable: onboarding.rowCount > 0,
        },
        null,
        2,
      ) + "\n",
    );
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  process.stderr.write("[apply-production-unapplied] FAIL: " + redact(err) + "\n");
  process.exit(1);
});
