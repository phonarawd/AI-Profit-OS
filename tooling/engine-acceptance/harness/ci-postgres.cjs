/**
 * Isolated CI Postgres: wait · bootstrap roles/schema · apply supabase/migrations 시간순.
 * 프로덕션/공유 Supabase 에는 절대 적용하지 않는다 (kill-switch evaluateDbTarget).
 */
"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { createRequire } = require("node:module");
const { ROOT } = require("../lib/hash-scope.cjs");
const { assertDbTarget, resolveHarnessDatabaseUrl } = require("../kill-switch.cjs");
const { SYNTH_USER_A, SYNTH_USER_B, SYNTH_USER_ORDINARY } = require("../lib/synthetic-identity.cjs");

const MIGRATIONS_REL = "supabase/migrations";
const nestRequire = createRequire(path.join(ROOT, "services/api-nest/package.json"));

function loadPg() {
  return nestRequire("pg");
}

function listMigrationFiles() {
  const abs = path.join(ROOT, MIGRATIONS_REL);
  const names = fs
    .readdirSync(abs)
    .filter((n) => n.endsWith(".sql"))
    .sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
  return names.map((name) => ({
    name,
    rel: `${MIGRATIONS_REL}/${name}`,
    abs: path.join(abs, name),
  }));
}

async function withClient(databaseUrl, fn) {
  const { Client } = loadPg();
  const client = new Client({ connectionString: databaseUrl, connectionTimeoutMillis: 8_000 });
  await client.connect();
  try {
    return await fn(client);
  } finally {
    await client.end().catch(() => {});
  }
}

