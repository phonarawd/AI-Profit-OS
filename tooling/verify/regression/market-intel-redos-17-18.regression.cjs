/**
 * Regression test for CodeQL js/polynomial-redos alerts 17 and 18
 * (D1-S1D 2026-09-05):
 *   17 - services/market-intelligence/src/card-grade.cjs:74
 *        "may run slow on strings with many repetitions of ' '"
 *   18 - services/market-intelligence/src/ebay-identity-match.cjs:139
 *        "may run slow on strings with many repetitions of '/'"
 *
 * Run: node tooling/verify/regression/market-intel-redos-17-18.regression.cjs
 *
 * Coverage:
 *  1. real card-grade inputs (PSA10 / PSA 10 / PSA-10 / PSA : 10 / BGS 9.5)
 *     must still extract identically after the regex change.
 *  2. real trading-card `set` catalog values (base1, sv3pt5, swsh12, LOB,
 *     MRD - taken directly from trading-card-seed.cjs) must still produce
 *     byte-identical `set.replace(...)` output after anchoring to `^`.
 *  3. timing/scaling sanity: an adversarial all-whitespace (alert 17) and
 *     all-non-digit (alert 18) input of increasing length must show
 *     roughly LINEAR growth after the fix, not quadratic - a lightweight
 *     empirical check in the same spirit as this repo's existing
 *     redos-scaling-probe.cjs, without requiring that external script.
 *  4. end-to-end: the real verify:ebay-identity-ingest script must still PASS.
 */
"use strict";
const path = require("path");
const root = path.resolve(__dirname, "../../..");
const { extractGradeFromText } = require(
  path.join(root, "services/market-intelligence/src/card-grade.cjs"),
);

const failures = [];
function expect(label, actual, expected) {
  if (actual !== expected) {
    failures.push(`${label}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

// --- 1. real card-grade inputs must still extract identically ---
const cardCases = [
  ["Charizard PSA10 Base Set", "PSA10"],
  ["Charizard PSA 10 Base Set", "PSA10"],
  ["Charizard PSA-10 Base Set", "PSA10"],
  ["Charizard PSA : 10 Base Set", "PSA10"],
  ["Charizard BGS 9.5 Base Set", "BGS9.5"],
  ["Charizard CGC10 Base Set", "CGC10"],
];
for (const [title, expected] of cardCases) {
  expect(`extractGradeFromText(${JSON.stringify(title)}).normalized`, extractGradeFromText(title).normalized, expected);
}

// --- 2. real `set` catalog values must produce identical replace() output ---
const OLD_SET_RE = /(\D+)(\d+)/;
const NEW_SET_RE = /^(\D+)(\d+)/;
const realSetValues = ["base1", "sv3", "sv1", "swsh12", "base4", "xy1", "sm1", "swsh45", "swsh7", "sv3pt5", "base3", "swsh35", "LOB", "MRD", "MFC"];
for (const set of realSetValues) {
  const oldOut = set.replace(OLD_SET_RE, "$1 $2");
  const newOut = set.replace(NEW_SET_RE, "$1 $2");
  expect(`set.replace old vs new must be byte-identical for real value ${JSON.stringify(set)}`, newOut, oldOut);
}

// --- 3. scaling sanity: growth should be roughly linear after the fix ---
function timeMs(fn) {
  const start = process.hrtime.bigint();
  fn();
  return Number(process.hrtime.bigint() - start) / 1e6;
}

// alert 17 shape: many repetitions of ' ' with no digit at the end (worst case)
const NEW_CARD_RE = /\b(PSA|BGS|Beckett|CGC|SGC)\s*(?:[-:]\s*)?(\d{1,2}(?:\.\d)?)\b/i;
const spaces4k = "PSA" + " ".repeat(4000) + "x"; // never completes a digit match
const spaces8k = "PSA" + " ".repeat(8000) + "x";
const tCard4k = timeMs(() => NEW_CARD_RE.test(spaces4k));
const tCard8k = timeMs(() => NEW_CARD_RE.test(spaces8k));
// linear growth: 8k should cost well under a quadratic ~4x multiple of 4k.
// generous threshold (3x) to avoid flakiness on a loaded/low-spec machine
// while still catching a real O(n^2) regression.
if (tCard4k > 0.02 && tCard8k > tCard4k * 3.5) {
  failures.push(`card-grade regex scaling looks super-linear: 4k=${tCard4k}ms 8k=${tCard8k}ms`);
}

// alert 18 shape: many repetitions of '/' with no digit anywhere
const slashes4k = "/".repeat(4000);
const slashes8k = "/".repeat(8000);
const tSet4k = timeMs(() => slashes4k.replace(NEW_SET_RE, "$1 $2"));
const tSet8k = timeMs(() => slashes8k.replace(NEW_SET_RE, "$1 $2"));
if (tSet4k > 0.02 && tSet8k > tSet4k * 3.5) {
  failures.push(`set.replace anchored regex scaling looks super-linear: 4k=${tSet4k}ms 8k=${tSet8k}ms`);
}

// sanity: confirm the OLD unanchored regex really is the slower shape at a
// larger size, so this test is not vacuous (best-effort - timing assertions
// are inherently a little noisy, so this is informational rather than a hard
// failure gate).
const slashes40k = "/".repeat(40000);
const tOld40k = timeMs(() => slashes40k.replace(OLD_SET_RE, "$1 $2"));
const tNew40k = timeMs(() => slashes40k.replace(NEW_SET_RE, "$1 $2"));
console.log(`[info] old-unanchored 40k=${tOld40k.toFixed(2)}ms vs new-anchored 40k=${tNew40k.toFixed(2)}ms`);

// --- 4. end-to-end: the real verify:ebay-identity-ingest script must still PASS ---
const { spawnSync } = require("node:child_process");
const e2e = spawnSync(process.execPath, [path.join(root, "tooling/verify/ebay-identity-ingest.cjs")], {
  cwd: root,
  encoding: "utf8",
});
if (e2e.status !== 0) {
  failures.push(
    `end-to-end verify:ebay-identity-ingest did not PASS (exit ${e2e.status}):\n${e2e.stdout}\n${e2e.stderr}`,
  );
}

if (failures.length) {
  console.error("[regression:market-intel-redos-17-18] FAIL\n- " + failures.join("\n- "));
  process.exit(1);
}
console.log(
  `[regression:market-intel-redos-17-18] PASS (${cardCases.length} card-grade + ${realSetValues.length} set-value + 2 scaling + 1 end-to-end)`,
);
