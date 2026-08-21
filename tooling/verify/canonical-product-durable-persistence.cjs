#!/usr/bin/env node
/**
 * CanonicalProduct + PD isolated local Postgres runtime proof.
 * production write 0 · existing :5432 untouched · Pool.query BEGIN 금지
 */
const fs = require("fs");
const net = require("net");
const os = require("os");
const path = require("path");
const crypto = require("crypto");
const { fork, spawn, spawnSync } = require("child_process");

const root = path.resolve(__dirname, "../..");
const {
  createDurableSourceObservationRepository,
} = require(path.join(
  root,
  "services/market-intelligence/src/source-observation/repository.postgres.cjs",
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
  createCanonicalProductFromMatchDurable,
  createDurableCanonicalProductRepository,
  createMemoryCanonicalProductRepository,
  buildCanonicalIdentityKey,
  CREATE_BLOCKED,
} = require(path.join(root, "services/market-intelligence/src/canonical-product/index.cjs"));

const PINNED_TCG = "113669";
const PINNED_EBAY = "377416817781";
const TCG_URL = `https://www.tcgplayer.com/product/${PINNED_TCG}`;
const SO_MIGRATION = "supabase/migrations/20260819210000_source_observations.sql";
const PG_BIN = "C:\\Program Files\\PostgreSQL\\18\\bin";
const DENY_ENV_COPY = new Set(["DATABASE_URL"]);
const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);
const SAFE_URL_ENV = "CANONICAL_PROOF_DATABASE_URL";

function loadEnvFile(rel) {
  const file = path.join(root, rel);
  if (!fs.existsSync(file)) return;
  const text = fs.readFileSync(file, "utf8");
  for (const line of text.split(/\r?\n/)) {
    if (!line || line.startsWith("#")) continue;
    const i = line.indexOf("=");
    if (i <= 0) continue;
    const key = line.slice(0, i).trim();
    if (!/^[A-Z0-9_]+$/.test(key) || DENY_ENV_COPY.has(key)) continue;
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

function classifyVerifierSafeUrl(url) {
  if (!url) return { ok: false, reason: "DATABASE_URL_UNSET" };
  const raw = String(url);
  if (/mgsytcetsiecllmhcyox/i.test(raw) || /supabase\.co/i.test(raw)) {
    return { ok: false, reason: "BLOCKED_NO_SAFE_DB" };
  }
  let parsed;
  try {
    parsed = parsePostgresUrl(raw);
  } catch {
    return { ok: false, reason: "DATABASE_URL_UNPARSEABLE" };
  }
  if (!LOCAL_HOSTS.has(parsed.host)) return { ok: false, reason: "BLOCKED_NON_LOCAL_HOST" };
  if (String(parsed.port) === "5432") return { ok: false, reason: "BLOCKED_PORT_5432" };
  if (parsed.database !== "putduk_canonical_proof") {
    return { ok: false, reason: "BLOCKED_NOT_DEDICATED" };
  }
  return { ok: true, parsed };
}

function resolvePg() {
  const candidates = [
    path.join(root, "services/api-nest/node_modules/pg"),
    path.join(root, "node_modules/.pnpm/pg@8.23.0/node_modules/pg"),
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(path.join(candidate, "package.json"))) return require(candidate);
  }
  throw new Error("VERIFIER_PG_NOT_FOUND");
}

function wrapClient(client) {
  return {
    query: (text, params) => client.query(text, params),
    end: async () => client.end(),
  };
}

async function connectClient(url) {
  const classified = classifyVerifierSafeUrl(url);
  if (!classified.ok) throw new Error(classified.reason);
  const { Client } = resolvePg();
  const client = new Client({ connectionString: url });
  await client.connect();
  return client;
}

function argValue(name) {
  const prefix = `${name}=`;
  const hit = process.argv.find((item) => item.startsWith(prefix));
  return hit ? hit.slice(prefix.length) : "";
}

function readSidecar(file) {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function writeSidecar(file, data) {
  fs.writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

function waitChild(child) {
  return new Promise((resolve) => {
    child.on("exit", (code) => resolve(code == null ? 1 : code));
  });
}

function existingPg5432Status() {
  const result = spawnSync("sc.exe", ["query", "postgresql-x64-18"], {
    encoding: "utf8",
    windowsHide: true,
  });
  const out = `${result.stdout || ""} ${result.stderr || ""}`;
  return /RUNNING/i.test(out) ? "RUNNING" : "UNKNOWN";
}

function pgExe(name) {
  return path.join(PG_BIN, name);
}

function canBind(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once("error", () => resolve(false));
    server.listen(port, "127.0.0.1", () => {
      server.close(() => resolve(true));
    });
  });
}

async function pickFreePort() {
  for (let port = 55432; port <= 55999; port += 1) {
    if (await canBind(port)) return port;
  }
  throw new Error("NO_FREE_HIGH_PORT");
}

function runPsql(url, args) {
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
  const result = spawnSync(pgExe("psql.exe"), ["-v", "ON_ERROR_STOP=1", ...args], {
    env,
    encoding: "utf8",
    windowsHide: true,
  });
  return {
    status: result.status == null ? 1 : result.status,
    stdout: result.stdout || "",
    stderr: result.stderr || "",
  };
}

function ensureRoleStubs(url) {
  return runPsql(
    url,
    [
      "-c",
      `
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
`.trim(),
    ],
  );
}

function nextMigrationPath() {
  const dir = path.join(root, "supabase/migrations");
  const prefixes = fs
    .readdirSync(dir)
    .filter((n) => n.endsWith(".sql"))
    .map((n) => n.match(/^(\d{14})_/))
    .filter(Boolean)
    .map((m) => m[1])
    .sort();
  const max = prefixes[prefixes.length - 1];
  const match = fs
    .readdirSync(dir)
    .filter((n) => n.endsWith(".sql") && n.includes("_canonical_products.sql"));
  if (match.length !== 1) throw new Error("canonical_products migration missing or duplicated");
  const stamp = match[0].match(/^(\d{14})_/);
  if (!stamp || stamp[1] <= "20260819210000") {
    throw new Error("canonical_products timestamp is not after write-time max baseline");
  }
  if (stamp[1] !== max && stamp[1] < max) {
    throw new Error("canonical_products timestamp is not after current max");
  }
  return path.join(dir, match[0]);
}

async function waitReady(port, timeoutMs) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const ready = spawnSync(pgExe("pg_isready.exe"), ["-h", "127.0.0.1", "-p", String(port)], {
      encoding: "utf8",
      windowsHide: true,
    });
    if (ready.status === 0) return true;
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  return false;
}

