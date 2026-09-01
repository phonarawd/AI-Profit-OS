"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const {
  ROOT,
  readJson,
  buildManifest,
  hashPathList,
} = require("../engine-acceptance/lib/hash-scope.cjs");

const baseline = readJson("governance/engine-acceptance/baseline.v1.json");
const scope = readJson("governance/engine-acceptance/protected-scope.v1.json");
const finalAcceptance = fs.readFileSync(
  path.join(ROOT, "governance/engine-acceptance/FINAL_ACCEPTANCE.md"),
  "utf8",
);

const liveManifest = buildManifest(scope);
const baselineEntries = new Map(
  (baseline.protected_scope_manifest?.entries || []).map((e) => [e.path, e.sha256]),
);
const liveEntries = new Map(liveManifest.entries.map((e) => [e.path, e.sha256]));

const added = [];
const mutated = [];
const missing = [];

for (const [p, h] of liveEntries) {
  if (!baselineEntries.has(p)) added.push(p);
  else if (baselineEntries.get(p) !== h) mutated.push(p);
}
for (const p of baselineEntries.keys()) {
  if (!liveEntries.has(p)) missing.push(p);
}

const hashes = {};
for (const [name, paths] of Object.entries(scope.aggregateHashes || {})) {
  hashes[name] = {
    pinned: baseline[name],
    live: hashPathList(paths, scope),
  };
  hashes[name].status = hashes[name].pinned === hashes[name].live ? "MATCH" : "MISMATCH";
}

assert.match(finalAcceptance, /STATUS = NOT_ISSUED/);
assert.match(finalAcceptance, /REBASE_REQUIRED = 1/);
assert.match(finalAcceptance, /ACK_RECEIVED = 0/);
assert.match(finalAcceptance, /NEXT = ENGINE_ACCEPTANCE_REBASE_V1/);
assert.equal(hashes.eval_dataset_hash.status, "MATCH");
assert.equal(hashes.acceptance_workflow_hash.status, "MISMATCH");

const report = {
  schema: "gpt.engine-rebase-diagnostic.v1",
  base_commit: "305c4e32a58254ab5987c60d42816dee26239895",
  baseline_id: baseline.id,
  baseline_commit: baseline.commit_sha,
  baseline_manifest: baseline.protected_scope_manifest?.aggregate || null,
  live_manifest: liveManifest.aggregate,
  baseline_path_count: baseline.protected_scope_manifest?.pathCount || 0,
  live_path_count: liveManifest.pathCount,
  changed_paths: added.length + mutated.length + missing.length,
  added_paths: added.length,
  mutated_paths: mutated.length,
  missing_paths: missing.length,
  hashes,
  acceptance: {
    status: "NOT_ISSUED",
    rebase_required: true,
    ack_received: false,
    next: "ENGINE_ACCEPTANCE_REBASE_V1",
  },
  sample: {
    added: added.slice(0, 25),
    mutated: mutated.slice(0, 25),
    missing: missing.slice(0, 25),
  },
};

console.log(JSON.stringify(report, null, 2));
