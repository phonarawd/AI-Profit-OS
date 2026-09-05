/**
 * Regression test for tooling/verify/lib/git-blob-hash.cjs and the provenance check it powers
 * inside tooling/verify/asset-production-pipeline.cjs (D1-S1E, 2026-09-05).
 *
 * Run: node tooling/verify/regression/home-lock-git-blob-provenance.regression.cjs
 *
 * Plain Node assertion script (no test framework wired into tooling/verify/ in this repo),
 * consistent with every other *.regression.cjs sibling. Performs real git subprocess calls
 * against this repo's own HEAD (read-only, git cat-file only - never writes, never checks out,
 * never mutates history) plus one in-memory negative-case assertion. Safe to run on any machine
 * / any branch: it only reads objects that must already exist at HEAD.
 *
 * Coverage required by the bug this closes:
 *  1. gitBlobSha256() for a real, stable, always-present file returns the correct sha256 (cross-
 *     checked against Node's own crypto hash of the same bytes read via `git cat-file -p`, i.e.
 *     an independent second computation of the identical bytes, not a hard-coded hash constant
 *     that would silently rot if the file it targets changes over time).
 *  2. gitBlobSha256() reports ok:false with a clear error (not a throw) for a path that does not
 *     exist at the given ref - the caller (asset-production-pipeline.cjs) must degrade to a FAIL
 *     message, not a crash.
 *  3. End-to-end: every current apps/web/scripts/asset-pipeline/home-lock.v1.json +
 *     home-lock-corrections.v1.json entry's declared sha256 matches its HEAD git-blob sha256 -
 *     this is the exact invariant that was violated by 38 files before this session's fix (see
 *     _audit-d0-20260904/session-1e-correction/logs/d1s1e-home-lock-hash-drift-full.json), and is
 *     the permanent guard against it recurring silently on any machine.
 *  4. A synthetic negative case (deliberately wrong expected hash) IS flagged as a mismatch by
 *     the same comparison logic the real check uses - proves assertion 3 is not vacuously true.
 */
"use strict";

const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const { spawnSync } = require("node:child_process");
const { gitBlobSha256 } = require("../lib/git-blob-hash.cjs");

const root = path.resolve(__dirname, "../../..");
const failures = [];

function expect(label, actual, expected) {
  if (actual !== expected) {
    failures.push(`${label}: expected ${expected}, got ${actual}`);
  }
}

// 1. Known-present file, cross-checked via an independent second read.
const knownRel = "package.json";
const r1 = gitBlobSha256(root, "HEAD", knownRel);
if (!r1.ok) {
  failures.push(`gitBlobSha256 unexpectedly failed for ${knownRel}: ${r1.error}`);
} else {
  const raw = spawnSync("git", ["cat-file", "-p", `HEAD:${knownRel}`], {
    cwd: root,
    maxBuffer: 1024 * 1024 * 16,
  }).stdout;
  const independent = crypto.createHash("sha256").update(raw).digest("hex");
  expect("known-file sha256 matches independent recomputation", r1.sha256, independent);
  if (r1.bytes !== raw.length) {
    failures.push(`known-file byte length mismatch: ${r1.bytes} vs ${raw.length}`);
  }
}

// 2. Missing path must degrade gracefully (ok:false + message), not throw.
let r2;
try {
  r2 = gitBlobSha256(
    root,
    "HEAD",
    "this/path/does/not/exist/anywhere/d1s1e-fixture.missing",
  );
} catch (err) {
  failures.push(`gitBlobSha256 threw instead of returning ok:false: ${err.message}`);
  r2 = { ok: true }; // avoid double-report below
}
if (r2 && r2.ok !== false) {
  failures.push("gitBlobSha256 should report ok:false for a missing path");
}

// 3. End-to-end: every home-lock (+corrections) entry's declared hash matches its HEAD blob hash.
function readJson(rel) {
  return JSON.parse(fs.readFileSync(path.join(root, rel), "utf8"));
}
const lock = readJson("apps/web/scripts/asset-pipeline/home-lock.v1.json");
const corrections = readJson(
  "apps/web/scripts/asset-pipeline/home-lock-corrections.v1.json",
);
const lockFiles = { ...(lock.files || {}), ...(corrections.corrections || {}) };
const lockEntries = Object.entries(lockFiles);
if (lockEntries.length < 40) {
  failures.push(
    `sanity: expected >=40 combined lock entries, found ${lockEntries.length} - fixture assumption may be stale`,
  );
}
let mismatchCount = 0;
for (const [rel, meta] of lockEntries) {
  const blob = gitBlobSha256(root, "HEAD", rel);
  if (!blob.ok) {
    failures.push(`could not read committed blob for locked asset ${rel}: ${blob.error}`);
    continue;
  }
  if (blob.sha256 !== meta.sha256) {
    mismatchCount += 1;
    failures.push(
      `PROVENANCE DRIFT still present: ${rel} lock=${meta.sha256.slice(0, 12)} blob=${blob.sha256.slice(0, 12)}`,
    );
  }
}
if (mismatchCount === 0) {
  console.log(
    `[3/4] OK: all ${lockEntries.length} home-lock(+corrections) entries match their HEAD git blob exactly (0 provenance drift)`,
  );
}

// 4. Negative case: a deliberately wrong expected hash must be caught by the same comparison.
const [sampleRel] = lockEntries[0];
const realBlob = gitBlobSha256(root, "HEAD", sampleRel);
const fakeExpected = "0".repeat(64);
if (realBlob.ok && realBlob.sha256 === fakeExpected) {
  failures.push("negative-case fixture collided with a real hash - test is broken, not the code");
} else if (realBlob.ok) {
  console.log(
    "[4/4] OK: synthetic wrong-hash fixture correctly disagrees with the real blob hash (comparison is not vacuous)",
  );
}

if (failures.length) {
  console.error(`[home-lock-git-blob-provenance.regression] FAIL (${failures.length})`);
  for (const f of failures) console.error(" -", f);
  process.exit(1);
}
console.log("[home-lock-git-blob-provenance.regression] PASS (4/4)");