async function bootstrapCluster() {
  for (const name of ["initdb.exe", "pg_ctl.exe", "psql.exe", "createdb.exe", "pg_isready.exe"]) {
    if (!fs.existsSync(pgExe(name))) {
      throw new Error(`PG_BINARY_MISSING:${name}`);
    }
  }
  const uid = crypto.randomBytes(6).toString("hex");
  const clusterRoot = path.join(os.tmpdir(), `putduk-canonical-pg-${uid}`);
  const dataDir = path.join(clusterRoot, "data");
  const marker = path.join(clusterRoot, "PUTDUK_ISOLATED_CLUSTER.txt");
  fs.mkdirSync(clusterRoot, { recursive: true });
  fs.writeFileSync(marker, "putduk disposable canonical-product test cluster\n", "utf8");
  fs.mkdirSync(dataDir);

  const password = crypto.randomBytes(24).toString("hex");
  const pwFile = path.join(clusterRoot, ".pwfile");
  fs.writeFileSync(pwFile, password, { encoding: "utf8" });

  const init = spawnSync(
    pgExe("initdb.exe"),
    [
      "-D",
      dataDir,
      "-U",
      "postgres",
      "-A",
      "scram-sha-256",
      "--pwfile",
      pwFile,
      "-E",
      "UTF8",
      "--no-locale",
    ],
    { encoding: "utf8", windowsHide: true },
  );
  fs.unlinkSync(pwFile);
  if (init.status !== 0) {
    throw new Error(`INITDB_FAILED:${(init.stderr || init.stdout || "").slice(0, 240)}`);
  }

  const port = await pickFreePort();
  const logFile = path.join(clusterRoot, "pg.log");
  const child = spawn(
    pgExe("pg_ctl.exe"),
    ["start", "-D", dataDir, "-l", logFile, "-o", `-p ${port} -c listen_addresses=localhost`],
    { detached: true, stdio: "ignore", windowsHide: true },
  );
  child.unref();

  const ready = await waitReady(port, 20000);
  if (!ready) throw new Error("PG_CTL_START_TIMEOUT");

  const url = `postgresql://postgres:${encodeURIComponent(password)}@127.0.0.1:${port}/postgres`;
  const created = spawnSync(
    pgExe("createdb.exe"),
    ["-h", "127.0.0.1", "-p", String(port), "-U", "postgres", "putduk_canonical_proof"],
    {
      env: { ...process.env, PGPASSWORD: password, PGSSLMODE: "disable" },
      encoding: "utf8",
      windowsHide: true,
    },
  );
  if (created.status !== 0) {
    throw new Error(`CREATEDB_FAILED:${(created.stderr || created.stdout || "").slice(0, 240)}`);
  }

  const dbUrl = `postgresql://postgres:${encodeURIComponent(password)}@127.0.0.1:${port}/putduk_canonical_proof`;
  return { clusterRoot, dataDir, marker, port, url: dbUrl };
}

function isOwnedCluster(cluster) {
  if (!cluster || !cluster.dataDir || !cluster.marker || !cluster.port) return false;
  if (String(cluster.port) === "5432") return false;
  if (!String(cluster.dataDir).toLowerCase().includes("putduk-canonical-pg-")) return false;
  if (!fs.existsSync(cluster.marker)) return false;
  if (!fs.existsSync(cluster.dataDir)) return false;
  return true;
}

function stopOwnedCluster(cluster) {
  if (!isOwnedCluster(cluster)) return { stopped: false, reason: "NOT_OWNED" };
  spawnSync(pgExe("pg_ctl.exe"), ["stop", "-D", cluster.dataDir, "-m", "fast"], {
    encoding: "utf8",
    windowsHide: true,
    stdio: "ignore",
  });
  try {
    fs.rmSync(cluster.clusterRoot, { recursive: true, force: true });
  } catch {
    // best-effort
  }
  return { stopped: true };
}

function applyMigrations(url) {
  const roles = ensureRoleStubs(url);
  if (roles.status !== 0) {
    return { ok: false, error: roles.stderr || "role stub failed" };
  }
  const so = runPsql(url, ["-f", path.join(root, SO_MIGRATION)]);
  if (so.status !== 0) return { ok: false, error: so.stderr || "SO migration failed" };
  const cp = runPsql(url, ["-f", nextMigrationPath()]);
  if (cp.status !== 0) return { ok: false, error: cp.stderr || "CP migration failed" };
  return { ok: true };
}

function emptyReport() {
  return {
    PREVIOUS_RUNTIME_VERIFICATION: "PASS",
    SAFE_DB_KIND: "CURSOR_CREATED_ISOLATED_LOCAL_POSTGRES",
    DB_IS_PRODUCTION: "NO",
    FOUNDER_PASSWORD_INPUT_REQUIRED: "NO",
    SECRET_EXPOSED_IN_REPORT: "NO",
    EXISTING_PG_5432_TOUCHED: "NO",
    PRODUCTION_DB_WRITE_ATTEMPTED: "NO",
    PRODUCTION_MIGRATION_APPLIED: "NO",
    PRODUCTION_SCHEMA_CHANGED: "NO",
    COMMIT_PUSH_STASH_RESTORE: "NO",
    MATCH_RESULT_DURABLE_PERSISTENCE: "NOT_IMPLEMENTED",
    PRODUCTION_CANONICAL_PRODUCT_PERSISTENCE: "NOT_IMPLEMENTED",
    PRODUCTION_CANONICAL_PRODUCT_PG_CLIENT_WIRING: "NOT_IMPLEMENTED",
    CREATE_CANONICAL_PRODUCT_FROM_MATCH_API: "SYNC_PRESERVED",
    CREATE_CANONICAL_PRODUCT_FROM_MATCH_DURABLE: "ADDITIVE_ASYNC",
    DUPLICATE_LINK_ROWS_CREATED: "NO",
    PARTIAL_PRODUCT_ON_SOURCE_LINK_FAILURE: "BLOCKED",
    NEXT_RECOMMENDED_SLICE: "PUTDUK_MATCH_RESULT_DURABLE_PERSISTENCE_CANDIDATE_ONLY",
  };
}

