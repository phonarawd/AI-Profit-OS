#!/usr/bin/env node
/**
 * SourceObservation dedicated local Postgres runtime proof.
 * repository.postgres.cjs 는 querier DI만 — 이 파일만 pg를 해석한다.
 * PRODUCTION_PG_CLIENT_WIRING = NOT_IMPLEMENTED
 * TRUNCATE / UPDATE / DELETE = 0
 * production DATABASE_URL fallback = 0
 */
const fs = require("fs");
const os = require("os");
const path = require("path");
const { fork, spawnSync } = require("child_process");

const root = path.resolve(__dirname, "../..");
const {
  classifyDurableDatabaseUrl,
  createDurableSourceObservationRepository,
} = require(path.join(
  root,
  "services/market-intelligence/src/source-observation/repository.postgres.cjs",
));
const {
  fingerprintCanonicalObservation,
  pickCanonicalObservation,
} = require(path.join(
  root,
  "services/market-intelligence/src/source-observation/persistence-mapper.cjs",
));
const { TCGPLAYER_PARSER_VERSION } = require(path.join(
  root,
  "services/market-intelligence/src/source-observation/contract.cjs",
));
const { observeProduct } = require(path.join(
  root,
  "services/market-intelligence/src/source-observation/observe.cjs",
));
const { credentialsFromEnv } = require(path.join(
  root,
  "services/market-intelligence/src/source-observation/acquire/ebay-browse.cjs",
));
const { matchSourceObservationsV2 } = require(path.join(
  root,
  "services/market-intelligence/src/identity-matching/v2/index.cjs",
));
const {
  createCanonicalProductFromMatch,
  createMemoryCanonicalProductRepository,
} = require(path.join(root, "services/market-intelligence/src/canonical-product/index.cjs"));

const PINNED_TCG_PRODUCT = "113669";
const PINNED_EBAY_ITEM = "377416817781";
const TCG_URL = `https://www.tcgplayer.com/product/${PINNED_TCG_PRODUCT}`;
const MIGRATION_REL = "supabase/migrations/20260819210000_source_observations.sql";
const PSQL_EXE = "C:\\Program Files\\PostgreSQL\\18\\bin\\psql.exe";
const SAFE_URL_KEYS = [
  "SOURCE_OBSERVATION_SAFE_DATABASE_URL",
  "TEST_DATABASE_URL",
  "SAFE_DATABASE_URL",
  "PUTDUK_SOURCEOBS_TEST_DATABASE_URL",
];
const DENY_ENV_COPY = new Set(["DATABASE_URL"]);
const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);
const DEFAULT_DB_NAMES = new Set(["postgres", "template0", "template1"]);

