#!/usr/bin/env node
/**
 * Track A ISSUED → 기존 Nest Opportunity write owner → feed read.
 * isolated local Postgres only · production write 0
 */
const fs = require("fs");
const net = require("net");
const os = require("os");
const path = require("path");
const crypto = require("crypto");
const { spawn, spawnSync } = require("child_process");

const root = path.resolve(__dirname, "../..");
const { matchSourceObservationsV2 } = require(path.join(
  root,
  "services/market-intelligence/src/identity-matching/v2/index.cjs",
));
const { cases: v2Cases } = require(path.join(
  root,
  "services/market-intelligence/src/identity-matching/v2/fixtures.cjs",
));
const {
  createCanonicalProductFromMatch,
  createMemoryCanonicalProductRepository,
} = require(path.join(root, "services/market-intelligence/src/canonical-product/index.cjs"));
const { generateCandidatePairs } = require(path.join(
  root,
  "services/market-intelligence/src/candidate-generation/index.cjs",
));
const { evaluateListingVariantCompatibility } = require(path.join(
  root,
  "services/market-intelligence/src/listing-variant-compatibility/index.cjs",
));
const { evaluateListingPromotion } = require(path.join(
  root,
  "services/market-intelligence/src/listing-promotion/index.cjs",
));
const { createMultiSourceOpportunity } = require(path.join(
  root,
  "services/market-intelligence/src/multi-source-opportunity/index.cjs",
));
const { BUY_EBAY_US, SELL_ADMIN_USDT, FX_SNAPSHOT } = require(path.join(
  root,
  "services/market-intelligence/src/multi-source-opportunity/fixtures.cjs",
));
const { tradingCardSeedsAsAssetMasters } = require(path.join(
  root,
  "services/market-intelligence/src/trading-card-seed.cjs",
));
const { persistQualifiedTrackAOpportunity } = require(path.join(
  root,
  "services/api-nest/src/opportunities/track-a-opportunity-persist.cjs",
));
const { loadOpportunityRow, countAvailableByOrigin, ORIGIN } = require(path.join(
  root,
  "services/api-nest/src/opportunities/opportunity-write.cjs",
));
const { getByIdThroughExistingFeed } = require(path.join(
  root,
  "services/api-nest/src/opportunities/opportunity-user-feed-read.cjs",
));

const PG_BIN = "C:\\Program Files\\PostgreSQL\\18\\bin";
const SAFE_URL_ENV = "OPPORTUNITY_WRITE_PROOF_DATABASE_URL";
const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);
const MIGRATIONS = [
  "supabase/migrations/20260808205844_identity_nest_auth.sql",
  "supabase/migrations/20260808205846_ledger_accounts_journals.sql",
  "supabase/migrations/20260808205848_wallet_deposit_withdraw.sql",
  "supabase/migrations/20260808205850_opportunities_pricing.sql",
  "supabase/migrations/20260809023230_market_intelligence.sql",
  "supabase/migrations/20260809023713_user_opportunity_overrides_schema_align.sql",
  "supabase/migrations/20260809100440_execution_policy_feed_audit.sql",
  "supabase/migrations/20260809142108_execution_policy_day1_bootstrap.sql",
  "supabase/migrations/20260809144814_catalog_runtime_day1_fx_bootstrap.sql",
  "supabase/migrations/20260814130000_ptf00c_fx_marketplace_normalization.sql",
];

function fail(msg) {
  console.error(`[verify:opportunity-write-through] FAIL\n- ${msg}`);
  process.exit(1);
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
  if (parsed.database !== "putduk_opportunity_write_proof") {
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
  const clusterRoot = path.join(os.tmpdir(), `putduk-opp-write-pg-${uid}`);
  const dataDir = path.join(clusterRoot, "data");
  const marker = path.join(clusterRoot, "PUTDUK_ISOLATED_CLUSTER.txt");
  fs.mkdirSync(clusterRoot, { recursive: true });
  fs.writeFileSync(marker, "putduk disposable opportunity write-through cluster\n", "utf8");
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
    ["-h", "127.0.0.1", "-p", String(port), "-U", "postgres", "putduk_opportunity_write_proof"],
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
    url: `postgresql://postgres:${encodeURIComponent(password)}@127.0.0.1:${port}/putduk_opportunity_write_proof`,
  };
}

function isOwnedCluster(cluster) {
  if (!cluster || !cluster.dataDir || !cluster.marker || !cluster.port) return false;
  if (String(cluster.port) === "5432") return false;
  if (!String(cluster.dataDir).toLowerCase().includes("putduk-opp-write-pg-")) return false;
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
  const ext = runPsql(url, [
    "-c",
    `CREATE SCHEMA IF NOT EXISTS extensions; CREATE EXTENSION IF NOT EXISTS pgcrypto; CREATE EXTENSION IF NOT EXISTS "uuid-ossp";`,
  ]);
  if (ext.status !== 0) return { ok: false, error: ext.stderr || "extension stub failed" };
  for (const rel of MIGRATIONS) {
    const applied = runPsql(url, ["-f", path.join(root, rel)]);
    if (applied.status !== 0) return { ok: false, error: applied.stderr || `${rel} failed` };
  }
  return { ok: true };
}

