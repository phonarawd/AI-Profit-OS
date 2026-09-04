/**
 * verify:root-domain-env — prod artifact에 placeholder domain 0 (Infra §15.0)
 * Local gate: infra configs only. CI hardens when apps/ exist.
 */
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "../..");
const fails = [];

// D1 remediation note (2026-09-04, REM-D1-6H, CodeQL js/regex/missing-regexp-anchor
// alerts #56/#57/#58): these patterns scan a whole multi-line file's text for a
// placeholder-domain substring (see scanFile below - re.test(text) against the full
// file content), so anchoring to start/end of STRING (^/$ without the m flag) would
// break detection entirely (the placeholder is virtually never the file's *entire*
// content). The correct, non-behaviour-weakening fix is a word-boundary (\b) on both
// sides of the literal domain instead - this keeps "match this substring anywhere in
// the file" working exactly as before, while preventing an accidental match inside a
// longer identifier that merely contains the placeholder as a sub-string (e.g.
// "subdomain.com" no longer false-matches "domain.com").
const PLACEHOLDER_PATTERNS = [
  /\{ROOT_DOMAIN\}/,
  /\{domain\}/i,
  /\bdomain\.com\b/i,
  /\byour-domain\.com\b/i,
  /\bexample\.com\b/i,
];

const SCAN_PATHS = [
  "infra/web/wrangler.toml",
  "infra/ops/wrangler.toml",
  "infra/ops/access-policy.json",
];

function scanFile(rel) {
  const full = path.join(root, rel);
  if (!fs.existsSync(full)) {
    fails.push(`missing: ${rel}`);
    return;
  }
  const text = fs.readFileSync(full, "utf8");
  for (const re of PLACEHOLDER_PATTERNS) {
    if (re.test(text)) {
      fails.push(`${rel}: contains placeholder ${re}`);
    }
  }
}

for (const rel of SCAN_PATHS) scanFile(rel);

// .env.example may document placeholders — scan only if ROOT_DOMAIN=localhost in prod context
const envExample = path.join(root, ".env.example");
if (fs.existsSync(envExample)) {
  const ex = fs.readFileSync(envExample, "utf8");
  if (!/ROOT_DOMAIN=/.test(ex)) {
    fails.push(".env.example: missing ROOT_DOMAIN");
  }
}

if (fails.length) {
  console.error("[verify:root-domain-env] FAIL\n- " + fails.join("\n- "));
  process.exit(1);
}

console.log("[verify:root-domain-env] PASS");
