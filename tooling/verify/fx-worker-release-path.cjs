"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "../..");
const manifest = JSON.parse(fs.readFileSync(path.join(root, "infra/workers.manifest.json"), "utf8"));
const { ALLOWED_WORKER_SETS, FX_CORE_ONLY, buildPlan } = require("../deploy/cf-workers.cjs");
const { WORKER_SNAPSHOTS } = require("../release/artifact-provenance.cjs");
const { VALID_WORKER_SETS, validateDeployArgs } = require("../release/deploy-from-artifact.cjs");

const FX = ["coingecko-adapter", "frankfurter-adapter"];
assert.deepEqual(FX_CORE_ONLY, FX);
assert.deepEqual(manifest["fx-core"], FX);
assert.ok(ALLOWED_WORKER_SETS.includes("fx-core"));
assert.ok(VALID_WORKER_SETS.has("fx-core"));
for (const worker of FX) assert.ok(WORKER_SNAPSHOTS.includes(worker));

const plan = buildPlan(manifest, "preview", "fx-core");
assert.deepEqual(plan.workers, FX);
assert.equal(plan.workerCount, 2);

const deployArgs = { target: "production", sha: "a".repeat(40), expectedDigest: "b".repeat(64), acceptance: "/tmp/verdict.json", bundle: "/tmp/bundle", surface: "workers", workerSet: "fx-core" };
assert.equal(validateDeployArgs(deployArgs), "");

const workflow = fs.readFileSync(path.join(root, ".github/workflows/deploy-cloudflare.yml"), "utf8");
assert.match(workflow, /worker_set:[\s\S]*?- fx-core/);
const releaseBuild = fs.readFileSync(path.join(root, ".github/workflows/release-build.yml"), "utf8");
for (const worker of FX) {
  assert.match(releaseBuild, new RegExp("workers/" + worker + "/\\.release-prebuilt/index\\.js"));
  const wrangler = fs.readFileSync(path.join(root, "workers", worker, "wrangler.toml"), "utf8");
  assert.match(wrangler, /\[triggers\]/);
  assert.match(wrangler, /crons\s*=\s*\[/);
  const index = fs.readFileSync(path.join(root, "workers", worker, "src/index.ts"), "utf8");
  assert.match(index, /NEST_ADAPTER_INGEST_URL/);
  assert.match(index, /ADAPTER_INGEST_TOKEN/);
}
const cg = fs.readFileSync(path.join(root, "workers/coingecko-adapter/src/index.ts"), "utf8");
assert.match(cg, /COINGECKO_DEMO_API_KEY/);

const frank = fs.readFileSync(
  path.join(root, "workers/frankfurter-adapter/src/index.ts"),
  "utf8",
);
for (const workerSource of [cg, frank]) {
  assert.match(workerSource, /if \(res\.ok\) forwarded = 1/);
}

const nestIngest = fs.readFileSync(
  path.join(root, "services/api-nest/src/adapters/adapters.admin.service.ts"),
  "utf8",
);
const fxSnapshot = fs.readFileSync(
  path.join(root, "services/api-nest/src/opportunities/fx-snapshot.service.ts"),
  "utf8",
);
assert.match(nestIngest, /if \(!this\.fxSnapshots\)/);
assert.match(nestIngest, /FX_SNAPSHOT_SERVICE_UNAVAILABLE/);
assert.match(nestIngest, /if \(!fxResult\.ok \|\| !fxResult\.snapshotId\)/);
assert.match(nestIngest, /FX_SNAPSHOT_PERSIST_FAILED:/);
assert.match(nestIngest, /markFxIngestFailure/);
assert.match(nestIngest, /ingestStatus = "red"/);
assert.match(nestIngest, /throw new ServiceUnavailableException/);
assert.match(fxSnapshot, /ON CONFLICT \(id\) DO NOTHING[\s\S]*RETURNING id/);
assert.match(fxSnapshot, /FX_SNAPSHOT_ID_COLLISION/);
assert.match(fxSnapshot, /IS NOT DISTINCT FROM \$13::jsonb/);
assert.match(fxSnapshot, /return \{ ok: true, snapshotId: id, created: false \}/);
console.log("[verify:fx-worker-release-path] PASS (FX_CORE_EXACT · BUILD_ONCE_INCLUDED · SCHEDULED_INGEST · NEST_PERSIST_AND_CONFLICT_FAIL_CLOSED)");