async function waitForPostgres(databaseUrl, opts = {}) {
  const attempts = opts.attempts || 30;
  const delayMs = opts.delayMs || 2000;
  let last = "";
  for (let i = 0; i < attempts; i++) {
    try {
      await withClient(databaseUrl, async (c) => {
        const r = await c.query("select 1 as ok");
        if (r.rows[0]?.ok !== 1) throw new Error("unexpected ping");
      });
      return { ok: true, attempts: i + 1 };
    } catch (e) {
      last = e instanceof Error ? e.message : String(e);
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }
  const err = new Error(`postgres wait failed: ${last}`);
  err.code = "AIPO_QA_HARNESS_FAILURE";
  throw err;
}

const BOOTSTRAP_SQL = `
CREATE SCHEMA IF NOT EXISTS extensions;
CREATE SCHEMA IF NOT EXISTS auth;
DO $$ BEGIN CREATE ROLE anon NOLOGIN; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE ROLE authenticated NOLOGIN; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE ROLE service_role NOLOGIN; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE ROLE authenticator NOLOGIN; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
GRANT USAGE ON SCHEMA public TO postgres, service_role, anon, authenticated;
`;

async function bootstrapRolesAndSearchPath(databaseUrl) {
  const { Client } = loadPg();
  const u = new URL(String(databaseUrl).replace(/^postgres(ql)?:/i, "http:"));
  const dbName = decodeURIComponent((u.pathname || "/postgres").replace(/^\//, "") || "postgres");
  const client = new Client({ connectionString: databaseUrl });
  await client.connect();
  try {
    await client.query(BOOTSTRAP_SQL);
    await client.query(`ALTER DATABASE "${dbName.replace(/"/g, "")}" SET search_path TO public, extensions`);
  } finally {
    await client.end().catch(() => {});
  }
}

async function applyMigrations(databaseUrl) {
  const files = listMigrationFiles();
  const applied = [];
  await withClient(databaseUrl, async (client) => {
    await client.query(`
      CREATE TABLE IF NOT EXISTS public.aipo_qa_schema_migrations (
        filename text PRIMARY KEY,
        applied_at timestamptz NOT NULL DEFAULT now()
      )
    `);
    for (const f of files) {
      const seen = await client.query(
        "SELECT 1 FROM public.aipo_qa_schema_migrations WHERE filename = $1",
        [f.name],
      );
      if (seen.rowCount) {
        applied.push({ filename: f.name, status: "already_applied" });
        continue;
      }
      const sql = fs.readFileSync(f.abs, "utf8");
      await client.query(sql);
      await client.query(
        "INSERT INTO public.aipo_qa_schema_migrations (filename) VALUES ($1)",
        [f.name],
      );
      applied.push({ filename: f.name, status: "applied" });
    }
  });
  return {
    order: files.map((f) => f.name),
    deterministic: true,
    applied,
  };
}

async function seedSyntheticUsers(databaseUrl) {
  const rows = [
    [SYNTH_USER_A, "qa-synth-a@example.invalid"],
    [SYNTH_USER_B, "qa-synth-b@example.invalid"],
    [SYNTH_USER_ORDINARY, "qa-synth-ordinary@example.invalid"],
  ];
  const result = { inserted: 0, errors: [] };
  await withClient(databaseUrl, async (client) => {
    for (const [id, email] of rows) {
      try {
        await client.query(
          `INSERT INTO public.users (id, email, status)
           VALUES ($1::uuid, $2, 'active')
           ON CONFLICT (id) DO NOTHING`,
          [id, email],
        );
        result.inserted += 1;
        try {
          await client.query("SELECT public.provision_user_bucket_accounts($1::uuid)", [id]);
        } catch {
          /* optional */
        }
      } catch (e) {
        result.errors.push(e instanceof Error ? e.message : String(e));
      }
    }
  });
  return result;
}

async function prepareIsolatedPostgres(opts = {}) {
  const databaseUrl = opts.databaseUrl || resolveHarnessDatabaseUrl();
  const target_env = opts.target_env || process.env.AIPO_QA_TARGET_ENV;
  const classified = assertDbTarget({ databaseUrl, target_env });
  const wait = await waitForPostgres(databaseUrl, opts.wait);
  await bootstrapRolesAndSearchPath(databaseUrl);
  const migrations = await applyMigrations(databaseUrl);
  const seed = await seedSyntheticUsers(databaseUrl);
  return {
    classification: classified.classification,
    host: classified.host,
    wait,
    migrations,
    seed,
  };
}

async function pingPostgres(databaseUrl) {
  try {
    await withClient(databaseUrl, async (c) => {
      await c.query("select 1");
    });
    return { ok: true };
  } catch (e) {
    return { ok: false, detail: e instanceof Error ? e.message : String(e) };
  }
}

function main() {
  const args = process.argv.slice(2);
  const cmd = args[0] || "prepare";
  const get = (flag) => {
    const i = args.indexOf(flag);
    return i >= 0 ? args[i + 1] : undefined;
  };
  const databaseUrl = get("--database-url") || resolveHarnessDatabaseUrl();
  const target_env = get("--target-env") || process.env.AIPO_QA_TARGET_ENV || "ci";

  (async () => {
    if (cmd === "list-migrations") {
      console.log(JSON.stringify({ order: listMigrationFiles().map((f) => f.name) }, null, 2));
      return;
    }
    if (cmd === "wait") {
      const out = await waitForPostgres(databaseUrl);
      console.log(JSON.stringify(out));
      return;
    }
    if (cmd === "prepare") {
      const out = await prepareIsolatedPostgres({ databaseUrl, target_env });
      console.log(JSON.stringify(out, null, 2));
      return;
    }
    console.error(`unknown command ${cmd}`);
    process.exit(2);
  })().catch((e) => {
    console.error(`[ci-postgres] FAIL ${e.message}`);
    process.exit(e.code === "AIPO_QA_KILL_SWITCH" ? 2 : 1);
  });
}

if (require.main === module) {
  main();
}

module.exports = {
  listMigrationFiles,
  waitForPostgres,
  bootstrapRolesAndSearchPath,
  applyMigrations,
  seedSyntheticUsers,
  prepareIsolatedPostgres,
  pingPostgres,
  MIGRATIONS_REL,
};
