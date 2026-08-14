/**
 * PTF-00C-R1 §7/§8 — LIVE eBay fault-injection integration harness.
 * Real HTTP + real isolated CI Postgres + a REAL booted Nest process.
 *
 * NO live eBay call is ever made — the ebay-adapter Cloudflare Worker's own
 * tick logic (nested-retry elimination, tick deadline, provider-tick-id
 * generation) is already proven separately and directly with a mocked
 * `fetch` in workers/ebay-adapter/src/fault-injection.selftest.ts (real
 * runtime, not this file's concern). What THIS harness proves is the
 * INTEGRATION boundary the worker pushes into: it POSTs ingest payloads
 * shaped EXACTLY like what that proven-correct worker sends for a full
 * OAuth outage / a recovered tick, straight at a real booted Nest's real
 * `/api/v1/internal/adapters/ingest` HTTP endpoint, backed by a real
 * ephemeral Postgres — then reads the durable result back through BOTH a
 * direct SQL read and the real `/api/v1/admin/adapters` HTTP surface.
 *
 * Reuses the SAME isolated-Postgres/Nest-boot/kill-switch/synthetic-identity
 * infra the engine-acceptance QA5 fault harness already established — no
 * duplicate bootstrap logic, no production DB, no destructive prod target.
 *
 * Proves (PTF-00C-R1 §7 A-F):
 *   A. full upstream eBay failure (payload shape a real OAuth-outage tick sends)
 *   B. bounded runtime at the integration boundary (Nest never blocks on eBay)
 *   C. failure heartbeat durably updates the REAL Nest+Postgres provider-health
 *      path (both direct SQL read-back AND the real admin HTTP surface) —
 *      idempotent even when the SAME providerTickId is redelivered 3x
 *   D. a stale eBay-sourced opportunity is excluded from the real user feed
 *   E. an unrelated Core endpoint (/health) + the ledger stay unaffected
 *   F. a successful recovery tick heals health without touching ledger truth
 */
"use strict";

const path = require("node:path");
const http = require("node:http");
const crypto = require("node:crypto");
const { createRequire } = require("node:module");
const {
  assertKillSwitch,
  assertDbTarget,
  resolveHarnessDatabaseUrl,
} = require("../engine-acceptance/kill-switch.cjs");
const { ROOT } = require("../engine-acceptance/lib/hash-scope.cjs");
const {
  createEphemeralSecrets,
  mintUserToken,
  mintAdminToken,
  SYNTH_USER_A,
  ADMIN_ROLE_SUPER,
  redactAuthorization,
} = require("../engine-acceptance/lib/synthetic-identity.cjs");
const { prepareIsolatedPostgres } = require("../engine-acceptance/harness/ci-postgres.cjs");
const nest = require("../engine-acceptance/harness/ci-nest-boot.cjs");
const fs = require("node:fs");

const nestRequire = createRequire(path.join(ROOT, "services/api-nest/package.json"));

function outDir() {
  const d =
    process.env.AIPO_QA_HARNESS_OUT || path.join(ROOT, "_tmp_qa_harness", "ebay-fault-injection");
  fs.mkdirSync(d, { recursive: true });
  return d;
}

function writeJson(abs, obj) {
  fs.writeFileSync(abs, `${JSON.stringify(obj, null, 2)}\n`, "utf8");
}

function harnessFailure(message) {
  const err = new Error(message);
  err.code = "AIPO_QA_HARNESS_FAILURE";
  return err;
}

async function withPgClient(databaseUrl, fn) {
  const { Client } = nestRequire("pg");
  const client = new Client({ connectionString: databaseUrl, connectionTimeoutMillis: 8_000 });
  await client.connect();
  try {
    return await fn(client);
  } finally {
    await client.end().catch(() => {});
  }
}

async function countRows(databaseUrl, table) {
  return withPgClient(databaseUrl, async (client) => {
    const r = await client.query(`SELECT count(*)::int AS n FROM public.${table}`);
    return r.rows[0] ? r.rows[0].n : null;
  });
}

async function loadProviderRuntimeHealth(databaseUrl, providerId, marketplaceId) {
  return withPgClient(databaseUrl, async (client) => {
    const r = await client.query(
      `SELECT circuit_state, consecutive_failures, attempted_count, success_count,
              failure_count, last_error_class
         FROM public.provider_runtime_health
        WHERE provider_id = $1 AND marketplace_id = $2`,
      [providerId, marketplaceId ?? ""],
    );
    return r.rows[0] || null;
  });
}

