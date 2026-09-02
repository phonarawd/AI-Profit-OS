"use strict";

const fs = require("fs");
const path = require("path");
const psm = require("./lib/rel-502-psm.cjs");

const root = path.resolve(__dirname, "../..");
const INV_REL = "governance/recovery/engine-drift-inventory.current.v1.json";
const EV_REL = "governance/recovery/engine-rebase-evidence.current.v1.json";
const CERT_REL = "governance/engine-acceptance/FINAL_ACCEPTANCE.md";
const DEFAULT_ARCHIVE_INV =
  "governance/recovery/archive/engine-drift-inventory.pre-rebase-20260902.v1.json";
const DEFAULT_ARCHIVE_EV =
  "governance/recovery/archive/engine-rebase-evidence.pre-rebase-20260902.v1.json";

function readJson(rel) {
  return JSON.parse(fs.readFileSync(path.join(root, rel), "utf8"));
}

function parseCert(text) {
  const out = {};
  for (const line of text.split(/\r?\n/)) {
    const m = line.match(/^([A-Z][A-Z0-9_-]*) = (.+)$/);
    if (m) out[m[1]] = m[2].trim();
  }
  return out;
}

function fail(msg) {
  console.error("[verify:engine-drift-inventory] FAIL " + msg);
  process.exit(1);
}

const inventory = readJson(INV_REL);
const evidence = readJson(EV_REL);
const cert = parseCert(fs.readFileSync(path.join(root, CERT_REL), "utf8"));
const live = psm.compareProtectedScope();
const rebaseLedger = readJson("governance/engine-acceptance/product-rebases.v1.json");
const currentRebase = [...(rebaseLedger.rebases || [])]
  .reverse()
  .find((entry) => entry.new_baseline_id === live.baselineId);
const qa = psm.currentEpochQaReady(root, live.baselineId);

if (inventory.schema !== "governance.recovery.engine-drift-inventory.v1") {
  fail("inventory schema");
}
if (evidence.schema !== "governance.recovery.engine-rebase-evidence.v1") {
  fail("evidence schema");
}

if (inventory.changed_paths !== live.changedPathCount) {
  fail(
    "changed_paths must match live protected-scope count " +
      live.changedPathCount +
      " (got " +
      inventory.changed_paths +
      ")",
  );
}
if (inventory.expected_changed_paths !== live.changedPathCount) {
  fail("expected_changed_paths must match live protected-scope count");
}
if (!Array.isArray(inventory.paths) || inventory.paths.length !== live.changedPathCount) {
  fail("paths length");
}
if (evidence.changed_paths !== live.changedPathCount) {
  fail("evidence.changed_paths must match live protected-scope count");
}
if (evidence.live_aggregate !== live.liveAggregate) {
  fail("evidence.live_aggregate stale vs live hash");
}
if (inventory.count_match !== true) fail("count_match");
if (inventory.unexplained_count !== 0) fail("unexplained_count must be 0");

const archiveInvRel = inventory.historical_inventory_ref || DEFAULT_ARCHIVE_INV;
const archiveEvRel = inventory.historical_evidence_ref || DEFAULT_ARCHIVE_EV;
if (!fs.existsSync(path.join(root, archiveInvRel))) {
  fail("predecessor inventory archive missing: " + archiveInvRel);
}
if (!fs.existsSync(path.join(root, archiveEvRel))) {
  fail("predecessor evidence archive missing: " + archiveEvRel);
}

const archiveInv = readJson(archiveInvRel);
const archiveEv = readJson(archiveEvRel);
if (archiveInv.changed_paths !== 82) {
  fail("archive inventory must preserve 82-path predecessor");
}
if (archiveInv.ACK_RECEIVED !== 0) fail("archive ACK_RECEIVED must stay 0");
if (archiveInv.FINAL_ACCEPTANCE !== "NOT_ISSUED") {
  fail("archive FINAL_ACCEPTANCE must stay NOT_ISSUED");
}
if (archiveInv.REBASE_REQUIRED !== 1) fail("archive REBASE_REQUIRED must stay 1");
if (archiveEv.changed_paths !== 82) {
  fail("archive evidence must preserve 82-path predecessor");
}
if (!archiveEv.ack_eligibility || archiveEv.ack_eligibility.ACK_RECEIVED !== 0) {
  fail("archive evidence ACK_RECEIVED must stay 0");
}
if (archiveEv.ack_eligibility.FINAL_ACCEPTANCE !== "NOT_ISSUED") {
  fail("archive evidence FINAL_ACCEPTANCE must stay NOT_ISSUED");
}

