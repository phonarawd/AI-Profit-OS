"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { writeApiManifest } = require("../release/api-artifact-provenance.cjs");
const {
  packFromPayload,
  verifyBundle,
  WORKER_SNAPSHOTS,
  PREBUILT_DIR,
} = require("../release/artifact-provenance.cjs");

const SHA = "a".repeat(40);
const root = fs.mkdtempSync(path.join(os.tmpdir(), "aipo-manifest-lock-"));

function writeFakeWorker(payload, name) {
  const dir = path.join(payload, "workers", name);
  const pre = path.join(dir, PREBUILT_DIR);
  fs.mkdirSync(pre, { recursive: true });
  fs.writeFileSync(
    path.join(dir, "wrangler.toml"),
    'name = "' + name + '"\nmain = "src/index.ts"\n',
  );
  fs.writeFileSync(
    path.join(pre, "index.js"),
    'export default { fetch() { return new Response("ok"); } }\n',
  );
  fs.writeFileSync(
    path.join(pre, "entry.json"),
    JSON.stringify({
      schema: "release-worker-prebuilt.v1",
      entry: "index.js",
      bundled_once: true,
      wrangler_no_upload: true,
    }) + "\n",
  );
}

let bundleCounter = 0;

function buildBundle(bundle) {
  bundleCounter += 1;
  const payload = path.join(root, "payload-src-" + String(bundleCounter));
  fs.mkdirSync(path.join(payload, "apps/web/.open-next/assets"), {
    recursive: true,
  });
  fs.mkdirSync(path.join(payload, "apps/admin/.open-next/assets"), {
    recursive: true,
  });
  fs.writeFileSync(path.join(payload, "apps/web/.open-next/worker.js"), "web");
  fs.writeFileSync(path.join(payload, "apps/admin/.open-next/worker.js"), "ops");
  fs.writeFileSync(path.join(payload, "apps/web/.open-next/assets/a.txt"), "a");
  fs.writeFileSync(
    path.join(payload, "apps/admin/.open-next/assets/a.txt"),
    "a",
  );

  const apiDist = path.join(payload, "services/api-nest/dist");
  fs.mkdirSync(apiDist, { recursive: true });
  const apiEntry = path.join(apiDist, "main.js");
  fs.writeFileSync(apiEntry, "api");
  writeApiManifest(apiDist, SHA, apiEntry);

  for (const name of WORKER_SNAPSHOTS) writeFakeWorker(payload, name);
  return packFromPayload(payload, bundle, SHA);
}

function buildPayload(label) {
  const payload = path.join(root, "source-" + label);
  fs.mkdirSync(path.join(payload, "apps/web/.open-next/assets"), {
    recursive: true,
  });
  fs.mkdirSync(path.join(payload, "apps/admin/.open-next/assets"), {
    recursive: true,
  });
  fs.writeFileSync(path.join(payload, "apps/web/.open-next/worker.js"), "web");
  fs.writeFileSync(path.join(payload, "apps/admin/.open-next/worker.js"), "ops");
  fs.writeFileSync(path.join(payload, "apps/web/.open-next/assets/a.txt"), "a");
  fs.writeFileSync(
    path.join(payload, "apps/admin/.open-next/assets/a.txt"),
    "a",
  );

  const apiDist = path.join(payload, "services/api-nest/dist");
  fs.mkdirSync(apiDist, { recursive: true });
  const apiEntry = path.join(apiDist, "main.js");
  fs.writeFileSync(apiEntry, "api");
  writeApiManifest(apiDist, SHA, apiEntry);
  for (const name of WORKER_SNAPSHOTS) writeFakeWorker(payload, name);
  return payload;
}

function tamperAndExpect(field, value, needle) {
  const bundle = path.join(root, "bundle-" + field);
  const manifest = buildBundle(bundle);
  const file = path.join(bundle, "release-manifest.json");
  const changed = { ...manifest, [field]: value };
  fs.writeFileSync(file, JSON.stringify(changed, null, 2) + "\n");
  assert.throws(
    () => verifyBundle(bundle, { sourceSha: SHA, digest: manifest.artifact_digest }),
    new RegExp(needle),
  );
}

try {
  const goodBundle = path.join(root, "bundle-good");
  const good = buildBundle(goodBundle);
  const verified = verifyBundle(goodBundle, {
    sourceSha: SHA,
    digest: good.artifact_digest,
  });
  assert.equal(verified.source_sha, SHA);

  tamperAndExpect("schema", "forged-manifest.v1", "manifest_schema_mismatch");
  tamperAndExpect("artifact_name", "other-artifact", "manifest_artifact_name_mismatch");
  tamperAndExpect("digest_alg", "sha1", "manifest_digest_alg_mismatch");
  tamperAndExpect(
    "rebuild_forbidden_at_deploy",
    false,
    "manifest_rebuild_guard_missing",
  );
  tamperAndExpect("worker_prebuilt", false, "manifest_worker_prebuilt_missing");
  tamperAndExpect(
    "worker_deploy_no_bundle",
    false,
    "manifest_worker_no_bundle_missing",
  );

  const badApiPayload = buildPayload("bad-api-schema");
  const apiManifestPath = path.join(
    badApiPayload,
    "services/api-nest/dist/api-release-manifest.json",
  );
  const apiManifest = JSON.parse(fs.readFileSync(apiManifestPath, "utf8"));
  apiManifest.schema = "forged-api-manifest.v1";
  fs.writeFileSync(apiManifestPath, JSON.stringify(apiManifest, null, 2) + "\n");
  assert.throws(
    () => packFromPayload(badApiPayload, path.join(root, "bundle-bad-api"), SHA),
    /api_artifact_schema_mismatch/,
  );

  const badWorkerPayload = buildPayload("bad-worker-meta");
  const workerMetaPath = path.join(
    badWorkerPayload,
    "workers",
    WORKER_SNAPSHOTS[0],
    PREBUILT_DIR,
    "entry.json",
  );
  const workerMeta = JSON.parse(fs.readFileSync(workerMetaPath, "utf8"));
  workerMeta.wrangler_no_upload = false;
  fs.writeFileSync(workerMetaPath, JSON.stringify(workerMeta, null, 2) + "\n");
  assert.throws(
    () =>
      packFromPayload(
        badWorkerPayload,
        path.join(root, "bundle-bad-worker"),
        SHA,
      ),
    /worker_prebuilt_upload_guard_missing/,
  );

  console.log(
    "[verify:release-manifest-identity-lock] PASS (manifest identity + deploy invariants fail closed)",
  );
} finally {
  fs.rmSync(root, { recursive: true, force: true });
}