/**
 * Seeds ONE stale eBay-sourced opportunity via direct SQL — the same
 * established test-fixture-setup pattern as ci-postgres.cjs's
 * seedSyntheticUsers(): real rows in a real isolated Postgres, read back
 * through the real Nest HTTP feed endpoint (not a canned response).
 */
async function seedStaleEbayOpportunity(databaseUrl) {
  return withPgClient(databaseUrl, async (client) => {
    const assetId = "qa-synth-ebay-stale-watch";
    await client.query(
      `INSERT INTO public.assets (asset_id, category, asset_label, image_url, image_source, image_alt_ko)
       VALUES ($1, 'watch', 'QA Synthetic Stale Watch', 'https://i.ebayimg.com/qa-synth.jpg', 'ebay', 'QA 합성 시계')
       ON CONFLICT (asset_id) DO NOTHING`,
      [assetId],
    );
    // formula_id is NOT NULL + CHECKed IN ('cg_usdt_krw', 'cg_usdt_usd__frank_usd_krw')
    // (services/market-intelligence market-intel-engine formula SSOT) — sources
    // is NOT NULL text[] CHECKed to never contain 'yahoo_jp'.
    await client.query(
      `INSERT INTO public.fx_snapshots (id, usd_krw, source, captured_at, formula_id, sources)
       VALUES ('qa-synth-fx-ebay-fault', 1350.00, 'qa-synth', now(), 'cg_usdt_krw', ARRAY['qa-synth']::text[])
       ON CONFLICT (id) DO NOTHING`,
    );
    const r = await client.query(
      `INSERT INTO public.opportunities (
         asset_id, pricing_version, priced_at, expected_profit_usdt,
         fx_snapshot_id, estimated_duration_sec, ai_confidence_score, difficulty,
         required_capital_usdt, execution_mode, category, asset_label,
         asset_image_url, asset_image_source, asset_image_alt_ko,
         arbitrage_type, arbitrage_type_ko, pricing, stale_at, status
       ) VALUES (
         $1, 1, now() - interval '2 hours', 12.5,
         'qa-synth-fx-ebay-fault', 600, 80, 'normal',
         50, 'orchestrate', 'watch', 'QA Synthetic Stale Watch',
         'https://i.ebayimg.com/qa-synth.jpg', 'ebay', 'QA 합성 시계',
         'price', '시세차익', '{"compareReady": true}'::jsonb,
         now() - interval '1 hour', 'available'
       ) RETURNING id::text`,
      [assetId],
    );
    return r.rows[0].id;
  });
}

function httpJson(method, baseUrl, pth, headers, bodyObj, timeoutMs = 12_000) {
  return new Promise((resolve) => {
    const u = new URL(pth, baseUrl);
    const bodyStr = bodyObj !== undefined ? JSON.stringify(bodyObj) : undefined;
    const req = http.request(
      {
        protocol: u.protocol,
        hostname: u.hostname,
        port: u.port,
        path: u.pathname + u.search,
        method,
        timeout: timeoutMs,
        headers: {
          ...(headers || {}),
          ...(bodyStr
            ? { "content-type": "application/json", "content-length": Buffer.byteLength(bodyStr) }
            : {}),
        },
      },
      (res) => {
        let data = "";
        res.on("data", (c) => (data += c));
        res.on("end", () => {
          let parsed = null;
          try {
            parsed = JSON.parse(data);
          } catch {
            parsed = null;
          }
          resolve({ status: res.statusCode || 0, body: data, parsed });
        });
      },
    );
    req.on("error", (e) => resolve({ status: 0, body: "", parsed: null, error: e.message }));
    req.on("timeout", () => {
      req.destroy();
      resolve({ status: 0, body: "", parsed: null, error: "timeout" });
    });
    if (bodyStr) req.write(bodyStr);
    req.end();
  });
}

function randomTickId() {
  return crypto.randomUUID();
}