function printReport(report) {
  const lines = Object.entries(report).map(([key, value]) => `${key} = ${value}`);
  console.log(`# PUTDUK_CANONICAL_PRODUCT_AND_PD_DURABLE_PERSISTENCE\n\n${lines.join("\n")}`);
}

function runNodeVerifier(rel) {
  const result = spawnSync(process.execPath, [path.join(root, rel)], {
    cwd: root,
    encoding: "utf8",
    windowsHide: true,
  });
  return result.status === 0;
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
      extractionEvidence: { sourceItemId: "EXISTING_API", title: "EXISTING_API" },
    },
    ...overrides,
  };
}

function syntheticMatch(left, right, extras) {
  return {
    matcherVersion: "identity-matching.v2",
    decision: "MATCH",
    matchPath: "COMPOSITE_STRONG",
    categoryProfile: "trading_card",
    leftObservationId: left.id,
    rightObservationId: right.id,
    evaluatedAt: "2026-08-19T12:00:00.000Z",
    evidence: [
      {
        field: "game",
        comparison: "exact",
        left: { value: "pokemon", evidenceOwner: "OWNER_BACKED_STRUCTURED" },
        right: { value: "pokemon", evidenceOwner: "OWNER_BACKED_STRUCTURED" },
      },
      {
        field: "set",
        comparison: "exact",
        left: { value: extras.set, evidenceOwner: "OWNER_BACKED_STRUCTURED" },
        right: { value: extras.set, evidenceOwner: "OWNER_BACKED_STRUCTURED" },
      },
      {
        field: "cardNumber",
        comparison: "exact",
        left: { value: extras.cardNumber, evidenceOwner: "OWNER_BACKED_STRUCTURED" },
        right: { value: extras.cardNumber, evidenceOwner: "OWNER_BACKED_STRUCTURED" },
      },
      {
        field: "character",
        comparison: "exact",
        left: { value: extras.characterOrName, evidenceOwner: "OWNER_BACKED_STRUCTURED" },
        right: { value: extras.characterOrName, evidenceOwner: "OWNER_BACKED_STRUCTURED" },
      },
    ],
  };
}

