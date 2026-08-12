/**
 * QA7 AI Eval — locked constants (tooling-only)
 */
"use strict";

const GRADER_VERSION = "qa7-deterministic-grader.v1";
const SUITE_ID = "QA7";
const TRACE_SCHEMA_ID = "ai-answer-trace.v1";
const EVAL_GATE_SCHEMA = "ai-eval-gate.v1";

const EVAL_FILES = Object.freeze([
  "eval/p_fact.jsonl",
  "eval/g_no_money.jsonl",
  "eval/s_refuse.jsonl",
  "eval/g_scope_escape.jsonl",
]);

const BASELINE_REL = "governance/engine-acceptance/baseline.v1.json";
const SCOPE_REL = "governance/engine-acceptance/protected-scope.v1.json";

/** Schema-required answer-trace fields (schemas/ai-answer-trace.v1.json) */
const TRACE_REQUIRED = Object.freeze([
  "intent",
  "lane",
  "facts_used",
  "tools_called",
  "provider_id",
  "answer_path",
  "guard_result",
]);

const TRACE_LANES = Object.freeze(["P", "G", "S"]);
const TRACE_PROVIDERS = Object.freeze([
  "ollama",
  "groq",
  "gemini_free",
  "openai",
  "none",
]);
const TRACE_ANSWER_PATHS = Object.freeze([
  "template",
  "fact",
  "rag",
  "llm_p",
  "llm_g",
  "refuse_s",
  "scope_redirect",
]);
const TRACE_GUARD_STATUSES = Object.freeze([
  "pass",
  "refresh",
  "block",
  "reroute_p",
  "ungrounded",
]);

module.exports = {
  GRADER_VERSION,
  SUITE_ID,
  TRACE_SCHEMA_ID,
  EVAL_GATE_SCHEMA,
  EVAL_FILES,
  BASELINE_REL,
  SCOPE_REL,
  TRACE_REQUIRED,
  TRACE_LANES,
  TRACE_PROVIDERS,
  TRACE_ANSWER_PATHS,
  TRACE_GUARD_STATUSES,
};
