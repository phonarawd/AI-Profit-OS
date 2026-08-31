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

const REQUIRED_FILES = [
  "apps/web/.open-next/worker.js",
  "apps/admin/.open-next/worker.js",
];
const REQUIRED_DIRS = [
  "apps/web/.open-next/assets",
  "apps/admin/.open-next/assets",
];
const WORKER_SNAPSHOTS = ["push-dispatcher", "ebay-adapter"];

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
  return (
    /(^|\/)node_modules(\/|$)/.test(p) ||
    /(^|\/)\.wrangler(\/|$)/.test(p) ||
    /(^|\/)dist(\/|$)/.test(p) ||
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
  return {
    digest,
    source_sha: sourceSha,
    manifest,
    built_once: true,
  };
}

function assertRequiredOutputs(repoRoot) {
  for (const rel of REQUIRED_FILES) {
    if (!fs.existsSync(path.join(repoRoot, rel))) throw failClosed("FAIL_CLOSED:artifact_missing", rel);
  }
  for (const rel of REQUIRED_DIRS) {
    if (!fs.existsSync(path.join(repoRoot, rel))) throw failClosed("FAIL_CLOSED:artifact_missing", rel);
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
  for (const worker of WORKER_SNAPSHOTS) {
    const src = path.join(repoRoot, "workers", worker);
    if (!fs.existsSync(src)) throw failClosed("FAIL_CLOSED:artifact_missing", "workers/" + worker);
    copyTree(src, path.join(payload, "workers", worker));
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
  const digest = canonicalDigest(payload);
  const manifest = {
    schema: SCHEMA,
    artifact_name: ARTIFACT_NAME,
    source_sha: sourceSha,
    built_once: true,
    artifact_digest: digest,
    digest_alg: "sha256",
    rebuild_forbidden_at_deploy: true,
  };
  fs.writeFileSync(path.join(outDir, MANIFEST_FILE), JSON.stringify(manifest, null, 2) + "\n");
  return manifest;
}

function extractPayload(bundleDir, repoRoot) {
  const payload = path.join(bundleDir, PAYLOAD_DIR);
  if (!fs.existsSync(payload)) throw failClosed("FAIL_CLOSED:artifact_missing");
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
  REQUIRED_FILES,
  REQUIRED_DIRS,
  WORKER_SNAPSHOTS,
  isFullSha,
  isSha256,
  normalizeHex,
  failClosed,
  throwFails,
  canonicalDigest,
  readManifest,
  verifyBundle,
  packFromRepo,
  packFromPayload,
  extractPayload,
  qaRecord,
  assertRequiredOutputs,
};
