/**
 * Regression test for tooling/verify/home-product-contract.cjs's example-literal
 * boundary check (D1 REM-D1-6B / S1A CONTRA-004 / S1 REM-001).
 *
 * Run: node tooling/verify/regression/home-product-contract.regression.cjs
 *
 * This is a plain Node assertion script (no test framework is wired into
 * tooling/verify/ in this repo), consistent with the sibling scripts under
 * tooling/verify/lib/. It performs pure, in-memory string checks only - it
 * does not read or write any file in the tracked source tree, and is safe to
 * run on any machine/branch.
 *
 * Coverage required by the D1 mandate section 6-B:
 *  1. a legitimate KRW value containing an example literal as a pure
 *     substring must NOT be flagged (this is the exact bug: "32,000" inside
 *     "\u20a93,332,000")
 *  2. a standalone occurrence of a forbidden literal in a production-shaped
 *     string must still be flagged (the check must not have been neutered)
 *  3. boundary edge cases (leading/trailing digit or comma adjacency on
 *     either side) are exercised explicitly, not just the one reported case
 *  4. an end-to-end run of the real script against the current tree is
 *     included, so a future unrelated change to any of the OTHER checks in
 *     home-product-contract.cjs (required sections / taxonomy / governance
 *     markers / Canon wire refs) is still caught by this regression test
 *     failing loudly, not silently.
 */
"use strict";

const path = require("node:path");
const { spawnSync } = require("node:child_process");
const {
  findStandaloneLiteralMatches,
} = require("../lib/example-literal-boundary.cjs");

const root = path.resolve(__dirname, "../../..");
const failures = [];

function expect(label, actualCount, expectedCount) {
  if (actualCount !== expectedCount) {
    failures.push(
      `${label}: expected ${expectedCount} standalone match(es), got ${actualCount}`,
    );
  }
}

// --- 1. the reported bug: legit KRW value must PASS (0 standalone matches) ---
expect(
  'PASS-case "\u2248 \u20a93,332,000" must not standalone-match "32,000"',
  findStandaloneLiteralMatches("\u2248 \u20a93,332,000", "32,000").length,
  0,
);
expect(
  'PASS-case krw row "usdt: \\"2,450.00\\", krw: \\"\u2248 \u20a93,332,000\\"" must not standalone-match "32,000"',
  findStandaloneLiteralMatches(
    'usdt: "2,450.00", krw: "\u2248 \u20a93,332,000"',
    "32,000",
  ).length,
  0,
);

// --- 2. the other two configured literals must have the same PASS behaviour
//        when embedded in an unrelated larger number (generalization check,
//        not just the one literal from the bug report) ---
expect(
  '"128,000" embedded inside "9,128,000" must not standalone-match',
  findStandaloneLiteralMatches("\u20a99,128,000 \uc0c1\ud488", "128,000").length,
  0,
);
expect(
  '"1,720,000" embedded inside "21,720,000" must not standalone-match',
  findStandaloneLiteralMatches("\u20a921,720,000 \uc0c1\ud488", "1,720,000").length,
  0,
);

// --- 3. a genuinely standalone forbidden literal must still FAIL (the check
//        must not have been neutered into never matching anything) ---
expect(
  'standalone "32,000\uc6d0" must match exactly once',
  findStandaloneLiteralMatches("\uc608\uc2dc \uac00\uaca9\uc740 32,000\uc6d0\uc785\ub2c8\ub2e4", "32,000").length,
  1,
);
expect(
  'standalone "\u20a9128,000" must match exactly once',
  findStandaloneLiteralMatches("\uc815\uac00 \u20a9128,000", "128,000").length,
  1,
);
expect(
  'standalone "1,720,000" at string start must match exactly once',
  findStandaloneLiteralMatches("1,720,000 USDT \uc608\uc0c1", "1,720,000").length,
  1,
);

// --- 4. boundary edge cases: a following comma+digits means it is still part
//        of a bigger number even though the character right after is a comma
//        (not a digit) - the naive "only check next digit" version of a
//        boundary fix would have missed this ---
expect(
  '"32,000,000" must NOT standalone-match "32,000" (trailing comma+digits extends the number)',
  findStandaloneLiteralMatches("\u20a932,000,000", "32,000").length,
  0,
);
expect(
  '"132,000" must NOT standalone-match "32,000" (leading digit extends the number)',
  findStandaloneLiteralMatches("\u20a9132,000", "32,000").length,
  0,
);
expect(
  '"32,0001" (trailing extra digit, no comma) must NOT standalone-match "32,000"',
  findStandaloneLiteralMatches("32,0001", "32,000").length,
  0,
);

// --- 5. end-to-end: the real script must currently PASS on this tree (guards
//        against a regression in any of its OTHER, untouched checks) ---
const e2e = spawnSync(
  process.execPath,
  [path.join(root, "tooling/verify/home-product-contract.cjs")],
  { cwd: root, encoding: "utf8" },
);
if (e2e.status !== 0) {
  failures.push(
    `end-to-end home-product-contract.cjs did not PASS on the current tree (exit ${e2e.status}):\n${e2e.stdout}\n${e2e.stderr}`,
  );
}

if (failures.length) {
  console.error(
    "[regression:home-product-contract] FAIL\n- " + failures.join("\n- "),
  );
  process.exit(1);
}
console.log(
  "[regression:home-product-contract] PASS (9 boundary-case assertions + end-to-end real-tree run)",
);
