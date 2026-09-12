#!/usr/bin/env node
"use strict";

/**
 * Apply one official CI suite result file written by run-qaN.cjs.
 * Does not invent hashes. Refuses if baseline_id is not the live epoch
 * or completion_status is not COMPLETE.
 *
 * Also merges official evidence stamps that run-qaN.cjs writes in CI:
 * numeric critical_invariant and kill_switch keys that are already true
 * in the CI evidence-manifest. Isolated CI jobs may have false kill_switch
 * flags for suites they did not run; those must not downgrade live evidence.
 *
 * Usage:
 *   node tooling/engine-acceptance/apply-ci-suite-result.cjs --suite QA3 --from <qa3-result.v1.json>
 */
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "../..");
const BASELINE_REL = "governance/engine-acceptance/baseline.v1.json";
const ALLOWED = Object.freeze({
  QA3: "governance/engine-acceptance/qa3-result.v1.json",
  QA4: "governance/engine-acceptance/qa4-result.v1.json",
  QA5: "governance/engine-acceptance/qa5-result.v1.json",
  QA6: "governance/engine-acceptance/qa6-result.v1.json",
  QA8: "governance/engine-acceptance/qa8-result.v1.json",
});

function fail(code) {
  process.stderr.write("[apply-ci-suite-result] FAIL_CLOSED:" + code + "\n");
  process.exit(1);
}

function parseArgs(argv) {
  const out = { suite: "", from: "" };
  for (let i = 2; i < argv.length; i += 1) {
    if (argv[i] === "--suite") out.suite = String(argv[i + 1] || "").toUpperCase();
    if (argv[i] === "--from") out.from = String(argv[i + 1] || "");
  }
  return out;
}

function main() {
  const args = parseArgs(process.argv);
  const destRel = ALLOWED[args.suite];
  if (!destRel) fail("suite_not_allowed");
  if (!args.from || !fs.existsSync(args.from)) fail("source_missing");
  const baseline = JSON.parse(
    fs.readFileSync(path.join(ROOT, BASELINE_REL), "utf8"),
  );
  const src = JSON.parse(fs.readFileSync(args.from, "utf8"));
  if (src.suite_id !== args.suite) fail("suite_id_mismatch");
  if (src.baseline_id !== baseline.id) fail("baseline_not_current_epoch");
  if (src.completion_status !== "COMPLETE") fail("suite_not_complete");
  const dest = path.join(ROOT, destRel);
  const raw = fs.readFileSync(args.from);
  fs.writeFileSync(dest, raw);

  const evidenceSrcPath = path.join(path.dirname(args.from), "evidence-manifest.v1.json");
  if (fs.existsSync(evidenceSrcPath)) {
    const liveEvPath = path.join(ROOT, "governance/engine-acceptance/evidence-manifest.v1.json");
    const liveEv = JSON.parse(fs.readFileSync(liveEvPath, "utf8"));
    const srcEv = JSON.parse(fs.readFileSync(evidenceSrcPath, "utf8"));
    const srcSuite = (srcEv.suites || []).find((s) => s.suite_id === args.suite);
    if (!srcSuite) fail("evidence_suite_missing");
    if (srcSuite.baseline_id !== baseline.id) fail("evidence_baseline_mismatch");
    if (srcSuite.completion_status !== "COMPLETE") fail("evidence_suite_not_complete");
    const idx = (liveEv.suites || []).findIndex((s) => s.suite_id === args.suite);
    if (idx < 0) fail("live_evidence_suite_missing");
    liveEv.suites[idx] = srcSuite;

    const srcCi = srcEv.critical_invariant || {};
    const resultCi = src.critical_invariant_cumulative || src.critical_invariant || {};
    const blocked = Number.isFinite(srcCi.blocked) ? srcCi.blocked : resultCi.blocked;
    if (typeof blocked === "number") {
      liveEv.critical_invariant = {
        blocked,
        skipped: Number.isFinite(srcCi.skipped) ? srcCi.skipped : Number(resultCi.skipped) || 0,
        uncovered: Number.isFinite(srcCi.uncovered) ? srcCi.uncovered : Number(resultCi.uncovered) || 0,
      };
    }

    liveEv.kill_switch = liveEv.kill_switch || {};
    const srcKs = srcEv.kill_switch || {};
    for (const [key, value] of Object.entries(srcKs)) {
      if (value === true) liveEv.kill_switch[key] = true;
    }
    if (args.suite === "QA8") {
      liveEv.kill_switch.verified_before_qa8 = true;
      if (liveEv.current_epoch) liveEv.current_epoch.qa8_status = "COMPLETE";
      liveEv.qa_phase = "QA-8";
    }

    fs.writeFileSync(liveEvPath, JSON.stringify(liveEv, null, 2) + "\n");
  }

  process.stdout.write(
    "[apply-ci-suite-result] APPLIED " +
      args.suite +
      " baseline=" +
      src.baseline_id +
      "\n",
  );
}

main();
