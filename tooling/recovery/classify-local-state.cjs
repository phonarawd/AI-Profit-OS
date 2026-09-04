"use strict";

/**
 * Salvage-branch dirty-tree classifier.
 * Writes machine-readable evidence. Does not print file contents or secrets.
 */
const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "../..");
const OUT_DIR = path.join(ROOT, "governance", "recovery");

function git(args, opts = {}) {
  return execFileSync("git", args, {
    cwd: ROOT,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
    ...opts,
  });
}

function gitLines(args) {
  return git(args)
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function classifyBucket(relPath) {
  const p = relPath.replace(/\\/g, "/");
  if (
    p.startsWith("apps/web/components/spark-dash-home/") ||
    p === "apps/web/app/HomeDesktopClient.tsx" ||
    p.startsWith("apps/web/public/spark-dash/") ||
    p === "apps/web/scripts/freeze-home-qa.mjs" ||
    p === "governance/consumer-home-approval/home-approval-freeze.v1.json"
  ) {
    return "HOME-FROZEN";
  }
  if (
    p === ".cursor/mcp.json" ||
    p === ".cursor/permissions.json" ||
    p === "infra/api/runtime.json" ||
    p === "tooling/mcp/browserstack-stdio.cjs" ||
    p === "tooling/dev/ensure-kakao-env.cjs" ||
    p === "tooling/dev/ensure-resend-env.cjs"
  ) {
    return "SECRET-RISK";
  }
  if (p === ".env.example") return "SECRET-RISK";
  if (p.startsWith("governance/db-recon/") || p === "governance/release-inventory/b1-push-rls-design.v1.json" || p === "governance/release-inventory/b2-ownership-design.v1.json") {
    return "KEEP";
  }
  if (
    p.startsWith("governance/release-master/rel-b3-promotion/") ||
    p === "governance/db-recon/b3-promotion-ledger.v1.json" ||
    p === "governance/release-inventory/b3-promotion.v1.json" ||
    p === "tooling/verify/b3-promotion.cjs"
  ) {
    return "KEEP";
  }
  if (
    p.includes("growth-psychology") ||
    p.includes("ethics-override") ||
    p.includes("loop-psychology") ||
    p.includes("match-tension")
  ) {
    return "HOLD";
  }
  if (p.startsWith("apps/web/components/support/") || p === "apps/web/app/me/support/page.tsx") {
    return "HOLD";
  }
  if (p.startsWith("governance/release-inventory/")) return "KEEP";
  if (p === "governance/security/http-headers.v1.json" || p === "tooling/security/http-headers.cjs" || p === "tooling/verify/rel-401-security-headers.cjs") {
    return "KEEP";
  }
  if (p.startsWith(".github/workflows/")) return "KEEP";
  if (p.startsWith("apps/web/app/wallet/deposit/")) return "HOLD";
  if (p.startsWith(".cursor/") || p.startsWith("tooling/mcp/") || p.startsWith("tooling/cleanup/") || p.startsWith("tooling/dev/") || p === ".vscode/settings.json") {
    return "HOLD";
  }
  return "SPLIT";
}

function secretScanFlags(relPath) {
  const abs = path.join(ROOT, relPath);
  let text;
  try {
    text = fs.readFileSync(abs, "utf8");
  } catch (err) {
    const code = err && typeof err === "object" && "code" in err ? err.code : "";
    if (code === "ENOENT" || code === "EISDIR" || code === "ENOTDIR") return [];
    throw err;
  }
  const flags = [];
  const checks = [
    { id: "service_role_literal", re: /service_role[^\n]{0,40}(eyJ|[A-Za-z0-9_-]{40,})/i },
    { id: "bearer_jwt_like", re: /\beyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{10,}\./ },
    { id: "private_key_block", re: /-----BEGIN [A-Z ]*PRIVATE KEY-----/ },
    { id: "ghp_token", re: /\bghp_[A-Za-z0-9]{20,}\b/ },
    { id: "github_pat", re: /\bgithub_pat_[A-Za-z0-9_]{20,}\b/ },
    { id: "sk_live", re: /\bsk_(live|test)_[A-Za-z0-9]{16,}\b/ },
    { id: "resend_key", re: /\bre_[A-Za-z0-9]{20,}\b/ },
    { id: "supabase_anon_jwt", re: /SUPABASE_.*KEY.*=\s*eyJ/i },
    { id: "absolute_user_path_secret_file", re: /C:\\Users\\[^\\\s]+\\.*(credentials|secrets|\.env)/i },
  ];
  for (const c of checks) {
    if (c.re.test(text)) flags.push(c.id);
  }
  return flags;
}

function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const branch = git(["branch", "--show-current"]).trim();
  const head = git(["rev-parse", "HEAD"]).trim();
  const originMain = git(["rev-parse", "origin/main"]).trim();
  const originCursor = git(["rev-parse", "origin/cursor/rel-602-staging-rollback-a907"]).trim();
  const vsMain = git(["rev-list", "--left-right", "--count", "origin/main...HEAD"]).trim();
  const vsCursor = git(["rev-list", "--left-right", "--count", "origin/cursor/rel-602-staging-rollback-a907...HEAD"]).trim();

  const porcelain = git(["-c", "core.quotepath=false", "status", "--porcelain=v1", "-uall"])
    .split(/\r?\n/)
    .filter((line) => line.length >= 4 && !line.startsWith("warning:"));
  const statusModified = [];
  const untracked = [];
  for (const line of porcelain) {
    const code = line.slice(0, 2);
    const raw = line.slice(3);
    const filePath = raw.includes(" -> ") ? raw.split(" -> ")[1] : raw;
    if (code.includes("?")) untracked.push(filePath);
    else if (code.trim() !== "") statusModified.push(filePath);
  }

  const semanticNames = new Set(gitLines(["-c", "core.quotepath=false", "diff", "--name-only"]));
  const stagedNames = new Set(gitLines(["-c", "core.quotepath=false", "diff", "--cached", "--name-only"]));
  const ignoreCrNames = new Set(gitLines(["-c", "core.quotepath=false", "diff", "--ignore-cr-at-eol", "--name-only"]));
  const numstatLines = gitLines(["-c", "core.quotepath=false", "diff", "--numstat"]);
  for (const line of numstatLines) {
    const parts = line.split("\t");
    if (parts.length >= 3 && parts[2]) semanticNames.add(parts[2]);
  }

  const semantic = [];
  const crlfOnly = [];
  const statusDirtyEmptyDiff = [];
  for (const f of statusModified) {
    const hasDiff = semanticNames.has(f) || stagedNames.has(f);
    const hasIgnoreCr = ignoreCrNames.has(f);
    let kind;
    if (hasDiff && hasIgnoreCr) kind = "SEMANTIC";
    else if (hasDiff && !hasIgnoreCr) kind = "CRLF_ONLY";
    else kind = "STATUS_DIRTY_EMPTY_DIFF";
    const rec = {
      path: f,
      kind,
      bucket: classifyBucket(f),
      secret_flags: kind === "SEMANTIC" ? secretScanFlags(f) : [],
    };
    if (kind === "SEMANTIC") semantic.push(rec);
    else if (kind === "CRLF_ONLY") crlfOnly.push(rec);
    else statusDirtyEmptyDiff.push(rec);
  }

  const untrackedRecs = untracked.map((f) => ({
    path: f,
    kind: "UNTRACKED",
    bucket: classifyBucket(f),
    secret_flags: secretScanFlags(f),
  }));

  const localCommits = git(["log", "--format=%H\t%s", "origin/cursor/rel-602-staging-rollback-a907..HEAD"])
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => {
      const i = line.indexOf("\t");
      return { sha: line.slice(0, i), title: line.slice(i + 1) };
    });

  const evidence = {
    schema: "governance.recovery.current-local-state.v1",
    observed_at: new Date().toISOString(),
    salvage: {
      branch,
      head,
      origin_main: originMain,
      origin_cursor: originCursor,
      vs_main_left_right: vsMain,
      vs_cursor_left_right: vsCursor,
      local_only_commit_count: localCommits.length,
    },
    counts: {
      status_modified_tracked: statusModified.length,
      semantic: semantic.length,
      crlf_only: crlfOnly.length,
      status_dirty_empty_diff: statusDirtyEmptyDiff.length,
      untracked: untrackedRecs.length,
    },
    local_commits: localCommits,
    semantic,
    crlf_only: crlfOnly.map((r) => r.path),
    status_dirty_empty_diff: statusDirtyEmptyDiff.map((r) => r.path),
    untracked: untrackedRecs,
    production_mutation: 0,
    notes: [
      "CRLF_ONLY paths have empty git diff --ignore-cr-at-eol",
      "secret_flags list pattern ids only; values are not recorded",
      "HOME-FROZEN paths must not enter recovery commits",
    ],
  };

  const outJson = path.join(OUT_DIR, "current-local-state.v1.json");
  fs.writeFileSync(outJson, `${JSON.stringify(evidence, null, 2)}\n`, "utf8");

  const summary = {
    semantic_count: semantic.length,
    crlf_only_count: crlfOnly.length,
    status_dirty_empty_diff_count: statusDirtyEmptyDiff.length,
    untracked_count: untrackedRecs.length,
    secret_flagged: [...semantic, ...untrackedRecs].filter((r) => r.secret_flags.length).map((r) => ({
      path: r.path,
      flags: r.secret_flags,
    })),
    home_frozen: [...semantic, ...untrackedRecs].filter((r) => r.bucket === "HOME-FROZEN").map((r) => r.path),
    keep: [...semantic, ...untrackedRecs].filter((r) => r.bucket === "KEEP").map((r) => r.path),
  };
  fs.writeFileSync(path.join(OUT_DIR, "dirty-classification-summary.v1.json"), `${JSON.stringify(summary, null, 2)}\n`, "utf8");
  process.stdout.write(`wrote ${outJson}\n`);
  process.stdout.write(`semantic=${semantic.length} crlf_only=${crlfOnly.length} empty_diff=${statusDirtyEmptyDiff.length} untracked=${untrackedRecs.length}\n`);
  process.stdout.write(`secret_flagged=${summary.secret_flagged.length}\n`);
}

module.exports = {
  classifyBucket,
  secretScanFlags,
};

if (require.main === module) {
  main();
}
