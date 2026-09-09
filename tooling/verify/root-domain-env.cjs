/**
 * verify:root-domain-env — prod artifact에 placeholder domain 0 (Infra §15.0)
 * Local gate: infra configs only. CI hardens when apps/ exist.
 */
const fs = require("fs");
const path = require("path");

const { hasExactDomainToken } = require("./lib/domain-token-scan.cjs");

const root = path.resolve(__dirname, "../..");
const fails = [];

// D1-S1E/PUTDUK-FULL-RELEASE remediation (2026-09-05, CodeQL
// js/regex/missing-regexp-anchor residual alerts #89/#90/#91, descending from
// the already-closed #56/#57/#58): the prior \b-word-boundary anchor fix was
// still flagged because CodeQL classifies these values as URL-like and does
// not consider ANY regex-boundary flavor sufficient for that classification.
// The structural fix (tooling/verify/lib/domain-token-scan.cjs) drops
// regex-substring matching for the literal-host checks entirely: it tokenizes
// the file text on non-hostname characters and requires an EXACT (===) match
// against a whole token, so "subdomain.com" can never false-match "domain.com"
// and no regex is evaluated against the raw text for these 3 checks at all.
// The 2 template-placeholder patterns below ({ROOT_DOMAIN}/{domain}) are
// UNCHANGED and were never flagged - their delimiters ({ and }) are already
// not hostname-continuation characters, so CodeQL's URL heuristic does not
// apply to them.
const TEMPLATE_PLACEHOLDER_PATTERNS = [/\{ROOT_DOMAIN\}/, /\{domain\}/i];
const FORBIDDEN_LITERAL_HOSTS = ["domain.com", "your-domain.com", "example.com"];

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
  for (const re of TEMPLATE_PLACEHOLDER_PATTERNS) {
    if (re.test(text)) {
      fails.push(`${rel}: contains placeholder ${re}`);
    }
  }
  for (const host of FORBIDDEN_LITERAL_HOSTS) {
    if (hasExactDomainToken(text, host)) {
      fails.push(`${rel}: contains placeholder host ${host}`);
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
