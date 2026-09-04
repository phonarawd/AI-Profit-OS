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
 *  2. a coincidental mid-identifier substring (not a real hostname shape)
 *     that the OLD unanchored regex would have flagged is confirmed to
 *     really have matched under the old logic (so this test is not
 *     vacuous), and confirmed to no longer match under the new \b-bounded
 *     regex - proving the fix actually changes matching behaviour.
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

// --- 2. discrimination check: the OLD unanchored regex really would match a
//        coincidental mid-word substring; the NEW \b-bounded one must not ---
const OLD_SUPABASE_COM_RE = /supabase\.com/i;
const NEW_SUPABASE_COM_RE = /\bsupabase\.com\b/i;
const coincidental = "xsupabase.comy"; // not a real hostname shape - no boundary on either side
expect(
  "sanity: the OLD unanchored regex really did match the coincidental case (test not vacuous)",
  OLD_SUPABASE_COM_RE.test(coincidental),
  true,
);
expect(
  "the NEW \\b-bounded regex must NOT match the coincidental mid-word case",
  NEW_SUPABASE_COM_RE.test(coincidental),
  false,
);

const OLD_RDS_RE = /\.rds\.amazonaws\.com/i;
const NEW_RDS_RE = /\.rds\.amazonaws\.com\b/i;
const coincidentalRds = ".rds.amazonaws.comx";
expect(
  "sanity: the OLD unanchored RDS regex really did match the coincidental case",
  OLD_RDS_RE.test(coincidentalRds),
  true,
);
expect(
  "the NEW \\b-bounded RDS regex must NOT match the coincidental case",
  NEW_RDS_RE.test(coincidentalRds),
  false,
);

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
  "[regression:clock-core-db-url-deny] PASS (3 realistic-DSN-still-denied + 4 discrimination assertions + 1 end-to-end run)",
);
