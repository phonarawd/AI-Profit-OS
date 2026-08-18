/**
 * QA6 measurement-only — 실제 k6 + booted Nest.
 * canonical perf-budget / qa6-result 를 PASS 로 바꾸지 않는다.
 * NON-VERDICT. Official V1 budget may exist; this runner still must not
 * write canonical qa6-result PASS. Measurement k6 keeps empty thresholds.
 */
"use strict";

const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const { spawnSync } = require("node:child_process");
const { assertKillSwitch, assertDbTarget, resolveHarnessDatabaseUrl } = require("./kill-switch.cjs");
const { ROOT } = require("./lib/hash-scope.cjs");
const { probePerfOracle } = require("./lib/perf-oracle.cjs");
const { SCENARIOS, PHANTOM_PATHS } = require("./k6/route-catalog.cjs");
const {
  createEphemeralSecrets,
  mintUserToken,
  SYNTH_USER_A,
  redactAuthorization,
} = require("./lib/synthetic-identity.cjs");
const { prepareIsolatedPostgres } = require("./harness/ci-postgres.cjs");
const nest = require("./harness/ci-nest-boot.cjs");

const K6_SCRIPT = path.join(ROOT, "tooling/engine-acceptance/k6/scenario-mix.js");

function outDir() {
  const d =
    process.env.AIPO_QA_HARNESS_OUT ||
    path.join(ROOT, "_tmp_qa_harness", "qa6-measure");
  fs.mkdirSync(d, { recursive: true });
  return d;
}

function writeJson(abs, obj) {
  fs.writeFileSync(abs, `${JSON.stringify(obj, null, 2)}\n`, "utf8");
}

function findK6() {
  const r = spawnSync("k6", ["version"], { encoding: "utf8" });
  if (r.status === 0) return "k6";
  return null;
}

function extractSummaryMetrics(summary) {
  const metrics = summary && summary.metrics ? summary.metrics : {};
  const pick = (name) => {
    const m = metrics[name];
    if (!m) return null;
    const values = m.values || m;
    return {
      p50: values["p(50)"] ?? values.med ?? null,
      p95: values["p(95)"] ?? null,
      p99: values["p(99)"] ?? null,
      avg: values.avg ?? null,
      max: values.max ?? null,
    };
  };
  const failed = metrics.http_req_failed;
  let errorRate = null;
  if (failed) {
    if (failed.values && typeof failed.values.rate === "number") errorRate = failed.values.rate;
    else if (typeof failed.rate === "number") errorRate = failed.rate;
    else if (typeof failed.value === "number") errorRate = failed.value;
  }
  const reqs = metrics.http_reqs || {};
  const reqCount = reqs.count ?? (reqs.values && reqs.values.count) ?? null;
  const reqRate = reqs.rate ?? (reqs.values && reqs.values.rate) ?? null;
  const tagged = {};
  for (const [key, val] of Object.entries(metrics)) {
    const m = key.match(/^http_req_duration\{scenario:([^}]+)\}$/);
    if (!m) continue;
    const values = val.values || val;
    tagged[m[1]] = {
      p50: values["p(50)"] ?? values.med ?? null,
      p95: values["p(95)"] ?? null,
      p99: values["p(99)"] ?? null,
    };
  }
  const checks = summary && summary.root_group && summary.root_group.checks
    ? Object.fromEntries(
        Object.entries(summary.root_group.checks).map(([k, v]) => [
          k,
          { passes: v.passes, fails: v.fails },
        ]),
      )
    : null;
  return {
    http_req_duration: pick("http_req_duration"),
    http_req_failed_rate: errorRate,
    http_reqs: { count: reqCount, rate: reqRate },
    iterations: metrics.iterations || null,
    by_scenario: Object.keys(tagged).length ? tagged : null,
    checks,
  };
}

