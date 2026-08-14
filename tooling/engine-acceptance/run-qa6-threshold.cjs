/**
 * QA6 canonical threshold execution — real k6 + booted Nest + isolated Postgres.
 *
 * Unlike run-qa6-measure.cjs (NON_VERDICT, thresholds intentionally empty),
 * this runner feeds the Human/PO-approved V1 numbers from
 * governance/engine-acceptance/perf-budget.v1.json into the SAME
 * tooling/engine-acceptance/k6/scenario-mix.js script via env vars, so k6
 * itself evaluates p(95)/error-rate thresholds for all four approved tags
 * (feed_read, participate, wallet_read, auth_profile) against real HTTP
 * traffic. Writes non-canonical evidence only — checks/performance-world.cjs
 * decides whether canonical qa6-result.v1.json may consume it.
 *
 * Numeric invention forbidden: every threshold number here is read from
 * perf-budget.v1.json, never hardcoded/invented in this file.
 */
"use strict";

const fs = require("node:fs");
const path = require("node:path");
const http = require("node:http");
const crypto = require("node:crypto");
const { spawnSync } = require("node:child_process");
const { assertKillSwitch, assertDbTarget, resolveHarnessDatabaseUrl } = require("./kill-switch.cjs");
const { ROOT, readJson } = require("./lib/hash-scope.cjs");
const { probePerfOracle } = require("./lib/perf-oracle.cjs");
const {
  createEphemeralSecrets,
  mintUserToken,
  SYNTH_USER_A,
  redactAuthorization,
} = require("./lib/synthetic-identity.cjs");
const { prepareIsolatedPostgres } = require("./harness/ci-postgres.cjs");
const nest = require("./harness/ci-nest-boot.cjs");

const K6_SCRIPT = path.join(ROOT, "tooling/engine-acceptance/k6/scenario-mix.js");
const BUDGET_REL = "governance/engine-acceptance/perf-budget.v1.json";
const REQUIRED_TAGS = ["feed_read", "participate", "wallet_read", "auth_profile"];

const TAG_ENV_NAME = {
  feed_read: "FEED_READ",
  participate: "PARTICIPATE",
  wallet_read: "WALLET_READ",
  auth_profile: "AUTH_PROFILE",
};

function outDir() {
  const d = process.env.AIPO_QA_HARNESS_OUT || path.join(ROOT, "_tmp_qa_harness", "qa6-threshold");
  fs.mkdirSync(d, { recursive: true });
  return d;
}

function writeJson(abs, obj) {
  fs.writeFileSync(abs, `${JSON.stringify(obj, null, 2)}\n`, "utf8");
}

function findK6() {
  const r = spawnSync("k6", ["version"], { encoding: "utf8" });
  return r.status === 0 ? "k6" : null;
}

function httpGetOnce(baseUrl, pth, bearer, timeoutMs = 8_000) {
  return new Promise((resolve) => {
    const u = new URL(pth, baseUrl);
    const req = http.request(
      {
        protocol: u.protocol,
        hostname: u.hostname,
        port: u.port,
        path: u.pathname + u.search,
        method: "GET",
        timeout: timeoutMs,
        headers: bearer ? { authorization: bearer } : {},
      },
      (res) => {
        let data = "";
        res.on("data", (c) => (data += c));
        res.on("end", () => resolve({ status: res.statusCode || 0, body: String(data).slice(0, 300) }));
      },
    );
    req.on("error", (e) => resolve({ status: 0, body: `` , error: e.message }));
    req.on("timeout", () => {
      req.destroy();
      resolve({ status: 0, body: "", error: "timeout" });
    });
    req.end();
  });
}

/** Diagnostic-only pre-flight — one real request per route, logged for post-mortem. Never affects the k6 verdict. */
async function preflightSmokeCheck(baseUrl, bearer) {
  const routes = {
    feed_read: "/api/v1/me/home-read",
    participate: "/api/v1/opportunities",
    wallet_read: "/api/v1/wallet/buckets",
    auth_profile: "/api/v1/auth/session",
  };
  const out = {};
  for (const [tag, pth] of Object.entries(routes)) {
    out[tag] = await httpGetOnce(baseUrl, pth, bearer);
  }
  return out;
}

/**
 * Reads the per-metric `thresholds` block k6's --summary-export writes
 * (`{ "p(95)<30": { ok: true } }`) for a given tagged metric key.
 */
function metricThresholdsOk(summary, metricKey) {
  const m = summary && summary.metrics ? summary.metrics[metricKey] : null;
  if (!m || !m.thresholds) return { present: false, ok: null, detail: null };
  const entries = Object.entries(m.thresholds);
  if (entries.length === 0) return { present: false, ok: null, detail: null };
  const ok = entries.every(([, v]) => v && v.ok === true);
  return { present: true, ok, detail: Object.fromEntries(entries.map(([k, v]) => [k, Boolean(v && v.ok)])) };
}

function extractPercentiles(summary, metricKey) {
  const m = summary && summary.metrics ? summary.metrics[metricKey] : null;
  if (!m) return null;
  const values = m.values || m;
  return {
    p50: values["p(50)"] ?? values.med ?? null,
    p95: values["p(95)"] ?? null,
    p99: values["p(99)"] ?? null,
    avg: values.avg ?? null,
  };
}