const issued =
  cert.STATUS === "ISSUED" &&
  cert.CERT_ISSUED === "1" &&
  cert.REBASE_REQUIRED === "0" &&
  cert.BASELINE_ID === live.baselineId &&
  Boolean(currentRebase) &&
  cert.REBASE_ID === currentRebase.rebase_id &&
  !live.drift &&
  qa.ready;
const preRebase = live.drift;

if (issued) {
  if (inventory.ACK_RECEIVED !== 1) fail("issued: inventory ACK_RECEIVED must be 1");
  if (inventory.FINAL_ACCEPTANCE !== "ISSUED") fail("issued: inventory FINAL_ACCEPTANCE");
  if (inventory.REBASE_REQUIRED !== 0) fail("issued: inventory REBASE_REQUIRED must be 0");
  if (inventory.current_baseline_id !== live.baselineId) fail("issued: inventory current_baseline_id");
  if (inventory.rebase_id !== currentRebase.rebase_id) fail("issued: inventory rebase_id");
  if (evidence.baseline_id !== live.baselineId) fail("issued: evidence baseline_id");
  if (evidence.current_baseline_id !== live.baselineId) fail("issued: evidence current_baseline_id");
  if (evidence.rebase_id !== currentRebase.rebase_id) fail("issued: evidence rebase_id");
  if (!evidence.ack_eligibility || evidence.ack_eligibility.ACK_RECEIVED !== 1) {
    fail("issued: evidence ACK_RECEIVED must be 1");
  }
  if (evidence.ack_eligibility.FINAL_ACCEPTANCE !== "ISSUED") {
    fail("issued: evidence FINAL_ACCEPTANCE");
  }
  if (live.changedPathCount !== 0) fail("issued: live changedPathCount must be 0");
  if (live.liveAggregate !== live.baselineAggregate) {
    fail("issued: liveAggregate must equal baselineAggregate");
  }
  if (inventory.historical_inventory_ref !== archiveInvRel) {
    fail("issued: historical_inventory_ref");
  }
  if (inventory.historical_evidence_ref !== archiveEvRel) {
    fail("issued: historical_evidence_ref");
  }
  if (evidence.inventory_ref !== INV_REL) fail("inventory_ref");
} else if (preRebase) {
  if (inventory.ACK_RECEIVED !== 0) fail("pre-rebase: ACK_RECEIVED must stay 0");
  if (inventory.FINAL_ACCEPTANCE !== "NOT_ISSUED") fail("pre-rebase: FINAL_ACCEPTANCE");
  if (inventory.REBASE_REQUIRED !== 1) fail("pre-rebase: REBASE_REQUIRED");
  if (!evidence.ack_eligibility || evidence.ack_eligibility.ACK_RECEIVED !== 0) {
    fail("pre-rebase: evidence ACK_RECEIVED");
  }
  if (evidence.ack_eligibility.FINAL_ACCEPTANCE !== "NOT_ISSUED") {
    fail("pre-rebase: evidence FINAL_ACCEPTANCE");
  }
  for (const row of inventory.paths) {
    if (!row.path || !row.kind || !row.category || !row.reason) {
      fail("path row incomplete: " + String(row.path));
    }
    if (row.category === "UNCLASSIFIED") fail("unclassified " + row.path);
    if (!row.owning_commit) fail("owning_commit missing " + row.path);
    if (!Array.isArray(row.required_rerun) || row.required_rerun.length === 0) {
      fail("required_rerun missing " + row.path);
    }
  }
  if (evidence.ack_eligibility.all_drift_explained !== true) {
    fail("evidence all_drift_explained");
  }
  if (evidence.inventory_ref !== INV_REL) fail("inventory_ref");
} else {
  fail(
    "FINAL_ACCEPTANCE epoch unrecognized (STATUS=" +
      cert.STATUS +
      " CERT_ISSUED=" +
      cert.CERT_ISSUED +
      " REBASE_REQUIRED=" +
      cert.REBASE_REQUIRED +
      ")",
  );
}

console.log(
  "[verify:engine-drift-inventory] PASS (" +
    "live.changed_paths=" +
    live.changedPathCount +
    " · unexplained=0 · ACK_RECEIVED=" +
    inventory.ACK_RECEIVED +
    " · " +
    inventory.FINAL_ACCEPTANCE +
    " · history.preserved=82)",
);