function staticChecks() {
  const fails = [];
  const createSrc = fs.readFileSync(
    path.join(root, "services/market-intelligence/src/multi-source-opportunity/create.cjs"),
    "utf8",
  );
  const persistSrc = fs.readFileSync(
    path.join(root, "services/api-nest/src/opportunities/track-a-opportunity-persist.cjs"),
    "utf8",
  );
  const writeSrc = fs.readFileSync(
    path.join(root, "services/api-nest/src/opportunities/opportunity-write.cjs"),
    "utf8",
  );
  const seedSrc = fs.readFileSync(
    path.join(root, "services/api-nest/src/opportunities/catalog-runtime-seed.service.ts"),
    "utf8",
  );
  const mapperSrc = fs.readFileSync(
    path.join(root, "services/api-nest/src/opportunities/track-a-opportunity.mapper.cjs"),
    "utf8",
  );
  if (/INSERT INTO(?: public\.)?opportunities/i.test(createSrc)) {
    fails.push("market-intelligence must not INSERT opportunities");
  }
  if (!writeSrc.includes("INSERT INTO public.opportunities")) {
    fails.push("shared write owner missing INSERT");
  }
  if (!persistSrc.includes("persistQualifiedTrackAOpportunity")) {
    fails.push("persist owner missing");
  }
  if (!seedSrc.includes("insertIfAbsentByAssetId")) {
    fails.push("catalog seed must reuse write owner");
  }
  if (!seedSrc.includes("track_a market-derived catalog present")) {
    fails.push("catalog seed must yield to Track A");
  }
  if (!mapperSrc.includes('estimatedDurationSec: "DERIVED_FROM_EXISTING_OWNER"')) {
    fails.push("mapper must classify estimatedDurationSec");
  }
  if (/8 days|12 days|8–12 days/.test(mapperSrc) || /8 days|12 days/.test(persistSrc)) {
    fails.push("must not introduce day-duration fixtures");
  }
  if (
    persistSrc.includes("workflow_dispatch") ||
    persistSrc.includes("setInterval") ||
    persistSrc.includes("CronJob")
  ) {
    fails.push("persist owner must not activate production ingest");
  }
  return fails;
}