function extractErrorRate(summary, metricKey) {
  const m = summary && summary.metrics ? summary.metrics[metricKey] : null;
  if (!m) return null;
  const values = m.values || m;
  if (typeof values.rate === "number") return values.rate;
  return null;
}

async function runQa6Threshold(opts = {}) {
  assertKillSwitch(opts);

  const budget = readJson(BUDGET_REL);
  if (budget.status !== "SPECIFIED" || !budget.threshold_mechanism || budget.threshold_mechanism.locked !== true) {
    const err = new Error("QA6 threshold run requires perf-budget.v1.json status=SPECIFIED (Human/PO ACK)");
    err.code = "AIPO_QA_HARNESS_FAILURE";
    throw err;
  }
  const missingTag = REQUIRED_TAGS.find((t) => {
    const th = (budget.thresholds_by_tag || {})[t];
    return !th || typeof th.p95_ms !== "number" || typeof th.error_rate !== "number" || !th.source;
  });
  if (missingTag) {
    const err = new Error(`QA6 threshold run: tag=${missingTag} has no Human/PO-sourced numeric threshold`);
    err.code = "AIPO_QA_HARNESS_FAILURE";
    throw err;
  }

  const oracle = probePerfOracle();

  const databaseUrl = opts.databaseUrl || resolveHarnessDatabaseUrl();
  const skipBoot = opts.skipBoot === true || process.env.AIPO_QA6_SKIP_BOOT === "1";
  const port = Number(opts.port || process.env.PORT || 4000);
  const baseUrl = opts.productBaseUrl || `http://127.0.0.1:${port}`;
  const secrets = createEphemeralSecrets();
  const userToken = mintUserToken(secrets.jwtUserSecret, SYNTH_USER_A);
  let started = null;
  let pgPrep = null;

  if (!skipBoot) {
    if (!databaseUrl) {
      const err = new Error("DATABASE_URL required for QA6 threshold run");
      err.code = "AIPO_QA_HARNESS_FAILURE";
      throw err;
    }
    assertDbTarget({ databaseUrl, target_env: opts.target_env });
    pgPrep = await prepareIsolatedPostgres({ databaseUrl, target_env: opts.target_env });
    nest.assertDistPresent();
    started = nest.startNest({
      port,
      secrets,
      env: {
        DATABASE_URL: databaseUrl,
        LLM_PROVIDER: "none",
        JWT_USER_SECRET: secrets.jwtUserSecret,
        JWT_ADMIN_SECRET: secrets.jwtAdminSecret,
      },
    });
    await nest.waitForHealth({ port });
  }

  const k6bin = findK6();
  const dir = outDir();
  const summaryPath = path.join(dir, "k6-threshold-summary.json");

  if (!k6bin) {
    const err = new Error("k6 not installed — cannot run canonical QA6 threshold execution");
    err.code = "AIPO_QA_HARNESS_FAILURE";
    throw err;
  }

  const env = { ...process.env };
  env.AIPO_QA_BASE_URL = baseUrl;
  env.AIPO_QA_PERF_BUDGET_STATUS = "SPECIFIED";
  delete env.AIPO_QA_MEASUREMENT_ONLY;
  env.AIPO_QA_SYNTHETIC_NS = opts.synthetic_account_namespace || "qa-synth-ci";
  env.AIPO_QA_USER_BEARER = `Bearer ${userToken}`;
  for (const tag of REQUIRED_TAGS) {
    const th = budget.thresholds_by_tag[tag];
    const envName = TAG_ENV_NAME[tag];
    env[`AIPO_QA_THRESH_${envName}_P95_MS`] = String(th.p95_ms);
    env[`AIPO_QA_THRESH_${envName}_ERROR_RATE`] = String(th.error_rate);
  }

  const preflight = skipBoot ? null : await preflightSmokeCheck(baseUrl, env.AIPO_QA_USER_BEARER);
  if (preflight) {
    console.log(`[run-qa6-threshold] preflight ${JSON.stringify(preflight)}`);
  }

  const spawned = spawnSync(
    k6bin,
    [
      "run",
      "--summary-export",
      summaryPath,
      "--summary-trend-stats",
      "avg,min,med,max,p(50),p(90),p(95),p(99)",
      K6_SCRIPT,
    ],
    { encoding: "utf8", env, cwd: ROOT, timeout: 180_000 },
  );

  if (spawned.stdout) {
    console.log(`[run-qa6-threshold] k6 stdout tail:\n${String(spawned.stdout).slice(-3000)}`);
  }

  let summary = null;
  if (fs.existsSync(summaryPath)) {
    try {
      summary = JSON.parse(fs.readFileSync(summaryPath, "utf8"));
    } catch {
      summary = null;
    }
  }

  const perTag = {};
  for (const tag of REQUIRED_TAGS) {
    const durKey = `http_req_duration{scenario:${tag}}`;
    const failKey = `http_req_failed{scenario:${tag}}`;
    const durThresh = metricThresholdsOk(summary, durKey);
    const failThresh = metricThresholdsOk(summary, failKey);
    const th = budget.thresholds_by_tag[tag];
    perTag[tag] = {
      threshold: { p95_ms: th.p95_ms, error_rate: th.error_rate, source: th.source },
      observed: {
        percentiles: extractPercentiles(summary, durKey),
        error_rate: extractErrorRate(summary, failKey),
      },
      p95_threshold: durThresh,
      error_rate_threshold: failThresh,
      verdict:
        durThresh.present && failThresh.present && durThresh.ok === true && failThresh.ok === true
          ? "PASS"
          : "FAIL",
    };
  }

  const allTagsEvaluated = REQUIRED_TAGS.every((t) => perTag[t].p95_threshold.present && perTag[t].error_rate_threshold.present);
  const allTagsPass = REQUIRED_TAGS.every((t) => perTag[t].verdict === "PASS");
  const k6ExitOk = spawned.status === 0;

  const harness_status = summary && allTagsEvaluated ? "PASS" : "HARNESS_FAILURE";

  const result = {
    schema: "harness.qa6-threshold.v1",
    suite_id: "QA6_THRESHOLD",
    measuredAt: new Date().toISOString(),
    github_run_id: process.env.GITHUB_RUN_ID || null,
    commit_sha: process.env.GITHUB_SHA || null,
    harness_status,
    non_canonical: true,
    does_not_replace_qa6_result: true,
    numeric_invention_forbidden: true,
    budget_source: BUDGET_REL,
    human_po_ack: budget.human_po_ack || null,
    k6: {
      exit_code: spawned.status,
      exit_ok: k6ExitOk,
      stderr_excerpt: String(spawned.stderr || "").slice(0, 4000),
      stdout_excerpt: String(spawned.stdout || "").slice(0, 4000),
      summary_present: Boolean(summary),
      summary_sha256: fs.existsSync(summaryPath)
        ? crypto.createHash("sha256").update(fs.readFileSync(summaryPath)).digest("hex")
        : null,
    },
    tags: perTag,
    all_tags_evaluated: allTagsEvaluated,
    all_tags_pass: allTagsPass,
    verdict_class: harness_status === "PASS" ? "HARNESS_VALIDATION" : "HARNESS_FAILURE",
    preflight_smoke_check: preflight,
    postgres: pgPrep ? { classification: pgPrep.classification, host: pgPrep.host } : { skipped: skipBoot },
    secrets: { committed: false, redacted_auth: redactAuthorization(`Bearer ${userToken}`) },
    oracle_probe: { available: oracle.available, budget_status: oracle.budget_status },
    nest_log_excerpt: started
      ? String(nest.collectLogs({ workDir: started.paths.dir }) || "")
          .slice(-4000)
          .replace(/Bearer\s+[A-Za-z0-9._-]+/g, "Bearer [redacted]")
          .replace(/postgres:[^@\s]+@/gi, "postgres:[redacted]@")
      : null,
    notes: [
      "Real k6 threshold execution against a booted Nest + isolated Postgres.",
      "Thresholds are read from perf-budget.v1.json only — never invented here.",
      "This runner does not itself decide the canonical QA6 verdict — checks/performance-world.cjs does, only when this evidence is fresh.",
    ],
  };

  writeJson(path.join(dir, "qa6-threshold.v1.json"), result);
  if (started) nest.stopNest({ pid: started.pid, workDir: started.paths.dir });

  if (harness_status !== "PASS") {
    const err = new Error("QA6 threshold harness failed to evaluate all four tags");
    err.code = "AIPO_QA_HARNESS_FAILURE";
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
  runQa6Threshold({
    target_env: get("--target-env") || process.env.AIPO_QA_TARGET_ENV || "ci",
    hostname: get("--hostname") || process.env.AIPO_QA_HOSTNAME || "localhost",
    synthetic_account_namespace: get("--synthetic-ns") || process.env.AIPO_QA_SYNTHETIC_NS || "qa-synth-ci",
    databaseUrl: get("--database-url") || resolveHarnessDatabaseUrl(),
    skipBoot: args.includes("--skip-boot"),
  })
    .then((out) => {
      console.log(
        `[run-qa6-threshold] harness=${out.harness_status} all_tags_pass=${out.all_tags_pass} ` +
          REQUIRED_TAGS.map((t) => `${t}=${out.tags[t].verdict}`).join(" ") +
          ` preflight=${JSON.stringify(out.preflight_smoke_check)}`,
      );
    })
    .catch((e) => {
      try {
        writeJson(path.join(outDir(), "harness-failure.v1.json"), { code: e.code || "FAIL", message: e.message });
      } catch {
        /* upload path still needs a file when wait fails early */
      }
      console.error(`[run-qa6-threshold] ${e.code || "FAIL"} — ${e.message}`);
      process.exit(e.code === "AIPO_QA_KILL_SWITCH" || e.code === "AIPO_QA_HARNESS_FAILURE" ? 2 : 1);
    });
}

if (require.main === module) {
  main();
}

module.exports = { runQa6Threshold, REQUIRED_TAGS };
