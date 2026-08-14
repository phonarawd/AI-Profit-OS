/**
 * QA5 live fault/recovery — 제품 경로 HTTP + isolated CI Postgres.
 * Canonical qa5-result.v1.json 을 덮어쓰지 않는다 (증거 세탁 금지).
 */
"use strict";

const fs = require("node:fs");
const path = require("node:path");
const http = require("node:http");
const { createRequire } = require("node:module");
const { assertKillSwitch, assertDbTarget, resolveHarnessDatabaseUrl } = require("./kill-switch.cjs");
const { ROOT } = require("./lib/hash-scope.cjs");
const { probeFaultHook } = require("./lib/fault-hook.cjs");
const {
  createEphemeralSecrets,
  mintUserToken,
  mintAdminToken,
  SYNTH_USER_A,
  ADMIN_ROLE_SUPER,
  redactAuthorization,
} = require("./lib/synthetic-identity.cjs");
const orch = require("./harness/fault-orchestrator.cjs");
const { prepareIsolatedPostgres } = require("./harness/ci-postgres.cjs");
const nest = require("./harness/ci-nest-boot.cjs");

const nestRequire = createRequire(path.join(ROOT, "services/api-nest/package.json"));

function outDir() {
  const d =
    process.env.AIPO_QA_HARNESS_OUT ||
    path.join(ROOT, "_tmp_qa_harness", "qa5-fault");
  fs.mkdirSync(d, { recursive: true });
  return d;
}

