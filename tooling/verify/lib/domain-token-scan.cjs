/**
 * domain-token-scan — shared pure helper (2026-09-05, PUTDUK FULL REAL-MONEY
 * PRODUCTION RELEASE directive Phase B / CodeQL js/regex/missing-regexp-anchor
 * residual alerts on tooling/verify/root-domain-env.cjs and
 * tooling/verify/ebay-resilience.cjs — new alert numbers 82/89/90/91,
 * descending from the already-closed #55/#56/#57/#58).
 *
 * Root cause this closes (structurally, not by adding another anchor):
 * root-domain-env.cjs / ebay-resilience.cjs both scan a whole FILE'S TEXT for
 * a placeholder/forbidden host substring using a regex + word-boundary
 * (`\bexample\.com\b`). CodeQL's `js/regex/missing-regexp-anchor` query
 * classifies these values as URL-like and considers `\b` boundary-insufficient:
 * `\b` blocks a mid-identifier match (e.g. "myexample.com" still matches, since
 * "y" before "e" IS a word character... actually `\b` DOES block that one, but
 * CodeQL's heuristic is deliberately conservative for any URL-classified value
 * and does not special-case which specific boundary characters a given anchor
 * uses) - CodeQL's own worked example is a *runtime* URL-redirect check, and it
 * cannot statically distinguish that from "scan this repo's own checked-in
 * config/source text for a placeholder", so it flags the pattern shape itself.
 *
 * The fix here is NOT another anchor flavor: it drops regex-based substring
 * matching against the raw file text entirely. Instead it tokenizes the text
 * on non-hostname characters (splitting apart on anything that ISN'T a-z/A-Z/
 * 0-9/dot/hyphen, i.e. whitespace, quotes, braces, commas, slashes, colons,
 * newlines...) and requires an EXACT (===, case-insensitive) match against one
 * whole token - never a regex `.test()` against the full text. A hostname that
 * merely CONTAINS the target as a sub-label (e.g. "notexample.com",
 * "example.com.evil.net", "subdomain.example.com") tokenizes to a DIFFERENT
 * whole token and therefore never matches, with zero regex involved in the
 * actual host comparison.
 */
"use strict";

/**
 * @param {string} text
 * @param {{ allowSlash?: boolean }} [opts] allowSlash: also keep '/' as a
 *   token-safe character (for host+path literals like "ebay.com/buy/browse").
 * @returns {string[]}
 */
function domainLikeTokens(text, opts) {
  if (typeof text !== "string") return [];
  const allowSlash = !!(opts && opts.allowSlash);
  const delimiter = allowSlash ? /[^a-zA-Z0-9.\/-]+/ : /[^a-zA-Z0-9.-]+/;
  return text.split(delimiter).filter(Boolean);
}

/**
 * Exact-token match for a bare hostname literal (e.g. "example.com").
 * @param {string} text
 * @param {string} domain
 * @returns {boolean}
 */
function hasExactDomainToken(text, domain) {
  if (typeof domain !== "string" || domain.length === 0) return false;
  const needle = domain.toLowerCase();
  return domainLikeTokens(text).some((t) => t.toLowerCase() === needle);
}

/**
 * Exact-token match for a host+path literal (e.g. "ebay.com/buy/browse").
 * @param {string} text
 * @param {string} hostPath
 * @returns {boolean}
 */
function hasExactHostPathToken(text, hostPath) {
  if (typeof hostPath !== "string" || hostPath.length === 0) return false;
  const needle = hostPath.toLowerCase();
  return domainLikeTokens(text, { allowSlash: true }).some(
    (t) => t.toLowerCase() === needle,
  );
}

module.exports = { domainLikeTokens, hasExactDomainToken, hasExactHostPathToken };
