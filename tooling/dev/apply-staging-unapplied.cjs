#!/usr/bin/env node
/**
 * staging Render 서비스의 DATABASE_URL만 사용해 committedUnapplied를 적용한다.
 * 로컬 DATABASE_URL · production 호스트 · production 서비스 ID 거절.
 * 연결 문자열·secret을 출력하지 않는다.
 */
"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { Client } = require("../../services/api-nest/node_modules/pg");
const { loadDotEnv, root } = require("../deploy/lib/env.cjs");

loadDotEnv();

const STAGING_SERVICE = "srv-dabph32fngtc73esj8rg";
const PRODUCTION_SERVICE = "srv-da5r1tqjobas73fl16dg";
const PRODUCTION_REF = "mgsytcetsiecllmhcyox";
const FIXTURE = path.join(root, "tooling/verify/fixtures/migrations-applied.v1.json");

function redact(err) {
  const msg = err && err.message ? String(err.message) : String(err);
  return msg
    .replace(/postgres(?:ql)?:\/\/[^\s)]+/gi, "postgres://redacted")
    .replace(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+/g, "redacted@host");
}

function assertNotProductionUrl(url) {
  let host = "";
  try {
    host = new URL(url).hostname;
  } catch {
    throw new Error("staging DATABASE_URL is not a URL");
  }
  if (!host) throw new Error("staging DATABASE_URL host empty");
  if (host.includes(PRODUCTION_REF)) {
    throw new Error("refused: URL host is production project");
  }
  if (host.includes("ai-profit-os.onrender.com")) {
    throw new Error("refused: URL host is production API");
  }
}

async function renderJson(pathname) {
  const token = process.env.RENDER_API_KEY || "";
  if (!token) throw new Error("RENDER_API_KEY missing");
  const res = await fetch("https://api.render.com/v1" + pathname, {
    headers: { authorization: "Bearer " + token, accept: "application/json" },
  });
  if (!res.ok) throw new Error("render http " + res.status);
  return res.json();
}

function collectEnvVars(payload) {
  const out = {};
  const rows = Array.isArray(payload) ? payload : [];
  for (const row of rows) {
    const ev = row && (row.envVar || row);
    if (ev && typeof ev.key === "string" && typeof ev.value === "string") {
      out[ev.key] = ev.value;
    }
  }
  return out;
}

async function stagingDatabaseUrl() {
  const serviceId = process.env.RENDER_STAGING_SERVICE_ID || STAGING_SERVICE;
  if (serviceId === PRODUCTION_SERVICE) {
    throw new Error("refused: production service id");
  }
  if (serviceId !== STAGING_SERVICE) {
    throw new Error("refused: unknown service id");
  }
  const vars = collectEnvVars(await renderJson("/services/" + serviceId + "/env-vars"));
  const url = vars.DATABASE_URL || vars.DIRECT_URL || vars.POSTGRES_URL || "";
  if (!url) throw new Error("staging service has no DATABASE_URL");
  assertNotProductionUrl(url);
  return url
    .replace(":6543/", ":5432/")
    .replace("?pgbouncer=true", "")
    .replace("&pgbouncer=true", "");
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

async function main() {
  const url = await stagingDatabaseUrl();
  const pending = pendingVersions();
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
      } catch (err) {
        try {
          await client.query("rollback");
        } catch {
          /* ignore */
        }
        throw new Error(row.version + " " + redact(err));
      }
    }
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
          target: "staging-render-service",
          productionApply: 0,
          applied,
          skippedAlready: skipped,
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
  process.stderr.write("[apply-staging-unapplied] FAIL: " + redact(err) + "\n");
  process.exit(1);
});
