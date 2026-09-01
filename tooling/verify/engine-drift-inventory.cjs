"use strict";

const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "../..");
const inventory = JSON.parse(
  fs.readFileSync(
    path.join(root, "governance/recovery/engine-drift-inventory.current.v1.json"),
    "utf8",
  ),
);
const evidence = JSON.parse(
  fs.readFileSync(
    path.join(root, "governance/recovery/engine-rebase-evidence.current.v1.json"),
    "utf8",
  ),
);

function fail(msg) {
  console.error("[verify:engine-drift-inventory] FAIL " + msg);
  process.exit(1);
}

if (inventory.schema !== "governance.recovery.engine-drift-inventory.v1") {
  fail("inventory schema");
}
if (inventory.changed_paths !== 79 || inventory.expected_changed_paths !== 79) {
  fail("changed_paths must stay 79 until a formal Engine rebase");
}
if (inventory.count_match !== true) fail("count_match");
if (inventory.unexplained_count !== 0) fail("unexplained_count must be 0");
if (!Array.isArray(inventory.paths) || inventory.paths.length !== 79) {
  fail("paths length");
}
if (inventory.ACK_RECEIVED !== 0) fail("ACK_RECEIVED must stay 0");
if (inventory.FINAL_ACCEPTANCE !== "NOT_ISSUED") fail("FINAL_ACCEPTANCE");
if (inventory.REBASE_REQUIRED !== 1) fail("REBASE_REQUIRED");

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
if (evidence.ack_eligibility.ACK_RECEIVED !== 0) fail("evidence ACK_RECEIVED");
if (evidence.ack_eligibility.FINAL_ACCEPTANCE !== "NOT_ISSUED") {
  fail("evidence FINAL_ACCEPTANCE");
}
if (evidence.cert_mirrors.ACK_RECEIVED_0 !== true) fail("cert ACK mirror");
if (evidence.inventory_ref !== "governance/recovery/engine-drift-inventory.current.v1.json") {
  fail("inventory_ref");
}

console.log(
  "[verify:engine-drift-inventory] PASS (79 classified · unexplained=0 · ACK_RECEIVED=0 · NOT_ISSUED)",
);
