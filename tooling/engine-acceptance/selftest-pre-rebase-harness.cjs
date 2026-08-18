/**
 * Pre-rebase harness selftest — Postgres/Nest/k6 풀스택 없이 결정론적 검사.
 */
"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const http = require("node:http");
const { ROOT } = require("./lib/hash-scope.cjs");
const catalog = require("./k6/route-catalog.cjs");
const ident = require("./lib/synthetic-identity.cjs");
const { evaluateKillSwitch, evaluateDbTarget, assemblePostgresUrl } = require("./kill-switch.cjs");
const { listMigrationFiles } = require("./harness/ci-postgres.cjs");
const { createLlmFaultServer } = require("./harness/llm-fault-server.cjs");
const { selectDbFaultStrategy } = require("./harness/db-fault.cjs");
const {
  probeFaultHook,
  assertHarnessOrchestratorAuthority,
} = require("./lib/fault-hook.cjs");
const { inventoryAdminRoutes, coverageDrift } = require("./qa8/admin-route-inventory.cjs");
const { CASES, casesForInventoryCoverage } = require("./qa8/adversarial-cases.cjs");
const { probePerfOracle } = require("./lib/perf-oracle.cjs");

function run() {
  const fails = [];
  const check = (name, fn) => {
    try {
      fn();
      console.log(`  PASS ${name}`);
    } catch (e) {
      fails.push(`${name}: ${e instanceof Error ? e.message : e}`);
      console.log(`  FAIL ${name}: ${e instanceof Error ? e.message : e}`);
    }
  };

  console.log("[selftest-pre-rebase-harness] start");

  check("k6_routes_match_catalog", () => {
    const src = fs.readFileSync(
      path.join(ROOT, "tooling/engine-acceptance/k6/scenario-mix.js"),
      "utf8",
    );
    for (const s of catalog.SCENARIOS) {
      assert.ok(src.includes(s.path), `k6 missing ${s.path}`);
    }
    for (const phantom of catalog.PHANTOM_PATHS) {
      assert.equal(src.includes(`"${phantom}"`), false, `phantom ${phantom}`);
      assert.equal(src.includes("`" + phantom + "`"), false, `phantom tmpl ${phantom}`);
      assert.equal(src.includes("${BASE}" + phantom), false, `phantom concat ${phantom}`);
    }
    assert.equal(src.includes("/v1/feed"), false);
    assert.ok(src.includes("/api/v1/"));
  });

  check("k6_destructive_excluded", () => {
    const src = fs.readFileSync(
      path.join(ROOT, "tooling/engine-acceptance/k6/scenario-mix.js"),
      "utf8",
    );
    assert.equal(src.includes("/participate"), false);
    assert.equal(src.includes("/withdraw"), false);
    assert.equal(src.includes("balance-adjust"), false);
    for (const s of catalog.SCENARIOS) {
      assert.equal(s.destructive, false);
    }
  });

  check("k6_measurement_only_has_no_threshold", () => {
    const src = fs.readFileSync(
      path.join(ROOT, "tooling/engine-acceptance/k6/scenario-mix.js"),
      "utf8",
    );
    assert.ok(src.includes("AIPO_QA_MEASUREMENT_ONLY"));
    assert.ok(src.includes("thresholds: {}"));
    const oracle = probePerfOracle();
    assert.equal(oracle.budget_status, "SPECIFIED");
    assert.equal(oracle.available, true);
    assert.ok(oracle.specified_tag_count >= 4);
  });

  check("synthetic_user_token_no_static_secret", () => {
    const secrets = ident.createEphemeralSecrets();
    assert.ok(secrets.jwtUserSecret.length >= 32);
    const token = ident.mintUserToken(secrets.jwtUserSecret, ident.SYNTH_USER_A);
    assert.equal(token.split(".").length, 3);
    const src = fs.readFileSync(
      path.join(ROOT, "tooling/engine-acceptance/lib/synthetic-identity.cjs"),
      "utf8",
    );
    ident.assertNoCommittedStaticSecret(src);
    const matrix = ident.buildIdentityMatrix(secrets);
    assert.ok(matrix.wrong_audience.authorization);
    assert.ok(matrix.wrong_issuer.authorization);
    assert.ok(matrix.alg_none.authorization);
    const red = ident.redactAuthorization(matrix.user_a.authorization);
    assert.ok(red.startsWith("Bearer sha256:"));
    assert.equal(red.includes(token.slice(0, 20)), false);
  });

  check("db_target_denies_production_and_supabase", () => {
    const denySupa = evaluateDbTarget({
      databaseUrl: assemblePostgresUrl({
        user: "u",
        password: "p",
        host: "db.mgsytcetsiecllmhcyox.supabase.co",
        database: "postgres",
      }),
      target_env: "ci",
    });
    assert.equal(denySupa.ok, false);
    const denyProd = evaluateDbTarget({
      databaseUrl: assemblePostgresUrl({
        user: "u",
        password: "p",
        host: "peotteok.com",
        database: "postgres",
      }),
      target_env: "ci",
    });
    assert.equal(denyProd.ok, false);
    const allowLocal = evaluateDbTarget({
      databaseUrl: assemblePostgresUrl({
        user: "postgres",
        password: "postgres",
        host: "127.0.0.1",
        database: "aipo_qa_synth",
      }),
      target_env: "ci",
    });
    assert.equal(allowLocal.ok, true);
    assert.equal(allowLocal.classification, "synthetic_ci_postgres");
    const allowSvc = evaluateDbTarget({
      databaseUrl: assemblePostgresUrl({
        user: "postgres",
        password: "postgres",
        host: "postgres",
        database: "aipo_qa_synth",
      }),
      target_env: "ci",
    });
    assert.equal(allowSvc.ok, true);
    const denyRemote = evaluateDbTarget({
      databaseUrl: assemblePostgresUrl({
        user: "u",
        password: "p",
        host: "8.8.8.8",
        database: "postgres",
      }),
      target_env: "ci",
    });
    assert.equal(denyRemote.ok, false);
  });

  check("kill_switch_still_denies_production", () => {
    assert.equal(
      evaluateKillSwitch({
        target_env: "production",
        hostname: "localhost",
        synthetic_account_namespace: "qa-synth-x",
      }).ok,
      false,
    );
  });

  check("migration_order_deterministic", () => {
    const a = listMigrationFiles().map((f) => f.name);
    const b = listMigrationFiles().map((f) => f.name);
    assert.deepEqual(a, b);
    assert.ok(a.length >= 10);
    const sorted = [...a].sort();
    assert.deepEqual(a, sorted);
  });

  check("db_fault_strategy_is_executable_shape", () => {
    const plan = selectDbFaultStrategy();
    assert.ok(typeof plan.executable === "boolean");
    assert.ok(["docker_stop_start", "unavailable"].includes(plan.strategy));
  });

  check("db_fault_restore_finds_stopped_container", () => {
    const dbFault = require("./harness/db-fault.cjs");
    const stopped = dbFault.parseDockerPsLines(
      [
        "abc123\t1634dc53_pgvectorpgvectorpg16_ac9c0c\tpgvector/pgvector:pg16\tExited (0) 2 seconds ago\t",
      ].join("\n"),
    );
    assert.equal(
      dbFault.pickPostgresContainer(stopped),
      "1634dc53_pgvectorpgvectorpg16_ac9c0c",
    );
    const runningOnlyEmpty = dbFault.parseDockerPsLines("");
    assert.equal(dbFault.pickPostgresContainer(runningOnlyEmpty), null);
    const src = fs.readFileSync(path.join(ROOT, "tooling/engine-acceptance/harness/db-fault.cjs"), "utf8");
    assert.ok(src.includes("includeStopped"));
    assert.ok(src.includes('docker", ["ps"]') || src.includes("ps -a") || src.includes('"-a"'));
    assert.ok(src.includes("containerName"));
  });

  check("qa5_recovery_layers_not_or_ping", () => {
    const orchSrc = fs.readFileSync(
      path.join(ROOT, "tooling/engine-acceptance/harness/fault-orchestrator.cjs"),
      "utf8",
    );
    assert.ok(orchSrc.includes("CONTAINER_RECOVERED"));
    assert.ok(orchSrc.includes("POSTGRES_READY"));
    assert.ok(orchSrc.includes("DIRECT_CLIENT_RECOVERED"));
    assert.ok(orchSrc.includes("PRODUCT_DB_PATH_RECOVERED"));
    assert.ok(orchSrc.includes("same_nest"));
    assert.ok(orchSrc.includes("containerName"));
    assert.equal(orchSrc.includes("afterPing && afterPing.ok) || healthIndicatesDb"), false);
    const runnerSrc = fs.readFileSync(
      path.join(ROOT, "tooling/engine-acceptance/run-qa5-fault.cjs"),
      "utf8",
    );
    assert.ok(runnerSrc.includes("QA5_DB_RECOVERY_PROOF"));
    assert.ok(runnerSrc.includes("does_not_replace_qa5_result"));
    assert.ok(runnerSrc.includes("nestPid"));
  });

  check("qa6_measure_requests_p99_trend_stats", () => {
    const src = fs.readFileSync(
      path.join(ROOT, "tooling/engine-acceptance/run-qa6-measure.cjs"),
      "utf8",
    );
    assert.ok(src.includes("p(99)"));
    assert.ok(src.includes("summary-trend-stats"));
    assert.ok(src.includes("http_req_failed_rate"));
    assert.ok(src.includes("GITHUB_RUN_ID"));
  });

  check("detector_rejects_inert_placeholder", () => {
    const fake = {
      injectFault() {
        return { ok: true };
      },
    };
    const src = "exports.injectFault = function injectFault() { return { ok: true }; }\n";
    const auth = assertHarnessOrchestratorAuthority(fake, src, { runnerSrc: "" });
    assert.equal(auth.ok, false);
  });

  check("detector_accepts_live_orchestrator", () => {
    const probe = probeFaultHook();
    assert.equal(probe.available, true, probe.findings.join("; "));
    assert.equal(probe.adapter_rel, "tooling/engine-acceptance/harness/fault-orchestrator.cjs");
  });

  check("qa5_runner_uses_orchestrator", () => {
    const src = fs.readFileSync(
      path.join(ROOT, "tooling/engine-acceptance/run-qa5-fault.cjs"),
      "utf8",
    );
    assert.ok(src.includes("fault-orchestrator"));
    assert.ok(src.includes("executeLlmFault"));
    assert.ok(src.includes("executeDbFault"));
  });

  check("admin_inventory_derived_not_hardcoded_19", () => {
    const inv = inventoryAdminRoutes();
    assert.ok(inv.controller_count >= 1);
    assert.ok(inv.route_count >= 1);
    const src = fs.readFileSync(
      path.join(ROOT, "tooling/engine-acceptance/qa8/admin-route-inventory.cjs"),
      "utf8",
    );
    assert.equal(/\b19\b/.test(src) && src.includes("hard-code"), false);
    const drift = coverageDrift(inv, casesForInventoryCoverage());
    assert.ok(Array.isArray(drift.controllers_without_case));
  });

  check("adversarial_case_schema", () => {
    const required = ["id", "method", "path", "identity", "expected_current"];
    for (const c of CASES) {
      for (const k of required) {
        assert.ok(c[k], `${c.id} missing ${k}`);
      }
    }
    const ids = CASES.map((c) => c.id);
    assert.equal(new Set(ids).size, ids.length);
  });

  check("qa8_redacts_tokens", () => {
    const src = fs.readFileSync(
      path.join(ROOT, "tooling/engine-acceptance/run-qa8-adversarial.cjs"),
      "utf8",
    );
    assert.ok(src.includes("redactAuthorization"));
    assert.ok(src.includes("harness_status"));
    assert.ok(src.includes("product_security_verdict"));
    assert.ok(src.includes("does_not_replace_qa8_result"));
  });

  check("qa6_measure_is_non_verdict", () => {
    const src = fs.readFileSync(
      path.join(ROOT, "tooling/engine-acceptance/run-qa6-measure.cjs"),
      "utf8",
    );
    assert.ok(src.includes("NON_VERDICT"));
    assert.ok(src.includes("cannot_be_canonical_qa6_pass"));
    assert.ok(src.includes("AIPO_QA_MEASUREMENT_ONLY"));
    const budget = JSON.parse(
      fs.readFileSync(
        path.join(ROOT, "governance/engine-acceptance/perf-budget.v1.json"),
        "utf8",
      ),
    );
    assert.equal(budget.status, "SPECIFIED");
    assert.equal(budget.human_po_ack && budget.human_po_ack.answer, "YES");
    for (const t of Object.values(budget.thresholds_by_tag || {})) {
      assert.equal(t.p95_ms, 30);
      assert.equal(t.error_rate, 0.01);
      assert.equal(typeof t.source, "string");
      assert.ok(t.source.includes("human-po-ack"));
      assert.notEqual(t.status, "UNSPECIFIED_PERF_BUDGET");
    }
  });

  check("workflow_additive_jobs_present", () => {
    const wf = fs.readFileSync(
      path.join(ROOT, ".github/workflows/engine-acceptance.yml"),
      "utf8",
    );
    assert.ok(/qa5-fault:/.test(wf));
    assert.ok(/qa6-measure:/.test(wf));
    assert.ok(/qa8-adversarial:/.test(wf));
    assert.ok(wf.includes("run-qa5-fault.cjs"));
    assert.ok(wf.includes("run-qa6-measure.cjs"));
    assert.ok(wf.includes("run-qa8-adversarial.cjs"));
    assert.ok(wf.includes("run-qa5.cjs"));
    assert.ok(wf.includes("UNSPECIFIED_PERF_BUDGET"));
    assert.ok(wf.includes("AIPO_QA_PGHOST"));
    assert.ok(wf.includes("127.0.0.1"));
    assert.equal(wf.includes(["postgresql://", "postgres", ":", "postgres", "@"].join("")), false);
    const qa5Case = wf.match(/QA5\)[\s\S]*?;;/);
    assert.ok(qa5Case && qa5Case[0].includes("run-qa5.cjs"));
  });

  check("protected_product_untouched_in_this_tree_probe", () => {
    for (const rel of [
      "tooling/engine-acceptance/run-qa5-fault.cjs",
      "tooling/engine-acceptance/run-qa6-measure.cjs",
      "tooling/engine-acceptance/run-qa8-adversarial.cjs",
    ]) {
      assert.ok(fs.existsSync(path.join(ROOT, rel)));
    }
  });

  const asyncChecks = ["llm_fault_server_real_429"];
  const pending = [];
  return { fails, asyncChecks, pending };
}

