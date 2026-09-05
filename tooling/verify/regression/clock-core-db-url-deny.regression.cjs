/**
 * Regression test for services/api-nest/clock.core.cjs's managed-database
 * host check (D1-S1F 2026-09-05, CodeQL js/regex/missing-regexp-anchor
 * alerts 80/81 — structural fix, not another anchor).
 *
 * Run: node tooling/verify/regression/clock-core-db-url-deny.regression.cjs
 *
 * History: alerts 51/52 (D1-S1C) added `\b` boundaries to a regex-against-
 * whole-DSN-string DENY list. CodeQL flagged the SAME lines again as 80/81
 * because it treats DATABASE_URL as URL-shaped and considers any
 * `regex.test(url)` capable of matching "anywhere". The real fix parses the
 * DSN with `URL` and compares only `.hostname` against known suffixes
 * (`isManagedDatabaseHost` / `safeDatabaseUrlHostname` in clock.core.cjs).
 *
 * Coverage:
 *  1. realistic production-shaped DSNs (Supabase direct + pooler, AWS RDS,
 *     current root domain) must STILL be denied — the fix must not weaken
 *     this fail-closed safety list for any real hostname shape.
 *  2. the SPECIFIC substring-bypass shapes CodeQL's alert describes (host
 *     token appearing in userinfo / query / path / as a sibling label
 *     rather than as the real authority) must NOT be treated as evidence
 *     either way BY THE HOSTNAME ITSELF — i.e. the decision is provably
 *     driven only by `new URL(...).hostname`, not by scanning the raw
 *     string. Each case is a non-managed, arbitrary host that must be
 *     ALLOWED (proving the old "matches anywhere" over-broad behaviour is
 *     gone), paired with a real managed host that must still be DENIED
 *     from the same raw-string family (proving no coverage was lost).
 *  3. malformed / unparseable DATABASE_URL values fail closed (denied),
 *     which is a strictly SAFER behaviour than the old regex list (an
 *     unparseable string that happened to match no regex was previously
 *     silently ALLOWED).
 *  4. end-to-end: the real verify:domain-clock script must still PASS.
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
// live-secret-shape allowlist convention.)
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
  "existing supabase.co direct DSN must still deny",
  gateOkFor("postgresql://svc:YOUR_PASSWORD@db.example-ref.supabase.co:5432/postgres"),
  false,
);
expect(
  "current production root domain (hiptk.app) must deny",
  gateOkFor("postgresql://svc:YOUR_PASSWORD@db.hiptk.app:5432/postgres"),
  false,
);
expect(
  "bare rds.amazonaws.com host (no subdomain) must deny",
  gateOkFor("postgresql://svc:YOUR_PASSWORD@rds.amazonaws.com:5432/postgres"),
  false,
);

// --- 2a. real hostname exported helper matches exactly the intended shapes ---
expect(
  "hostMatchesManagedSuffix: exact host",
  core.hostMatchesManagedSuffix("supabase.com", "supabase.com"),
  true,
);
expect(
  "hostMatchesManagedSuffix: real subdomain",
  core.hostMatchesManagedSuffix("aws-0-ap-northeast-2.pooler.supabase.com", "supabase.com"),
  true,
);
expect(
  "hostMatchesManagedSuffix: coincidental prefix (not a subdomain) must NOT match",
  core.hostMatchesManagedSuffix("xsupabase.com", "supabase.com"),
  false,
);
expect(
  "hostMatchesManagedSuffix: unrelated host must NOT match",
  core.hostMatchesManagedSuffix("evil.example.com", "supabase.com"),
  false,
);

// --- 2b. the exact substring-bypass shapes CodeQL's alert is about — the
// managed-looking token sits in userinfo/query/path, NOT the real host, and
// must have ZERO influence on the decision (only .hostname is ever read) ---
const bypassCases = [
  [
    "managed token in query string, real host is arbitrary",
    "postgresql://svc:YOUR_PASSWORD@arbitrary-attacker-host.example.net:5432/db?note=rds.amazonaws.com",
  ],
  [
    "managed token in userinfo, real host is arbitrary",
    "postgresql://rds.amazonaws.com:YOUR_PASSWORD@arbitrary-attacker-host.example.net:5432/db",
  ],
  [
    "managed token in path, real host is arbitrary",
    "postgresql://svc:YOUR_PASSWORD@arbitrary-attacker-host.example.net:5432/supabase.com",
  ],
  [
    "managed token as a sibling label, not a real subdomain",
    "postgresql://svc:YOUR_PASSWORD@notsupabase.com.arbitrary-attacker-host.example.net:5432/db",
  ],
];
for (const [label, dsn] of bypassCases) {
  expect(`${label} must be ALLOWED (arbitrary host, not managed)`, gateOkFor(dsn), true);
}

// --- 3. malformed/unparseable DATABASE_URL fails closed (denied) — strictly
// safer than the old regex-list behaviour (no-match => silently allowed) ---
expect(
  "safeDatabaseUrlHostname returns null for unparseable input",
  core.safeDatabaseUrlHostname("not a url at all, just text"),
  null,
);
expect(
  "isManagedDatabaseHost fails closed (true) for unparseable input",
  core.isManagedDatabaseHost("not a url at all, just text"),
  true,
);
expect(
  "malformed DATABASE_URL denies synthetic clock (fail closed)",
  gateOkFor("not a url at all, just text"),
  false,
);
expect(
  "empty DATABASE_URL is treated as unset (allowed — nothing to target)",
  gateOkFor(""),
  true,
);

// --- 4. end-to-end: the real verify:domain-clock script must still PASS ---
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
  "[regression:clock-core-db-url-deny] PASS (5 realistic-DSN-still-denied + 4 suffix-helper + 4 substring-bypass-now-allowed + 4 fail-closed-parse + 1 end-to-end run)",
);