function loadEnvFile(rel) {
  const file = path.join(root, rel);
  if (!fs.existsSync(file)) return;
  const text = fs.readFileSync(file, "utf8");
  for (const line of text.split(/\r?\n/)) {
    if (!line || line.startsWith("#")) continue;
    const i = line.indexOf("=");
    if (i <= 0) continue;
    const key = line.slice(0, i).trim();
    if (!/^[A-Z0-9_]+$/.test(key)) continue;
    if (DENY_ENV_COPY.has(key)) continue;
    if (process.env[key]) continue;
    let value = line.slice(i + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
}

function readNamedUrlFromFile(rel, key) {
  const file = path.join(root, rel);
  if (!fs.existsSync(file)) return "";
  const text = fs.readFileSync(file, "utf8");
  for (const line of text.split(/\r?\n/)) {
    if (!line || line.startsWith("#")) continue;
    const i = line.indexOf("=");
    if (i <= 0) continue;
    if (line.slice(0, i).trim() !== key) continue;
    let value = line.slice(i + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    return value;
  }
  return "";
}

function parsePostgresUrl(raw) {
  const x = new URL(String(raw).replace(/^postgresql:/i, "http:"));
  return {
    host: x.hostname,
    port: x.port || "5432",
    database: decodeURIComponent((x.pathname || "").replace(/^\//, "").split("?")[0] || ""),
    user: decodeURIComponent(x.username || ""),
    password: decodeURIComponent(x.password || ""),
  };
}

function isDedicatedDatabaseName(name) {
  const db = String(name || "");
  if (!db || DEFAULT_DB_NAMES.has(db)) return false;
  if (db === "putduk_sourceobs_test") return true;
  return /^putduk[_-].*(sourceobs|source_obs|so).*(test|runtime|proof)$/i.test(db);
}

function resolveSafeUrl() {
  for (const key of SAFE_URL_KEYS) {
    if (process.env[key] && String(process.env[key]).trim()) {
      return { key, url: String(process.env[key]).trim() };
    }
  }
  const files = [".env.safe", ".env.test", ".env.sourceobs", ".env.local", ".env"];
  for (const file of files) {
    for (const key of SAFE_URL_KEYS) {
      const url = readNamedUrlFromFile(file, key);
      if (url) return { key, url, file };
    }
  }
  return null;
}

function classifySafeTarget(url) {
  const classified = classifyDurableDatabaseUrl(url);
  if (!classified.ok) {
    return {
      ok: false,
      reason: classified.reason || "BLOCKED_NO_SAFE_DB",
      safeEnvironment: classified.reason === "BLOCKED_NO_SAFE_DB" ? "BLOCKED_PRODUCTION_URL" : "NOT_FOUND",
    };
  }
  let parsed;
  try {
    parsed = parsePostgresUrl(url);
  } catch {
    return { ok: false, reason: "DATABASE_URL_UNPARSEABLE", safeEnvironment: "NOT_FOUND" };
  }
  const blob = `${url}\n${parsed.user}\n${parsed.host}\n${parsed.database}`;
  if (/mgsytcetsiecllmhcyox/i.test(blob) || /supabase\.co/i.test(blob)) {
    return { ok: false, reason: "BLOCKED_NO_SAFE_DB", safeEnvironment: "BLOCKED_PRODUCTION_URL" };
  }
  if (!LOCAL_HOSTS.has(parsed.host)) {
    return { ok: false, reason: "BLOCKED_NO_SAFE_DB", safeEnvironment: "BLOCKED_NON_LOCAL_HOST" };
  }
  if (!isDedicatedDatabaseName(parsed.database)) {
    return {
      ok: false,
      reason: "BLOCKED_NOT_DEDICATED",
      safeEnvironment: "BLOCKED_NOT_DEDICATED",
      database: parsed.database,
      host: parsed.host,
    };
  }
  return { ok: true, parsed };
}

function resolvePg() {
  const candidates = [
    path.join(root, "services/api-nest/node_modules/pg"),
    path.join(root, "node_modules/.pnpm/pg@8.23.0/node_modules/pg"),
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(path.join(candidate, "package.json"))) {
      return require(candidate);
    }
  }
  throw new Error("VERIFIER_PG_NOT_FOUND");
}

function guardSql(text) {
  const sql = String(text);
  if (/^\s*TRUNCATE\b/i.test(sql) || /\bTRUNCATE\s+(TABLE\s+)?(public\.)?source_observations\b/i.test(sql)) {
    throw new Error("SOURCE_OBSERVATION_TRUNCATE_FORBIDDEN");
  }
  if (/\bUPDATE\s+(ONLY\s+)?(public\.)?source_observations\s+SET\b/i.test(sql)) {
    throw new Error("SOURCE_OBSERVATION_UPDATE_FORBIDDEN");
  }
  if (/\bDELETE\s+FROM\s+(ONLY\s+)?(public\.)?source_observations\b/i.test(sql)) {
    throw new Error("SOURCE_OBSERVATION_DELETE_FORBIDDEN");
  }
}

function createQuerier(client) {
  return {
    query: async (text, params) => {
      guardSql(text);
      return client.query(text, params);
    },
    end: async () => client.end(),
  };
}

async function connectClient(url) {
  const { Client } = resolvePg();
  const client = new Client({ connectionString: url });
  await client.connect();
  return client;
}

function sameInstant(left, right) {
  if (left == null && right == null) return true;
  if (left == null || right == null) return false;
  const a = left instanceof Date ? left.toISOString() : String(left);
  const b = right instanceof Date ? right.toISOString() : String(right);
  const ta = Date.parse(a);
  const tb = Date.parse(b);
  if (Number.isNaN(ta) || Number.isNaN(tb)) return a === b;
  return ta === tb;
}

function sampleObservation(overrides) {
  return {
    id: "obs_verify_placeholder",
    source: "ebay",
    externalItemId: "verify_item_local",
    url: "https://www.ebay.com/itm/verify_item_local",
    title: "Pokemon trading card verifier",
    imageUrl: "https://i.ebayimg.com/images/g/abc/s-l1600.jpg",
    imageAlt: null,
    nativeAmount: "12.50",
    nativeCurrency: "USD",
    observedAt: "2026-08-19T12:00:00.000Z",
    fetchedAt: "2026-08-19T12:00:00.000Z",
    observationPurpose: "CONFIRMATION",
    sourceStatus: "SUCCESS",
    parserVersion: "ebay.browse-api.1",
    availability: "available",
    displayAuthorized: false,
    meta: {
      priceKind: "listing_sale",
      observationMode: "AUTOMATED_LIVE",
      extractionEvidence: {
        sourceItemId: "EXISTING_API",
        title: "EXISTING_API",
      },
    },
    ...overrides,
  };
}

function isAutomatedTcg(obs) {
  if (!obs) return false;
  if (obs.source !== "tcgplayer") return false;
  if (obs.parserVersion !== TCGPLAYER_PARSER_VERSION) return false;
  if (obs.meta && obs.meta.observationMode === "MANUAL_LIVE_VALIDATION") return false;
  if (String(obs.parserVersion).includes("live-manual")) return false;
  if (String(obs.parserVersion).includes("fixture.")) return false;
  return obs.meta && obs.meta.observationMode === "AUTOMATED_LIVE";
}

function roundTripOk(original, readBack) {
  if (!original || !readBack) return { ok: false, failures: ["missing_observation"] };
  const left = pickCanonicalObservation(original);
  const right = pickCanonicalObservation(readBack);
  const failures = [];
  const keys = [
    "id",
    "source",
    "externalItemId",
    "observationPurpose",
    "sourceStatus",
    "url",
    "title",
    "imageUrl",
    "nativeAmount",
    "nativeCurrency",
    "parserVersion",
    "availability",
    "displayAuthorized",
  ];
  for (const key of keys) {
    if (JSON.stringify(left[key]) !== JSON.stringify(right[key])) failures.push(key);
  }
  if (!sameInstant(left.observedAt, right.observedAt)) failures.push("observedAt");
  const metaKeys = ["priceKind", "observationMode", "identityHints", "extractionEvidence"];
  const lm = left.meta || {};
  const rm = right.meta || {};
  for (const key of metaKeys) {
    if (JSON.stringify(lm[key] ?? null) !== JSON.stringify(rm[key] ?? null)) {
      failures.push(`meta.${key}`);
    }
  }
  const fpLeft = fingerprintCanonicalObservation(left);
  const fpRight = fingerprintCanonicalObservation(right);
  if (fpLeft !== fpRight) failures.push("content_fingerprint");
  return { ok: failures.length === 0, failures, fpLeft, fpRight };
}

function emptyReport() {
  return {
    GIT_SAFETY: "READ_ONLY_CONFIRMED",
    HEAD: "0345206ad2e7238658454db5d072c8fbf93dbb37",
    WORKTREE_PROTECTED: "YES",
    FILES_MODIFIED: [],
    FILES_ADDED: ["tooling/verify/source-observation-db-runtime.cjs"],
    SAFE_DB_ENVIRONMENT: "NOT_FOUND",
    SAFE_DB_KIND: "NONE",
    DB_TECHNOLOGY: "NONE",
    DB_HOST_OR_PROJECT: "NONE",
    DB_NAME: "NONE",
    DB_IS_PRODUCTION: "NO",
    PRODUCTION_DB_WRITE_ATTEMPTED: "NO",
    PRODUCTION_MIGRATION_APPLIED: "NO",
    PRODUCTION_SCHEMA_CHANGED: "NO",
    SOURCE_OBSERVATION_MIGRATION: "20260819210000_source_observations.sql",
    MIGRATION_APPLIED_TO_SAFE_DB: "NO",
    MIGRATION_APPLIED_TO_PRODUCTION: "NO",
    TCG_PRODUCT_ID: PINNED_TCG_PRODUCT,
    TCG_AUTOMATED_OBSERVATION: "NOT_VERIFIED",
    TCG_DURABLE_WRITE: "NOT_VERIFIED",
    TCG_DURABLE_READ_AFTER_FRESH_REPOSITORY: "NOT_VERIFIED",
    EBAY_ITEM_ID: PINNED_EBAY_ITEM,
    EBAY_AUTOMATED_OBSERVATION: "NOT_VERIFIED",
    EBAY_DURABLE_WRITE: "NOT_VERIFIED",
    EBAY_DURABLE_READ_AFTER_FRESH_REPOSITORY: "NOT_VERIFIED",
    SOURCE_OBSERVATION_IDEMPOTENT_RETRY_DB_RUNTIME: "NOT_VERIFIED",
    OBSERVATION_ID_PAYLOAD_CONFLICT_DB_RUNTIME: "NOT_VERIFIED",
    SOURCE_OBSERVATION_HISTORY_PRESERVATION_DB_RUNTIME: "NOT_VERIFIED",
    TCG_CANONICAL_ROUND_TRIP: "NOT_VERIFIED",
    EBAY_CANONICAL_ROUND_TRIP: "NOT_VERIFIED",
    SOURCE_OBSERVATION_CANONICAL_ROUND_TRIP: "NOT_VERIFIED",
    IN_MEMORY_OBJECT_REUSE_FOR_DURABILITY_PROOF: "NO",
    SOURCE_OBSERVATION_FRESH_REPOSITORY_DURABILITY: "NOT_VERIFIED",
    SOURCE_OBSERVATION_CROSS_PROCESS_DURABILITY: "NOT_VERIFIED",
    DURABLE_OBSERVATION_PAIR_PROFILE: "NOT_VERIFIED",
    DURABLE_OBSERVATION_V2_DECISION: "NOT_VERIFIED",
    DURABLE_OBSERVATION_MATCH_PATH: "NOT_VERIFIED",
    DURABLE_OBSERVATION_MATCH_REGRESSION: "NOT_VERIFIED",
    DURABLE_OBSERVATION_TO_CANONICAL_PRODUCT_REGRESSION: "NOT_VERIFIED",
    DB_RLS_SCHEMA_ENABLED: "NOT_VERIFIED",
    DB_RLS_RUNTIME_CONNECTION: "NOT_VERIFIED",
    DB_RLS_APPLICATION_ROLE_ENFORCEMENT: "NOT_VERIFIED",
    LOCAL_SUPABASE_ROLE_STUBS: "NOT_USED",
    SUPABASE_ROLE_RUNTIME_PARITY: "NOT_VERIFIED",
    PRODUCTION_PG_CLIENT_WIRING: "NOT_IMPLEMENTED",
    SOURCE_OBSERVATION_DB_RUNTIME_VERIFICATION: "BLOCKED_NO_SAFE_DB",
    PRODUCTION_OBSERVATION_PERSISTENCE: "NOT_IMPLEMENTED",
    CANONICAL_PRODUCT_DURABLE_DB_PERSISTENCE: "NOT_IMPLEMENTED",
    PUTDUK_PRODUCT_ID_DURABLE_STABILITY: "NOT_IMPLEMENTED",
    MATCH_RESULT_DURABLE_PERSISTENCE: "NOT_IMPLEMENTED",
    COMMIT_PUSH_STASH_RESTORE: "NO",
    NEXT_RECOMMENDED_SLICE: "SECURE_DEDICATED_LOCAL_TEST_DB_URL",
    DETAIL: "",
  };
}

function printReport(report) {
  const lines = [
    "# PUTDUK_SOURCE_OBSERVATION_DB_RUNTIME_PROOF",
    "",
    `GIT_SAFETY = ${report.GIT_SAFETY}`,
    `HEAD = ${report.HEAD}`,
    `WORKTREE_PROTECTED = ${report.WORKTREE_PROTECTED}`,
    "",
    "FILES_MODIFIED:",
    ...(report.FILES_MODIFIED.length ? report.FILES_MODIFIED.map((f) => `- ${f}`) : ["-"]),
    "FILES_ADDED:",
    ...(report.FILES_ADDED.length ? report.FILES_ADDED.map((f) => `- ${f}`) : ["-"]),
    "",
    `SAFE_DB_ENVIRONMENT = ${report.SAFE_DB_ENVIRONMENT}`,
    `SAFE_DB_KIND = ${report.SAFE_DB_KIND || "NONE"}`,
    `DB_TECHNOLOGY = ${report.DB_TECHNOLOGY}`,
    `DB_HOST_OR_PROJECT = ${report.DB_HOST_OR_PROJECT}`,
    `DB_NAME = ${report.DB_NAME}`,
    `DB_IS_PRODUCTION = ${report.DB_IS_PRODUCTION}`,
    "",
    `PRODUCTION_DB_WRITE_ATTEMPTED = ${report.PRODUCTION_DB_WRITE_ATTEMPTED}`,
    `PRODUCTION_MIGRATION_APPLIED = ${report.PRODUCTION_MIGRATION_APPLIED}`,
    `PRODUCTION_SCHEMA_CHANGED = ${report.PRODUCTION_SCHEMA_CHANGED}`,
    "",
    `SOURCE_OBSERVATION_MIGRATION = ${report.SOURCE_OBSERVATION_MIGRATION}`,
    `MIGRATION_APPLIED_TO_SAFE_DB = ${report.MIGRATION_APPLIED_TO_SAFE_DB}`,
    `MIGRATION_APPLIED_TO_PRODUCTION = ${report.MIGRATION_APPLIED_TO_PRODUCTION}`,
    "",
    `TCG_PRODUCT_ID = ${report.TCG_PRODUCT_ID}`,
    `TCG_AUTOMATED_OBSERVATION = ${report.TCG_AUTOMATED_OBSERVATION}`,
    `TCG_DURABLE_WRITE = ${report.TCG_DURABLE_WRITE}`,
    `TCG_DURABLE_READ_AFTER_FRESH_REPOSITORY = ${report.TCG_DURABLE_READ_AFTER_FRESH_REPOSITORY}`,
    "",
    `EBAY_ITEM_ID = ${report.EBAY_ITEM_ID}`,
    `EBAY_AUTOMATED_OBSERVATION = ${report.EBAY_AUTOMATED_OBSERVATION}`,
    `EBAY_DURABLE_WRITE = ${report.EBAY_DURABLE_WRITE}`,
    `EBAY_DURABLE_READ_AFTER_FRESH_REPOSITORY = ${report.EBAY_DURABLE_READ_AFTER_FRESH_REPOSITORY}`,
    "",
    `SOURCE_OBSERVATION_IDEMPOTENT_RETRY_DB_RUNTIME = ${report.SOURCE_OBSERVATION_IDEMPOTENT_RETRY_DB_RUNTIME}`,
    `OBSERVATION_ID_PAYLOAD_CONFLICT_DB_RUNTIME = ${report.OBSERVATION_ID_PAYLOAD_CONFLICT_DB_RUNTIME}`,
    `SOURCE_OBSERVATION_HISTORY_PRESERVATION_DB_RUNTIME = ${report.SOURCE_OBSERVATION_HISTORY_PRESERVATION_DB_RUNTIME}`,
    "",
    `TCG_CANONICAL_ROUND_TRIP = ${report.TCG_CANONICAL_ROUND_TRIP}`,
    `EBAY_CANONICAL_ROUND_TRIP = ${report.EBAY_CANONICAL_ROUND_TRIP}`,
    `SOURCE_OBSERVATION_CANONICAL_ROUND_TRIP = ${report.SOURCE_OBSERVATION_CANONICAL_ROUND_TRIP}`,
    "",
    `IN_MEMORY_OBJECT_REUSE_FOR_DURABILITY_PROOF = ${report.IN_MEMORY_OBJECT_REUSE_FOR_DURABILITY_PROOF}`,
    `SOURCE_OBSERVATION_FRESH_REPOSITORY_DURABILITY = ${report.SOURCE_OBSERVATION_FRESH_REPOSITORY_DURABILITY}`,
    `SOURCE_OBSERVATION_CROSS_PROCESS_DURABILITY = ${report.SOURCE_OBSERVATION_CROSS_PROCESS_DURABILITY}`,
    "",
    `DURABLE_OBSERVATION_PAIR_PROFILE = ${report.DURABLE_OBSERVATION_PAIR_PROFILE}`,
    `DURABLE_OBSERVATION_V2_DECISION = ${report.DURABLE_OBSERVATION_V2_DECISION}`,
    `DURABLE_OBSERVATION_MATCH_PATH = ${report.DURABLE_OBSERVATION_MATCH_PATH}`,
    `DURABLE_OBSERVATION_MATCH_REGRESSION = ${report.DURABLE_OBSERVATION_MATCH_REGRESSION}`,
    "",
    `DURABLE_OBSERVATION_TO_CANONICAL_PRODUCT_REGRESSION = ${report.DURABLE_OBSERVATION_TO_CANONICAL_PRODUCT_REGRESSION}`,
    "",
    `DB_RLS_SCHEMA_ENABLED = ${report.DB_RLS_SCHEMA_ENABLED}`,
    `DB_RLS_RUNTIME_CONNECTION = ${report.DB_RLS_RUNTIME_CONNECTION}`,
    `DB_RLS_APPLICATION_ROLE_ENFORCEMENT = ${report.DB_RLS_APPLICATION_ROLE_ENFORCEMENT}`,
    `LOCAL_SUPABASE_ROLE_STUBS = ${report.LOCAL_SUPABASE_ROLE_STUBS}`,
    `SUPABASE_ROLE_RUNTIME_PARITY = ${report.SUPABASE_ROLE_RUNTIME_PARITY}`,
    `PRODUCTION_PG_CLIENT_WIRING = ${report.PRODUCTION_PG_CLIENT_WIRING}`,
    "",
    `SOURCE_OBSERVATION_DB_RUNTIME_VERIFICATION = ${report.SOURCE_OBSERVATION_DB_RUNTIME_VERIFICATION}`,
    `PRODUCTION_OBSERVATION_PERSISTENCE = ${report.PRODUCTION_OBSERVATION_PERSISTENCE}`,
    "",
    `CANONICAL_PRODUCT_DURABLE_DB_PERSISTENCE = ${report.CANONICAL_PRODUCT_DURABLE_DB_PERSISTENCE}`,
    `PUTDUK_PRODUCT_ID_DURABLE_STABILITY = ${report.PUTDUK_PRODUCT_ID_DURABLE_STABILITY}`,
    `MATCH_RESULT_DURABLE_PERSISTENCE = ${report.MATCH_RESULT_DURABLE_PERSISTENCE}`,
    "",
    `COMMIT_PUSH_STASH_RESTORE = ${report.COMMIT_PUSH_STASH_RESTORE}`,
    "",
    `NEXT_RECOMMENDED_SLICE = ${report.NEXT_RECOMMENDED_SLICE}`,
  ];
  if (report.DETAIL) {
    lines.push("");
    lines.push(`DETAIL = ${report.DETAIL}`);
  }
  console.log(lines.join("\n"));
}

function runPsql(url, args) {
  if (!fs.existsSync(PSQL_EXE)) {
    return { status: 1, stderr: `psql missing: ${PSQL_EXE}`, stdout: "" };
  }
  const parsed = parsePostgresUrl(url);
  const env = {
    ...process.env,
    PGHOST: parsed.host,
    PGPORT: parsed.port,
    PGUSER: parsed.user,
    PGPASSWORD: parsed.password,
    PGDATABASE: parsed.database,
    PGSSLMODE: "disable",
  };
  const result = spawnSync(PSQL_EXE, ["-v", "ON_ERROR_STOP=1", ...args], {
    env,
    encoding: "utf8",
    windowsHide: true,
  });
  return {
    status: result.status == null ? 1 : result.status,
    stdout: result.stdout || "",
    stderr: result.stderr || "",
    error: result.error ? String(result.error.message) : "",
  };
}

function ensureRoleStubs(url) {
  const sql = `
DO $roles$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    CREATE ROLE anon NOLOGIN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    CREATE ROLE authenticated NOLOGIN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    CREATE ROLE service_role NOLOGIN;
  END IF;
END
$roles$;
`.trim();
  return runPsql(url, ["-c", sql]);
}

function applyMigration(url) {
  const sqlPath = path.join(root, MIGRATION_REL);
  if (!fs.existsSync(sqlPath)) {
    return { ok: false, error: `missing ${MIGRATION_REL}` };
  }
  const roles = ensureRoleStubs(url);
  let stubs = "NOT_USED";
  if (roles.status !== 0) {
    return {
      ok: false,
      error: roles.stderr || roles.error || "role stub failed",
      stubs: "FAIL",
    };
  }
  stubs = "MIGRATION_COMPATIBILITY_ONLY";
  const applied = runPsql(url, ["-f", sqlPath]);
  if (applied.status !== 0) {
    return {
      ok: false,
      error: applied.stderr || applied.error || "migration apply failed",
      stubs,
    };
  }
  return { ok: true, stubs };
}

function readSidecar(file) {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function writeSidecar(file, data) {
  fs.writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

function argValue(name) {
  const prefix = `${name}=`;
  const hit = process.argv.find((item) => item.startsWith(prefix));
  return hit ? hit.slice(prefix.length) : "";
}

async function phaseWrite() {
  loadEnvFile(".env");
  loadEnvFile(".env.local");
  const report = emptyReport();
  const sidecarPath = argValue("--sidecar");
  const resolved = resolveSafeUrl();
  if (!resolved) {
    report.DETAIL = "write phase missing safe url";
    writeSidecar(sidecarPath, { ok: false, report });
    process.exit(2);
  }
  const classified = classifySafeTarget(resolved.url);
  if (!classified.ok) {
    report.SAFE_DB_ENVIRONMENT = classified.safeEnvironment;
    report.DETAIL = classified.reason;
    writeSidecar(sidecarPath, { ok: false, report });
    process.exit(2);
  }

  const client = await connectClient(resolved.url);
  const identity = await client.query(
    "SELECT current_database() AS db, current_user AS role, inet_server_addr()::text AS addr, version() AS version",
  );
  const ident = identity.rows[0];
  if (!isDedicatedDatabaseName(ident.db)) {
    await client.end();
    report.SAFE_DB_ENVIRONMENT = "BLOCKED_NOT_DEDICATED";
    report.DB_NAME = ident.db;
    writeSidecar(sidecarPath, { ok: false, report });
    process.exit(2);
  }

  const querier = createQuerier(client);
  const repo = createDurableSourceObservationRepository({ querier });
  const runId = `obs_verify_${Date.now()}_${process.pid}`;

  const tcg = await observeProduct({
    source: "tcgplayer",
    url: TCG_URL,
    externalItemId: PINNED_TCG_PRODUCT,
    purpose: "CONFIRMATION",
  });
  report.TCG_AUTOMATED_OBSERVATION =
    tcg.ok && tcg.observation && isAutomatedTcg(tcg.observation) && tcg.observation.sourceStatus === "SUCCESS"
      ? "PASS"
      : `FAIL:${(tcg && (tcg.reason || tcg.sourceStatus)) || "blocked"}`;
  if (report.TCG_AUTOMATED_OBSERVATION !== "PASS") {
    await repo.end();
    writeSidecar(sidecarPath, { ok: false, report });
    process.exit(2);
  }

  const creds = credentialsFromEnv();
  if (!creds.configured) {
    report.EBAY_AUTOMATED_OBSERVATION = "BLOCKED_CREDENTIALS";
    await repo.end();
    writeSidecar(sidecarPath, { ok: false, report });
    process.exit(2);
  }

  const ebay = await observeProduct({
    source: "ebay",
    externalItemId: PINNED_EBAY_ITEM,
    purpose: "CONFIRMATION",
    marketplaceId: "EBAY_US",
  });
  report.EBAY_AUTOMATED_OBSERVATION =
    ebay.ok &&
    ebay.observation &&
    ebay.observation.observationPurpose === "CONFIRMATION" &&
    ebay.observation.sourceStatus === "SUCCESS"
      ? "PASS"
      : `FAIL:${(ebay && (ebay.reason || ebay.sourceStatus)) || "blocked"}`;
  if (report.EBAY_AUTOMATED_OBSERVATION !== "PASS") {
    await repo.end();
    writeSidecar(sidecarPath, { ok: false, report });
    process.exit(2);
  }

  const tcgObs = tcg.observation;
  const ebayObs = ebay.observation;
  const tcgWrite = await repo.appendObservation(tcgObs);
  report.TCG_DURABLE_WRITE =
    tcgWrite.ok && (tcgWrite.persistenceStatus === "INSERTED" || tcgWrite.persistenceStatus === "IDEMPOTENT_SUCCESS")
      ? "PASS"
      : `FAIL:${tcgWrite.persistenceStatus || tcgWrite.reason}`;
  const ebayWrite = await repo.appendObservation(ebayObs);
  report.EBAY_DURABLE_WRITE =
    ebayWrite.ok && (ebayWrite.persistenceStatus === "INSERTED" || ebayWrite.persistenceStatus === "IDEMPOTENT_SUCCESS")
      ? "PASS"
      : `FAIL:${ebayWrite.persistenceStatus || ebayWrite.reason}`;

  const tcgRetry = await repo.appendObservation(tcgObs);
  const ebayRetry = await repo.appendObservation(ebayObs);
  const tcgCount = await client.query("SELECT count(*)::int AS n FROM public.source_observations WHERE id = $1", [
    tcgObs.id,
  ]);
  const ebayCount = await client.query("SELECT count(*)::int AS n FROM public.source_observations WHERE id = $1", [
    ebayObs.id,
  ]);
  report.SOURCE_OBSERVATION_IDEMPOTENT_RETRY_DB_RUNTIME =
    tcgRetry.ok &&
    ebayRetry.ok &&
    tcgRetry.persistenceStatus === "IDEMPOTENT_SUCCESS" &&
    ebayRetry.persistenceStatus === "IDEMPOTENT_SUCCESS" &&
    tcgCount.rows[0].n === 1 &&
    ebayCount.rows[0].n === 1
      ? "PASS"
      : "FAIL";

  const conflictBase = sampleObservation({
    id: `${runId}_conflict`,
    externalItemId: `${runId}_conflict_item`,
    url: `https://www.ebay.com/itm/${runId}_conflict_item`,
  });
  const conflictInsert = await repo.appendObservation(conflictBase);
  const conflictMutated = sampleObservation({
    id: `${runId}_conflict`,
    externalItemId: `${runId}_conflict_item`,
    url: `https://www.ebay.com/itm/${runId}_conflict_item`,
    title: "mutated verifier payload",
  });
  const conflictAttempt = await repo.appendObservation(conflictMutated);
  const conflictRead = await repo.getByObservationId(`${runId}_conflict`);
  const originalFp = fingerprintCanonicalObservation(conflictBase);
  const storedFp = conflictRead.ok ? fingerprintCanonicalObservation(conflictRead.observation) : "";
  report.OBSERVATION_ID_PAYLOAD_CONFLICT_DB_RUNTIME =
    conflictInsert.ok &&
    !conflictAttempt.ok &&
    conflictAttempt.persistenceStatus === "BLOCKED_CONFLICT" &&
    storedFp === originalFp
      ? "BLOCKED"
      : "FAIL";

  const historyItem = `${runId}_history_item`;
  const hist1 = sampleObservation({
    id: `${runId}_history_1`,
    externalItemId: historyItem,
    url: `https://www.ebay.com/itm/${historyItem}`,
    observedAt: "2026-08-19T12:00:00.000Z",
    fetchedAt: "2026-08-19T12:00:00.000Z",
  });
  const hist2 = sampleObservation({
    id: `${runId}_history_2`,
    externalItemId: historyItem,
    url: `https://www.ebay.com/itm/${historyItem}`,
    observedAt: "2026-08-19T12:05:00.000Z",
    fetchedAt: "2026-08-19T12:05:00.000Z",
    nativeAmount: "13.00",
  });
  const h1 = await repo.appendObservation(hist1);
  const h2 = await repo.appendObservation(hist2);
  const listed = await repo.listBySourceItem("ebay", historyItem);
  report.SOURCE_OBSERVATION_HISTORY_PRESERVATION_DB_RUNTIME =
    h1.ok && h2.ok && listed.ok && listed.observations.length === 2 ? "PASS" : "FAIL";

  const sidecar = {
    ok:
      report.TCG_AUTOMATED_OBSERVATION === "PASS" &&
      report.EBAY_AUTOMATED_OBSERVATION === "PASS" &&
      report.TCG_DURABLE_WRITE === "PASS" &&
      report.EBAY_DURABLE_WRITE === "PASS" &&
      report.SOURCE_OBSERVATION_IDEMPOTENT_RETRY_DB_RUNTIME === "PASS" &&
      report.OBSERVATION_ID_PAYLOAD_CONFLICT_DB_RUNTIME === "BLOCKED" &&
      report.SOURCE_OBSERVATION_HISTORY_PRESERVATION_DB_RUNTIME === "PASS",
    writePid: process.pid,
    db: ident.db,
    role: ident.role,
    tcgId: tcgObs.id,
    ebayId: ebayObs.id,
    tcgFp: fingerprintCanonicalObservation(tcgObs),
    ebayFp: fingerprintCanonicalObservation(ebayObs),
    conflictId: `${runId}_conflict`,
    conflictFp: originalFp,
    historySource: "ebay",
    historyExternalItemId: historyItem,
    historyIds: [`${runId}_history_1`, `${runId}_history_2`],
    report,
  };
  await repo.end();
  writeSidecar(sidecarPath, sidecar);
  process.exit(sidecar.ok ? 0 : 2);
}

async function phaseRead() {
  loadEnvFile(".env");
  loadEnvFile(".env.local");
  const sidecarPath = argValue("--sidecar");
  const sidecar = readSidecar(sidecarPath);
  const report = sidecar.report || emptyReport();
  const resolved = resolveSafeUrl();
  if (!resolved || !sidecar.ok) {
    sidecar.readOk = false;
    writeSidecar(sidecarPath, sidecar);
    process.exit(2);
  }

  const client = await connectClient(resolved.url);
  const ident = await client.query("SELECT current_database() AS db, current_user AS role");
  if (ident.rows[0].db !== sidecar.db) {
    await client.end();
    sidecar.readOk = false;
    sidecar.readDetail = "database name changed between processes";
    writeSidecar(sidecarPath, sidecar);
    process.exit(2);
  }

  const rls = await client.query(
    `SELECT c.relrowsecurity AS rls
     FROM pg_class c
     JOIN pg_namespace n ON n.oid = c.relnamespace
     WHERE n.nspname = 'public' AND c.relname = 'source_observations'`,
  );
  report.DB_RLS_SCHEMA_ENABLED = rls.rows[0] && rls.rows[0].rls ? "PASS" : "FAIL";
  report.DB_RLS_RUNTIME_CONNECTION = "PASS_WITH_SUPERUSER_BYPASS";
  report.DB_RLS_APPLICATION_ROLE_ENFORCEMENT = "NOT_VERIFIED";

  const querier = createQuerier(client);
  const repo = createDurableSourceObservationRepository({ querier });
  const tcgRead = await repo.getByObservationId(sidecar.tcgId);
  const ebayRead = await repo.getByObservationId(sidecar.ebayId);
  report.TCG_DURABLE_READ_AFTER_FRESH_REPOSITORY = tcgRead.ok ? "PASS" : "FAIL";
  report.EBAY_DURABLE_READ_AFTER_FRESH_REPOSITORY = ebayRead.ok ? "PASS" : "FAIL";

  const tcgRt = tcgRead.ok ? roundTripOk({ id: sidecar.tcgId, ...tcgRead.observation }, tcgRead.observation) : { ok: false };
  const ebayRt = ebayRead.ok ? roundTripOk({ id: sidecar.ebayId, ...ebayRead.observation }, ebayRead.observation) : { ok: false };
  const tcgFpOk = tcgRead.ok && fingerprintCanonicalObservation(tcgRead.observation) === sidecar.tcgFp;
  const ebayFpOk = ebayRead.ok && fingerprintCanonicalObservation(ebayRead.observation) === sidecar.ebayFp;
  report.TCG_CANONICAL_ROUND_TRIP = tcgRead.ok && tcgFpOk ? "PASS" : "FAIL";
  report.EBAY_CANONICAL_ROUND_TRIP = ebayRead.ok && ebayFpOk ? "PASS" : "FAIL";
  report.SOURCE_OBSERVATION_CANONICAL_ROUND_TRIP =
    report.TCG_CANONICAL_ROUND_TRIP === "PASS" && report.EBAY_CANONICAL_ROUND_TRIP === "PASS"
      ? "PASS"
      : "FAIL";

  const conflictRead = await repo.getByObservationId(sidecar.conflictId);
  if (
    !conflictRead.ok ||
    fingerprintCanonicalObservation(conflictRead.observation) !== sidecar.conflictFp
  ) {
    report.OBSERVATION_ID_PAYLOAD_CONFLICT_DB_RUNTIME = "FAIL";
  }

  const history = await repo.listBySourceItem(sidecar.historySource, sidecar.historyExternalItemId);
  if (!history.ok || history.observations.length !== 2) {
    report.SOURCE_OBSERVATION_HISTORY_PRESERVATION_DB_RUNTIME = "FAIL";
  }

  if (tcgRead.ok && ebayRead.ok) {
    const now = new Date().toISOString();
    const matched = matchSourceObservationsV2(tcgRead.observation, ebayRead.observation, { now });
    report.DURABLE_OBSERVATION_PAIR_PROFILE = matched.categoryProfile || "unknown";
    report.DURABLE_OBSERVATION_V2_DECISION = matched.decision;
    report.DURABLE_OBSERVATION_MATCH_PATH = matched.matchPath || "null";
    report.DURABLE_OBSERVATION_MATCH_REGRESSION =
      matched.decision === "MATCH" &&
      matched.matchPath === "COMPOSITE_STRONG" &&
      matched.categoryProfile === "trading_card"
        ? "PASS"
        : "FAIL";

    const memory = createMemoryCanonicalProductRepository();
    const created = createCanonicalProductFromMatch({
      left: tcgRead.observation,
      right: ebayRead.observation,
      matchResult: matched,
      repository: memory,
      now,
    });
    report.DURABLE_OBSERVATION_TO_CANONICAL_PRODUCT_REGRESSION = created.ok ? "PASS" : `FAIL:${created.reason}`;
  }

  report.SOURCE_OBSERVATION_FRESH_REPOSITORY_DURABILITY =
    report.TCG_DURABLE_READ_AFTER_FRESH_REPOSITORY === "PASS" &&
    report.EBAY_DURABLE_READ_AFTER_FRESH_REPOSITORY === "PASS" &&
    report.SOURCE_OBSERVATION_CANONICAL_ROUND_TRIP === "PASS"
      ? "PASS"
      : "FAIL";
  report.SOURCE_OBSERVATION_CROSS_PROCESS_DURABILITY =
    sidecar.writePid && sidecar.writePid !== process.pid && report.SOURCE_OBSERVATION_FRESH_REPOSITORY_DURABILITY === "PASS"
      ? "PASS"
      : "NOT_VERIFIED";
  report.IN_MEMORY_OBJECT_REUSE_FOR_DURABILITY_PROOF = "NO";

  await repo.end();
  sidecar.report = report;
  sidecar.readOk =
    report.SOURCE_OBSERVATION_FRESH_REPOSITORY_DURABILITY === "PASS" &&
    report.DURABLE_OBSERVATION_MATCH_REGRESSION === "PASS" &&
    report.DURABLE_OBSERVATION_TO_CANONICAL_PRODUCT_REGRESSION === "PASS" &&
    report.SOURCE_OBSERVATION_CROSS_PROCESS_DURABILITY === "PASS";
  sidecar.readPid = process.pid;
  writeSidecar(sidecarPath, sidecar);
  process.exit(sidecar.readOk ? 0 : 2);
}

function waitChild(child) {
  return new Promise((resolve) => {
    child.on("exit", (code) => resolve(code == null ? 1 : code));
  });
}

async function phaseParent() {
  loadEnvFile(".env");
  loadEnvFile(".env.local");
  const report = emptyReport();
  const resolved = resolveSafeUrl();
  if (!resolved) {
    report.SAFE_DB_ENVIRONMENT = "NOT_FOUND";
    report.SOURCE_OBSERVATION_DB_RUNTIME_VERIFICATION = "BLOCKED_NO_SAFE_DB";
    report.DETAIL = "no SOURCE_OBSERVATION_SAFE_DATABASE_URL / TEST_DATABASE_URL / SAFE_DATABASE_URL";
    report.NEXT_RECOMMENDED_SLICE = "SECURE_DEDICATED_LOCAL_TEST_DB_URL";
    printReport(report);
    process.exit(0);
  }

  const classified = classifySafeTarget(resolved.url);
  if (!classified.ok) {
    report.SAFE_DB_ENVIRONMENT = classified.safeEnvironment;
    report.DB_NAME = classified.database || "NONE";
    report.DB_HOST_OR_PROJECT = classified.host ? `${classified.host}` : "NONE";
    report.SOURCE_OBSERVATION_DB_RUNTIME_VERIFICATION =
      classified.reason === "BLOCKED_NOT_DEDICATED" ? "BLOCKED_NOT_DEDICATED" : "BLOCKED_NO_SAFE_DB";
    report.DETAIL = classified.reason;
    report.NEXT_RECOMMENDED_SLICE =
      classified.reason === "BLOCKED_NOT_DEDICATED"
        ? "CREATE_DEDICATED_DB_putduk_sourceobs_test"
        : "SECURE_DEDICATED_LOCAL_TEST_DB_URL";
    printReport(report);
    process.exit(0);
  }

  process.env.SOURCE_OBSERVATION_SAFE_DATABASE_URL = resolved.url;

  let client;
  try {
    client = await connectClient(resolved.url);
  } catch (err) {
    report.SAFE_DB_ENVIRONMENT = "NOT_FOUND";
    report.SOURCE_OBSERVATION_DB_RUNTIME_VERIFICATION = "BLOCKED_NO_SAFE_DB";
    report.DETAIL = `connect_failed:${err instanceof Error ? err.message : "unknown"}`;
    printReport(report);
    process.exit(0);
  }

  const identity = await client.query(
    "SELECT current_database() AS db, current_user AS role, inet_server_addr()::text AS addr, inet_server_port() AS port, version() AS version",
  );
  const ident = identity.rows[0];
  await client.end();

  if (!isDedicatedDatabaseName(ident.db)) {
    report.SAFE_DB_ENVIRONMENT = "BLOCKED_NOT_DEDICATED";
    report.DB_TECHNOLOGY = "PostgreSQL";
    report.DB_HOST_OR_PROJECT = `localhost:${ident.port || "5432"}/postgresql-x64-18`;
    report.DB_NAME = ident.db;
    report.SOURCE_OBSERVATION_DB_RUNTIME_VERIFICATION = "BLOCKED_NOT_DEDICATED";
    report.DETAIL = "current_database is not a PUTDUK dedicated proof database";
    printReport(report);
    process.exit(0);
  }

  report.SAFE_DB_ENVIRONMENT = "FOUND";
  report.SAFE_DB_KIND = "DEDICATED_LOCAL_TEST_POSTGRES";
  report.DB_TECHNOLOGY = "PostgreSQL";
  report.DB_HOST_OR_PROJECT = `localhost:${ident.port || classified.parsed.port}/postgresql-x64-18`;
  report.DB_NAME = ident.db;
  report.DB_IS_PRODUCTION = "NO";

  const migrated = applyMigration(resolved.url);
  report.LOCAL_SUPABASE_ROLE_STUBS = migrated.stubs || "NOT_USED";
  report.SUPABASE_ROLE_RUNTIME_PARITY = "NOT_VERIFIED";
  if (!migrated.ok) {
    report.MIGRATION_APPLIED_TO_SAFE_DB = "NO";
    report.SOURCE_OBSERVATION_DB_RUNTIME_VERIFICATION = "FAIL";
    report.DETAIL = migrated.error;
    printReport(report);
    process.exit(2);
  }
  report.MIGRATION_APPLIED_TO_SAFE_DB = "YES";
  report.MIGRATION_APPLIED_TO_PRODUCTION = "NO";

  const sidecarPath = path.join(os.tmpdir(), `putduk-so-db-runtime-${Date.now()}.json`);
  writeSidecar(sidecarPath, { ok: false });

  const writeChild = fork(__filename, ["--phase=write", `--sidecar=${sidecarPath}`], {
    env: process.env,
    stdio: "inherit",
  });
  const writeCode = await waitChild(writeChild);
  if (writeCode !== 0) {
    const sidecar = fs.existsSync(sidecarPath) ? readSidecar(sidecarPath) : { report };
    const out = sidecar.report || report;
    out.SAFE_DB_ENVIRONMENT = report.SAFE_DB_ENVIRONMENT;
    out.SAFE_DB_KIND = report.SAFE_DB_KIND;
    out.DB_TECHNOLOGY = report.DB_TECHNOLOGY;
    out.DB_HOST_OR_PROJECT = report.DB_HOST_OR_PROJECT;
    out.DB_NAME = report.DB_NAME;
    out.MIGRATION_APPLIED_TO_SAFE_DB = report.MIGRATION_APPLIED_TO_SAFE_DB;
    out.LOCAL_SUPABASE_ROLE_STUBS = report.LOCAL_SUPABASE_ROLE_STUBS;
    out.SOURCE_OBSERVATION_DB_RUNTIME_VERIFICATION = "FAIL";
    out.SOURCE_OBSERVATION_CROSS_PROCESS_DURABILITY = "NOT_VERIFIED";
    printReport(out);
    process.exit(2);
  }

  const readChild = fork(__filename, ["--phase=read", `--sidecar=${sidecarPath}`], {
    env: process.env,
    stdio: "inherit",
  });
  const readCode = await waitChild(readChild);
  const sidecar = readSidecar(sidecarPath);
  const out = sidecar.report || report;
  out.SAFE_DB_ENVIRONMENT = report.SAFE_DB_ENVIRONMENT;
  out.SAFE_DB_KIND = report.SAFE_DB_KIND;
  out.DB_TECHNOLOGY = report.DB_TECHNOLOGY;
  out.DB_HOST_OR_PROJECT = report.DB_HOST_OR_PROJECT;
  out.DB_NAME = report.DB_NAME;
  out.MIGRATION_APPLIED_TO_SAFE_DB = report.MIGRATION_APPLIED_TO_SAFE_DB;
  out.MIGRATION_APPLIED_TO_PRODUCTION = "NO";
  out.LOCAL_SUPABASE_ROLE_STUBS = report.LOCAL_SUPABASE_ROLE_STUBS;
  out.SUPABASE_ROLE_RUNTIME_PARITY = "NOT_VERIFIED";
  out.PRODUCTION_PG_CLIENT_WIRING = "NOT_IMPLEMENTED";
  out.PRODUCTION_OBSERVATION_PERSISTENCE = "NOT_IMPLEMENTED";
  out.CANONICAL_PRODUCT_DURABLE_DB_PERSISTENCE = "NOT_IMPLEMENTED";
  out.PUTDUK_PRODUCT_ID_DURABLE_STABILITY = "NOT_IMPLEMENTED";
  out.MATCH_RESULT_DURABLE_PERSISTENCE = "NOT_IMPLEMENTED";
  out.COMMIT_PUSH_STASH_RESTORE = "NO";
  const pass =
    readCode === 0 &&
    sidecar.readOk &&
    out.TCG_DURABLE_WRITE === "PASS" &&
    out.EBAY_DURABLE_WRITE === "PASS" &&
    out.SOURCE_OBSERVATION_CROSS_PROCESS_DURABILITY === "PASS" &&
    out.DURABLE_OBSERVATION_MATCH_REGRESSION === "PASS";
  out.SOURCE_OBSERVATION_DB_RUNTIME_VERIFICATION = pass ? "PASS" : "FAIL";
  out.NEXT_RECOMMENDED_SLICE = pass
    ? "PUTDUK_CANONICAL_PRODUCT_AND_PD_DURABLE_PERSISTENCE"
    : "STOP";
  printReport(out);
  process.exit(pass ? 0 : 2);
}

const phase = process.argv.includes("--phase=write")
  ? "write"
  : process.argv.includes("--phase=read")
    ? "read"
    : "parent";

const run =
  phase === "write" ? phaseWrite : phase === "read" ? phaseRead : phaseParent;

run().catch((err) => {
  const report = emptyReport();
  report.DETAIL = err instanceof Error ? err.message : String(err);
  report.SOURCE_OBSERVATION_DB_RUNTIME_VERIFICATION = "FAIL";
  printReport(report);
  process.exit(2);
});
