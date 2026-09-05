/**
 * Regression test for the "Nest must never call OUT to eBay directly"
 * boundary check in tooling/verify/ebay-resilience.cjs (§11).
 *
 * Run: node tooling/verify/regression/ebay-resilience-anchor-55.regression.cjs
 *
 * History: originally a \b-word-boundary regex fix for CodeQL
 * js/regex/missing-regexp-anchor alert 55 (D1-S1D, 2026-09-05). That anchor
 * style was re-flagged under a new alert number (82) because CodeQL
 * classifies the checked value as URL-like and does not accept any anchor
 * flavor as sufficient for that classification (PUTDUK-FULL-RELEASE Phase B,
 * 2026-09-05). ebay-resilience.cjs itself was then rewritten to use
 * tooling/verify/lib/domain-token-scan.cjs's exact-token comparison instead
 * of a regex `.test()` against the whole file text - this test now exercises
 * that real, shipped implementation directly (via the exported helper
 * functions, not a second, locally-defined regex literal), plus an
 * end-to-end run of the real script.
 *
 * Coverage:
 *  1. real violations (api.ebay.com / ebay.com/buy/browse as their own
 *     token) must still be caught.
 *  2. a different-but-substring host (e.g. "myapi.ebay.com" - a genuinely
 *     different, longer hostname, not api.ebay.com) must NOT be caught -
 *     proves the exact-token comparison, not merely "not vacuous" via a
 *     second regex.
 *  3. end-to-end: the real verify:ebay-resilience script must still PASS.
 */
"use strict";
const path = require("path");
const root = path.resolve(__dirname, "../../..");
const {
  hasExactDomainToken,
  hasExactHostPathToken,
} = require(path.join(root, "tooling/verify/lib/domain-token-scan.cjs"));

const failures = [];
function expect(label, actual, expected) {
  if (actual !== expected) {
    failures.push(`${label}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

// --- 1. real violations must still be caught (exact token match) ---
const realViolation1 = 'const url = "https://api.ebay.com/buy/browse/v1/item_summary/search";';
const realViolation2 = "const path = 'ebay.com/buy/browse endpoint';";
expect(
  "real api.ebay.com reference must still be caught",
  hasExactDomainToken(realViolation1, "api.ebay.com"),
  true,
);
expect(
  "real ebay.com/buy/browse reference must still be caught",
  hasExactHostPathToken(realViolation2, "ebay.com/buy/browse"),
  true,
);

// --- 2. discrimination: a different, longer hostname must not match ---
const coincidentalHost = "myapi.ebay.com"; // a genuinely different host, not api.ebay.com
expect(
  "a different-but-substring host (myapi.ebay.com) must NOT match api.ebay.com",
  hasExactDomainToken(coincidentalHost, "api.ebay.com"),
  false,
);
const differentPath = "ebay.com/buy/browse/extra-segment";
expect(
  "a different, longer path must NOT match the exact ebay.com/buy/browse token",
  hasExactHostPathToken(differentPath, "ebay.com/buy/browse"),
  false,
);

// --- 3. end-to-end: the real verify:ebay-resilience script must still PASS ---
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
  "[regression:ebay-resilience-anchor-55] PASS (2 real-violation + 2 discrimination + 1 end-to-end, exact-token helper only, no locally-defined regex literal)",
);
