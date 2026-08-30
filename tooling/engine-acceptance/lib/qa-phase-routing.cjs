/**
 * engine-acceptance.yml workflow_dispatch 정적 라우팅.
 * GitHub Actions를 실행하지 않는다. YAML 바이트만 해석한다.
 */
"use strict";

const JOB_ORDER = Object.freeze([
  "qa0-baseline",
  "qa1-deterministic",
  "qa2-synthetic-personas",
  "qa-matrix",
  "qa7-ai-eval",
  "qa5-fault",
  "qa6-measure",
  "qa8-adversarial",
  "aggregator",
]);

const QA8_MATRIX = "QA8";
const EXCLUDE_NEVER = "___never___";
const EXCLUDE_RULE_RE =
  /inputs\.qa_phase == '([^']+)' && '([^']+)' \|\| '___never___'/g;

function extractJobIf(yaml, jobId) {
  const norm = yaml.replace(/\r\n/g, "\n");
  const start = norm.search(new RegExp(`^  ${jobId}:\\s*$`, "m"));
  if (start < 0) return null;
  const rest = norm.slice(start);
  const next = rest.slice(1).search(/^  [a-zA-Z][a-zA-Z0-9-]*:\s*$/m);
  const body = next >= 0 ? rest.slice(0, next + 1) : rest;
  const ifLine = body.match(/^    if: \$\{\{ (.+) \}\}$/m);
  return ifLine ? ifLine[1] : null;
}

function evalDispatchIf(expr, phase) {
  if (!expr) return true;
  if (expr.includes("always()")) return true;
  if (expr.includes("github.event_name == 'workflow_dispatch' &&")) {
    const inner = expr.replace(/^github\.event_name == 'workflow_dispatch' && \((.+)\)\s*$/, "$1");
    if (inner === expr) {
      return /inputs\.qa_phase == '([^']+)'/.test(expr)
        ? [...expr.matchAll(/inputs\.qa_phase == '([^']+)'/g)].some((x) => x[1] === phase)
        : false;
    }
    return [...inner.matchAll(/inputs\.qa_phase == '([^']+)'/g)].some((x) => x[1] === phase);
  }
  if (expr.includes("github.event_name != 'workflow_dispatch' ||")) {
    return [...expr.matchAll(/inputs\.qa_phase == '([^']+)'/g)].some((x) => x[1] === phase);
  }
  return false;
}

function parseMatrixSuiteList(yaml) {
  const m = String(yaml || "").match(/^\s+suite:\s*\[([^\]]+)\]/m);
  if (!m) return [];
  return m[1]
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function parseExcludeSuiteRules(yaml) {
  const rules = [];
  const src = String(yaml || "");
  EXCLUDE_RULE_RE.lastIndex = 0;
  let m = EXCLUDE_RULE_RE.exec(src);
  while (m) {
    if (m[2] && m[2] !== EXCLUDE_NEVER) {
      rules.push({ phase: m[1], suite: m[2] });
    }
    m = EXCLUDE_RULE_RE.exec(src);
  }
  return rules;
}

function excludedSuitesForPhase(yaml, phase) {
  return parseExcludeSuiteRules(yaml)
    .filter((r) => r.phase === phase)
    .map((r) => r.suite);
}

function qa8ExcludedForQa6(yaml, phase) {
  if (phase !== "qa6") return false;
  return excludedSuitesForPhase(yaml, phase).includes(QA8_MATRIX);
}

function matrixSuitesForPhase(yaml, phase) {
  const matrixRuns = evalDispatchIf(extractJobIf(yaml, "qa-matrix"), phase);
  if (!matrixRuns) return [];
  const excluded = new Set(excludedSuitesForPhase(yaml, phase));
  return parseMatrixSuiteList(yaml).filter((suite) => !excluded.has(suite));
}

function dispatchRouting(yaml, phase) {
  const jobs = {};
  for (const id of JOB_ORDER) {
    const expr = extractJobIf(yaml, id);
    jobs[id] = evalDispatchIf(expr, phase);
  }
  const matrix = jobs["qa-matrix"] ? matrixSuitesForPhase(yaml, phase) : [];
  return {
    phase,
    jobs,
    matrix_suites: matrix,
    runs_qa7: jobs["qa7-ai-eval"] === true,
    runs_qa8_matrix: matrix.includes(QA8_MATRIX),
    runs_qa8_adversarial: jobs["qa8-adversarial"] === true,
    runs_qa9: false,
  };
}

function qa4CaseHasClockHarness(yaml) {
  const m = yaml.match(/QA4\)\s*\n([\s\S]*?)\n\s*;;/);
  if (!m) return false;
  const body = m[1];
  return (
    body.includes("run-qa4-clock.cjs") &&
    body.includes("run-qa4.cjs") &&
    body.includes("/tmp/aipo-harness/qa4-clock") &&
    body.includes("qa4-clock-harness.v1.json")
  );
}

function qa4UploadIncludesClockHarness(yaml) {
  return (
    yaml.includes("/tmp/aipo-harness/qa4-clock/") &&
    yaml.includes("engine-acceptance-${{ matrix.suite }}")
  );
}

function qa8CasePreservedForFull(yaml) {
  const m = yaml.match(/QA8\)\s*\n([\s\S]*?)\n\s*;;/);
  if (!m) return false;
  return (
    m[1].includes("run-qa8-adversarial.cjs") &&
    m[1].includes("run-qa8.cjs") &&
    m[1].includes("pnpm verify:engine-acceptance")
  );
}

module.exports = {
  JOB_ORDER,
  dispatchRouting,
  matrixSuitesForPhase,
  parseMatrixSuiteList,
  parseExcludeSuiteRules,
  excludedSuitesForPhase,
  qa4CaseHasClockHarness,
  qa4UploadIncludesClockHarness,
  qa8CasePreservedForFull,
  qa8ExcludedForQa6,
};
