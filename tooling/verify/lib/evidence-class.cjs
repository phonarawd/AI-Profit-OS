/**
 * 증거 등급 — static grep을 runtime/browser/CI PASS로 오인하지 않는다.
 * STATIC_VERIFIER_PASS ≠ RUNTIME_BEHAVIOR_PASS ≠ BROWSER_PASS ≠ REMOTE_CI_PASS
 */

"use strict";

const EVIDENCE_CLASSES = [
  "STATIC_VERIFIER_PASS",
  "RUNTIME_BEHAVIOR_PASS",
  "BROWSER_PASS",
  "REMOTE_CI_PASS",
];

function classifyClosureFinish(extra) {
  if (extra === "browser") return "BROWSER_PASS";
  return "STATIC_VERIFIER_PASS";
}

function assertNoRuntimeMasquerade(source, label) {
  const fails = [];
  const staticExit =
    /CLOSURE_STATIC_ONLY[\s\S]{0,400}finish\(|STATIC_ONLY === "1"[\s\S]{0,400}finish\(/;
  if (
    staticExit.test(source) &&
    /runtime Playwright/.test(source) &&
    !/STATIC_VERIFIER_PASS/.test(source)
  ) {
    fails.push(
      label +
        " static-only path must not print runtime Playwright as if it were BROWSER_PASS",
    );
  }
  return fails;
}

module.exports = {
  EVIDENCE_CLASSES,
  classifyClosureFinish,
  assertNoRuntimeMasquerade,
};