async function runQa6Measure(opts = {}) {
  assertKillSwitch(opts);
  const oracle = probePerfOracle();
  if (oracle.budget_status !== "UNSPECIFIED_PERF_BUDGET" && oracle.available) {
    /* 수치가 있어도 이 러너는 candidate 를 canonical 에 쓰지 않는다 */
  }

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
      const err = new Error("DATABASE_URL required for QA6 measure");
      err.code = "AIPO_QA_HARNESS_FAILURE";
      throw err;
    }
    assertDbTarget({ databaseUrl, target_env: opts.target_env });
    pgPrep = await prepareIsolatedPostgres({
      databaseUrl,
      target_env: opts.target_env,
    });
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
  const summaryPath = path.join(dir, "k6-summary.json");
  let k6 = { ran: false, exitCode: null, stderr: "", metrics: null };

  if (!k6bin) {
    k6 = { ran: false, exitCode: null, reason: "k6_not_installed", blocked: "BLOCKED_ENV_CAPABILITY" };
  } else {
    const env = {
      ...process.env,
      AIPO_QA_BASE_URL: baseUrl,
      AIPO_QA_PERF_BUDGET_STATUS: "UNSPECIFIED_PERF_BUDGET",
      AIPO_QA_MEASUREMENT_ONLY: "1",
      AIPO_QA_SYNTHETIC_NS: opts.synthetic_account_namespace || "qa-synth-ci",
      AIPO_QA_USER_BEARER: `Bearer ${userToken}`,
    };
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
      { encoding: "utf8", env, cwd: ROOT, timeout: 120_000 },
    );
    let summary = null;
    if (fs.existsSync(summaryPath)) {
      try {
        summary = JSON.parse(fs.readFileSync(summaryPath, "utf8"));
      } catch {
        summary = null;
      }
    }
    k6 = {
      ran: true,
      exitCode: spawned.status,
      stderr: String(spawned.stderr || "").slice(0, 4000),
      metrics: extractSummaryMetrics(summary),
      summary_present: Boolean(summary),
      summary_sha256: fs.existsSync(summaryPath)
        ? crypto.createHash("sha256").update(fs.readFileSync(summaryPath)).digest("hex")
        : null,
      trend_stats: "avg,min,med,max,p(50),p(90),p(95),p(99)",
    };
  }

  const phantomHits = PHANTOM_PATHS.filter((p) =>
    fs.readFileSync(K6_SCRIPT, "utf8").includes(`"${p}"`) ||
    fs.readFileSync(K6_SCRIPT, "utf8").includes("`" + p + "`"),
  );

  const result = {
    schema: "harness.qa6-measure.v1",
    suite_id: "QA6_MEASURE",
    github_run_id: process.env.GITHUB_RUN_ID || null,
    github_run_attempt: process.env.GITHUB_RUN_ATTEMPT || null,
    commit_sha: process.env.GITHUB_SHA || null,
    runner_arch: process.env.RUNNER_ARCH || null,
    runner_os: process.env.RUNNER_OS || null,
    verdict_class: "NON_VERDICT",
    acceptance_verdict: "NOT_A_QA6_PASS",
    cannot_be_canonical_qa6_pass: true,
    budget_status: "MEASUREMENT_ONLY",
    official_budget_status: oracle.budget_status,
    numeric_invention_forbidden: true,
    thresholds_applied: false,
    harness_status: k6.ran ? (k6.summary_present ? "PASS" : "HARNESS_FAILURE") : "BLOCKED_ENVIRONMENT",
    product_result_status: "NOT_APPLICABLE",
    routes: SCENARIOS.map((s) => ({
      tag: s.tag,
      method: s.method,
      path: s.path,
      auth: s.auth,
      destructive: s.destructive,
    })),
    phantom_paths_present: phantomHits,
    k6,
    postgres: pgPrep ? { classification: pgPrep.classification, host: pgPrep.host } : { skipped: skipBoot },
    secrets: { committed: false, redacted_auth: redactAuthorization(`Bearer ${userToken}`) },
    notes: [
      "MEASUREMENT EVIDENCE != ACCEPTANCE VERDICT",
      "Human/PO approved V1 numbers into perf-budget.v1.json. This runner remains NON_VERDICT and must not write canonical qa6-result PASS.",
    ],
  };

  writeJson(path.join(dir, "qa6-measure.v1.json"), result);
  if (started) nest.stopNest({ pid: started.pid, workDir: started.paths.dir });

  if (result.harness_status === "HARNESS_FAILURE") {
    const err = new Error("QA6 measure harness failure");
    err.code = "AIPO_QA_HARNESS_FAILURE";
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
  runQa6Measure({
    target_env: get("--target-env") || process.env.AIPO_QA_TARGET_ENV || "ci",
    hostname: get("--hostname") || process.env.AIPO_QA_HOSTNAME || "localhost",
    synthetic_account_namespace:
      get("--synthetic-ns") || process.env.AIPO_QA_SYNTHETIC_NS || "qa-synth-ci",
    databaseUrl: get("--database-url") || resolveHarnessDatabaseUrl(),
    skipBoot: args.includes("--skip-boot"),
  })
    .then((out) => {
      console.log("[run-qa6-measure] NON_VERDICT", out.harness_status);
    })
    .catch((e) => {
      try {
        writeJson(path.join(outDir(), "harness-failure.v1.json"), {
          code: e.code || "FAIL",
          message: e.message,
        });
      } catch {
        /* upload path still needs a file when wait fails early */
      }
      console.error(`[run-qa6-measure] ${e.code || "FAIL"} — ${e.message}`);
      process.exit(e.code === "AIPO_QA_KILL_SWITCH" || e.code === "AIPO_QA_HARNESS_FAILURE" ? 2 : 1);
    });
}

if (require.main === module) {
  main();
}

module.exports = { runQa6Measure };