async function runEbayFaultInjection(opts = {}) {
  assertKillSwitch(opts);
  const databaseUrl = opts.databaseUrl || resolveHarnessDatabaseUrl();
  if (databaseUrl) assertDbTarget({ databaseUrl, target_env: opts.target_env });

  const secrets = createEphemeralSecrets();
  const userBearer = `Bearer ${mintUserToken(secrets.jwtUserSecret, SYNTH_USER_A)}`;
  const adminBearer = `Bearer ${mintAdminToken(
    secrets.jwtAdminSecret,
    "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    { role: ADMIN_ROLE_SUPER },
  )}`;

  const skipBoot = opts.skipBoot === true || process.env.AIPO_EBAY_FAULT_SKIP_BOOT === "1";
  const port = Number(opts.port || process.env.PORT || 4000);
  const productBaseUrl = opts.productBaseUrl || `http://127.0.0.1:${port}`;
  let started = null;
  let pgPrep = null;

  if (!skipBoot) {
    if (!databaseUrl) throw harnessFailure("DATABASE_URL required for the live eBay fault harness");
    pgPrep = await prepareIsolatedPostgres({ databaseUrl, target_env: opts.target_env });
    nest.assertDistPresent();
    started = nest.startNest({ port, secrets, env: { DATABASE_URL: databaseUrl } });
    await nest.waitForHealth({ port });
  }

  const evidence = {};

  // --- E (baseline) — Core/Money isolation before any eBay fault traffic ---
  const ledgerBefore = databaseUrl ? await countRows(databaseUrl, "ledger_journals") : null;
  const coreHealthBefore = await httpJson("GET", productBaseUrl, "/api/v1/health", {}, undefined);

  // --- D (setup) — a stale eBay-sourced opportunity, seeded BEFORE the fault ---
  const staleOpportunityId = databaseUrl ? await seedStaleEbayOpportunity(databaseUrl) : null;

  // --- A/B/C — full eBay OAuth outage tick, delivered as 3 identical batches ---
  // (network-retry / duplicate-ingest simulation). Payload shape matches
  // EXACTLY what the separately-proven-correct worker sends for §R1-B's
  // fast-fail auth-outage path: same providerTickId on every batch (§R1-A).
  const outageTickId = randomTickId();
  const outageBody = (batchIndex) => ({
    adapterId: "ebay",
    worker: "ebay-adapter",
    observedAt: new Date().toISOString(),
    dryRun: false,
    marketplaceIds: ["EBAY_US", "EBAY_GB"],
    listings: [],
    observations: [],
    marketplaceHealth: [
      { marketplaceId: "EBAY_US", attempted: 16, successCount: 0, failureCount: 16, errorClass: "auth_failed" },
      { marketplaceId: "EBAY_GB", attempted: 16, successCount: 0, failureCount: 16, errorClass: "auth_failed" },
    ],
    providerTickId: outageTickId,
    tickIncomplete: false,
    error: `ebay:auth_failed batch ${batchIndex}`,
  });

  const startOutageMs = Date.now();
  const outageIngestResponses = [];
  for (let batch = 1; batch <= 3; batch += 1) {
    const res = await httpJson(
      "POST",
      productBaseUrl,
      "/api/v1/internal/adapters/ingest",
      {},
      outageBody(batch),
    );
    outageIngestResponses.push({ batch, status: res.status, ok: res.parsed?.ok === true });
  }
  const outageElapsedMs = Date.now() - startOutageMs;

  evidence.A_fullUpstreamFailure = {
    providerTickId: outageTickId,
    batchesSent: outageIngestResponses.length,
    responses: outageIngestResponses,
    // Nest's default POST response code is 201 Created (no @HttpCode override
    // on AdaptersIngestController.ingest) — accept any 2xx, not literally 200.
    pass: outageIngestResponses.every((r) => r.status >= 200 && r.status < 300 && r.ok),
  };

  // --- B — bounded runtime at the integration boundary ---
  const boundedRuntimeBudgetMs = 10_000;
  evidence.B_boundedIntegrationRuntime = {
    elapsedMs: outageElapsedMs,
    budgetMs: boundedRuntimeBudgetMs,
    pass: outageElapsedMs < boundedRuntimeBudgetMs,
  };

  // --- C — REAL DB read-back: idempotent despite 3 identical-tick batches ---
  const healthAfterOutage = databaseUrl
    ? await loadProviderRuntimeHealth(databaseUrl, "ebay", "EBAY_US")
    : null;
  evidence.C_durableHeartbeatIdempotent_directSql = {
    row: healthAfterOutage,
    pass: Boolean(
      healthAfterOutage &&
        healthAfterOutage.attempted_count === 16 &&
        healthAfterOutage.failure_count === 16 &&
        // §5/§8 — one real tick (even resent 3x) must NOT trip a 3-strike
        // circuit on its own; consecutive_failures must be 1, never 3.
        healthAfterOutage.consecutive_failures === 1 &&
        healthAfterOutage.circuit_state === "CLOSED",
    ),
  };

  // --- C — SAME evidence via the real Admin HTTP surface ---
  const adminHealthRes = await httpJson(
    "GET",
    productBaseUrl,
    "/api/v1/admin/adapters",
    { authorization: adminBearer },
    undefined,
  );
  const ebayRow = (adminHealthRes.parsed?.items || []).find((it) => it.adapterId === "ebay");
  evidence.C_providerHealthObservability_adminHttp = {
    status: adminHealthRes.status,
    ebayStatus: ebayRow ? ebayRow.status : null,
    ebayHealthStatus: ebayRow ? ebayRow.healthStatus : null,
    marketplaceHealth: ebayRow ? ebayRow.marketplaceHealth : null,
    pass: Boolean(adminHealthRes.status === 200 && ebayRow && ebayRow.status !== "green"),
  };

  // --- D — the seeded STALE eBay opportunity must be absent from the real feed ---
  const feedRes = await httpJson(
    "GET",
    productBaseUrl,
    "/api/v1/opportunities",
    { authorization: userBearer },
    undefined,
  );
  const feedIds = new Set((feedRes.parsed?.items || []).map((it) => it.id));
  evidence.D_staleOpportunityExcluded = {
    status: feedRes.status,
    staleOpportunityId,
    presentInFeed: staleOpportunityId ? feedIds.has(staleOpportunityId) : null,
    pass: Boolean(staleOpportunityId && feedRes.status === 200 && !feedIds.has(staleOpportunityId)),
  };

  // --- E — Core/Money isolation held DURING/AFTER the fault traffic ---
  const coreHealthAfter = await httpJson("GET", productBaseUrl, "/api/v1/health", {}, undefined);
  const ledgerAfterOutage = databaseUrl ? await countRows(databaseUrl, "ledger_journals") : null;
  evidence.E_coreMoneyIsolation = {
    healthBefore: { status: coreHealthBefore.status, ok: coreHealthBefore.parsed?.ok === true },
    healthAfter: { status: coreHealthAfter.status, ok: coreHealthAfter.parsed?.ok === true },
    ledgerJournalsBefore: ledgerBefore,
    ledgerJournalsAfterOutage: ledgerAfterOutage,
    pass: Boolean(
      coreHealthBefore.status === 200 &&
        coreHealthAfter.status === 200 &&
        ledgerBefore === ledgerAfterOutage,
    ),
  };

  // --- F — recovery tick: different providerTickId, real success ---
  const recoveryTickId = randomTickId();
  const recoveryRes = await httpJson(
    "POST",
    productBaseUrl,
    "/api/v1/internal/adapters/ingest",
    {},
    {
      adapterId: "ebay",
      worker: "ebay-adapter",
      observedAt: new Date().toISOString(),
      dryRun: false,
      marketplaceIds: ["EBAY_US", "EBAY_GB"],
      listings: [],
      observations: [],
      marketplaceHealth: [
        { marketplaceId: "EBAY_US", attempted: 16, successCount: 16, failureCount: 0, errorClass: null },
        { marketplaceId: "EBAY_GB", attempted: 16, successCount: 16, failureCount: 0, errorClass: null },
      ],
      providerTickId: recoveryTickId,
      tickIncomplete: false,
    },
  );
  const healthAfterRecovery = databaseUrl
    ? await loadProviderRuntimeHealth(databaseUrl, "ebay", "EBAY_US")
    : null;
  const ledgerAfterRecovery = databaseUrl ? await countRows(databaseUrl, "ledger_journals") : null;
  evidence.F_outageRecovery = {
    ingestStatus: recoveryRes.status,
    row: healthAfterRecovery,
    ledgerJournalsAfterRecovery: ledgerAfterRecovery,
    pass: Boolean(
      recoveryRes.status >= 200 &&
        recoveryRes.status < 300 &&
        healthAfterRecovery &&
        healthAfterRecovery.circuit_state === "CLOSED" &&
        healthAfterRecovery.consecutive_failures === 0 &&
        healthAfterRecovery.attempted_count === 32 &&
        healthAfterRecovery.success_count === 16 &&
        healthAfterRecovery.failure_count === 16 &&
        ledgerBefore === ledgerAfterRecovery,
    ),
  };

  const allPass = Object.keys(evidence)
    .filter((k) => k !== "kill_switch")
    .every((k) => evidence[k].pass === true);

  const result = {
    schema: "harness.ebay-fault-injection.v1",
    suite_id: "PTF00C_R1_EBAY_FAULT_INJECTION",
    measuredAt: new Date().toISOString(),
    github_run_id: process.env.GITHUB_RUN_ID || null,
    commit_sha: process.env.GITHUB_SHA || null,
    harness_status: allPass ? "PASS" : "FAIL",
    mock: false,
    does_not_call_real_ebay: true,
    kill_switch: {
      target_env: opts.target_env,
      hostname: opts.hostname,
      synthetic_account_namespace: opts.synthetic_account_namespace,
    },
    postgres: pgPrep ? { classification: pgPrep.classification, host: pgPrep.host } : { skipped: skipBoot },
    evidence,
    secrets: { committed: false, redacted_user_auth: redactAuthorization(userBearer), redacted_admin_auth: redactAuthorization(adminBearer) },
    nest_log_excerpt: started
      ? String(nest.collectLogs({ workDir: started.paths.dir }) || "")
          .slice(-4000)
          .replace(/Bearer\s+[A-Za-z0-9._-]+/g, "Bearer [redacted]")
          .replace(/postgres:[^@\s]+@/gi, "postgres:[redacted]@")
      : null,
    notes: [
      "Worker-side nested-retry/tick-deadline/provider-tick-id fault injection is proven separately in workers/ebay-adapter/src/fault-injection.selftest.ts (real mocked-fetch execution).",
      "This harness proves the Nest+Postgres integration boundary the worker pushes into, using real HTTP + a real ephemeral Postgres — never a fixture pretending to be the result.",
      "No live eBay call is made anywhere in this process.",
    ],
  };

  const dir = outDir();
  writeJson(path.join(dir, "ebay-fault-injection.v1.json"), result);

  if (started) nest.stopNest({ pid: started.pid, workDir: started.paths.dir });

  if (!allPass) {
    const err = harnessFailure("eBay fault-injection harness observed a FAIL — see evidence");
    err.result = result;
    throw err;
  }
  return result;
}

