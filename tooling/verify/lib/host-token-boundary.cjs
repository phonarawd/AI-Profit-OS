/**
 * host-token-boundary — shared pure helper (D1-S1D 2026-09-05, CodeQL
 * js/incomplete-url-substring-sanitization alerts 26/27/28 in
 * tooling/verify/web-remote-patterns.cjs)
 *
 * tooling/verify/web-remote-patterns.cjs drift-checks that specific known
 * source files still literally mention a specific required host (e.g. does
 * services/api-nest/.../asset-image-r2.service.ts still say
 * "r2.cloudflarestorage.com" anywhere). The original checks used a raw
 * `text.includes(host)`, which CodeQL correctly flags as an incomplete
 * substring check: `"fake-r2.cloudflarestorage.com.attacker.net".includes(
 * "r2.cloudflarestorage.com")` is also `true`, even though that string is not
 * really a reference to the intended host - it just happens to contain it as
 * a substring of a longer token.
 *
 * This module fixes that by requiring a token boundary: the character
 * immediately before and after the matched host (if any exist) must not be a
 * hostname-continuation character ([a-zA-Z0-9-]), so `host` cannot be a
 * fragment of a longer hostname/label on either side. This mirrors the same
 * `\b`-boundary fix pattern already applied to
 * services/api-nest/clock.core.cjs's DB_URL_DENY list (CodeQL alerts 51/52)
 * and tooling/verify/{root-domain-env,secrets}.cjs (CodeQL alerts 56-59) -
 * same class of fix, same repo, extended to a third, structurally identical
 * finding.
 *
 * Kept as a separate, dependency-free, side-effect-free module (no fs/path
 * usage, no process.exit) so it can be unit-tested directly.
 */
"use strict";

function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * @param {string} text - source text to scan (e.g. an entire file's contents)
 * @param {string} host - literal host/domain token to search for (e.g.
 *   "r2.cloudflarestorage.com"). Must be a plain literal, not a regex.
 * @returns {boolean} true only if `host` appears as a standalone token, not
 *   merely as a substring of a longer hostname/label.
 */
function includesHostToken(text, host) {
  if (typeof text !== "string" || typeof host !== "string" || host.length === 0) {
    return false;
  }
  const escaped = escapeRegExp(host);
  const re = new RegExp(`(?<![a-zA-Z0-9-])${escaped}(?![a-zA-Z0-9-])`);
  return re.test(text);
}

module.exports = { escapeRegExp, includesHostToken };
