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
  const phases = [...String(expr).matchAll(/inputs\.qa_phase == '([^']+)'/g)].map((x) => x[1]);
  // aggregator `always()` has no phase gate. A job that wraps always()
  // around phase/needs checks must still be routed by those phase gates —
  // do not treat always() as "every qa_phase is selected".
  if (phases.length === 0) return true;
  return phases.includes(phase);
}

const ALLOWED_MEMBERS = Object.freeze({
  "github.event_name": "eventName",
  "inputs.qa_phase": "qaPhase",
  "needs.qa2-synthetic-personas.result": "qa2Result",
});

function tokenizeGha(src) {
  const tokens = [];
  const s = String(src || "");
  let i = 0;
  while (i < s.length) {
    const ch = s[i];
    if (/\s/.test(ch)) {
      i += 1;
      continue;
    }
    if (s.startsWith("&&", i)) {
      tokens.push({ t: "AND" });
      i += 2;
      continue;
    }
    if (s.startsWith("||", i)) {
      tokens.push({ t: "OR" });
      i += 2;
      continue;
    }
    if (s.startsWith("==", i)) {
      tokens.push({ t: "EQ" });
      i += 2;
      continue;
    }
    if (s.startsWith("!=", i)) {
      tokens.push({ t: "NEQ" });
      i += 2;
      continue;
    }
    if (ch === "!") {
      tokens.push({ t: "NOT" });
      i += 1;
      continue;
    }
    if (ch === "(") {
      tokens.push({ t: "LPAREN" });
      i += 1;
      continue;
    }
    if (ch === ")") {
      tokens.push({ t: "RPAREN" });
      i += 1;
      continue;
    }
    if (ch === "'") {
      const end = s.indexOf("'", i + 1);
      if (end < 0) throw new Error("unterminated GHA string");
      tokens.push({ t: "STRING", v: s.slice(i + 1, end) });
      i = end + 1;
      continue;
    }
    if (/[A-Za-z_]/.test(ch)) {
      let j = i + 1;
      while (j < s.length && /[A-Za-z0-9_.-]/.test(s[j])) j += 1;
      const name = s.slice(i, j);
      i = j;
      let k = i;
      while (k < s.length && /\s/.test(s[k])) k += 1;
      if (s[k] === "(") {
        let n = k + 1;
        while (n < s.length && /\s/.test(s[n])) n += 1;
        if (s[n] !== ")") throw new Error(`GHA function ${name} must be ()`);
        tokens.push({ t: "FUNC", v: name });
        i = n + 1;
      } else {
        tokens.push({ t: "MEMBER", v: name });
      }
      continue;
    }
    throw new Error(`unexpected GHA char ${ch}`);
  }
  tokens.push({ t: "EOF" });
  return tokens;
}

function evalGhaExpr(expr, ctx) {
  const tokens = tokenizeGha(expr);
  let i = 0;
  const peek = () => tokens[i];
  const eat = (t) => {
    const cur = tokens[i];
    if (!cur || cur.t !== t) throw new Error(`expected ${t} got ${cur && cur.t}`);
    i += 1;
    return cur;
  };
  function parseOr() {
    let left = parseAnd();
    while (peek().t === "OR") {
      eat("OR");
      const right = parseAnd();
      left = left || right;
    }
    return left;
  }
  function parseAnd() {
    let left = parseUnary();
    while (peek().t === "AND") {
      eat("AND");
      const right = parseUnary();
      left = left && right;
    }
    return left;
  }
  function parseUnary() {
    if (peek().t === "NOT") {
      eat("NOT");
      return !parseUnary();
    }
    return parsePrimary();
  }
  function parsePrimary() {
    const cur = peek();
    if (cur.t === "LPAREN") {
      eat("LPAREN");
      const inner = parseOr();
      eat("RPAREN");
      return inner;
    }
    if (cur.t === "FUNC") {
      eat("FUNC");
      if (cur.v === "always") return true;
      if (cur.v === "cancelled") return ctx.cancelled === true;
      throw new Error(`unexpected GHA function ${cur.v}`);
    }
    if (cur.t === "MEMBER") {
      eat("MEMBER");
      const op = peek();
      if (op.t !== "EQ" && op.t !== "NEQ") {
        throw new Error(`expected EQ or NEQ got ${op.t}`);
      }
      eat(op.t);
      const lit = eat("STRING").v;
      const key = ALLOWED_MEMBERS[cur.v];
      if (!key) throw new Error(`unexpected GHA member ${cur.v}`);
      return op.t === "EQ" ? ctx[key] === lit : ctx[key] !== lit;
    }
    throw new Error(`unexpected GHA token ${cur.t}`);
  }
  const value = parseOr();
  if (peek().t !== "EOF") throw new Error("trailing GHA tokens");
  return value;
}

const KNOWN_QA2_RESULTS = Object.freeze(["success", "failure", "cancelled", "skipped"]);

function evaluateQaMatrixJobEligibility(yaml, ctx) {
  const expr = extractJobIf(yaml, "qa-matrix");
  if (!expr) {
    return { eligible: false, reason: "missing_qa_matrix_if", expr: null };
  }
  const qa2 = ctx.qa2Result;
  if (qa2 != null && !KNOWN_QA2_RESULTS.includes(qa2)) {
    return { eligible: false, reason: "unexpected_needs_result", expr };
  }
  try {
    const eligible = evalGhaExpr(expr, {
      eventName: ctx.eventName,
      qaPhase: ctx.qaPhase,
      qa2Result: qa2,
      cancelled: ctx.cancelled === true,
    });
    return { eligible, reason: eligible ? "allow" : "deny", expr };
  } catch (e) {
    return {
      eligible: false,
      reason: `unexpected_expr:${e instanceof Error ? e.message : e}`,
      expr,
    };
  }
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
  extractJobIf,
  evalDispatchIf,
  evalGhaExpr,
  evaluateQaMatrixJobEligibility,
  KNOWN_QA2_RESULTS,
};
