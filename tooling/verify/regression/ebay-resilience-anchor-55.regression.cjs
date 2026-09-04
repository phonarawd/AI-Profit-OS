/**
 * Regression test for CodeQL js/regex/missing-regexp-anchor alert 55
 * (D1-S1D 2026-09-05): tooling/verify/ebay-resilience.cjs:339 - the
 * "Nest must never call OUT to eBay directly" boundary check.
 *
 * Run: node tooling/verify/regression/ebay-resilience-anchor-55.regression.cjs
 *
 * Same \b word-boundary fix class already applied to
 * services/api-nest/clock.core.cjs (alerts 51/52) and
 * tooling/verify/{root-domain-env,secrets}.cjs (alerts 56-59).
 *
 * NOTE: this session's sibling alerts 53/54 (tooling/engine-acceptance/
 * kill-switch.cjs DB_URL_DENY, identical fix shape) were investigated and a
 * fix was drafted, but committing any change under tooling/engine-acceptance/
 * currently trips an UNRELATED, PRE-EXISTING verify:engine-acceptance FAIL
 * ("protected_scope_manifest.aggregate drift vs live hash") that reproduces
 * identically even with kill-switch.cjs fully reverted to HEAD (isolated via
 * `git stash` before/after - see D1-MASTER-STATE.json correctionEvent_D1S1D
 * for the exact isolation evidence). That drift is a separate, real, already-
 * latent defect gating the formal REL-502 rebase ceremony
 * (governance/engine-acceptance/**), not something to fix as a drive-by
 * CodeQL cleanup. Alerts 53/54 are therefore left OPEN_UNTRIAGED with this
 * evidence attached, not silently dismissed.
 */
"use strict";
const path = require("path");
const root = path.resolve(__dirname, "../../..");

const failures = [];
function expect(label, actual, expected) {
  if (actual !== expected) {
    failures.push(`${label}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

const OLD_EBAY_RE = /api\.ebay\.com|ebay\.com\/buy\/browse/i;
const NEW_EBAY_RE = /\bapi\.ebay\.com\b|\bebay\.com\/buy\/browse\b/i;

// --- discrimination: OLD regex matches a different-but-substring host; NEW must not ---
const coincidentalHost = "myapi.ebay.com"; // a genuinely different host, not api.ebay.com
expect(
  "sanity: OLD ebay-resilience regex really did match a different-but-substring host (test not vacuous)",
  OLD_EBAY_RE.test(coincidentalHost),
  true,
);
expect(
  "NEW ebay-resilience regex must NOT match the different host",
  NEW_EBAY_RE.test(coincidentalHost),
  false,
);

// --- real violations must still be caught ---
const realViolation1 = 'const url = "https://api.ebay.com/buy/browse/v1/item_summary/search";';
const realViolation2 = "const path = 'ebay.com/buy/browse endpoint';";
expect(
  "NEW ebay-resilience regex must still catch a real api.ebay.com reference",
  NEW_EBAY_RE.test(realViolation1),
  true,
);
expect(
  "NEW ebay-resilience regex must still catch a real ebay.com/buy/browse reference",
  NEW_EBAY_RE.test(realViolation2),
  true,
);

// --- end-to-end: the real verify:ebay-resilience script must still PASS ---
const { spawnSync } = require("node:child_process");
const e2e = spawnSync(process.execPath, [path.join(root, "tooling/verify/ebay-resilience.cjs")], {
  cwd: root,
  encoding: "utf8",
});
if (e2e.status !== 0) {
  failures.push(
    `end-to-end verify:ebay-resilience did not PASS (exit ${e2e.status}):\n${e2e.stdout}\n${e2e.stderr}`,
  );
}

if (failures.length) {
  console.error("[regression:ebay-resilience-anchor-55] FAIL\n- " + failures.join("\n- "));
  process.exit(1);
}
console.log(
  "[regression:ebay-resilience-anchor-55] PASS (2 discrimination + 2 real-violation + 1 end-to-end)",
);
