/**
 * Regression test for services/api-nest/clock.core.cjs's DB_URL_DENY list
 * (D1-S1C 2026-09-05, CodeQL js/regex/missing-regexp-anchor alerts 51/52).
 *
 * Run: node tooling/verify/regression/clock-core-db-url-deny.regression.cjs
 *
 * Coverage:
 *  1. realistic production-shaped DSNs (Supabase pooler .com, AWS RDS) must
 *     STILL be denied after adding \b boundaries - the fix must not weaken
 *     this fail-closed safety list for any real hostname shape.
 *  2. a coincidental mid-identifier substring (not a real hostname shape,
 *     e.g. "xsupabase.comy") does NOT trip the CURRENT production
 *     DB_URL_DENY entries. This asserts directly against the exported
 *     `core.DB_URL_DENY` array (the real, already-\b-bounded regexes that
 *     live in clock.core.cjs) instead of re-declaring a second, locally-
 *     defined "OLD vulnerable" RegExp literal in this file - CodeQL
 *     js/regex/missing-regexp-anchor cannot distinguish a test-only
 *     discrimination fixture's intentionally-unanchored literal from a live
 *     security check, so it re-flagged this file after the original D1-S1C
 *     fix (2026-09-05, PUTDUK-FULL-RELEASE Phase B remediation). Asserting
 *     against the real production array proves the identical behaviour
 *     without ever constructing a second, unanchored regex anywhere.
 */
"use strict";
const path = require("path");
const root = path.resolve(__dirname, "../../..");
const core = require(path.join(root, "services/api-nest/clock.core.cjs"));

const failures = [];
function expect(label, actual, expected) {
  if (actual !== expected) {
    failures.push(`${label}: expected ${expected}, got ${actual}`);
  }
}

const SAFE_ENV = Object.freeze({
  NODE_ENV: "test",
  AIPO_QA_CLOCK_ENABLE: "1",
  AIPO_QA_SYNTHETIC_NS: "qa-synth-ci",
  AIPO_QA_TARGET_ENV: "ci",
  AIPO_QA_HOSTNAME: "localhost",
});

function gateOkFor(databaseUrl) {
  return core.evaluateSyntheticClockGate(
    { ...SAFE_ENV, DATABASE_URL: databaseUrl },
    "localhost",
  ).ok;
}

// --- 1. realistic production DSN shapes must still be denied ---
// (YOUR_PASSWORD placeholder matches tooling/verify/secrets.cjs's own
// live-secret-shape allowlist - same convention the existing
// tooling/verify/domain-clock.cjs DENY_CASES fixture already uses.)
expect(
  "Supabase pooler .com DSN must still deny synthetic clock",
  gateOkFor("postgresql://svc:YOUR_PASSWORD@aws-0-ap-northeast-2.pooler.supabase.com:6543/postgres"),
  false,
);
expect(
  "AWS RDS DSN must still deny synthetic clock",
  gateOkFor("postgresql://svc:YOUR_PASSWORD@mydb-instance.abc123xyz.us-east-1.rds.amazonaws.com:5432/postgres"),
  false,
);
expect(
  "existing supabase.co DSN (unrelated pattern, untouched by this fix) must still deny",
  gateOkFor("postgresql://svc:YOUR_PASSWORD@db.example-ref.supabase.co:5432/postgres"),
  false,
);

// --- 2. discrimination check against the SPECIFIC two \b-bounded production
//        entries only (found by .source identity, not a locally-defined
//        "OLD vulnerable" RegExp literal, and not the whole array - the
//        array also contains OTHER, deliberately broader entries such as
//        /supabase\.co/i with no \b at all, which legitimately still match
//        "xsupabase.comy" and would make a whole-array .some() check
//        meaningless here) ---
const supabaseComEntry = core.DB_URL_DENY.find(
  (re) => re.source === "\\bsupabase\\.com\\b",
);
const rdsEntry = core.DB_URL_DENY.find(
  (re) => re.source === "\\.rds\\.amazonaws\\.com\\b",
);
if (!supabaseComEntry) failures.push("DB_URL_DENY no longer contains the expected \\bsupabase.com\\b entry");
if (!rdsEntry) failures.push("DB_URL_DENY no longer contains the expected \\.rds.amazonaws.com\\b entry");

const coincidental = "xsupabase.comy"; // not a real hostname shape - no boundary on either side
if (supabaseComEntry) {
  expect(
    "the \\bsupabase.com\\b production entry must NOT match the coincidental mid-word case",
    supabaseComEntry.test(coincidental),
    false,
  );
}

const coincidentalRds = ".rds.amazonaws.comx";
if (rdsEntry) {
  expect(
    "the \\.rds.amazonaws.com\\b production entry must NOT match the coincidental mid-word case",
    rdsEntry.test(coincidentalRds),
    false,
  );
}
// A real hostname always has a non-hostname-character boundary immediately
// before/after a dot-delimited label, so this is not a loophole: it only
// rules out a substring appearing mid-identifier, which is not a real
// hostname shape (see clock.core.cjs's own DB_URL_DENY doc comment). The
// OTHER, broader DB_URL_DENY entries (e.g. /supabase\.co/i) still correctly
// deny "xsupabase.comy" via section 1's whole-gate assertions below - this
// section only isolates the two specific \b-bounded entries under test.

// --- 3. end-to-end: the real verify:domain-clock script must still PASS ---
const { spawnSync } = require("node:child_process");
const e2e = spawnSync(process.execPath, [path.join(root, "tooling/verify/domain-clock.cjs")], {
  cwd: root,
  encoding: "utf8",
});
if (e2e.status !== 0) {
  failures.push(
    `end-to-end verify:domain-clock did not PASS (exit ${e2e.status}):\n${e2e.stdout}\n${e2e.stderr}`,
  );
}

if (failures.length) {
  console.error("[regression:clock-core-db-url-deny] FAIL\n- " + failures.join("\n- "));
  process.exit(1);
}
console.log(
  "[regression:clock-core-db-url-deny] PASS (3 realistic-DSN-still-denied + 2 discrimination assertions (against real production array, no local vulnerable-regex re-declaration) + 1 end-to-end run)",
);
