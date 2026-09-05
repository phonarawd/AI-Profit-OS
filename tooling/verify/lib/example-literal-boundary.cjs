/**
 * example-literal-boundary — shared pure helper (D1 REM-D1-6B, S1A CONTRA-004, S1 REM-001)
 *
 * Used by tooling/verify/home-product-contract.cjs to decide whether a
 * "forbidden example literal" (e.g. "32,000") appears as a *standalone*
 * number in a scanned source file, as opposed to merely being a substring of
 * a larger, unrelated number (e.g. "32,000" is a substring of "3,332,000").
 *
 * A naive `src.includes(lit)` check cannot tell these apart and produces
 * false positives against ordinary KRW-formatted values. This module fixes
 * that by requiring a numeric boundary: the literal must not be immediately
 * preceded or followed by another digit or comma.
 *
 * Kept as a separate, dependency-free, side-effect-free module (no fs/path
 * usage, no process.exit) specifically so it can be unit-tested directly
 * without triggering the parent script's full repo scan.
 */
"use strict";

function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * @param {string} src - source text to scan
 * @param {string} lit - literal number string to search for (e.g. "32,000")
 * @returns {string[]} every standalone occurrence found (empty array = none)
 */
function findStandaloneLiteralMatches(src, lit) {
  const re = new RegExp(`(?<![0-9,])${escapeRegExp(lit)}(?![0-9,])`, "g");
  return src.match(re) || [];
}

module.exports = { escapeRegExp, findStandaloneLiteralMatches };
