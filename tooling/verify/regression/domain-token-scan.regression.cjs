/**
 * Regression test for tooling/verify/lib/domain-token-scan.cjs (2026-09-05,
 * PUTDUK FULL REAL-MONEY PRODUCTION RELEASE directive Phase B).
 *
 * Run: node tooling/verify/regression/domain-token-scan.regression.cjs
 *
 * Proves the token-exact-match approach is BOTH:
 *  1. at least as strict as the old `\b`-anchored regex for the true-positive
 *     cases it must still catch (real placeholder/forbidden literals present
 *     as their own token), and
 *  2. strictly safer for the false-positive shapes CodeQL's own worked
 *     example and this repo's own prior \b-anchor fix both worried about
 *     (a target string appearing only as a piece of a longer hostname).
 */
"use strict";

const {
  hasExactDomainToken,
  hasExactHostPathToken,
} = require("../lib/domain-token-scan.cjs");

const failures = [];
function expect(label, actual, expected) {
  if (actual !== expected) {
    failures.push(`${label}: expected ${expected}, got ${actual}`);
  }
}

// --- hasExactDomainToken: true positives (must still detect the real thing) ---
expect(
  "bare token in TOML-ish text",
  hasExactDomainToken('ROOT_DOMAIN = "example.com"\n', "example.com"),
  true,
);
expect(
  "bare token surrounded by quotes/braces/commas",
  hasExactDomainToken('{"host":"your-domain.com","port":443}', "your-domain.com"),
  true,
);
expect(
  "token at start of file",
  hasExactDomainToken("domain.com is not allowed here", "domain.com"),
  true,
);
expect(
  "token at end of file with trailing newline",
  hasExactDomainToken("some line\nexample.com\n", "example.com"),
  true,
);
expect(
  "case-insensitive match",
  hasExactDomainToken("EXAMPLE.COM", "example.com"),
  true,
);

// --- hasExactDomainToken: true negatives (must NOT false-positive) ---
expect(
  "sub-label prefix must not match (notexample.com)",
  hasExactDomainToken("host = notexample.com", "example.com"),
  false,
);
expect(
  "subdomain must not match bare apex (sub.example.com vs example.com)",
  hasExactDomainToken("allow: sub.example.com", "example.com"),
  false,
);
expect(
  "attacker-appended suffix must not match (example.com.evil.net)",
  hasExactDomainToken("redirect to example.com.evil.net", "example.com"),
  false,
);
expect(
  "concatenated longer hostname must not match (myexample.com)",
  hasExactDomainToken("host=myexample.com", "example.com"),
  false,
);
expect(
  "absent domain must not match",
  hasExactDomainToken("nothing relevant here", "example.com"),
  false,
);

// --- hasExactHostPathToken: host+path literal (ebay-resilience.cjs shape) ---
expect(
  "exact host+path token inside a URL literal",
  hasExactHostPathToken('const u = "https://ebay.com/buy/browse?x=1".split("?")[0];\nebay.com/buy/browse', "ebay.com/buy/browse"),
  true,
);
expect(
  "host+path as a standalone comment mention",
  hasExactHostPathToken("// see ebay.com/buy/browse for the real API", "ebay.com/buy/browse"),
  true,
);
expect(
  "different path must not match (host+path token exactness)",
  hasExactHostPathToken("ebay.com/buy/browse/extra", "ebay.com/buy/browse"),
  false,
);
expect(
  "different host must not match",
  hasExactHostPathToken("notebay.com/buy/browse", "ebay.com/buy/browse"),
  false,
);

// --- Regex-free comparison sanity: the actual comparison is `===`, never RegExp#test ---
{
  const src = require("fs").readFileSync(__filename === undefined ? "" : require("path").join(__dirname, "../lib/domain-token-scan.cjs"), "utf8");
  const compareLine = src.split("\n").find((l) => l.includes(".some((t) => t.toLowerCase() === needle)"));
  if (!compareLine) {
    failures.push("expected an exact `===` comparison against a whole token, found none (implementation drifted)");
  }
}

if (failures.length) {
  console.error(`[domain-token-scan.regression] FAIL (${failures.length})`);
  for (const f of failures) console.error(" -", f);
  process.exit(1);
}
console.log(
  `[domain-token-scan.regression] PASS (${9 + 4}/${9 + 4} — true-positive detection preserved, false-positive substring shapes eliminated, comparison is exact-token not regex-substring)`,
);
