/**
 * Static audit — executor must not read dataset expectation fields.
 * Grader may read expect* · executor must not.
 */
"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { ROOT } = require("./hash-scope.cjs");

const EXECUTOR_REL = "tooling/engine-acceptance/lib/qa7-coach-executor.cjs";

const FORBIDDEN_EXPECT_KEYS = Object.freeze([
  "expectLane",
  "expectTools",
  "expectToolsExact",
  "expectToolsAny",
  "expectPath",
  "expectAnswerPath",
  "expectFacts",
  "expectScope",
  "expectGuard",
]);

/**
 * Strip // and /* *\/ comments for crude source scan
 * @param {string} src
 */
function stripComments(src) {
  return String(src || "")
    .replace(/\/\*[\s\S]*?\*\//g, "\n")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");
}

/**
 * @param {string} [absOrRel]
 */
function auditExecutorExpectationIsolation(absOrRel) {
  const abs = absOrRel
    ? path.isAbsolute(absOrRel)
      ? absOrRel
      : path.join(ROOT, absOrRel)
    : path.join(ROOT, EXECUTOR_REL);
  const raw = fs.readFileSync(abs, "utf8");
  const src = stripComments(raw);

  /** @type {Record<string, string>} */
  const flags = {
    EXECUTOR_READS_EXPECT_LANE: "NO",
    EXECUTOR_READS_EXPECT_TOOLS: "NO",
    EXECUTOR_READS_EXPECT_PATH: "NO",
    EXECUTOR_READS_EXPECT_FACTS: "NO",
  };

  /** @type {string[]} */
  const hits = [];

  if (/\bexpectLane\b/.test(src)) {
    flags.EXECUTOR_READS_EXPECT_LANE = "YES";
    hits.push("expectLane");
  }
  if (
    /\bexpectTools\b/.test(src) ||
    /\bexpectToolsExact\b/.test(src) ||
    /\bexpectToolsAny\b/.test(src)
  ) {
    flags.EXECUTOR_READS_EXPECT_TOOLS = "YES";
    hits.push("expectTools*");
  }
  if (
    /\bexpectPath\b/.test(src) ||
    /\bexpectAnswerPath\b/.test(src) ||
    /\bexpectScope\b/.test(src)
  ) {
    flags.EXECUTOR_READS_EXPECT_PATH = "YES";
    hits.push("expectPath/expectAnswerPath/expectScope");
  }
  if (/\bexpectFacts\b/.test(src) || /\bexpectGuard\b/.test(src)) {
    flags.EXECUTOR_READS_EXPECT_FACTS = "YES";
    hits.push("expectFacts/expectGuard");
  }

  // Historical leakage markers that must stay gone
  if (/\blockScopeRedirect\b/.test(src)) {
    hits.push("lockScopeRedirect");
  }
  if (/\bscope_redirect_template_locked\b/.test(src)) {
    hits.push("scope_redirect_template_locked");
  }

  const ok =
    flags.EXECUTOR_READS_EXPECT_LANE === "NO" &&
    flags.EXECUTOR_READS_EXPECT_TOOLS === "NO" &&
    flags.EXECUTOR_READS_EXPECT_PATH === "NO" &&
    flags.EXECUTOR_READS_EXPECT_FACTS === "NO" &&
    !hits.includes("lockScopeRedirect") &&
    !hits.includes("scope_redirect_template_locked");

  return {
    ok,
    file: EXECUTOR_REL,
    flags,
    hits,
    forbidden_keys: FORBIDDEN_EXPECT_KEYS,
  };
}

module.exports = {
  EXECUTOR_REL,
  FORBIDDEN_EXPECT_KEYS,
  auditExecutorExpectationIsolation,
  stripComments,
};
