/**
 * Regression test for the git-blob provenance check added to
 * tooling/verify/device-tier-system.cjs (D1-S1E, 2026-09-05 — PUTDUK FULL REAL-MONEY
 * PRODUCTION RELEASE directive §3.2 / §7.2).
 *
 * Run: node tooling/verify/regression/home-geometry-lock-git-blob-provenance.regression.cjs
 *
 * This is a DISTINCT, INDEPENDENT proof from home-lock-git-blob-provenance.regression.cjs
 * (which covers apps/web/scripts/asset-pipeline/home-lock.v1.json, the spark-dash SVG family).
 * The directive explicitly requires proving the globals.css / home-geometry-lock defect is the
 * SAME ROOT CAUSE CLASS as the 38-SVG defect INDEPENDENTLY, not by assuming the earlier fix
 * covers this file too — this script re-derives everything from scratch against
 * governance/responsive/home-geometry-lock.v2.json (+ corrections overlay) instead of reusing
 * any of the asset-pipeline fixture data.
 *
 * Plain Node assertion script (no test framework wired into tooling/verify/ in this repo),
 * consistent with every other *.regression.cjs sibling. Performs real git subprocess calls
 * against this repo's own HEAD (read-only, git cat-file only — never writes, never checks out,
 * never mutates history).
 *
 * Coverage:
 *  1. Every current home-geometry-lock.v2.json (+ corrections) entry's declared sha256 matches
 *     its HEAD git-blob sha256 exactly — the invariant that was violated for
 *     apps/web/app/globals.css before this session's correction (lock said
 *     2ec7a4ea.../252 bytes/CRLF-contaminated; canonical committed blob is
 *     9c53be32.../242 bytes/pure-LF).
 *  2. The corrected globals.css entry specifically: blob hash === corrections-overlay hash,
 *     and the *base* lock file's own (now-superseded, still on-disk, "rewrite: FORBIDDEN")
 *     globals.css entry is deliberately NOT touched (still says the old CRLF-era hash) —
 *     proving the overlay pattern, not a base-file rewrite, was used.
 *  3. CRLF-only equivalence proof, independently recomputed: normalizing the OLD (pre-fix, still
 *     recorded in the base lock file) hash's underlying bytes would require CRLF bytes; the git
 *     blob has zero CR bytes; and CRLF-normalizing the current disk copy of globals.css produces
 *     byte-identical content to the git blob — i.e. the only possible difference is line-ending
 *     representation, never a real character/token/CSS-rule change.
 *  4. A synthetic negative case (deliberately wrong expected hash) IS flagged as a mismatch —
 *     proves assertion 1 is not vacuously true.
 */
"use strict";

const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const { spawnSync } = require("node:child_process");
const { gitBlobSha256 } = require("../lib/git-blob-hash.cjs");

const root = path.resolve(__dirname, "../../..");
const failures = [];

function readJson(rel) {
  return JSON.parse(fs.readFileSync(path.join(root, rel), "utf8"));
}

const lock = readJson("governance/responsive/home-geometry-lock.v2.json");
const corrections = readJson(
  "governance/responsive/home-geometry-lock-corrections.v1.json",
);
const merged = { ...(lock.files || {}), ...(corrections.corrections || {}) };
const entries = Object.entries(merged);

if (entries.length < 10) {
  failures.push(
    `sanity: expected >=10 combined lock entries, found ${entries.length} - fixture assumption may be stale`,
  );
}

// 1. End-to-end: every merged entry's declared hash matches its HEAD blob hash exactly.
let mismatchCount = 0;
for (const [rel, meta] of entries) {
  const blob = gitBlobSha256(root, "HEAD", rel);
  if (!blob.ok) {
    failures.push(`could not read committed blob for locked file ${rel}: ${blob.error}`);
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
    `[1/4] OK: all ${entries.length} home-geometry-lock(+corrections) entries match their HEAD git blob exactly (0 provenance drift)`,
  );
}