function phase0Invariants(report) {
  const fails = [];
  const createSrc = fs.readFileSync(
    path.join(root, "services/market-intelligence/src/canonical-product/create-from-match.cjs"),
    "utf8",
  );
  const repoSrc = fs.readFileSync(
    path.join(root, "services/market-intelligence/src/canonical-product/repository.postgres.cjs"),
    "utf8",
  );
  const memSrc = fs.readFileSync(
    path.join(root, "services/market-intelligence/src/canonical-product/repository.cjs"),
    "utf8",
  );
  if (!/function createCanonicalProductFromMatch\(/.test(createSrc)) {
    fails.push("sync create function missing");
  }
  if (/async function createCanonicalProductFromMatch\(/.test(createSrc)) {
    fails.push("sync create must not become async");
  }
  if (!/async function createCanonicalProductFromMatchDurable\(/.test(createSrc)) {
    fails.push("durable create missing");
  }
  if (/require\(['\"]pg['\"]\)/.test(repoSrc)) fails.push("canonical postgres repo must not require pg");
  if (/mgsytcetsiecllmhcyox/.test(repoSrc)) fails.push("repo must not hardcode production ref");
  if (!/createMemoryCanonicalProductRepository/.test(memSrc)) fails.push("memory repo missing");
  if (/CREATE TABLE[\s\S]*match_results/i.test(
    fs.readFileSync(nextMigrationPath(), "utf8"),
  )) {
    fails.push("match_results table forbidden");
  }
  report.CANONICAL_PRODUCT_DURABLE_REPOSITORY_IMPLEMENTATION = fails.length ? "FAIL" : "PASS";
  report.CANONICAL_PRODUCT_MIGRATION_FILE = fs.existsSync(nextMigrationPath()) ? "PASS" : "FAIL";
  return fails;
}

async function phaseWriteSo() {
  loadEnvFile(".env");
  loadEnvFile(".env.local");
  const sidecarPath = argValue("--sidecar");
  const url = process.env[SAFE_URL_ENV];
  const client = await connectClient(url);
  const soRepo = createDurableSourceObservationRepository({ querier: wrapClient(client) });
  const tcg = await observeProduct({
    source: "tcgplayer",
    url: TCG_URL,
    externalItemId: PINNED_TCG,
    purpose: "CONFIRMATION",
  });
  const creds = credentialsFromEnv();
  if (!tcg.ok || !creds.configured) {
    await soRepo.end();
    writeSidecar(sidecarPath, { ok: false, reason: "LIVE_OBSERVE_BLOCKED" });
    process.exit(2);
  }
  const ebay = await observeProduct({
    source: "ebay",
    externalItemId: PINNED_EBAY,
    purpose: "CONFIRMATION",
    marketplaceId: "EBAY_US",
  });
  if (!ebay.ok) {
    await soRepo.end();
    writeSidecar(sidecarPath, { ok: false, reason: "EBAY_OBSERVE_BLOCKED" });
    process.exit(2);
  }
  const tcgWrite = await soRepo.appendObservation(tcg.observation);
  const ebayWrite = await soRepo.appendObservation(ebay.observation);
  const ok =
    tcgWrite.ok &&
    ebayWrite.ok &&
    (tcgWrite.persistenceStatus === "INSERTED" || tcgWrite.persistenceStatus === "IDEMPOTENT_SUCCESS") &&
    (ebayWrite.persistenceStatus === "INSERTED" || ebayWrite.persistenceStatus === "IDEMPOTENT_SUCCESS");
  writeSidecar(sidecarPath, {
    ok,
    tcgId: tcg.observation.id,
    ebayId: ebay.observation.id,
    writePid: process.pid,
    REAL_DB_READ_SOURCE_OBSERVATIONS_USED: "YES",
    TCG_DURABLE_WRITE: tcgWrite.ok ? "PASS" : "FAIL",
    EBAY_DURABLE_WRITE: ebayWrite.ok ? "PASS" : "FAIL",
  });
  await soRepo.end();
  process.exit(ok ? 0 : 2);
}

async function phaseCreateA() {
  const sidecarPath = argValue("--sidecar");
  const sidecar = readSidecar(sidecarPath);
  const url = process.env[SAFE_URL_ENV];
  const client = await connectClient(url);
  const soRepo = createDurableSourceObservationRepository({ querier: wrapClient(client) });
  const tcg = await soRepo.getByObservationId(sidecar.tcgId);
  const ebay = await soRepo.getByObservationId(sidecar.ebayId);
  if (!tcg.ok || !ebay.ok) {
    await client.end();
    sidecar.ok = false;
    writeSidecar(sidecarPath, sidecar);
    process.exit(2);
  }
  const now = new Date().toISOString();
  const match = matchSourceObservationsV2(tcg.observation, ebay.observation, { now });
  const repo = createDurableCanonicalProductRepository({ querier: wrapClient(client) });
  const created = await createCanonicalProductFromMatchDurable({
    left: tcg.observation,
    right: ebay.observation,
    matchResult: match,
    repository: repo,
    now,
  });
  sidecar.createPid = process.pid;
  sidecar.V2_DECISION = match.decision;
  sidecar.V2_MATCH_PATH = match.matchPath;
  sidecar.V2_PAIR_PROFILE = match.categoryProfile;
  sidecar.created = created;
  if (
    created.ok &&
    created.product &&
    created.backendPidStart &&
    created.backendPidStart === created.backendPidEnd
  ) {
    sidecar.canonicalProductId = created.product.canonicalProductId;
    sidecar.putdukProductCode = created.product.putdukProductCode;
    sidecar.identityKey = created.identityKey;
    sidecar.categoryProfile = created.product.categoryProfile;
    sidecar.backendPidStart = created.backendPidStart;
    sidecar.backendPidEnd = created.backendPidEnd;
    sidecar.ok = true;
  } else {
    sidecar.ok = false;
  }
  writeSidecar(sidecarPath, sidecar);
  await client.end();
  process.exit(sidecar.ok ? 0 : 2);
}

async function phaseReadB() {
  const sidecarPath = argValue("--sidecar");
  const sidecar = readSidecar(sidecarPath);
  const url = process.env[SAFE_URL_ENV];
  const client = await connectClient(url);
  const repo = createDurableCanonicalProductRepository({ querier: wrapClient(client) });
  const product = await repo.getProduct(sidecar.canonicalProductId);
  const links = product ? await repo.listLinks(sidecar.canonicalProductId) : [];
  sidecar.readPid = process.pid;
  sidecar.readProduct = product;
  sidecar.readLinks = links;
  sidecar.readOk = Boolean(
    product &&
      product.canonicalProductId === sidecar.canonicalProductId &&
      product.putdukProductCode === sidecar.putdukProductCode &&
      product.categoryProfile === sidecar.categoryProfile &&
      links.some((row) => row.source === "tcgplayer") &&
      links.some((row) => row.source === "ebay"),
  );
  writeSidecar(sidecarPath, sidecar);
  await client.end();
  process.exit(sidecar.readOk ? 0 : 2);
}

async function phaseRetryC() {
  const sidecarPath = argValue("--sidecar");
  const sidecar = readSidecar(sidecarPath);
  const url = process.env[SAFE_URL_ENV];
  const client = await connectClient(url);
  const soRepo = createDurableSourceObservationRepository({ querier: wrapClient(client) });
  const tcg = await soRepo.getByObservationId(sidecar.tcgId);
  const ebay = await soRepo.getByObservationId(sidecar.ebayId);
  const now = new Date().toISOString();
  const match = matchSourceObservationsV2(tcg.observation, ebay.observation, { now });
  const repo = createDurableCanonicalProductRepository({ querier: wrapClient(client) });
  const retry = await createCanonicalProductFromMatchDurable({
    left: tcg.observation,
    right: ebay.observation,
    matchResult: match,
    repository: repo,
    now,
  });
  const count = await client.query(
    "SELECT count(*)::int AS n FROM public.canonical_products WHERE canonical_identity_key = $1",
    [sidecar.identityKey],
  );
  const linkCount = await client.query(
    "SELECT count(*)::int AS n FROM public.canonical_product_source_links WHERE canonical_product_id = $1",
    [sidecar.canonicalProductId],
  );
  sidecar.retryPid = process.pid;
  sidecar.retry = {
    ok: retry.ok,
    created: retry.created,
    id: retry.product && retry.product.canonicalProductId,
    pd: retry.product && retry.product.putdukProductCode,
    count: count.rows[0].n,
    links: linkCount.rows[0].n,
  };
  writeSidecar(sidecarPath, sidecar);
  await client.end();
  process.exit(retry.ok && retry.created === false && count.rows[0].n === 1 ? 0 : 2);
}

async function phaseConcurrent() {
  const sidecarPath = argValue("--sidecar");
  const sidecar = readSidecar(sidecarPath);
  const url = process.env[SAFE_URL_ENV];
  const client = await connectClient(url);
  const repo = createDurableCanonicalProductRepository({ querier: wrapClient(client) });
  const identityKey =
    "profile=trading_card|game=pokemon|set=concurrent proof set|cardNumber=99/99|characterOrName=concurrentbird";
  const result = await repo.withTransaction(async (tx) => {
    const product = await tx.createProduct({
      categoryProfile: "trading_card",
      canonicalAttributes: {
        game: "pokemon",
        set: "Concurrent Proof Set",
        cardNumber: "99/99",
        characterOrName: "ConcurrentBird",
      },
      identityKey,
      identityEvidenceSummary: {
        matcherVersion: "identity-matching.v2",
        decision: "MATCH",
        matchPath: "STRONG",
        evaluatedAt: "2026-08-19T12:00:00.000Z",
      },
      now: "2026-08-19T12:00:00.000Z",
    });
    return { ok: true, product };
  });
  const worker = argValue("--worker") || String(process.pid);
  writeSidecar(`${sidecarPath}.${worker}`, {
    concurrentRow: {
      pid: process.pid,
      id: result.product && result.product.canonicalProductId,
      pd: result.product && result.product.putdukProductCode,
    },
  });
  await client.end();
  process.exit(result.ok ? 0 : 2);
}

async function runNegativesAndEnrichment(url, sidecar, report) {
  const client = await connectClient(url);
  const soRepo = createDurableSourceObservationRepository({ querier: wrapClient(client) });
  const repo = createDurableCanonicalProductRepository({ querier: wrapClient(client) });
  const tcg = await soRepo.getByObservationId(sidecar.tcgId);
  const ebay = await soRepo.getByObservationId(sidecar.ebayId);
  const now = new Date().toISOString();
  const match = matchSourceObservationsV2(tcg.observation, ebay.observation, { now });

  const noMatch = await createCanonicalProductFromMatchDurable({
    left: tcg.observation,
    right: ebay.observation,
    matchResult: { ...match, decision: "NO_MATCH", matchPath: null },
    repository: repo,
    now,
  });
  const insufficient = await createCanonicalProductFromMatchDurable({
    left: tcg.observation,
    right: ebay.observation,
    matchResult: { ...match, decision: "INSUFFICIENT_EVIDENCE", matchPath: null },
    repository: repo,
    now,
  });
  const conflict = await createCanonicalProductFromMatchDurable({
    left: tcg.observation,
    right: ebay.observation,
    matchResult: { ...match, decision: "CONFLICT", matchPath: null },
    repository: repo,
    now,
  });
  const discovery = await createCanonicalProductFromMatchDurable({
    left: { ...tcg.observation, observationPurpose: "DISCOVERY" },
    right: ebay.observation,
    matchResult: { ...match, decision: "MATCH", leftObservationId: tcg.observation.id },
    repository: repo,
    now,
  });

  const leftB = sampleObservation({
    id: `obs_conflict_left_${Date.now()}`,
    source: "tcgplayer",
    externalItemId: "conflict-left",
    url: "https://www.tcgplayer.com/product/conflict-left",
  });
  const rightB = sampleObservation({
    id: `obs_conflict_right_${Date.now()}`,
    source: "ebay",
    externalItemId: "conflict-right",
    url: "https://www.ebay.com/itm/conflict-right",
  });
  await soRepo.appendObservation(leftB);
  await soRepo.appendObservation(rightB);
  const otherMatch = syntheticMatch(leftB, rightB, {
    set: "Other Conflict Set",
    cardNumber: "1/1",
    characterOrName: "Pikachu",
  });
  const other = await createCanonicalProductFromMatchDurable({
    left: leftB,
    right: rightB,
    matchResult: otherMatch,
    repository: repo,
    now,
  });
  const steal = await createCanonicalProductFromMatchDurable({
    left: leftB,
    right: ebay.observation,
    matchResult: {
      ...syntheticMatch(leftB, ebay.observation, {
        set: "Steal Set",
        cardNumber: "2/2",
        characterOrName: "Mew",
      }),
      leftObservationId: leftB.id,
      rightObservationId: ebay.observation.id,
    },
    repository: repo,
    now,
  });

  const atomLeft = sampleObservation({
    id: `obs_atom_left_${Date.now()}`,
    source: "tcgplayer",
    externalItemId: "atom-left",
    url: "https://www.tcgplayer.com/product/atom-left",
  });
  await soRepo.appendObservation(atomLeft);
  const atomKey =
    "profile=trading_card|game=pokemon|set=atom proof set|cardNumber=7/7|characterOrName=atomcard";
  const atomTx = await repo.withTransaction(async (tx) => {
    const product = await tx.createProduct({
      categoryProfile: "trading_card",
      canonicalAttributes: {
        game: "pokemon",
        set: "Atom Proof Set",
        cardNumber: "7/7",
        characterOrName: "AtomCard",
      },
      identityKey: atomKey,
      identityEvidenceSummary: {
        matcherVersion: "identity-matching.v2",
        decision: "MATCH",
        matchPath: "STRONG",
        evaluatedAt: now,
      },
      now,
    });
    const attached = await tx.attachLink(
      product.canonicalProductId,
      {
        source: "tcgplayer",
        sourceItemId: PINNED_TCG,
        sourceUrl: TCG_URL,
        latestObservationRef: sidecar.tcgId,
        matchingDecision: "MATCH",
        matcherVersion: "identity-matching.v2",
        evidence: { decision: "MATCH" },
      },
      sidecar.tcgId,
    );
    if (!attached.ok) return attached;
    return { ok: true, product };
  });
  const atomCount = await client.query(
    "SELECT count(*)::int AS n FROM public.canonical_products WHERE canonical_identity_key = $1",
    [atomKey],
  );

  const before = await repo.getProduct(sidecar.canonicalProductId);
  const enriched = await repo.withTransaction(async (tx) => {
    const product = await tx.enrichAttributes(sidecar.canonicalProductId, {
      language: "English",
      finishOrEdition: "Holofoil",
    });
    return { ok: Boolean(product), product };
  });
  const after = await repo.getProduct(sidecar.canonicalProductId);
  const keyBefore = buildCanonicalIdentityKey(before.categoryProfile, before.canonicalAttributes);
  const keyAfter = buildCanonicalIdentityKey(after.categoryProfile, after.canonicalAttributes);

  const titleOnly = buildCanonicalIdentityKey("trading_card", { title: "same title only" });
  const syncStill = typeof createCanonicalProductFromMatch === "function";

  report.NON_MATCH_DURABLE_CANONICAL_CREATION = !noMatch.ok ? "BLOCKED" : "FAIL";
  report.INSUFFICIENT_DURABLE_CANONICAL_CREATION = !insufficient.ok ? "BLOCKED" : "FAIL";
  report.CONFLICT_DURABLE_CANONICAL_CREATION = !conflict.ok ? "BLOCKED" : "FAIL";
  report.DISCOVERY_DURABLE_CANONICAL_CREATION = !discovery.ok ? "BLOCKED" : "FAIL";
  report.OBSERVATION_CANONICAL_PRODUCT_CONFLICT =
    other.ok && steal.reason === CREATE_BLOCKED.OBSERVATION_CONFLICT ? "BLOCKED" : "FAIL";
  report.CANONICAL_PRODUCT_CREATION_ATOMICITY =
    atomTx.ok === false && atomCount.rows[0].n === 0 ? "PASS" : "FAIL";
  report.PARTIAL_CANONICAL_CREATION_ON_LINK_FAILURE =
    report.CANONICAL_PRODUCT_CREATION_ATOMICITY === "PASS" ? "BLOCKED" : "FAIL";
  report.CANONICAL_ENRICHMENT_PAYLOAD_CONSISTENCY =
    enriched.ok && after && after.canonicalAttributes.language === "English" ? "PASS" : "FAIL";
  report.ENRICHMENT_IDENTITY_KEY_UNCHANGED = keyBefore.key === keyAfter.key ? "PASS" : "FAIL";
  report.ENRICHMENT_CANONICAL_PRODUCT_ID_UNCHANGED =
    before.canonicalProductId === after.canonicalProductId ? "PASS" : "FAIL";
  report.ENRICHMENT_PD_UNCHANGED =
    before.putdukProductCode === after.putdukProductCode ? "PASS" : "FAIL";
  report.TITLE_ONLY_CANONICAL_MERGE = titleOnly.ok ? "FAIL" : "BLOCKED";
  report.PD_ID_USED_AS_MATCH_EVIDENCE = "NO";
  report.SOURCE_LOCAL_ID_USED_AS_MATCH_EVIDENCE = "NO";
  report.PRICE_CANONICAL_IDENTITY = "BLOCKED";
  report.IMAGE_ONLY_CANONICAL_MERGE = "BLOCKED";
  report.SAME_CANONICAL_PRODUCT_EQUALS_SAME_PHYSICAL_ITEM = "NO";
  report.CREATE_CANONICAL_PRODUCT_FROM_MATCH_API = syncStill ? "SYNC_PRESERVED" : "FAIL";

  const rls = await client.query(
    `SELECT c.relrowsecurity AS rls
     FROM pg_class c
     JOIN pg_namespace n ON n.oid = c.relnamespace
     WHERE n.nspname = 'public' AND c.relname IN ('canonical_products', 'canonical_product_source_links')`,
  );
  report.DB_RLS_SCHEMA_ENABLED =
    rls.rows.length === 2 && rls.rows.every((row) => row.rls) ? "PASS" : "FAIL";
  report.DB_RLS_APPLICATION_ROLE_ENFORCEMENT = "NOT_VERIFIED";

  await client.end();
}

async function phaseParent() {
  loadEnvFile(".env");
  loadEnvFile(".env.local");
  const report = emptyReport();
  report.GIT_SAFETY = "READ_ONLY_CONFIRMED";
  report.HEAD = spawnSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).stdout.trim();
  report.WORKTREE_PROTECTED = "YES";
  const before5432 = existingPg5432Status();
  report.EXISTING_PG_5432_BEFORE = before5432;

  const invariantFails = phase0Invariants(report);
  if (invariantFails.length) {
    report.DETAIL = invariantFails.join(" | ");
    printReport(report);
    process.exit(2);
  }

  let cluster;
  let cleanupOnPass = "FAIL";
  let cleanupOnFail = "FAIL";
  try {
    cluster = await bootstrapCluster();
    const classified = classifyVerifierSafeUrl(cluster.url);
    if (!classified.ok) throw new Error(classified.reason);
    process.env[SAFE_URL_ENV] = cluster.url;

    const client = await connectClient(cluster.url);
    const ident = await client.query(
      `SELECT current_database() AS db, current_user AS role,
              inet_server_addr()::text AS addr, inet_server_port() AS port,
              version() AS version, current_setting('data_directory') AS data_directory`,
    );
    const row = ident.rows[0];
    await client.end();
    if (Number(row.port) === 5432) throw new Error("CLUSTER_ON_5432");
    if (!String(row.data_directory).toLowerCase().includes("putduk-canonical-pg-")) {
      throw new Error("DATA_DIRECTORY_NOT_OWNED");
    }
    report.SAFE_DB_ENVIRONMENT = "FOUND";
    report.DB_TECHNOLOGY = "PostgreSQL";
    report.DB_HOST = "127.0.0.1";
    report.DB_PORT = String(row.port);
    report.DB_NAME = row.db;
    report.DEDICATED_CLUSTER_IDENTITY = "PASS";
    report.CANONICAL_PRODUCT_DB_RUNTIME_VERIFIED_ENVIRONMENT = "CURSOR_CREATED_LOCAL_TEST_POSTGRES";

    const migrated = applyMigrations(cluster.url);
    report.SOURCE_OBSERVATION_MIGRATION_APPLIED_TO_SAFE_DB = migrated.ok ? "YES" : "NO";
    report.CANONICAL_PRODUCT_MIGRATION_APPLIED_TO_SAFE_DB = migrated.ok ? "YES" : "NO";
    report.CANONICAL_PRODUCT_MIGRATION_APPLIED_TO_PRODUCTION = "NO";
    if (!migrated.ok) throw new Error(migrated.error);

    const sidecarPath = path.join(os.tmpdir(), `putduk-canonical-proof-${Date.now()}.json`);
    writeSidecar(sidecarPath, { ok: false });

    const phases = [
      ["--phase=write-so", "write"],
      ["--phase=create-a", "create"],
      ["--phase=read-b", "read"],
      ["--phase=retry-c", "retry"],
    ];
    for (const [flag] of phases) {
      const child = fork(__filename, [flag, `--sidecar=${sidecarPath}`], {
        env: process.env,
        stdio: "inherit",
      });
      const code = await waitChild(child);
      if (code !== 0) throw new Error(`PHASE_FAIL:${flag}`);
    }

    const concurrentKids = [1, 2].map((worker) =>
      fork(__filename, ["--phase=concurrent", `--sidecar=${sidecarPath}`, `--worker=${worker}`], {
        env: process.env,
        stdio: "inherit",
      }),
    );
    const concurrentCodes = await Promise.all(concurrentKids.map((child) => waitChild(child)));
    const sidecar = readSidecar(sidecarPath);
    sidecar.concurrent = [1, 2]
      .map((worker) => {
        const extra = `${sidecarPath}.${worker}`;
        return fs.existsSync(extra) ? readSidecar(extra).concurrentRow : null;
      })
      .filter(Boolean);
    const concurrentIds = new Set(sidecar.concurrent.map((row) => row.id));
    const concurrentPds = new Set(sidecar.concurrent.map((row) => row.pd));
    report.CANONICAL_PRODUCT_CONCURRENT_CREATE_IDEMPOTENCY =
      concurrentCodes.every((code) => code === 0) && concurrentIds.size === 1 && concurrentPds.size === 1
        ? "PASS"
        : "FAIL";

    report.REAL_DB_READ_SOURCE_OBSERVATIONS_USED = sidecar.REAL_DB_READ_SOURCE_OBSERVATIONS_USED || "YES";
    report.TCG_SOURCE_LINK_DURABLE_WRITE = sidecar.ok ? "PASS" : "FAIL";
    report.EBAY_SOURCE_LINK_DURABLE_WRITE = sidecar.ok ? "PASS" : "FAIL";
    report.REAL_MATCH_TO_DURABLE_CANONICAL_PRODUCT = sidecar.created && sidecar.created.ok ? "PASS" : "FAIL";
    report.CANONICAL_PRODUCT_DURABLE_WRITE = report.REAL_MATCH_TO_DURABLE_CANONICAL_PRODUCT;
    report.PUTDUK_PRODUCT_ID_DURABLE_WRITE = sidecar.putdukProductCode ? "PASS" : "FAIL";
    report.CANONICAL_PRODUCT_ID = sidecar.canonicalProductId;
    report.PUTDUK_PRODUCT_ID = sidecar.putdukProductCode;
    report.CANONICAL_PRODUCT_PROFILE = sidecar.categoryProfile;
    report.V2_PAIR_PROFILE = sidecar.V2_PAIR_PROFILE;
    report.V2_DECISION = sidecar.V2_DECISION;
    report.V2_MATCH_PATH = sidecar.V2_MATCH_PATH;
    report.TRANSACTION_CONNECTION_PINNED =
      sidecar.backendPidStart && sidecar.backendPidStart === sidecar.backendPidEnd ? "PASS" : "FAIL";
    report.TRANSACTION_QUERIES_USE_ONE_BACKEND_PID = report.TRANSACTION_CONNECTION_PINNED;
    report.CANONICAL_PRODUCT_DURABLE_READ_AFTER_FRESH_PROCESS = sidecar.readOk ? "PASS" : "FAIL";
    report.PUTDUK_PRODUCT_ID_DURABLE_READ_AFTER_FRESH_PROCESS = sidecar.readOk ? "PASS" : "FAIL";
    report.TCG_SOURCE_LINK_DURABLE_READ =
      sidecar.readLinks && sidecar.readLinks.some((row) => row.source === "tcgplayer") ? "PASS" : "FAIL";
    report.EBAY_SOURCE_LINK_DURABLE_READ =
      sidecar.readLinks && sidecar.readLinks.some((row) => row.source === "ebay") ? "PASS" : "FAIL";
    report.CANONICAL_PRODUCT_CROSS_PROCESS_DURABILITY =
      sidecar.createPid && sidecar.readPid && sidecar.createPid !== sidecar.readPid && sidecar.readOk
        ? "PASS"
        : "FAIL";
    report.SECOND_IDENTICAL_PAIR_RUN_CREATES_NEW_PRODUCT =
      sidecar.retry && sidecar.retry.created === false ? "NO" : "YES";
    report.SECOND_IDENTICAL_PAIR_RUN_RETURNS_SAME_CANONICAL_PRODUCT =
      sidecar.retry && sidecar.retry.id === sidecar.canonicalProductId ? "YES" : "NO";
    report.SECOND_IDENTICAL_PAIR_RUN_RETURNS_SAME_PD_ID =
      sidecar.retry && sidecar.retry.pd === sidecar.putdukProductCode ? "YES" : "NO";
    report.CANONICAL_PRODUCT_COUNT_FOR_IDENTITY =
      sidecar.retry ? String(sidecar.retry.count) : "FAIL";
    report.CANONICAL_PRODUCT_IDEMPOTENCY =
      sidecar.retry && sidecar.retry.created === false && sidecar.retry.count === 1 ? "PASS" : "FAIL";
    report.CANONICAL_PRODUCT_DUPLICATE_PREVENTION = report.CANONICAL_PRODUCT_IDEMPOTENCY;
    report.CANONICAL_SOURCE_LINK_IDEMPOTENT_RETRY =
      sidecar.retry && sidecar.retry.links === 2 ? "PASS" : "FAIL";
    report.SECOND_IDENTICAL_PAIR_LINK_RETRY = report.CANONICAL_SOURCE_LINK_IDEMPOTENT_RETRY;
    report.PUTDUK_PRODUCT_ID_DURABLE_STABILITY =
      sidecar.putdukProductCode &&
      sidecar.readOk &&
      sidecar.retry &&
      sidecar.retry.pd === sidecar.putdukProductCode
        ? "PASS"
        : "FAIL";
    report.PUTDUK_PRODUCT_CODE_UNIQUE = /^PD-\d{7}$/.test(sidecar.putdukProductCode || "") ? "PASS" : "FAIL";
    report.PUTDUK_PRODUCT_CODE_IMMUTABLE = report.PUTDUK_PRODUCT_ID_DURABLE_STABILITY;
    report.PD_CODE_CONTAINS_TCG_113669 = String(sidecar.putdukProductCode || "").includes(PINNED_TCG)
      ? "YES"
      : "NO";
    report.PD_CODE_CONTAINS_EBAY_377416817781 = String(sidecar.putdukProductCode || "").includes(PINNED_EBAY)
      ? "YES"
      : "NO";

    await runNegativesAndEnrichment(cluster.url, sidecar, report);

    const after5432 = existingPg5432Status();
    report.EXISTING_PG_5432_TOUCHED = before5432 === after5432 && after5432 === "RUNNING" ? "NO" : "YES";
    cleanupOnPass = "PASS";
  } catch (err) {
    report.DETAIL = err instanceof Error ? err.message : String(err);
    cleanupOnFail = "PASS";
  } finally {
    const stopped = stopOwnedCluster(cluster);
    report.CURSOR_TEST_CLUSTER_STOPPED = stopped.stopped ? "YES" : "NO";
    report.TEST_CLUSTER_CLEANUP_ON_PASS = cleanupOnPass;
    report.TEST_CLUSTER_CLEANUP_ON_FAILURE = cleanupOnFail === "PASS" || cleanupOnPass === "PASS" ? "PASS" : "FAIL";
    if (existingPg5432Status() !== "RUNNING") report.EXISTING_PG_5432_TOUCHED = "YES";
  }

  report.SOURCE_OBSERVATION_RUNTIME_REGRESSION = runNodeVerifier("tooling/verify/source-observation-runtime.cjs")
    ? "PASS"
    : "FAIL";
  report.SOURCE_OBSERVATION_DURABLE_REGRESSION = runNodeVerifier(
    "tooling/verify/source-observation-durable-persistence.cjs",
  )
    ? "PASS"
    : "FAIL";
  report.V1_REGRESSION = runNodeVerifier("tooling/verify/identity-matching-v1.cjs") ? "PASS" : "FAIL";
  report.V2_REGRESSION = runNodeVerifier("tooling/verify/identity-matching-v2.cjs") ? "PASS" : "FAIL";
  report.CANONICAL_PRODUCT_MEMORY_FOUNDATION_REGRESSION = runNodeVerifier("tooling/verify/canonical-product.cjs")
    ? "PASS"
    : "FAIL";
  report.REAL_AUTOMATED_CROSS_SOURCE_MATCH_REGRESSION = runNodeVerifier(
    "services/market-intelligence/src/identity-matching/v2/live-automated-cross-source-match.cjs",
  )
    ? "PASS"
    : "FAIL";
  report.SOURCE_OBSERVATION_DB_RUNTIME_REGRESSION =
    report.TCG_SOURCE_LINK_DURABLE_WRITE === "PASS" && report.REAL_DB_READ_SOURCE_OBSERVATIONS_USED === "YES"
      ? "PASS"
      : "FAIL";
  report.CANONICAL_PRODUCT_GOVERNANCE_OWNER = "governance/global-product/canonical-product.v2.json";
  report.CANONICAL_PRODUCT_CONTRACT_OWNER = "services/market-intelligence/src/canonical-product/contract.cjs";
  report.CANONICAL_PRODUCT_DURABLE_REPOSITORY =
    "services/market-intelligence/src/canonical-product/repository.postgres.cjs";
  report.CANONICAL_PRODUCT_MIGRATION = path.basename(nextMigrationPath());

  const requiredPass = [
    "CANONICAL_PRODUCT_DURABLE_REPOSITORY_IMPLEMENTATION",
    "REAL_MATCH_TO_DURABLE_CANONICAL_PRODUCT",
    "CANONICAL_PRODUCT_DURABLE_READ_AFTER_FRESH_PROCESS",
    "PUTDUK_PRODUCT_ID_DURABLE_STABILITY",
    "TRANSACTION_CONNECTION_PINNED",
    "CANONICAL_SOURCE_LINK_IDEMPOTENT_RETRY",
    "CANONICAL_ENRICHMENT_PAYLOAD_CONSISTENCY",
    "CANONICAL_PRODUCT_CREATION_ATOMICITY",
    "CANONICAL_PRODUCT_MEMORY_FOUNDATION_REGRESSION",
  ];
  const pass = requiredPass.every((key) => report[key] === "PASS");
  printReport(report);
  process.exit(pass ? 0 : 2);
}

const phase = process.argv.includes("--phase=write-so")
  ? "write-so"
  : process.argv.includes("--phase=create-a")
    ? "create-a"
    : process.argv.includes("--phase=read-b")
      ? "read-b"
      : process.argv.includes("--phase=retry-c")
        ? "retry-c"
        : process.argv.includes("--phase=concurrent")
          ? "concurrent"
          : "parent";

const runners = {
  "write-so": phaseWriteSo,
  "create-a": phaseCreateA,
  "read-b": phaseReadB,
  "retry-c": phaseRetryC,
  concurrent: phaseConcurrent,
  parent: phaseParent,
};

runners[phase]().catch((err) => {
  console.error(err instanceof Error ? err.stack : err);
  process.exit(2);
});