async function runE2E() {
  const staticFails = staticChecks();
  if (staticFails.length) {
    fail(staticFails.join("\n- "));
  }

  let cluster = null;
  try {
    cluster = await bootstrapCluster();
    const safe = classifyVerifierSafeUrl(cluster.url);
    if (!safe.ok) throw new Error(safe.reason);
    process.env[SAFE_URL_ENV] = cluster.url;
    const applied = applyMigrations(cluster.url);
    if (!applied.ok) throw new Error(applied.error);

    const { Client } = resolvePg();
    const client = new Client({ connectionString: cluster.url });
    await client.connect();

    const now = new Date().toISOString();
    const fixture = v2Cases.find((row) => row.id === "A-composite-owner-vs-derived");
    if (!fixture) throw new Error("V2_FIXTURE_A_MISSING");
    const match = matchSourceObservationsV2(fixture.left, fixture.right, { now });
    if (match.decision !== "MATCH") throw new Error(`MATCH_FAILED:${match.decision}`);

    const repo = createMemoryCanonicalProductRepository();
    const created = createCanonicalProductFromMatch({
      left: fixture.left,
      right: fixture.right,
      matchResult: match,
      repository: repo,
      now,
    });
    if (!created.ok || !created.product) {
      throw new Error(`CANONICAL_FAILED:${created.reason || "unknown"}`);
    }

    const candidates = generateCandidatePairs([fixture.left, fixture.right], { now });
    if (!candidates.candidates || candidates.candidates.length < 1) {
      throw new Error("CANDIDATE_MISSING");
    }

    const left = {
      ...BUY_EBAY_US,
      canonicalProductId: created.product.canonicalProductId,
      observedAt: now,
    };
    const right = {
      ...SELL_ADMIN_USDT,
      canonicalProductId: created.product.canonicalProductId,
      observedAt: now,
    };
    const compat = evaluateListingVariantCompatibility(left, right);
    if (compat.decision === "BLOCKED") throw new Error(`COMPAT_BLOCKED:${compat.reason}`);
    const promo = evaluateListingPromotion(left, right);
    if (promo.decision !== "PROMOTABLE") throw new Error(`PROMO:${promo.decision}/${promo.reason}`);

    const fxSnapshot = {
      ...FX_SNAPSHOT,
      capturedAt: now,
    };
    const issued = createMultiSourceOpportunity(left, right, {
      now,
      fxSnapshot,
      buyListingId: left.listingId,
      sellListingId: right.listingId,
    });
    if (issued.decision !== "ISSUED" || !issued.opportunity) {
      throw new Error(`NOT_ISSUED:${issued.decision}/${issued.reason}`);
    }
    if (issued.opportunity.assetId !== null) {
      throw new Error("CANONICAL_PRODUCT_EQUALS_ASSET");
    }

    const seedAsset = tradingCardSeedsAsAssetMasters()[0];
    const assetId = "asset_write_through_e2e";
    await client.query(
      `INSERT INTO public.assets (
         asset_id, category, asset_label, image_url, image_source,
         image_alt_ko, image_rights_note_ko, meta
       ) VALUES ($1,$2,$3,$4,$5,$6,'시세 참고용',$7::jsonb)`,
      [
        assetId,
        seedAsset.category,
        seedAsset.assetLabel,
        seedAsset.imageUrl,
        seedAsset.imageSource,
        seedAsset.imageAltKo || seedAsset.assetLabel,
        JSON.stringify(seedAsset.meta || {}),
      ],
    );

    const first = await persistQualifiedTrackAOpportunity({
      issued,
      fxSnapshot,
      querier: client,
      asset: {
        assetId,
        category: seedAsset.category,
        assetLabel: seedAsset.assetLabel,
        assetImageUrl: seedAsset.imageUrl,
        assetImageSource: seedAsset.imageSource,
        assetImageAltKo: seedAsset.imageAltKo || seedAsset.assetLabel,
      },
    });
    if (!first.ok || !first.opportunityId) {
      throw new Error(`PERSIST_FAIL:${first.reason}`);
    }

    const second = await persistQualifiedTrackAOpportunity({
      issued,
      fxSnapshot,
      querier: client,
      asset: {
        assetId,
        category: seedAsset.category,
        assetLabel: seedAsset.assetLabel,
        assetImageUrl: seedAsset.imageUrl,
        assetImageSource: seedAsset.imageSource,
        assetImageAltKo: seedAsset.imageAltKo || seedAsset.assetLabel,
      },
    });
    if (!second.ok || second.idempotent !== true || second.opportunityId !== first.opportunityId) {
      throw new Error(`IDEMPOTENCY_FAIL:${second.reason}`);
    }

    const { rows: countRows } = await client.query(
      `SELECT count(*)::int AS n FROM public.opportunities`,
    );
    if (Number(countRows[0].n) !== 1) {
      throw new Error(`DUPLICATE_ROWS:${countRows[0].n}`);
    }

    const reloaded = await loadOpportunityRow(client, first.opportunityId);
    if (!reloaded) throw new Error("RELOAD_MISSING");
    if (String(reloaded.expected_profit_usdt) !== String(issued.opportunity.expectedProfitUsdt)) {
      throw new Error("PROFIT_DRIFT");
    }
    if (reloaded.pricing.origin !== "track_a") throw new Error("ORIGIN_NOT_TRACK_A");
    if (reloaded.estimated_duration_sec < 1 || reloaded.estimated_duration_sec >= 86400) {
      throw new Error("DAY_DURATION_FORBIDDEN");
    }

    const feed = await getByIdThroughExistingFeed({
      querier: client,
      clock: { nowMs: () => Date.now() },
      row: reloaded,
      principalUsdt: "0",
      executionPolicy: { feed: { nearMissCapUsdt: "50" } },
    });
    if (!feed.ok || !feed.item) throw new Error(`FEED_READ:${feed.reason}`);
    if (feed.item.id !== first.opportunityId) throw new Error("FEED_ID_MISMATCH");
    if (String(feed.item.expectedProfitUsdt) !== String(issued.opportunity.expectedProfitUsdt)) {
      throw new Error("FEED_PROFIT_DRIFT");
    }
    if (feed.item.pricing && feed.item.pricing.origin) {
      throw new Error("SEED_OR_ORIGIN_LEAKED_TO_USER");
    }

    const trackACount = await countAvailableByOrigin(client, ORIGIN.TRACK_A);
    if (trackACount < 1) throw new Error("TRACK_A_ORIGIN_MISSING");

    await client.end();
    console.log(
      "[verify:opportunity-write-through] PASS (Match→Canonical→Candidate→Listing→Economics→Persist→Reload→Feed · idempotent)",
    );
  } finally {
    if (cluster) stopOwnedCluster(cluster);
  }
}

runE2E().catch((e) => {
  fail(e instanceof Error ? e.message : String(e));
});
