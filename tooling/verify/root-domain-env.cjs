/**
 * verify:root-domain-env — prod artifact에 placeholder domain 0 (Infra §15.0)
 * Local gate: infra configs only. CI hardens when apps/ exist.
 */
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "../..");
const fails = [];

const PLACEHOLDER_PATTERNS = [
  /\{ROOT_DOMAIN\}/,
  /\{domain\}/i,
  /domain\.com/i,
  /your-domain\.com/i,
  /example\.com/i,
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
