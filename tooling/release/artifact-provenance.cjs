"use strict";

/**
 * 출시 산출물 provenance: SOURCE SHA → 1회 빌드 → canonical SHA-256.
 * 배포 재빌드 금지. Production apply 없음.
 */
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const SCHEMA = "release-artifact-manifest.v1";
const ARTIFACT_NAME = "release-bundle";
const MANIFEST_FILE = "release-manifest.json";
const PAYLOAD_DIR = "payload";
const RELEASE_BUILD_WORKFLOW = "release-build.yml";
const API_DIST_DIR = "services/api-nest/dist";
const API_ENTRY = API_DIST_DIR + "/main.js";
const API_MANIFEST = API_DIST_DIR + "/api-release-manifest.json";

const REQUIRED_FILES = [
  "apps/web/.open-next/worker.js",
  "apps/admin/.open-next/worker.js",
  API_ENTRY,
  API_MANIFEST,
];
const REQUIRED_DIRS = [
  "apps/web/.open-next/assets",
  "apps/admin/.open-next/assets",
];
const WORKER_SNAPSHOTS = ["push-dispatcher", "ebay-adapter"];
const PREBUILT_DIR = ".release-prebuilt";
const PREFERRED_PREBUILT_ENTRIES = ["index.js", "worker.js", "main.js"];
const EXTRACTION_OUTPUTS = Object.freeze([
  "apps/web/.open-next",
  "apps/admin/.open-next",
  API_DIST_DIR,
  ...WORKER_SNAPSHOTS.map((name) => "workers/" + name + "/" + PREBUILT_DIR),
]);

function isFullSha(value) {
  return /^[0-9a-f]{40}$/.test(String(value || "").toLowerCase());
}

function isSha256(value) {
  return /^[0-9a-f]{64}$/.test(String(value || "").toLowerCase());
}

