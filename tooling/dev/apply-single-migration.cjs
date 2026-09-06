#!/usr/bin/env node
"use strict";

/**
 * Apply one local migration file to remote Postgres and record schema_migrations.
 * Usage: node tooling/dev/apply-single-migration.cjs <version-prefix>
 */
const fs = require("node:fs");
const path = require("node:path");
const { Client } = require("../../services/api-nest/node_modules/pg");

const ROOT = path.resolve(__dirname, "../..");
const version = process.argv[2];

if (!/^\d{14}$/.test(version || "")) {
  process.stderr.write("usage: apply-single-migration.cjs <14-digit-version>\n");
  process.exit(1);
}

function loadDatabaseUrl() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL unset — load .env in shell before running");
  return url
    .replace(":6543/", ":5432/")
    .replace("?pgbouncer=true", "")
    .replace("&pgbouncer=true", "");
}

function findMigrationFile() {
  const dir = path.join(ROOT, "supabase", "migrations");
  const match = fs.readdirSync(dir).find((f) => f.startsWith(`${version}_`) && f.endsWith(".sql"));
  if (!match) throw new Error(`migration file not found for ${version}`);
  return {
    file: match,
    name: match.slice(version.length + 1, -4),
    sql: fs.readFileSync(path.join(dir, match), "utf8"),
  };
}

async function main() {
  const mig = findMigrationFile();
  const client = new Client({
    connectionString: loadDatabaseUrl(),
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();
  try {
    const exists = await client.query(
      "select 1 from supabase_migrations.schema_migrations where version = $1",
      [version],
    );
    if (exists.rowCount > 0) {
      process.stdout.write(`[apply-single-migration] already applied: ${version}\n`);
      return;
    }
    await client.query("begin");
    await client.query(mig.sql);
    await client.query(
      "insert into supabase_migrations.schema_migrations(version, name) values ($1, $2)",
      [version, mig.name],
    );
    await client.query("commit");
    process.stdout.write(`[apply-single-migration] applied: ${version} (${mig.file})\n`);
  } catch (err) {
    try {
      await client.query("rollback");
    } catch {
      /* ignore */
    }
    throw err;
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  process.stderr.write(`[apply-single-migration] FAIL: ${err.message}\n`);
  process.exit(1);
});
