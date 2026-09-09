"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");

const engine = fs.readFileSync("governance/engine-acceptance/FINAL_ACCEPTANCE.md", "utf8");
const migration = fs.readFileSync("governance/release-master/MIGRATION_READINESS.md", "utf8");
const r7 = fs.readFileSync("governance/release-master/R7_BACKEND_ALIGNMENT.md", "utf8");
const r8 = fs.readFileSync("governance/release-master/R8_INFRA_CORE.md", "utf8");

const fence = engine.match(/```text\r?\n([\s\S]*?)\r?\n```/);
const header = fence ? fence[1] : "";
if (!header) {
  throw new Error("FINAL_ACCEPTANCE.md missing ```text header fence");
}

const rebaseRequired = /REBASE_REQUIRED = 1/.test(header);
const rebaseAppliedPendingQa =
  /REBASE_APPLIED = 1/.test(header) && /STATUS = NOT_ISSUED/.test(header);
if (rebaseRequired) {
  assert.match(header, /STATUS = NOT_ISSUED/);
  assert.match(header, /CERT_ISSUED = 0/);
  assert.match(header, /ACK_RECEIVED = 0/);
  assert.match(migration, /REL_502_ISSUED = 0/);
  assert.match(r7, /CERT_ISSUED = 0/);
  assert.match(r7, /STALE_PENDING_REBASE = 1/);
  assert.doesNotMatch(r7, /ALIGNED \(current epoch ISSUED\)/);
  assert.doesNotMatch(r7, /ALIGNED \(448-path pin\)/);
  assert.match(r8, /STALE_PENDING_REBASE/);
  assert.doesNotMatch(r8, /DEFECTS_P0\/P1=0 ISSUED/);
} else if (rebaseAppliedPendingQa) {
  assert.match(header, /CERT_ISSUED = 0/);
  assert.match(header, /ACK_RECEIVED = 1/);
  assert.match(header, /PROTECTED_SCOPE_DRIFT = 0/);
  assert.match(migration, /REL_502_ISSUED = 0/);
  assert.match(r7, /CERT_ISSUED = 0/);
  assert.doesNotMatch(r7, /ALIGNED \(current epoch ISSUED\)/);
  assert.doesNotMatch(r8, /DEFECTS_P0\/P1=0 ISSUED/);
} else {
  assert.match(header, /STATUS = ISSUED/);
  assert.match(header, /CERT_ISSUED = 1/);
  assert.match(migration, /REL_502_ISSUED = 1/);
  assert.match(r7, /CERT_ISSUED = 1/);
  assert.match(r7, /STALE_PENDING_REBASE = 0/);
}
console.log("[verify:release-engine-truth-consistency] PASS");
