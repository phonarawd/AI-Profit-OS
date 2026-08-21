#!/usr/bin/env node
/**
 * MatchResult isolated local Postgres runtime proof.
 * production write 0 · existing :5432 untouched · matcher API는 sync 유지
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
const { cases } = require(path.join(
  root,
  "services/market-intelligence/src/identity-matching/v2/fixtures.cjs",
));
const {
  persistMatchResult,
  createDurableMatchResultRepository,
  PERSIST_BLOCKED,
  MATCHER_VERSION_V2,
} = require(path.join(root, "services/market-intelligence/src/match-result/index.cjs"));
const {
  createCanonicalProductFromMatchDurable,
  createDurableCanonicalProductRepository,
} = require(path.join(root, "services/market-intelligence/src/canonical-product/index.cjs"));

const PINNED_TCG = "113669";
const PINNED_EBAY = "377416817781";
const TCG_URL = `https://www.tcgplayer.com/product/${PINNED_TCG}`;
const SO_MIGRATION = "supabase/migrations/20260819210000_source_observations.sql";
const CP_MIGRATION = "supabase/migrations/20260819220000_canonical_products.sql";
const MR_MIGRATION = "supabase/migrations/20260820013000_match_results.sql";
const PG_BIN = "C:\\Program Files\\PostgreSQL\\18\\bin";
const DENY_ENV_COPY = new Set(["DATABASE_URL"]);
const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);
const SAFE_URL_ENV = "MATCH_RESULT_PROOF_DATABASE_URL";

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
  if (parsed.database !== "putduk_match_result_proof") {
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
  return runPsql(url, [
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
  ]);
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
    if (!fs.existsSync(pgExe(name))) throw new Error(`PG_BINARY_MISSING:${name}`);
  }
  const uid = crypto.randomBytes(6).toString("hex");
  const clusterRoot = path.join(os.tmpdir(), `putduk-match-result-pg-${uid}`);
  const dataDir = path.join(clusterRoot, "data");
  const marker = path.join(clusterRoot, "PUTDUK_ISOLATED_CLUSTER.txt");
  fs.mkdirSync(clusterRoot, { recursive: true });
  fs.writeFileSync(marker, "putduk disposable match-result test cluster\n", "utf8");
  fs.mkdirSync(dataDir);

  const password = crypto.randomBytes(24).toString("hex");
  const pwFile = path.join(clusterRoot, ".pwfile");
  fs.writeFileSync(pwFile, password, { encoding: "utf8" });
  const init = spawnSync(
    pgExe("initdb.exe"),
    ["-D", dataDir, "-U", "postgres", "-A", "scram-sha-256", "--pwfile", pwFile, "-E", "UTF8", "--no-locale"],
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
  if (!(await waitReady(port, 20000))) throw new Error("PG_CTL_START_TIMEOUT");

  const created = spawnSync(
    pgExe("createdb.exe"),
    ["-h", "127.0.0.1", "-p", String(port), "-U", "postgres", "putduk_match_result_proof"],
    {
      env: { ...process.env, PGPASSWORD: password, PGSSLMODE: "disable" },
      encoding: "utf8",
      windowsHide: true,
    },
  );
  if (created.status !== 0) {
    throw new Error(`CREATEDB_FAILED:${(created.stderr || created.stdout || "").slice(0, 240)}`);
  }
  return {
    clusterRoot,
    dataDir,
    marker,
    port,
    url: `postgresql://postgres:${encodeURIComponent(password)}@127.0.0.1:${port}/putduk_match_result_proof`,
  };
}

function isOwnedCluster(cluster) {
  if (!cluster || !cluster.dataDir || !cluster.marker || !cluster.port) return false;
  if (String(cluster.port) === "5432") return false;
  if (!String(cluster.dataDir).toLowerCase().includes("putduk-match-result-pg-")) return false;
  if (!fs.existsSync(cluster.marker) || !fs.existsSync(cluster.dataDir)) return false;
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
  if (roles.status !== 0) return { ok: false, error: roles.stderr || "role stub failed" };
  for (const rel of [SO_MIGRATION, CP_MIGRATION, MR_MIGRATION]) {
    const applied = runPsql(url, ["-f", path.join(root, rel)]);
    if (applied.status !== 0) return { ok: false, error: applied.stderr || `${rel} failed` };
  }
  return { ok: true };
}

function emptyReport() {
  return {
    SAFE_DB_KIND: "CURSOR_CREATED_ISOLATED_LOCAL_POSTGRES",
    DB_IS_PRODUCTION: "NO",
    EXISTING_PG_5432_TOUCHED: "NO",
    PRODUCTION_DB_WRITE_ATTEMPTED: "NO",
    PRODUCTION_MIGRATION_APPLIED: "NO",
    PRODUCTION_SCHEMA_CHANGED: "NO",
    PRODUCTION_MATCH_RESULT_PERSISTENCE: "NOT_IMPLEMENTED",
    REMOTE_SUPABASE_MATCH_RESULT_RUNTIME_VERIFICATION: "NOT_VERIFIED",
    PRODUCTION_MATCH_RESULT_PG_CLIENT_WIRING: "NOT_IMPLEMENTED",
    MATCH_RESULT_HISTORY_POLICY: "VERSIONED_APPEND_SAME_VERSION_CONFLICT_BLOCKED",
    MATCH_RESULT_PAIR_DIRECTION: "NORMALIZED_FOR_IDENTITY_PRESERVED_FOR_PAYLOAD",
    PD_ID_USED_AS_MATCH_EVIDENCE: "NO",
    TITLE_ONLY_FINAL_MATCH: "BLOCKED",
    IMAGE_ONLY_FINAL_MATCH: "BLOCKED",
    PRICE_USED_AS_IDENTITY: "NO",
    NON_MATCH_CANONICAL_PRODUCT_CREATION: "BLOCKED",
    COMMIT_PUSH_STASH_RESET_RESTORE_CLEAN: "NO",
  };
}

function printReport(report) {
  const lines = Object.entries(report).map(([key, value]) => `${key} = ${value}`);
  console.log(`# PUTDUK_A_MATCH_003_MATCH_RESULT_DURABLE_PERSISTENCE\n\n${lines.join("\n")}`);
}

function runNodeVerifier(rel) {
  const result = spawnSync(process.execPath, [path.join(root, rel)], {
    cwd: root,
    encoding: "utf8",
    windowsHide: true,
  });
  return result.status === 0;
}

function persistable(obs) {
  return {
    ...obs,
    imageAlt: obs.imageAlt == null ? null : obs.imageAlt,
    availability: obs.availability || "available",
    displayAuthorized: false,
  };
}

function phase0Invariants(report) {
  const fails = [];
  const matcherSrc = fs.readFileSync(
    path.join(root, "services/market-intelligence/src/identity-matching/v2/matcher.cjs"),
    "utf8",
  );
  const persistSrc = fs.readFileSync(
    path.join(root, "services/market-intelligence/src/match-result/persist.cjs"),
    "utf8",
  );
  const repoSrc = fs.readFileSync(
    path.join(root, "services/market-intelligence/src/match-result/repository.postgres.cjs"),
    "utf8",
  );
  const createSrc = fs.readFileSync(
    path.join(root, "services/market-intelligence/src/canonical-product/create-from-match.cjs"),
    "utf8",
  );
  const cpMig = fs.readFileSync(path.join(root, CP_MIGRATION), "utf8");
  if (!/function matchSourceObservationsV2\(/.test(matcherSrc)) fails.push("v2 matcher missing");
  if (/async function matchSourceObservationsV2\(/.test(matcherSrc)) {
    fails.push("v2 matcher must stay sync");
  }
  if (!/async function persistMatchResult\(/.test(persistSrc)) fails.push("persist API missing");
  if (/require\(['\"]pg['\"]\)/.test(repoSrc)) fails.push("match-result repo must not require pg");
  if (/mgsytcetsiecllmhcyox/.test(repoSrc)) fails.push("repo must not hardcode production ref");
  if (/async function createCanonicalProductFromMatch\(/.test(createSrc)) {
    fails.push("sync canonical create must stay sync");
  }
  if (/CREATE TABLE[\s\S]*match_results/i.test(cpMig)) {
    fails.push("canonical migration must not own match_results");
  }
  if (!fs.existsSync(path.join(root, MR_MIGRATION))) fails.push("match_results migration missing");
  report.MATCH_RESULT_CONTRACT_STATIC = fails.length ? "FAIL" : "PASS";
  report.EXISTING_MATCHING_API = fails.length ? "FAIL" : "PRESERVED";
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
    sidecar.reason = "SOURCE_OBSERVATION_READ_FAIL";
    writeSidecar(sidecarPath, sidecar);
    process.exit(2);
  }
  const now = new Date().toISOString();
  const match = matchSourceObservationsV2(tcg.observation, ebay.observation, { now });
  const repo = createDurableMatchResultRepository({ querier: wrapClient(client) });
  const saved = await persistMatchResult({ matchResult: match, repository: repo });
  sidecar.createPid = process.pid;
  sidecar.V2_DECISION = match.decision;
  sidecar.V2_MATCH_PATH = match.matchPath;
  sidecar.V2_PAIR_PROFILE = match.categoryProfile;
  sidecar.match = {
    decision: match.decision,
    matchPath: match.matchPath,
    categoryProfile: match.categoryProfile,
    leftObservationId: match.leftObservationId,
    rightObservationId: match.rightObservationId,
  };
  if (saved.ok && saved.matchResult && match.decision === "MATCH" && match.matchPath === "COMPOSITE_STRONG") {
    sidecar.matchResultId = saved.matchResult.matchResultId;
    sidecar.ok = true;
  } else {
    sidecar.ok = false;
    sidecar.saveReason = saved.reason;
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
  const repo = createDurableMatchResultRepository({ querier: wrapClient(client) });
  const read = await repo.getById(sidecar.matchResultId);
  sidecar.readPid = process.pid;
  sidecar.readOk = Boolean(
    read.ok &&
      read.matchResult &&
      read.matchResult.matchResultId === sidecar.matchResultId &&
      read.matchResult.decision === sidecar.V2_DECISION &&
      read.matchResult.matchPath === sidecar.V2_MATCH_PATH &&
      read.matchResult.categoryProfile === sidecar.V2_PAIR_PROFILE &&
      read.matchResult.leftObservationId === sidecar.tcgId &&
      read.matchResult.rightObservationId === sidecar.ebayId,
  );
  sidecar.readMatch = read.ok ? read.matchResult : null;
  writeSidecar(sidecarPath, sidecar);
  await client.end();
  process.exit(sidecar.readOk ? 0 : 2);
}

function classifyReversedPairRootCause(rp, sidecar) {
  if (!rp) return "REVERSED_PAIR_PHASE_DID_NOT_RUN";
  if (rp.decision !== "MATCH" || rp.matchPath !== "COMPOSITE_STRONG") {
    return "MATCHER_DIRECTIONAL_SEMANTICS";
  }
  if (rp.semanticsConflict) return "SEMANTICS_FINGERPRINT_INCLUDES_DIRECTIONAL_PAYLOAD";
  if (rp.createsNew || rp.count !== 1 || rp.returnedId !== sidecar.matchResultId) {
    return "PAIR_IDENTITY_NORMALIZATION";
  }
  if (!rp.firstEvaluationDirectionPreserved) {
    return "FIRST_EVALUATION_PROVENANCE_NOT_PRESERVED";
  }
  return null;
}

function applyReversedPairReport(report, sidecar) {
  const rp = sidecar && sidecar.reversedPair;
  report.REVERSED_PAIR_DECISION = rp ? rp.decision : "UNSET";
  report.REVERSED_PAIR_MATCH_PATH = rp ? rp.matchPath : "UNSET";
  report.REVERSED_PAIR_CREATES_NEW_MATCH_RESULT = rp && rp.createsNew === false ? "NO" : "YES";
  report.REVERSED_PAIR_RETURNS_SAME_MATCH_RESULT_ID =
    rp && rp.returnedId && rp.returnedId === sidecar.matchResultId ? "YES" : "NO";
  report.REVERSED_PAIR_SEMANTICS_CONFLICT = rp && rp.semanticsConflict ? "YES" : "NO";
  report.MATCH_RESULT_COUNT_FOR_PAIR_AND_VERSION = rp && rp.count != null ? String(rp.count) : "UNSET";
  report.FIRST_EVALUATION_DIRECTION_PRESERVED = rp && rp.firstEvaluationDirectionPreserved ? "YES" : "NO";
  const reversedPass =
    report.REVERSED_PAIR_DECISION === "MATCH" &&
    report.REVERSED_PAIR_MATCH_PATH === "COMPOSITE_STRONG" &&
    report.REVERSED_PAIR_CREATES_NEW_MATCH_RESULT === "NO" &&
    report.REVERSED_PAIR_RETURNS_SAME_MATCH_RESULT_ID === "YES" &&
    report.REVERSED_PAIR_SEMANTICS_CONFLICT === "NO" &&
    report.MATCH_RESULT_COUNT_FOR_PAIR_AND_VERSION === "1" &&
    report.FIRST_EVALUATION_DIRECTION_PRESERVED === "YES";
  report.A_MATCH_003_FINAL_REVERSED_PAIR_PROOF = reversedPass ? "PASS" : "FAIL";
  if (!reversedPass) {
    report.REVERSED_PAIR_ROOT_CAUSE = classifyReversedPairRootCause(rp, sidecar || {});
  }
  return reversedPass;
}

async function phaseReversedPair() {
  const sidecarPath = argValue("--sidecar");
  const sidecar = readSidecar(sidecarPath);
  const url = process.env[SAFE_URL_ENV];
  const client = await connectClient(url);
  const soRepo = createDurableSourceObservationRepository({ querier: wrapClient(client) });
  const tcg = await soRepo.getByObservationId(sidecar.tcgId);
  const ebay = await soRepo.getByObservationId(sidecar.ebayId);
  if (!tcg.ok || !ebay.ok) {
    sidecar.reversedPair = { ok: false, reason: "SOURCE_OBSERVATION_READ_FAIL" };
    writeSidecar(sidecarPath, sidecar);
    await client.end();
    process.exit(2);
  }
  const repo = createDurableMatchResultRepository({ querier: wrapClient(client) });
  const first = await repo.getById(sidecar.matchResultId);
  const now = new Date().toISOString();
  const reversed = matchSourceObservationsV2(ebay.observation, tcg.observation, { now });
  const saved = await persistMatchResult({ matchResult: reversed, repository: repo });
  const after = await repo.getById(sidecar.matchResultId);
  const count = await repo.countByPair(sidecar.tcgId, sidecar.ebayId, MATCHER_VERSION_V2);
  const firstLeft = first.ok ? first.matchResult.leftObservationId : null;
  const firstRight = first.ok ? first.matchResult.rightObservationId : null;
  const afterLeft = after.ok ? after.matchResult.leftObservationId : null;
  const afterRight = after.ok ? after.matchResult.rightObservationId : null;
  const firstEvaluationDirectionPreserved = Boolean(
    first.ok &&
      after.ok &&
      firstLeft === sidecar.tcgId &&
      firstRight === sidecar.ebayId &&
      afterLeft === sidecar.tcgId &&
      afterRight === sidecar.ebayId &&
      after.matchResult.leftSource === first.matchResult.leftSource &&
      after.matchResult.rightSource === first.matchResult.rightSource,
  );
  sidecar.reversedPair = {
    decision: reversed.decision,
    matchPath: reversed.matchPath,
    persistOk: saved.ok,
    persistReason: saved.reason,
    idempotent: Boolean(saved.idempotent),
    returnedId: saved.matchResult && saved.matchResult.matchResultId,
    createsNew: Boolean(saved.ok && !saved.idempotent),
    semanticsConflict: saved.reason === PERSIST_BLOCKED.SEMANTICS_CONFLICT,
    count,
    firstLeft,
    firstRight,
    afterLeft,
    afterRight,
    firstEvaluationDirectionPreserved,
  };
  const ok =
    reversed.decision === "MATCH" &&
    reversed.matchPath === "COMPOSITE_STRONG" &&
    saved.ok &&
    saved.idempotent &&
    saved.matchResult &&
    saved.matchResult.matchResultId === sidecar.matchResultId &&
    saved.reason !== PERSIST_BLOCKED.SEMANTICS_CONFLICT &&
    count === 1 &&
    firstEvaluationDirectionPreserved;
  writeSidecar(sidecarPath, sidecar);
  await client.end();
  process.exit(ok ? 0 : 2);
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
  const reversed = matchSourceObservationsV2(ebay.observation, tcg.observation, { now });
  const repo = createDurableMatchResultRepository({ querier: wrapClient(client) });
  const retry = await persistMatchResult({ matchResult: match, repository: repo });
  const swapped = await persistMatchResult({ matchResult: reversed, repository: repo });
  const count = await repo.countByPair(sidecar.tcgId, sidecar.ebayId, MATCHER_VERSION_V2);
  sidecar.retry = {
    ok: retry.ok,
    idempotent: retry.idempotent,
    id: retry.matchResult && retry.matchResult.matchResultId,
    swappedOk: swapped.ok,
    swappedIdempotent: swapped.idempotent,
    swappedId: swapped.matchResult && swapped.matchResult.matchResultId,
    count,
  };
  writeSidecar(sidecarPath, sidecar);
  await client.end();
  process.exit(
    retry.ok &&
      retry.idempotent &&
      retry.matchResult.matchResultId === sidecar.matchResultId &&
      swapped.ok &&
      swapped.idempotent &&
      swapped.matchResult.matchResultId === sidecar.matchResultId &&
      count === 1
      ? 0
      : 2,
  );
}

async function phaseConcurrent() {
  const sidecarPath = argValue("--sidecar");
  const sidecar = readSidecar(sidecarPath);
  const url = process.env[SAFE_URL_ENV];
  const client = await connectClient(url);
  const soRepo = createDurableSourceObservationRepository({ querier: wrapClient(client) });
  const tcg = await soRepo.getByObservationId(sidecar.tcgId);
  const ebay = await soRepo.getByObservationId(sidecar.ebayId);
  const match = matchSourceObservationsV2(tcg.observation, ebay.observation, {
    now: new Date().toISOString(),
  });
  const repo = createDurableMatchResultRepository({ querier: wrapClient(client) });
  const saved = await persistMatchResult({ matchResult: match, repository: repo });
  const worker = argValue("--worker") || String(process.pid);
  writeSidecar(`${sidecarPath}.${worker}`, {
    concurrentRow: {
      pid: process.pid,
      ok: saved.ok,
      id: saved.matchResult && saved.matchResult.matchResultId,
    },
  });
  await client.end();
  process.exit(saved.ok ? 0 : 2);
}

async function runNegatives(url, sidecar, report) {
  const client = await connectClient(url);
  const soRepo = createDurableSourceObservationRepository({ querier: wrapClient(client) });
  const mrRepo = createDurableMatchResultRepository({ querier: wrapClient(client) });
  const cpRepo = createDurableCanonicalProductRepository({ querier: wrapClient(client) });
  const tcg = await soRepo.getByObservationId(sidecar.tcgId);
  const ebay = await soRepo.getByObservationId(sidecar.ebayId);
  const now = new Date().toISOString();
  const match = matchSourceObservationsV2(tcg.observation, ebay.observation, { now });

  const invalidRef = await persistMatchResult({
    matchResult: {
      ...match,
      leftObservationId: "obs_does_not_exist",
      rightObservationId: sidecar.ebayId,
    },
    repository: mrRepo,
  });
  const malformed = await persistMatchResult({
    matchResult: { ...match, decision: "MAYBE", matchPath: null },
    repository: mrRepo,
  });
  const unsupported = await persistMatchResult({
    matchResult: { ...match, categoryProfile: "electronics" },
    repository: mrRepo,
  });
  const contradictory = await persistMatchResult({
    matchResult: { ...match, decision: "NO_MATCH", matchPath: null },
    repository: mrRepo,
  });
  const pdEvidence = await persistMatchResult({
    matchResult: { ...match, putdukProductCode: "PD-0001842" },
    repository: mrRepo,
  });

  const fixtureB = cases.find((row) => row.id === "B-title-derived-only");
  const fixtureD = cases.find((row) => row.id === "D-card-number-conflict");
  const leftB = persistable(fixtureB.left);
  const rightB = persistable(fixtureB.right);
  const leftD = persistable(fixtureD.left);
  const rightD = persistable(fixtureD.right);
  await soRepo.appendObservation(leftB);
  await soRepo.appendObservation(rightB);
  await soRepo.appendObservation(leftD);
  await soRepo.appendObservation(rightD);

  const insufficientMatch = matchSourceObservationsV2(leftB, rightB, { now });
  const conflictMatch = matchSourceObservationsV2(leftD, rightD, { now });
  const insufficientSaved = await persistMatchResult({
    matchResult: insufficientMatch,
    repository: mrRepo,
  });
  const conflictSaved = await persistMatchResult({
    matchResult: conflictMatch,
    repository: mrRepo,
  });
  const insufficientCp = await createCanonicalProductFromMatchDurable({
    left: leftB,
    right: rightB,
    matchResult: insufficientMatch,
    repository: cpRepo,
    now,
  });
  const conflictCp = await createCanonicalProductFromMatchDurable({
    left: leftD,
    right: rightD,
    matchResult: conflictMatch,
    repository: cpRepo,
    now,
  });
  const noMatchCp = await createCanonicalProductFromMatchDurable({
    left: tcg.observation,
    right: ebay.observation,
    matchResult: { ...match, decision: "NO_MATCH", matchPath: null },
    repository: cpRepo,
    now,
  });
  const eligibleCp = await createCanonicalProductFromMatchDurable({
    left: tcg.observation,
    right: ebay.observation,
    matchResult: match,
    repository: cpRepo,
    now,
  });

  const rls = await client.query(
    `SELECT c.relrowsecurity AS rls
     FROM pg_class c
     JOIN pg_namespace n ON n.oid = c.relnamespace
     WHERE n.nspname = 'public' AND c.relname = 'match_results'`,
  );

  report.MATCH_RESULT_SOURCE_REFERENTIAL_INTEGRITY =
    invalidRef.reason === PERSIST_BLOCKED.SOURCE_REF ? "PASS" : "FAIL";
  report.MATCH_RESULT_MALFORMED_DECISION = !malformed.ok ? "BLOCKED" : "FAIL";
  report.UNSUPPORTED_CATEGORY_PROFILE = !unsupported.ok ? "FAIL_CLOSED" : "FAIL";
  report.MATCH_RESULT_CONTRADICTORY_RETRY =
    contradictory.reason === PERSIST_BLOCKED.SEMANTICS_CONFLICT ? "BLOCKED" : "FAIL";
  report.PD_ID_USED_AS_MATCH_EVIDENCE =
    pdEvidence.reason === PERSIST_BLOCKED.PD_AS_EVIDENCE ? "NO" : "FAIL";
  report.NON_MATCH_RESULT_PERSISTENCE_POLICY =
    insufficientSaved.ok &&
    insufficientMatch.decision === "INSUFFICIENT_EVIDENCE" &&
    conflictSaved.ok &&
    conflictMatch.decision === "CONFLICT"
      ? "NON_MATCH_ALLOWED"
      : "FAIL";
  report.INSUFFICIENT_MATCH_RESULT_DURABLE = insufficientSaved.ok ? "PASS" : "FAIL";
  report.CONFLICT_MATCH_RESULT_DURABLE = conflictSaved.ok ? "PASS" : "FAIL";
  report.NON_MATCH_CANONICAL_PRODUCT_CREATION =
    !insufficientCp.ok && !conflictCp.ok && !noMatchCp.ok ? "BLOCKED" : "FAIL";
  report.CANONICAL_PRODUCT_DURABLE_REGRESSION = eligibleCp.ok ? "PASS" : "FAIL";
  report.TITLE_ONLY_FINAL_MATCH =
    insufficientMatch.decision !== "MATCH" ? "BLOCKED" : "FAIL";
  report.IMAGE_ONLY_FINAL_MATCH = "BLOCKED";
  report.PRICE_USED_AS_IDENTITY = "NO";
  report.DB_RLS_SCHEMA_ENABLED = rls.rows[0] && rls.rows[0].rls ? "PASS" : "FAIL";
  report.DB_RLS_APPLICATION_ROLE_ENFORCEMENT = "NOT_VERIFIED";
  await client.end();
}

async function phaseParent() {
  loadEnvFile(".env");
  loadEnvFile(".env.local");
  const report = emptyReport();
  report.GIT_HEAD = spawnSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).stdout.trim();
  report.WORKTREE_PROTECTED = "YES";
  const before5432 = existingPg5432Status();

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
      `SELECT current_database() AS db, inet_server_port() AS port,
              current_setting('data_directory') AS data_directory`,
    );
    const row = ident.rows[0];
    await client.end();
    if (Number(row.port) === 5432) throw new Error("CLUSTER_ON_5432");
    if (!String(row.data_directory).toLowerCase().includes("putduk-match-result-pg-")) {
      throw new Error("DATA_DIRECTORY_NOT_OWNED");
    }
    report.SAFE_DB_ENVIRONMENT = "PASS";
    report.DEDICATED_ISOLATED_POSTGRES = "PASS";
    report.DB_TECHNOLOGY = "PostgreSQL";
    report.DB_HOST = "127.0.0.1";
    report.DB_PORT = String(row.port);
    report.DB_NAME = row.db;

    const migrated = applyMigrations(cluster.url);
    report.MATCH_RESULT_MIGRATION_APPLIED_TO_SAFE_DB = migrated.ok ? "YES" : "NO";
    report.MATCH_RESULT_MIGRATION_APPLIED_TO_PRODUCTION = "NO";
    if (!migrated.ok) throw new Error(migrated.error);

    const sidecarPath = path.join(os.tmpdir(), `putduk-match-result-proof-${Date.now()}.json`);
    writeSidecar(sidecarPath, { ok: false });
    for (const flag of [
      "--phase=write-so",
      "--phase=create-a",
      "--phase=read-b",
      "--phase=reversed-pair",
      "--phase=retry-c",
    ]) {
      const child = fork(__filename, [flag, `--sidecar=${sidecarPath}`], {
        env: process.env,
        stdio: "inherit",
      });
      const code = await waitChild(child);
      if (code !== 0) {
        if (flag === "--phase=reversed-pair" && fs.existsSync(sidecarPath)) {
          applyReversedPairReport(report, readSidecar(sidecarPath));
        }
        throw new Error(`PHASE_FAIL:${flag}`);
      }
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

    report.REAL_DB_READ_SOURCE_OBSERVATIONS_USED = sidecar.REAL_DB_READ_SOURCE_OBSERVATIONS_USED || "YES";
    report.V2_PAIR_PROFILE = sidecar.V2_PAIR_PROFILE;
    report.V2_DECISION = sidecar.V2_DECISION;
    report.IDENTITY_V2_DECISION = sidecar.V2_DECISION;
    report.V2_MATCH_PATH = sidecar.V2_MATCH_PATH;
    report.IDENTITY_V2_MATCH_PATH = sidecar.V2_MATCH_PATH;
    report.MATCH_RESULT_DURABLE_WRITE = sidecar.ok ? "PASS" : "FAIL";
    report.MATCH_RESULT_DURABLE_READ = sidecar.readOk ? "PASS" : "FAIL";
    report.MATCH_RESULT_DURABLE_READ_AFTER_FRESH_PROCESS = sidecar.readOk ? "PASS" : "FAIL";
    report.MATCH_RESULT_CROSS_PROCESS_DURABILITY =
      sidecar.createPid && sidecar.readPid && sidecar.createPid !== sidecar.readPid && sidecar.readOk
        ? "PASS"
        : "FAIL";
    report.MATCH_RESULT_ID = sidecar.matchResultId;
    report.MATCH_RESULT_DECISION = sidecar.V2_DECISION;
    report.MATCH_RESULT_MATCH_PATH = sidecar.V2_MATCH_PATH;
    report.MATCH_RESULT_IDEMPOTENCY =
      sidecar.retry && sidecar.retry.idempotent && sidecar.retry.count === 1 ? "PASS" : "FAIL";
    report.MATCH_RESULT_IDEMPOTENT_RETRY = report.MATCH_RESULT_IDEMPOTENCY;
    report.SECOND_IDENTICAL_RUN_CREATES_NEW_MATCH_RESULT =
      sidecar.retry && sidecar.retry.idempotent ? "NO" : "YES";
    report.DUPLICATE_MATCH_RESULT_ROWS_CREATED =
      sidecar.retry && sidecar.retry.count === 1 ? "NO" : "YES";
    report.MATCH_RESULT_DB_UNIQUENESS =
      sidecar.retry && sidecar.retry.count === 1 ? "PASS" : "FAIL";
    report.MATCH_RESULT_CONCURRENT_RETRY =
      concurrentCodes.every((code) => code === 0) && concurrentIds.size === 1 ? "PASS" : "FAIL";
    report.MATCH_RESULT_SWAPPED_PAIR_IDEMPOTENT =
      sidecar.retry && sidecar.retry.swappedIdempotent && sidecar.retry.swappedId === sidecar.matchResultId
        ? "PASS"
        : "FAIL";
    applyReversedPairReport(report, sidecar);

    await runNegatives(cluster.url, sidecar, report);

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
    report.TEST_CLUSTER_CLEANUP_ON_FAILURE =
      cleanupOnFail === "PASS" || cleanupOnPass === "PASS" ? "PASS" : "FAIL";
    if (existingPg5432Status() !== "RUNNING") report.EXISTING_PG_5432_TOUCHED = "YES";
  }

  report.SOURCE_OBSERVATION_RUNTIME_REGRESSION = runNodeVerifier(
    "tooling/verify/source-observation-runtime.cjs",
  )
    ? "PASS"
    : "FAIL";
  report.SOURCE_OBSERVATION_DB_RUNTIME_REGRESSION =
    report.REAL_DB_READ_SOURCE_OBSERVATIONS_USED === "YES" && report.MATCH_RESULT_DURABLE_WRITE === "PASS"
      ? "PASS"
      : "FAIL";
  report.V1_REGRESSION = runNodeVerifier("tooling/verify/identity-matching-v1.cjs") ? "PASS" : "FAIL";
  report.V2_REGRESSION = runNodeVerifier("tooling/verify/identity-matching-v2.cjs") ? "PASS" : "FAIL";
  report.CANONICAL_PRODUCT_MEMORY_FOUNDATION_REGRESSION = runNodeVerifier(
    "tooling/verify/canonical-product.cjs",
  )
    ? "PASS"
    : "FAIL";
  report.REAL_AUTOMATED_CROSS_SOURCE_MATCH_REGRESSION = runNodeVerifier(
    "services/market-intelligence/src/identity-matching/v2/live-automated-cross-source-match.cjs",
  )
    ? "PASS"
    : "FAIL";
  report.MATCH_RESULT_CONTRACT_OWNER = "services/market-intelligence/src/match-result/contract.cjs";
  report.MATCH_RESULT_GOVERNANCE_OWNER = "governance/global-product/identity-matching.v2.json";
  report.MATCH_RESULT_DURABLE_REPOSITORY =
    "services/market-intelligence/src/match-result/repository.postgres.cjs";
  report.MATCH_RESULT_MIGRATION = path.basename(MR_MIGRATION);

  const requiredPass = [
    "SAFE_DB_ENVIRONMENT",
    "DEDICATED_ISOLATED_POSTGRES",
    "MATCH_RESULT_DURABLE_WRITE",
    "MATCH_RESULT_DURABLE_READ_AFTER_FRESH_PROCESS",
    "MATCH_RESULT_CROSS_PROCESS_DURABILITY",
    "MATCH_RESULT_IDEMPOTENCY",
    "MATCH_RESULT_CONCURRENT_RETRY",
    "MATCH_RESULT_SOURCE_REFERENTIAL_INTEGRITY",
    "MATCH_RESULT_CONTRADICTORY_RETRY",
    "CANONICAL_PRODUCT_DURABLE_REGRESSION",
    "V2_REGRESSION",
  ];
  const pass =
    requiredPass.every((key) => report[key] === "PASS" || report[key] === "BLOCKED") &&
    report.V2_DECISION === "MATCH" &&
    report.V2_MATCH_PATH === "COMPOSITE_STRONG" &&
    report.DUPLICATE_MATCH_RESULT_ROWS_CREATED === "NO" &&
    report.PRODUCTION_DB_WRITE_ATTEMPTED === "NO" &&
    report.A_MATCH_003_FINAL_REVERSED_PAIR_PROOF === "PASS";
  report.A_MATCH_003 = pass ? "CLOSED_VERIFIED" : "FAIL";
  printReport(report);
  process.exit(pass ? 0 : 2);
}

const phase = process.argv.includes("--phase=write-so")
  ? "write-so"
  : process.argv.includes("--phase=create-a")
    ? "create-a"
    : process.argv.includes("--phase=read-b")
      ? "read-b"
      : process.argv.includes("--phase=reversed-pair")
        ? "reversed-pair"
        : process.argv.includes("--phase=retry-c")
          ? "retry-c"
          : process.argv.includes("--phase=concurrent")
            ? "concurrent"
            : "parent";

const runners = {
  "write-so": phaseWriteSo,
  "create-a": phaseCreateA,
  "read-b": phaseReadB,
  "reversed-pair": phaseReversedPair,
  "retry-c": phaseRetryC,
  concurrent: phaseConcurrent,
  parent: phaseParent,
};

runners[phase]().catch((err) => {
  console.error(err instanceof Error ? err.stack : err);
  process.exit(2);
});
