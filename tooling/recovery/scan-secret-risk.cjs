"use strict";

/**
 * Report secret-risk files without printing secret values.
 */
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "../..");
const TARGETS = [
  ".cursor/mcp.json",
  ".cursor/permissions.json",
  ".env.example",
  ".gitignore",
  "tooling/mcp/browserstack-stdio.cjs",
  "tooling/dev/ensure-kakao-env.cjs",
  "tooling/dev/ensure-resend-env.cjs",
  "infra/api/runtime.json",
];

const PATTERNS = [
  { id: "private_key_block", re: /-----BEGIN [A-Z ]*PRIVATE KEY-----/ },
  { id: "jwt_like", re: /\beyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{10,}\./ },
  { id: "ghp", re: /\bghp_[A-Za-z0-9]{20,}\b/ },
  { id: "github_pat", re: /\bgithub_pat_[A-Za-z0-9_]{20,}\b/ },
  { id: "sk_live", re: /\bsk_(live|test)_[A-Za-z0-9]{16,}\b/ },
  { id: "resend_re", re: /\bre_[A-Za-z0-9]{20,}\b/ },
  { id: "assignment_long_secret", re: /(KEY|SECRET|TOKEN|PASSWORD|SERVICE_ROLE)\s*[:=]\s*['\"]?[A-Za-z0-9/+._-]{24,}/i },
];

function looksPlaceholder(text) {
  return /CHANGE_ME|YOUR_|TODO|example\.com|placeholder|<.+>|\$\{[A-Z0-9_]+\}|process\.env\./i.test(text);
}

function main() {
  const findings = [];
  for (const rel of TARGETS) {
    const abs = path.join(ROOT, rel);
    if (!fs.existsSync(abs)) {
      findings.push({ path: rel, exists: false });
      continue;
    }
    const text = fs.readFileSync(abs, "utf8");
    const hits = [];
    for (const p of PATTERNS) {
      if (p.re.test(text)) hits.push(p.id);
    }
    findings.push({
      path: rel,
      exists: true,
      bytes: Buffer.byteLength(text),
      pattern_hits: hits,
      placeholder_signals: looksPlaceholder(text),
      commit_advice: hits.length && !looksPlaceholder(text) ? "EXCLUDE" : "REVIEW",
    });
  }
  const out = {
    schema: "governance.recovery.secret-risk-scan.v1",
    observed_at: new Date().toISOString(),
    values_printed: 0,
    findings,
  };
  const dest = path.join(ROOT, "governance", "recovery", "secret-risk-scan.v1.json");
  fs.writeFileSync(dest, `${JSON.stringify(out, null, 2)}\n`, "utf8");
  process.stdout.write(`wrote ${dest}\n`);
  for (const f of findings) {
    process.stdout.write(`${f.path} hits=${(f.pattern_hits || []).join(",") || "none"} advice=${f.commit_advice || "n/a"}\n`);
  }
}

main();
