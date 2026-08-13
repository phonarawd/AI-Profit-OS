/**
 * QA5 live fault/recovery — 제품 경로 HTTP + isolated CI Postgres.
 * Canonical qa5-result.v1.json 을 덮어쓰지 않는다 (증거 세탁 금지).
 */
"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { assertKillSwitch, assertDbTarget, resolveHarnessDatabaseUrl } = require("./kill-switch.cjs");
const { ROOT } = require("./lib/hash-scope.cjs");
const { probeFaultHook } = require("./lib/fault-hook.cjs");
const {
  createEphemeralSecrets,
  mintUserToken,
  SYNTH_USER_A,
  redactAuthorization,
} = require("./lib/synthetic-identity.cjs");
const orch = require("./harness/fault-orchestrator.cjs");
const { prepareIsolatedPostgres } = require("./harness/ci-postgres.cjs");
const nest = require("./harness/ci-nest-boot.cjs");

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

  const dbEvidence = await orch.executeDbFault({
    productBaseUrl,
    databaseUrl,
    nestPid: started ? started.pid : opts.nestPid,
    authorization: userBearer,
  });

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

  const proofPass =
    classification !== "ENVIRONMENT_BLOCKER" &&
    dbEvidence.fault_induced &&
    dbEvidence.product_observed_failure &&
    depRecovered &&
    dbEvidence.product_recovered === true &&
    dbEvidence.same_nest_process === true;

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