function main() {
  const args = process.argv.slice(2);
  const get = (flag) => {
    const i = args.indexOf(flag);
    return i >= 0 ? args[i + 1] : undefined;
  };
  runEbayFaultInjection({
    target_env: get("--target-env") || process.env.AIPO_QA_TARGET_ENV || "ci",
    hostname: get("--hostname") || process.env.AIPO_QA_HOSTNAME || "localhost",
    synthetic_account_namespace:
      get("--synthetic-ns") || process.env.AIPO_QA_SYNTHETIC_NS || "qa-synth-ci",
    databaseUrl: get("--database-url") || resolveHarnessDatabaseUrl(),
    skipBoot: args.includes("--skip-boot"),
  })
    .then((out) => {
      console.log("[run-ebay-fault-injection] harness_status", out.harness_status);
      console.log(
        JSON.stringify(
          Object.fromEntries(Object.entries(out.evidence).map(([k, v]) => [k, v.pass])),
          null,
          2,
        ),
      );
    })
    .catch((e) => {
      try {
        writeJson(path.join(outDir(), "harness-failure.v1.json"), {
          code: e.code || "FAIL",
          message: e.message,
          result: e.result || null,
        });
      } catch {
        /* upload path still needs a file when wait fails early */
      }
      console.error(`[run-ebay-fault-injection] ${e.code || "FAIL"} — ${e.message}`);
      process.exit(e.code === "AIPO_QA_KILL_SWITCH" || e.code === "AIPO_QA_HARNESS_FAILURE" ? 2 : 1);
    });
}

if (require.main === module) {
  main();
}

module.exports = { runEbayFaultInjection };
