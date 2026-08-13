/**
 * QA-5 fault seam probe — harness only · 제품 mutation 0
 *
 * 권위 = 실행 가능한 실의존성 fault orchestrator
 * (파일명만 있고 injectFault 스텁인 placeholder 는 PASS 불가).
 */
"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { ROOT } = require("./hash-scope.cjs");

const HARNESS_ORCHESTRATOR_REL =
  "tooling/engine-acceptance/harness/fault-orchestrator.cjs";
const HARNESS_RUNNER_REL = "tooling/engine-acceptance/run-qa5-fault.cjs";

/** 제품 seam 후보 (미래 Admin/Clock 웨이브). 파일명만으로는 부족. */
const CANDIDATE_RELS = [
  HARNESS_ORCHESTRATOR_REL,
  "services/api-nest/src/common/fault.ts",
  "services/api-nest/src/common/fault.js",
  "services/api-nest/src/common/fault.cjs",
  "services/api-nest/src/testing/fault-hook.ts",
  "services/api-nest/src/testing/fault-hook.cjs",
  "services/api-nest/src/testing/fault-injector.ts",
  "services/api-nest/src/resilience/fault-injector.ts",
  "tooling/engine-acceptance/hooks/fault-hook.adapter.cjs",
];

const ENV_HOOK_KEYS = [
  "AIPO_QA_FAULT",
  "AIPO_QA_INJECT_FAULT",
  "AIPO_INJECT_FAULT",
  "AIPO_FAULT_HOOK",
  "AIPO_QA5_EXECUTE_FAULTS",
];

const REQUIRED_KIND = "harness_real_dependency_fault";

/**
 * placeholder 가 통과하지 못하게 하는 권위 검사.
 * @param {object|null} mod
 * @param {string} src
 * @param {{ runnerSrc?: string }} [extra]
 */
function assertHarnessOrchestratorAuthority(mod, src, extra = {}) {
  const fails = [];
  if (!mod || typeof mod !== "object") fails.push("module not an object");
  if (!mod || mod.ORCHESTRATOR_KIND !== REQUIRED_KIND) {
    fails.push("ORCHESTRATOR_KIND must be harness_real_dependency_fault");
  }
  for (const fn of ["injectFault", "clearFault", "executeLlmFault", "executeDbFault"]) {
    if (!mod || typeof mod[fn] !== "function") fails.push(`missing function ${fn}`);
  }
  const combined = `${src}\n${extra.companionSrc || ""}`;
  if (!/createServer\s*\(/.test(combined) && !/http\.createServer/.test(combined)) {
    fails.push("source must actually create an HTTP server (listen/createServer)");
  }
  if (!/docker/.test(combined) || !/stop/.test(combined)) {
    fails.push("source must include a docker stop/start DB fault strategy");
  }
  const runnerSrc = extra.runnerSrc;
  if (typeof runnerSrc === "string") {
    if (!/fault-orchestrator/.test(runnerSrc) || !/executeLlmFault|executeDbFault/.test(runnerSrc)) {
      fails.push("QA5 runner must require and invoke the orchestrator");
    }
  }
  return { ok: fails.length === 0, fails };
}

function readRel(rel) {
  const abs = path.join(ROOT, rel);
  if (!fs.existsSync(abs)) return null;
  try {
    return fs.readFileSync(abs, "utf8");
  } catch {
    return null;
  }
}

function probeHarnessOrchestrator() {
  const findings = [];
  const probed_paths = [HARNESS_ORCHESTRATOR_REL, HARNESS_RUNNER_REL];
  const src = readRel(HARNESS_ORCHESTRATOR_REL);
  if (!src) {
    return {
      available: false,
      findings: ["harness orchestrator missing"],
      probed_paths,
    };
  }
  let mod = null;
  try {
    delete require.cache[require.resolve(path.join(ROOT, HARNESS_ORCHESTRATOR_REL))];
    mod = require(path.join(ROOT, HARNESS_ORCHESTRATOR_REL));
  } catch (e) {
    return {
      available: false,
      findings: [`orchestrator require failed: ${e.message}`],
      probed_paths,
    };
  }
  const runnerSrc = readRel(HARNESS_RUNNER_REL) || "";
  const companionSrc = [
    readRel("tooling/engine-acceptance/harness/llm-fault-server.cjs") || "",
    readRel("tooling/engine-acceptance/harness/db-fault.cjs") || "",
  ].join("\n");
  const auth = assertHarnessOrchestratorAuthority(mod, src, { runnerSrc, companionSrc });
  if (!auth.ok) {
    findings.push(...auth.fails.map((f) => `orchestrator authority: ${f}`));
    return { available: false, findings, probed_paths };
  }
  if (!runnerSrc) {
    return {
      available: false,
      findings: ["run-qa5-fault.cjs missing — orchestrator unused"],
      probed_paths,
    };
  }
  return {
    available: true,
    findings: [
      "executable harness fault orchestrator (LLM HTTP server + DB docker strategy) wired from run-qa5-fault.cjs",
    ],
    probed_paths,
    adapter_rel: HARNESS_ORCHESTRATOR_REL,
  };
}

function probeFaultHook() {
  const harness = probeHarnessOrchestrator();
  const env_hooks_present = ENV_HOOK_KEYS.filter((k) => Boolean(process.env[k]));
  if (harness.available) {
    return {
      available: true,
      blocked_code: null,
      findings: harness.findings,
      probed_paths: harness.probed_paths.concat(CANDIDATE_RELS),
      env_hooks_present,
      adapter_rel: harness.adapter_rel,
      authority: REQUIRED_KIND,
    };
  }

  const findings = [...(harness.findings || [])];
  const probed_paths = [...(harness.probed_paths || [])];

  for (const rel of CANDIDATE_RELS) {
    if (rel === HARNESS_ORCHESTRATOR_REL) continue;
    const abs = path.join(ROOT, rel);
    probed_paths.push(rel);
    if (!fs.existsSync(abs)) continue;
    findings.push(
      `${rel}: product/legacy candidate present but harness orchestrator authority not satisfied`,
    );
  }

  if (env_hooks_present.length) {
    findings.push(
      `env present (${env_hooks_present.join(",")}) but no executable real-dependency fault seam`,
    );
  }

  return {
    available: false,
    blocked_code: "BLOCKED_NO_FAULT_HOOK",
    findings,
    probed_paths,
    env_hooks_present,
    adapter_rel: null,
    authority: null,
  };
}

module.exports = {
  probeFaultHook,
  probeHarnessOrchestrator,
  assertHarnessOrchestratorAuthority,
  CANDIDATE_RELS,
  ENV_HOOK_KEYS,
  HARNESS_ORCHESTRATOR_REL,
  HARNESS_RUNNER_REL,
  REQUIRED_KIND,
};