async function runAsync() {
  const srv = createLlmFaultServer({ port: 0, scenario: "http_429" });
  const port = await srv.listen();
  const status = await new Promise((resolve, reject) => {
    const req = http.request(
      {
        host: "127.0.0.1",
        port,
        path: "/chat/completions",
        method: "POST",
        headers: { "content-type": "application/json" },
      },
      (res) => {
        res.resume();
        res.on("end", () => resolve(res.statusCode));
      },
    );
    req.on("error", reject);
    req.end("{}");
  });
  await srv.close();
  if (status !== 429) throw new Error(`expected 429 got ${status}`);
}

function main() {
  const { fails } = run();
  runAsync()
    .then(() => {
      console.log("  PASS llm_fault_server_real_429_async");
      if (fails.length) {
        console.error("[selftest-pre-rebase-harness] FAIL");
        for (const f of fails) console.error(`  - ${f}`);
        process.exit(1);
      }
      console.log("[selftest-pre-rebase-harness] PASS");
    })
    .catch((e) => {
      console.error("[selftest-pre-rebase-harness] FAIL");
      for (const f of fails) console.error(`  - ${f}`);
      console.error(`  - llm_fault_server_real_429_async: ${e.message}`);
      process.exit(1);
    });
}

if (require.main === module) {
  main();
}

module.exports = { run };