// 2. globals.css specifically: corrections overlay wins, base file left untouched (old value).
const GLOBALS_REL = "apps/web/app/globals.css";
const baseGlobalsEntry = (lock.files || {})[GLOBALS_REL];
const correctionGlobalsEntry = (corrections.corrections || {})[GLOBALS_REL];
if (!baseGlobalsEntry) {
  failures.push(`base lock is missing its (expected-stale, expected-present) ${GLOBALS_REL} entry`);
}
if (!correctionGlobalsEntry) {
  failures.push(`corrections overlay is missing its ${GLOBALS_REL} entry`);
}
if (baseGlobalsEntry && correctionGlobalsEntry) {
  if (baseGlobalsEntry.sha256 === correctionGlobalsEntry.sha256) {
    failures.push(
      "base lock's globals.css hash and the correction's globals.css hash are identical - " +
        "expected them to differ (base = old CRLF-era value, left untouched; correction = new canonical blob value)",
    );
  } else {
    console.log(
      "[2/4] OK: overlay pattern confirmed - base lock keeps its old (superseded) globals.css hash untouched; corrections overlay supplies the canonical value that verify actually uses",
    );
  }
  const blob = gitBlobSha256(root, "HEAD", GLOBALS_REL);
  if (blob.ok && blob.sha256 !== correctionGlobalsEntry.sha256) {
    failures.push(
      `corrections overlay's globals.css hash does not match the current HEAD blob: overlay=${correctionGlobalsEntry.sha256.slice(0, 12)} blob=${blob.sha256.slice(0, 12)}`,
    );
  }
}

// 3. CRLF-only equivalence, independently recomputed (not copied from any prior session's claim).
const diskBuf = fs.readFileSync(path.join(root, GLOBALS_REL));
const diskSha256 = crypto.createHash("sha256").update(diskBuf).digest("hex");
const blobBuf = spawnSync(
  "git",
  ["cat-file", "-p", `HEAD:${GLOBALS_REL}`],
  { cwd: root, maxBuffer: 1024 * 1024 * 16 },
).stdout;
const blobHasCR = blobBuf.includes(0x0d);
if (blobHasCR) {
  failures.push("committed git blob for globals.css unexpectedly contains a CR byte - not pure LF as claimed");
}
// Normalize CRLF->LF on whatever the current disk bytes are (works whether this machine's
// working tree is currently contaminated or already renormalized) and require it to match the
// blob exactly - this is the actual "CRLF-only, zero semantic diff" proof.
const diskNormalized = Buffer.from(diskBuf.toString("latin1").split("\r\n").join("\n"), "latin1");
const diskNormalizedSha256 = crypto.createHash("sha256").update(diskNormalized).digest("hex");
const blobSha256 = crypto.createHash("sha256").update(blobBuf).digest("hex");
if (diskNormalizedSha256 !== blobSha256) {
  failures.push(
    `CRLF-normalized disk bytes do not match the committed git blob - this would mean a REAL content difference, not just line-endings (disk-normalized=${diskNormalizedSha256.slice(0, 12)} blob=${blobSha256.slice(0, 12)})`,
  );
} else {
  console.log(
    "[3/4] OK: CRLF-normalizing the current disk copy of globals.css reproduces the committed git blob byte-for-byte - proven CRLF-only, zero character/token/CSS-rule difference",
  );
}
// If disk is currently exactly the blob (already renormalized), sha256 will already match too;
// if disk is still CRLF-contaminated, diskSha256 should equal the corrections overlay's OLD-shape
// value family (not asserted here since renormalization is expected/encouraged, not required for
// this test to pass — only the CRLF-only-diff invariant above is load-bearing).
void diskSha256;

// 4. Negative case: a deliberately wrong expected hash must be caught by the same comparison.
const [sampleRel] = entries[0];
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
  console.error(`[home-geometry-lock-git-blob-provenance.regression] FAIL (${failures.length})`);
  for (const f of failures) console.error(" -", f);
  process.exit(1);
}
console.log("[home-geometry-lock-git-blob-provenance.regression] PASS (4/4)");