function writeJson(abs, obj) {
  fs.writeFileSync(abs, `${JSON.stringify(obj, null, 2)}\n`, "utf8");
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

async function countLedgerJournals(databaseUrl) {
  return withPgClient(databaseUrl, async (client) => {
    const r = await client.query("SELECT count(*)::int AS n FROM public.ledger_journals");
    return r.rows[0] ? r.rows[0].n : null;
  });
}

function httpJsonGet(baseUrl, pth, headers, timeoutMs = 12_000) {
  return new Promise((resolve) => {
    const u = new URL(pth, baseUrl);
    const req = http.request(
      { protocol: u.protocol, hostname: u.hostname, port: u.port, path: u.pathname + u.search, method: "GET", timeout: timeoutMs, headers: headers || {} },
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
    req.end();
  });
}

async function runQa5Fault(opts = {}) {
  assertKillSwitch(opts);
  const databaseUrl = opts.databaseUrl || resolveHarnessDatabaseUrl();
  if (databaseUrl) assertDbTarget({ databaseUrl, target_env: opts.target_env });

  const probe = probeFaultHook();
  if (!probe.available) {
    const result = {
      schema: "harness.qa5-fault.v1",
      harness_status: "HARNESS_FAILURE",
      product_result_status: "NOT_RUN",
      reason: "orchestrator authority not satisfied",
      probe,
      verdict_class: "HARNESS_FAILURE",
    };
    writeJson(path.join(outDir(), "qa5-fault-harness.v1.json"), result);
    const err = new Error("QA5 fault harness: orchestrator not available");
    err.code = "AIPO_QA_HARNESS_FAILURE";
    throw err;
  }

  const secrets = createEphemeralSecrets();
  const llm = await orch.startLlmFaultServer({ scenario: "healthy" });
  const userBearer = `Bearer ${mintUserToken(secrets.jwtUserSecret, SYNTH_USER_A)}`;

  const skipBoot = opts.skipBoot === true || process.env.AIPO_QA5_SKIP_BOOT === "1";
  let started = null;
  let pgPrep = null;
  const port = Number(opts.port || process.env.PORT || 4000);
  const productBaseUrl = opts.productBaseUrl || `http://127.0.0.1:${port}`;

  if (!skipBoot) {
    if (!databaseUrl) {
      const err = new Error("DATABASE_URL required for live QA5 fault");
      err.code = "AIPO_QA_HARNESS_FAILURE";
      throw err;
    }
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
        LLM_PROVIDER: "openai",
        LLM_BASE_URL: llm.baseUrl,
        LLM_API_KEY: secrets.llmApiKey,
        JWT_USER_SECRET: secrets.jwtUserSecret,
        JWT_ADMIN_SECRET: secrets.jwtAdminSecret,
      },
    });
    await nest.waitForHealth({ port });
  }

  // Axis1 (Mission 2 Scenario A) — ledger must stay untouched by an AI-only
  // fault. Journal count is a real DB read, not an assumption.
  const ledgerCountBeforeLlmFault =
    !skipBoot && databaseUrl ? await countLedgerJournals(databaseUrl).catch(() => null) : null;

  const llmScenarios = ["http_429", "http_500", "http_503", "timeout", "invalid_json", "truncated"];
  const llmEvidence = [];
  for (const scenario of llmScenarios) {
    const ev = await orch.executeLlmFault({
      scenario,
      productBaseUrl,
      authorization: userBearer,
    });
    llmEvidence.push(ev);
  }
  const refuse = await orch.executeLlmFault({
    scenario: "connection_refuse",
    productBaseUrl,
    authorization: userBearer,
  });
  llmEvidence.push(refuse);
  await orch.startLlmFaultServer({ scenario: "healthy" });

  const ledgerCountAfterLlmFault =
    !skipBoot && databaseUrl ? await countLedgerJournals(databaseUrl).catch(() => null) : null;
  const ledgerUntouchedByAiFault =
    ledgerCountBeforeLlmFault !== null &&
    ledgerCountAfterLlmFault !== null &&
    ledgerCountBeforeLlmFault === ledgerCountAfterLlmFault;

  const dbEvidence = await orch.executeDbFault({
    productBaseUrl,
    databaseUrl,
    nestPid: started ? started.pid : opts.nestPid,
    authorization: userBearer,
  });

  // Axis2 (Mission 2 Scenario B) — post-recovery ledger/bucket invariant
  // scan, real admin HTTP call against the SAME recovered Nest process.
  let postRecoveryReconScan = null;
  if (!skipBoot && dbEvidence.product_recovered === true) {
    const adminBearer = `Bearer ${mintAdminToken(secrets.jwtAdminSecret, "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", { role: ADMIN_ROLE_SUPER })}`;
    const recon = await httpJsonGet(productBaseUrl, "/api/v1/admin/ledger/recon", {
      authorization: adminBearer,
    });
    postRecoveryReconScan = {
      http_status: recon.status,
      ok: Boolean(recon.parsed && recon.parsed.ok === true),
      mismatches: recon.parsed && Array.isArray(recon.parsed.mismatches) ? recon.parsed.mismatches.length : null,
      journalsChecked: recon.parsed ? recon.parsed.journalsChecked : null,
    };
  }

  const llmObserved = llmEvidence.some((e) => e.observed_failure);
  const dbBlocked = dbEvidence.strategy && dbEvidence.strategy.executable === false;
  const layers = dbEvidence.recovery_layers || {};
  const depRecovered =
    layers.CONTAINER_RECOVERED === true &&
    layers.POSTGRES_READY === true &&
    layers.DIRECT_CLIENT_RECOVERED === true;

  let classification = "UNCLASSIFIED";
  if (dbBlocked) classification = "ENVIRONMENT_BLOCKER";
  else if (!dbEvidence.fault_induced || !dbEvidence.product_observed_failure) {
    classification = "HARNESS_RECOVERY_DEFECT";
  } else if (!depRecovered) {
    const startFailed = dbEvidence.restore && dbEvidence.restore.reason === "docker_start_failed";
    classification = startFailed ? "ENVIRONMENT_BLOCKER" : "HARNESS_RECOVERY_DEFECT";
  } else if (!dbEvidence.product_recovered || !dbEvidence.same_nest_process) {
    classification = "PRODUCT_RECOVERY_DEFECT";
  } else {
    /* 원 결함은 중지 컨테이너를 running-only 로 재탐색한 하네스. 이번 실행에서 복구 증명. */
    classification = "HARNESS_RECOVERY_DEFECT";
  }

  const reconScanPass = postRecoveryReconScan ? postRecoveryReconScan.ok === true : false;

  const proofPass =
    classification !== "ENVIRONMENT_BLOCKER" &&
    dbEvidence.fault_induced &&
    dbEvidence.product_observed_failure &&
    depRecovered &&
    dbEvidence.product_recovered === true &&
    dbEvidence.same_nest_process === true &&
    reconScanPass;

  // Mission-2 Scenario A axis1 verdict: real fault observed, product did not
  // fake success, ledger stayed untouched by an AI-only dependency fault.
  const axis1429 = llmEvidence.find((e) => e.scenario === "http_429");
  const axis1Pass = Boolean(
    axis1429 &&
      axis1429.observed_failure === true &&
      axis1429.response &&
      axis1429.response.body_class !== "ok_text" &&
      ledgerUntouchedByAiFault,
  );

  let harness_status = "PASS";
  if (!llmObserved) harness_status = "HARNESS_FAILURE";
  if (dbBlocked) {
    /* LLM 축은 성공 가능 · DB 는 환경 차단 */
  } else if (!dbEvidence.fault_induced || !dbEvidence.product_observed_failure) {
    harness_status = "HARNESS_FAILURE";
  } else if (!depRecovered) {
    harness_status = "HARNESS_FAILURE";
  }

  const result = {
    schema: "harness.qa5-fault.v1",
    suite_id: "QA5_FAULT_ORCH",
    measuredAt: new Date().toISOString(),
    baseline_id: opts.baseline_id || null,
    github_run_id: process.env.GITHUB_RUN_ID || null,
    commit_sha: process.env.GITHUB_SHA || null,
    harness_status,
    product_result_status: "OBSERVED",
    verdict_class: harness_status === "PASS" ? "HARNESS_VALIDATION" : "HARNESS_FAILURE",
    QA5_DB_RECOVERY_PROOF: proofPass ? "PASS" : "FAIL",
    QA5_DB_RECOVERY_CLASSIFICATION: classification,
    NEW_PROTECTED_REPAIR_CANDIDATE: classification === "PRODUCT_RECOVERY_DEFECT",
    QA5_AXIS1_429_DEGRADE_PROOF: axis1Pass ? "PASS" : "FAIL",
    axis1_429_degrade: {
      verdict: axis1Pass ? "PASS" : "FAIL",
      observed_failure: Boolean(axis1429 && axis1429.observed_failure),
      response_body_class: axis1429 && axis1429.response ? axis1429.response.body_class : null,
      ledger_journal_count_before: ledgerCountBeforeLlmFault,
      ledger_journal_count_after: ledgerCountAfterLlmFault,
      ledger_untouched: ledgerUntouchedByAiFault,
    },
    axis2_post_recovery_ledger_scan: {
      verdict: reconScanPass ? "PASS" : "FAIL",
      scan: postRecoveryReconScan,
      same_nest_process: dbEvidence.same_nest_process === true,
      nest_restarted: false,
    },
    non_canonical: true,
    does_not_replace_qa5_result: true,
    mock: false,
    probe: {
      available: probe.available,
      adapter_rel: probe.adapter_rel,
      findings: probe.findings,
    },
    kill_switch: {
      target_env: opts.target_env,
      hostname: opts.hostname,
      synthetic_ns: opts.synthetic_account_namespace,
    },
    postgres: pgPrep
      ? { classification: pgPrep.classification, host: pgPrep.host }
      : { skipped: skipBoot },
    llm: {
      baseUrl: llm.baseUrl,
      scenarios: llmEvidence,
      observed_any_failure: llmObserved,
    },
    db: dbEvidence,
    nest_log_excerpt: started
      ? String(nest.collectLogs({ workDir: started.paths.dir }) || "")
          .slice(-4000)
          .replace(/Bearer\s+[A-Za-z0-9._-]+/g, "Bearer [redacted]")
          .replace(/postgres:[^@\s]+@/gi, "postgres:[redacted]@")
      : null,
    secrets: { committed: false, redacted_auth: redactAuthorization(userBearer) },
    notes: [
      "MEASUREMENT/HARNESS evidence only — not canonical QA5 PASS.",
      "No product fault API. LLM_BASE_URL pointed at local fault server.",
      "Recovery layers are independent: container → pg_isready → fresh client → same Nest DB path.",
      "Nest is not restarted to fake recovery.",
    ],
  };

  const dir = outDir();
  writeJson(path.join(dir, "qa5-fault-harness.v1.json"), result);

  if (started) nest.stopNest({ pid: started.pid, workDir: started.paths.dir });
  await orch.stopLlmFaultServer();

  if (harness_status === "HARNESS_FAILURE") {
    const err = new Error("QA5 fault harness failed to observe real faults");
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
  runQa5Fault({
    target_env: get("--target-env") || process.env.AIPO_QA_TARGET_ENV || "ci",
    hostname: get("--hostname") || process.env.AIPO_QA_HOSTNAME || "localhost",
    synthetic_account_namespace:
      get("--synthetic-ns") || process.env.AIPO_QA_SYNTHETIC_NS || "qa-synth-ci",
    databaseUrl: get("--database-url") || resolveHarnessDatabaseUrl(),
    skipBoot: args.includes("--skip-boot"),
  })
    .then((out) => {
      console.log("[run-qa5-fault] HARNESS_VALIDATION", out.harness_status);
      console.log(
        JSON.stringify(
          {
            harness_status: out.harness_status,
            QA5_DB_RECOVERY_PROOF: out.QA5_DB_RECOVERY_PROOF,
            QA5_DB_RECOVERY_CLASSIFICATION: out.QA5_DB_RECOVERY_CLASSIFICATION,
            QA5_AXIS1_429_DEGRADE_PROOF: out.QA5_AXIS1_429_DEGRADE_PROOF,
            llm: out.llm.observed_any_failure,
          },
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
        });
      } catch {
        /* upload path still needs a file when wait fails early */
      }
      console.error(`[run-qa5-fault] ${e.code || "FAIL"} — ${e.message}`);
      process.exit(e.code === "AIPO_QA_KILL_SWITCH" || e.code === "AIPO_QA_HARNESS_FAILURE" ? 2 : 1);
    });
}

if (require.main === module) {
  main();
}

module.exports = { runQa5Fault };
