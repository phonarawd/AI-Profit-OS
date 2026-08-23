/**
 * REL-503 — protected-scope STALE watch.
 * ISSUED 인증서 이후 live hash 가 baseline 과 어긋나면 STALE.
 * 제품 파일을 바꾸지 않는다. 시뮬 1파일 변경은 메모리 overlay 만.
 */
"use strict";

const fs = require("fs");
const path = require("path");
const psm = require("../verify/lib/rel-502-psm.cjs");
const { ROOT, readJson } = require("./lib/hash-scope.cjs");

const DOC_REL = "governance/engine-acceptance/PROTECTED_SCOPE_STALE_WATCH.md";
const NEXT_ON_STALE = "REL-502_REBASE";

function readCertStatus(root) {
  const cert = fs.readFileSync(path.join(root, psm.CERT_REL), "utf8");
  if (psm.needle(cert, "STATUS", "ISSUED") && psm.needle(cert, "CERT_ISSUED", "1")) {
    return "ISSUED";
  }
  return "NOT_ISSUED";
}

function watchStatus(drift, certStatus) {
  if (drift && certStatus === "ISSUED") return "STALE";
  if (drift) return "DRIFT_UNISSUED";
  if (certStatus === "ISSUED") return "CURRENT";
  return "NOT_ISSUED";
}

function evaluateLive(root) {
  const scope = psm.compareProtectedScope();
  const certStatus = readCertStatus(root);
  const status = watchStatus(scope.drift, certStatus);
  return {
    schema: "engine-acceptance.protected-scope-watch.v1",
    cert_status: certStatus,
    drift: scope.drift,
    watch_status: status,
    live_aggregate: scope.liveAggregate,
    baseline_aggregate: scope.baselineAggregate,
    changed_paths: scope.changed,
    added_paths: scope.added,
    missing_paths: scope.missing,
    changed_path_count: scope.changedPathCount,
    next: status === "STALE" ? NEXT_ON_STALE : null,
    concealment_forbidden: true,
    simulated: false,
  };
}

function evaluateSimulatedOneFileChange(root) {
  const live = evaluateLive(root);
  const baseline = readJson(psm.BASELINE_REL);
  const first = ((baseline.protected_scope_manifest || {}).entries || [])[0];
  if (!first || !first.path) {
    throw new Error("baseline protected_scope_manifest.entries[0] missing");
  }
  const fake = {
    drift: true,
    changed: [first.path],
    added: [],
    missing: [],
    changedPathCount: 1,
    liveAggregate: "simulated-one-file-change",
    baselineAggregate: live.baseline_aggregate,
  };
  const status = watchStatus(fake.drift, live.cert_status);
  return {
    schema: "engine-acceptance.protected-scope-watch.v1",
    cert_status: live.cert_status,
    drift: true,
    watch_status: status,
    live_aggregate: fake.liveAggregate,
    baseline_aggregate: fake.baselineAggregate,
    changed_paths: fake.changed,
    added_paths: [],
    missing_paths: [],
    changed_path_count: 1,
    next: status === "STALE" ? NEXT_ON_STALE : null,
    concealment_forbidden: true,
    simulated: true,
    simulated_path: first.path,
  };
}

function main() {
  const out = evaluateLive(ROOT);
  console.log(JSON.stringify(out, null, 2));
  if (out.watch_status === "STALE") {
    console.error("[protected-scope-watch] STALE — ISSUED cert is not current. Next=" + NEXT_ON_STALE);
    process.exit(1);
  }
  console.log("[protected-scope-watch] " + out.watch_status);
}

if (require.main === module) {
  main();
}

module.exports = {
  DOC_REL,
  NEXT_ON_STALE,
  evaluateLive,
  evaluateSimulatedOneFileChange,
  watchStatus,
  readCertStatus,
};