function normalizeHex(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

function failClosed(code, extra) {
  const message = extra ? code + ":" + extra : code;
  const err = new Error(message);
  err.code = "FAIL_CLOSED";
  err.fails = [message];
  return err;
}

function fileSha256(abs) {
  return crypto.createHash("sha256").update(fs.readFileSync(abs)).digest("hex");
}

function findPrebuiltEntry(prebuiltDir) {
  if (!fs.existsSync(prebuiltDir)) {
    throw failClosed("FAIL_CLOSED:worker_prebuilt_missing", prebuiltDir);
  }
  const metaPath = path.join(prebuiltDir, "entry.json");
  if (fs.existsSync(metaPath)) {
    let meta;
    try {
      meta = JSON.parse(fs.readFileSync(metaPath, "utf8"));
    } catch {
      throw failClosed("FAIL_CLOSED:worker_prebuilt_entry_missing", "entry.json");
    }
    if (meta.schema !== "release-worker-prebuilt.v1") {
      throw failClosed("FAIL_CLOSED:worker_prebuilt_schema_mismatch", "entry.json");
    }
    if (meta.bundled_once !== true) {
      throw failClosed("FAIL_CLOSED:worker_prebuilt_not_bundled_once", "entry.json");
    }
    if (meta.wrangler_no_upload !== true) {
      throw failClosed("FAIL_CLOSED:worker_prebuilt_upload_guard_missing", "entry.json");
    }
    const rel = String((meta && meta.entry) || "").replace(/\\/g, "/");
    if (!rel || rel.includes("..") || path.isAbsolute(rel)) {
      throw failClosed("FAIL_CLOSED:worker_prebuilt_entry_missing", "entry");
    }
    const abs = path.join(prebuiltDir, rel);
    if (!fs.existsSync(abs)) throw failClosed("FAIL_CLOSED:worker_prebuilt_entry_missing", rel);
    return abs;
  }
  for (const name of PREFERRED_PREBUILT_ENTRIES) {
    const abs = path.join(prebuiltDir, name);
    if (fs.existsSync(abs)) return abs;
  }
  const js = fs
    .readdirSync(prebuiltDir)
    .filter((name) => name.endsWith(".js") && !name.endsWith(".map.js") && !name.endsWith(".map"));
  if (js.length === 1) return path.join(prebuiltDir, js[0]);
  throw failClosed("FAIL_CLOSED:worker_prebuilt_entry_missing", prebuiltDir);
}

function collectWorkerPrebuilts(payloadAbs) {
  const out = {};
  for (const name of WORKER_SNAPSHOTS) {
    const dir = path.join(payloadAbs, "workers", name, PREBUILT_DIR);
    const entry = findPrebuiltEntry(dir);
    out[name] = {
      entry: path.basename(entry),
      sha256: fileSha256(entry),
      bundled_once: true,
    };
  }
  return out;
}

function collectApiArtifact(payloadAbs, expectedSourceSha) {
  const entryAbs = path.join(payloadAbs, API_ENTRY);
  const manifestAbs = path.join(payloadAbs, API_MANIFEST);
  if (!fs.existsSync(entryAbs)) {
    throw failClosed("FAIL_CLOSED:api_artifact_missing", API_ENTRY);
  }
  if (!fs.existsSync(manifestAbs)) {
    throw failClosed("FAIL_CLOSED:api_artifact_manifest_missing", API_MANIFEST);
  }
  let api;
  try {
    api = JSON.parse(fs.readFileSync(manifestAbs, "utf8"));
  } catch {
    throw failClosed("FAIL_CLOSED:api_artifact_manifest_invalid");
  }
  const sourceSha = normalizeHex(api && api.source_sha);
  const wantSha = normalizeHex(expectedSourceSha);
  const digest = fileSha256(entryAbs);
  if (api.schema !== "api-nest-artifact-manifest.v1") {
    throw failClosed("FAIL_CLOSED:api_artifact_schema_mismatch");
  }
  if (api.artifact_kind !== "api-nest") {
    throw failClosed("FAIL_CLOSED:api_artifact_kind_mismatch");
  }
  if (api.not_web_kind !== "web-open-next") {
    throw failClosed("FAIL_CLOSED:api_artifact_web_kind_guard_missing");
  }
  if (api.deploy_forbidden_here !== true) {
    throw failClosed("FAIL_CLOSED:api_artifact_deploy_guard_missing");
  }
  if (api.render_config_mutation !== 0) {
    throw failClosed("FAIL_CLOSED:api_artifact_render_mutation_invalid");
  }
  if (api.registry !== "BLOCKED_EXTERNAL_ACTION") {
    throw failClosed("FAIL_CLOSED:api_artifact_registry_state_invalid");
  }
  const acceptance = api.acceptance && typeof api.acceptance === "object" ? api.acceptance : null;
  if (
    !acceptance ||
    acceptance.WEB_ARTIFACT_ACCEPTED !== false ||
    acceptance.API_ARTIFACT_ACCEPTED !== false ||
    acceptance.inequality !== "WEB_ARTIFACT_ACCEPTED != API_ARTIFACT_ACCEPTED"
  ) {
    throw failClosed("FAIL_CLOSED:api_artifact_acceptance_guard_invalid");
  }
  if (api.entry !== API_ENTRY) {
    throw failClosed("FAIL_CLOSED:api_artifact_entry_mismatch");
  }
  if (!isFullSha(sourceSha) || sourceSha !== wantSha) {
    throw failClosed("FAIL_CLOSED:api_artifact_source_sha_mismatch");
  }
  if (normalizeHex(api.artifact_digest) !== digest) {
    throw failClosed("FAIL_CLOSED:api_artifact_digest_mismatch");
  }
  if (api.digest_alg !== "sha256" || api.built_once !== true) {
    throw failClosed("FAIL_CLOSED:api_artifact_not_built_once");
  }
  return {
    artifact_kind: "api-nest",
    entry: API_ENTRY,
    source_sha: sourceSha,
    artifact_digest: digest,
    digest_alg: "sha256",
    built_once: true,
  };
}

function assertApiArtifact(payloadAbs, manifest) {
  const listed = manifest && manifest.api_artifact;
  if (!listed || typeof listed !== "object") {
    throw failClosed("FAIL_CLOSED:api_artifact_missing");
  }
  const actual = collectApiArtifact(payloadAbs, manifest.source_sha);
  const keys = [
    "artifact_kind",
    "entry",
    "source_sha",
    "artifact_digest",
    "digest_alg",
    "built_once",
  ];
  for (const key of keys) {
    if (listed[key] !== actual[key]) {
      throw failClosed("FAIL_CLOSED:api_artifact_manifest_mismatch", key);
    }
  }
  return actual;
}

function assertWorkerPrebuilts(payloadAbs, manifest) {
  const listed = manifest && manifest.worker_prebuilts;
  if (!listed || typeof listed !== "object") {
    throw failClosed("FAIL_CLOSED:worker_prebuilt_missing");
  }
  const fails = [];
  for (const name of WORKER_SNAPSHOTS) {
    const meta = listed[name];
    if (!meta || meta.bundled_once !== true) {
      fails.push("FAIL_CLOSED:worker_prebuilt_missing:" + name);
      continue;
    }
    let entry;
    try {
      entry = findPrebuiltEntry(path.join(payloadAbs, "workers", name, PREBUILT_DIR));
    } catch (err) {
      fails.push(((err && err.fails) || ["FAIL_CLOSED:worker_prebuilt_missing:" + name])[0]);
      continue;
    }
    const digest = fileSha256(entry);
    if (normalizeHex(meta.sha256) !== digest) {
      fails.push("FAIL_CLOSED:worker_prebuilt_digest_mismatch:" + name);
    }
  }
  if (fails.length) throwFails(fails);
}

function throwFails(fails) {
  const err = new Error(fails.join("\n"));
  err.code = "FAIL_CLOSED";
  err.fails = fails;
  throw err;
}

function toPosix(rel) {
  return String(rel).replace(/\\/g, "/");
}

function shouldSkipRel(rel) {
  const p = toPosix(rel);
  const isCanonicalApiDist =
    p === API_DIST_DIR || p.startsWith(API_DIST_DIR + "/");
  return (
    /(^|\/)node_modules(\/|$)/.test(p) ||
    /(^|\/)\.wrangler(\/|$)/.test(p) ||
    (!isCanonicalApiDist && /(^|\/)dist(\/|$)/.test(p)) ||
    /(^|\/)dist-selftest(\/|$)/.test(p) ||
    /(^|\/)\.open-next\/cache(\/|$)/.test(p) ||
    /(^|\/)\.git(\/|$)/.test(p)
  );
}

function walkFiles(absDir, baseRel) {
  const out = [];
  if (!fs.existsSync(absDir)) return out;
  const entries = fs.readdirSync(absDir, { withFileTypes: true });
  for (const ent of entries) {
    const rel = toPosix(path.join(baseRel, ent.name));
    if (shouldSkipRel(rel)) continue;
    const abs = path.join(absDir, ent.name);
    if (ent.isDirectory()) out.push(...walkFiles(abs, rel));
    else if (ent.isFile()) out.push({ rel, abs });
  }
  return out;
}

function canonicalDigest(payloadAbs) {
  const files = walkFiles(payloadAbs, "").sort((a, b) => (a.rel < b.rel ? -1 : a.rel > b.rel ? 1 : 0));
  if (!files.length) throw failClosed("FAIL_CLOSED:artifact_missing");
  const hash = crypto.createHash("sha256");
  for (const file of files) {
    hash.update(file.rel);
    hash.update("\0");
    hash.update(fs.readFileSync(file.abs));
    hash.update("\n");
  }
  return hash.digest("hex");
}

function readManifest(bundleDir) {
  const filePath = path.join(bundleDir, MANIFEST_FILE);
  if (!fs.existsSync(filePath)) throw failClosed("FAIL_CLOSED:digest_missing");
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function copyTree(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const file of walkFiles(src, "")) {
    const to = path.join(dest, file.rel);
    fs.mkdirSync(path.dirname(to), { recursive: true });
    fs.copyFileSync(file.abs, to);
  }
}

function verifyBundle(bundleDir, expected) {
  const fails = [];
  const payload = path.join(bundleDir, PAYLOAD_DIR);
  if (!fs.existsSync(payload)) throw failClosed("FAIL_CLOSED:artifact_missing");
  let manifest;
  try {
    manifest = readManifest(bundleDir);
  } catch (err) {
    if (err && err.code === "FAIL_CLOSED") throw err;
    throw failClosed("FAIL_CLOSED:digest_missing");
  }
  if (manifest.schema !== SCHEMA) fails.push("FAIL_CLOSED:manifest_schema_mismatch");
  if (manifest.artifact_name !== ARTIFACT_NAME) {
    fails.push("FAIL_CLOSED:manifest_artifact_name_mismatch");
  }
  if (manifest.digest_alg !== "sha256") {
    fails.push("FAIL_CLOSED:manifest_digest_alg_mismatch");
  }
  if (manifest.rebuild_forbidden_at_deploy !== true) {
    fails.push("FAIL_CLOSED:manifest_rebuild_guard_missing");
  }
  if (manifest.worker_prebuilt !== true) {
    fails.push("FAIL_CLOSED:manifest_worker_prebuilt_missing");
  }
  if (manifest.worker_deploy_no_bundle !== true) {
    fails.push("FAIL_CLOSED:manifest_worker_no_bundle_missing");
  }

  const digest = canonicalDigest(payload);
  const manDigest = normalizeHex(manifest.artifact_digest);
  if (!isSha256(manDigest)) fails.push("FAIL_CLOSED:digest_missing");
  if (isSha256(manDigest) && manDigest !== digest) fails.push("FAIL_CLOSED:digest_mismatch");
  const sourceSha = normalizeHex(manifest.source_sha);
  if (!isFullSha(sourceSha)) fails.push("FAIL_CLOSED:source_sha_not_full");
  if (expected && expected.sourceSha) {
    const want = normalizeHex(expected.sourceSha);
    if (!isFullSha(want)) fails.push("FAIL_CLOSED:requested_sha_not_full");
    if (isFullSha(want) && isFullSha(sourceSha) && want !== sourceSha) {
      fails.push("FAIL_CLOSED:artifact_source_sha_mismatch");
    }
  }
  if (expected && expected.digest) {
    const wantDigest = normalizeHex(expected.digest);
    if (!isSha256(wantDigest)) fails.push("FAIL_CLOSED:expected_digest_not_full");
    if (isSha256(wantDigest) && wantDigest !== digest) fails.push("FAIL_CLOSED:digest_mismatch");
  }
  if (manifest.built_once !== true) fails.push("FAIL_CLOSED:artifact_not_built_once");
  if (fails.length) throwFails(fails);
  assertWorkerPrebuilts(payload, manifest);
  const api_artifact = assertApiArtifact(payload, manifest);
  return {
    digest,
    source_sha: sourceSha,
    manifest,
    built_once: true,
    worker_prebuilts: manifest.worker_prebuilts,
    api_artifact,
  };
}

function assertRequiredOutputs(repoRoot) {
  for (const rel of REQUIRED_FILES) {
    if (!fs.existsSync(path.join(repoRoot, rel))) throw failClosed("FAIL_CLOSED:artifact_missing", rel);
  }
  for (const rel of REQUIRED_DIRS) {
    if (!fs.existsSync(path.join(repoRoot, rel))) throw failClosed("FAIL_CLOSED:artifact_missing", rel);
  }
  for (const worker of WORKER_SNAPSHOTS) {
    const toml = path.join(repoRoot, "workers", worker, "wrangler.toml");
    if (!fs.existsSync(toml)) throw failClosed("FAIL_CLOSED:artifact_missing", "workers/" + worker + "/wrangler.toml");
    findPrebuiltEntry(path.join(repoRoot, "workers", worker, PREBUILT_DIR));
  }
}

function packFromRepo(repoRoot, outDir, sourceSha) {
  const sha = normalizeHex(sourceSha);
  if (!isFullSha(sha)) throw failClosed("FAIL_CLOSED:source_sha_not_full");
  if (fs.existsSync(path.join(outDir, MANIFEST_FILE)) || fs.existsSync(path.join(outDir, PAYLOAD_DIR))) {
    throw failClosed("FAIL_CLOSED:artifact_rebuild_forbidden");
  }
  assertRequiredOutputs(repoRoot);
  const payload = path.join(outDir, PAYLOAD_DIR);
  fs.mkdirSync(payload, { recursive: true });
  copyTree(path.join(repoRoot, "apps/web/.open-next"), path.join(payload, "apps/web/.open-next"));
  copyTree(path.join(repoRoot, "apps/admin/.open-next"), path.join(payload, "apps/admin/.open-next"));
  copyTree(path.join(repoRoot, API_DIST_DIR), path.join(payload, API_DIST_DIR));
  for (const worker of WORKER_SNAPSHOTS) {
    const toml = path.join(repoRoot, "workers", worker, "wrangler.toml");
    const prebuilt = path.join(repoRoot, "workers", worker, PREBUILT_DIR);
    if (!fs.existsSync(toml)) throw failClosed("FAIL_CLOSED:artifact_missing", "workers/" + worker + "/wrangler.toml");
    findPrebuiltEntry(prebuilt);
    const dest = path.join(payload, "workers", worker);
    fs.mkdirSync(dest, { recursive: true });
    fs.copyFileSync(toml, path.join(dest, "wrangler.toml"));
    copyTree(prebuilt, path.join(dest, PREBUILT_DIR));
  }
  return writeManifest(outDir, sha);
}

function packFromPayload(payloadSrc, outDir, sourceSha) {
  const sha = normalizeHex(sourceSha);
  if (!isFullSha(sha)) throw failClosed("FAIL_CLOSED:source_sha_not_full");
  if (fs.existsSync(path.join(outDir, MANIFEST_FILE)) || fs.existsSync(path.join(outDir, PAYLOAD_DIR))) {
    throw failClosed("FAIL_CLOSED:artifact_rebuild_forbidden");
  }
  if (!fs.existsSync(payloadSrc)) throw failClosed("FAIL_CLOSED:artifact_missing");
  const payload = path.join(outDir, PAYLOAD_DIR);
  fs.mkdirSync(path.dirname(payload), { recursive: true });
  copyTree(payloadSrc, payload);
  return writeManifest(outDir, sha);
}

function writeManifest(outDir, sourceSha) {
  const payload = path.join(outDir, PAYLOAD_DIR);
  const worker_prebuilts = collectWorkerPrebuilts(payload);
  const api_artifact = collectApiArtifact(payload, sourceSha);
  const digest = canonicalDigest(payload);
  const manifest = {
    schema: SCHEMA,
    artifact_name: ARTIFACT_NAME,
    source_sha: sourceSha,
    built_once: true,
    artifact_digest: digest,
    digest_alg: "sha256",
    rebuild_forbidden_at_deploy: true,
    worker_prebuilt: true,
    worker_deploy_no_bundle: true,
    worker_prebuilts,
    api_artifact,
  };
  fs.writeFileSync(path.join(outDir, MANIFEST_FILE), JSON.stringify(manifest, null, 2) + "\n");
  return manifest;
}

function prepareExtractionTargets(repoRoot) {
  for (const rel of EXTRACTION_OUTPUTS) {
    fs.rmSync(path.join(repoRoot, rel), { recursive: true, force: true });
  }
}

function extractPayload(bundleDir, repoRoot) {
  const payload = path.join(bundleDir, PAYLOAD_DIR);
  if (!fs.existsSync(payload)) throw failClosed("FAIL_CLOSED:artifact_missing");
  prepareExtractionTargets(repoRoot);
  copyTree(payload, repoRoot);
}

function qaRecord(verified, extra) {
  return {
    schema: "release-artifact-qa.v1",
    verified: verified === true,
    ...extra,
  };
}

module.exports = {
  SCHEMA,
  ARTIFACT_NAME,
  MANIFEST_FILE,
  PAYLOAD_DIR,
  RELEASE_BUILD_WORKFLOW,
  API_DIST_DIR,
  API_ENTRY,
  API_MANIFEST,
  REQUIRED_FILES,
  REQUIRED_DIRS,
  WORKER_SNAPSHOTS,
  PREBUILT_DIR,
  EXTRACTION_OUTPUTS,
  isFullSha,
  isSha256,
  normalizeHex,
  failClosed,
  throwFails,
  fileSha256,
  findPrebuiltEntry,
  collectWorkerPrebuilts,
  assertWorkerPrebuilts,
  collectApiArtifact,
  assertApiArtifact,
  canonicalDigest,
  readManifest,
  verifyBundle,
  packFromRepo,
  packFromPayload,
  prepareExtractionTargets,
  extractPayload,
  qaRecord,
  assertRequiredOutputs,
};
