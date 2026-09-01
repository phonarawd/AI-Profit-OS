#!/usr/bin/env node
/**
 * Evidence-only Engine drift inventory. Does not issue ACK and does not rebase.
 */
"use strict";

const { execFileSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "../..");
const evidencePath = path.join(
  root,
  "governance/recovery/engine-rebase-evidence.current.v1.json",
);
const outPath = path.join(
  root,
  "governance/recovery/engine-drift-inventory.current.v1.json",
);

const evidence = JSON.parse(fs.readFileSync(evidencePath, "utf8"));
const predecessor = evidence.predecessor_head_sha;
const added = evidence.added_paths || [];
const mutated = evidence.mutated_paths || [];
const missing = evidence.missing_paths || [];

function git(args) {
  return execFileSync("git", args, {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
}

function classify(rel) {
  const p = rel.replace(/\\/g, "/");
  if (p.includes("/migrations/") || p.endsWith(".sql")) {
    return {
      category: "DB_MIGRATION",
      reason: "Schema/ledger change after Engine baseline. Formal rebase must re-prove money invariants.",
      security_impact: "HIGH",
      schema_impact: true,
      prompt_impact: false,
      required_rerun: ["QA0", "QA3", "QA4", "QA5", "QA8"],
    };
  }
  if (p.startsWith("schemas/")) {
    return {
      category: "CONTRACT_SCHEMA",
      reason: "Public contract drift. Engine consumers must re-bind after rebase.",
      security_impact: "MEDIUM",
      schema_impact: true,
      prompt_impact: false,
      required_rerun: ["QA0", "QA3", "QA4"],
    };
  }
  if (
    p.includes("identity-proof") ||
    p.includes("magic-link") ||
    p.includes("oauth-identity") ||
    p.includes("webauthn") ||
    p.includes("passkey") ||
    p.includes("auth.controller") ||
    p.includes("auth.service") ||
    p.includes("auth.module") ||
    p.includes("jwt-auth.guard")
  ) {
    return {
      category: "AUTH_SECURITY",
      reason: "Identity proof / session mint path changed. CSRF design stays; ACK waits rebase QA.",
      security_impact: "HIGH",
      schema_impact: false,
      prompt_impact: false,
      required_rerun: ["QA1", "QA2", "QA8"],
    };
  }
  if (
    p.includes("admin-session") ||
    p.includes("admin-token") ||
    p.includes("admin.guard") ||
    p.includes("admin-csrf") ||
    p.includes("admin-capabilities") ||
    p.includes("bearer-header") ||
    p.includes("admin-audit")
  ) {
    return {
      category: "ADMIN_SESSION",
      reason: "Admin cookie/CSRF/capability surface. Double-submit cookie remains JS-readable by design.",
      security_impact: "HIGH",
      schema_impact: false,
      prompt_impact: false,
      required_rerun: ["QA1", "QA2", "QA8"],
    };
  }
  if (
    p.includes("/wallet/") ||
    p.includes("tron-address") ||
    p.includes("deposit-") ||
    p.includes("withdraw-") ||
    p.includes("krw-deposit") ||
    p.includes("min-holding") ||
    p.includes("chain-sweep") ||
    p.includes("chain-watch") ||
    p.includes("resend-email.provider")
  ) {
    return {
      category: "MONEY_WALLET",
      reason: "Wallet/TRON/withdraw path. Synthetic HMAC derivation remains forbidden. Vault still external.",
      security_impact: "HIGH",
      schema_impact: p.includes("withdraw"),
      prompt_impact: false,
      required_rerun: ["QA3", "QA4", "QA5", "QA8"],
    };
  }
  if (p.includes("idempotency") || p.includes("/ledger/")) {
    return {
      category: "LEDGER",
      reason: "Idempotency/ledger fingerprint drift. Money truth must be re-proven.",
      security_impact: "HIGH",
      schema_impact: false,
      prompt_impact: false,
      required_rerun: ["QA3", "QA4", "QA8"],
    };
  }
  if (p.includes("referral")) {
    return {
      category: "REFERRAL",
      reason: "Referral code issuance/own-code path. Not a ledger writer.",
      security_impact: "MEDIUM",
      schema_impact: false,
      prompt_impact: false,
      required_rerun: ["QA2", "QA8"],
    };
  }
  if (p.includes("ux-prefs")) {
    return {
      category: "UX_PREFS",
      reason: "User preference store. No money authority.",
      security_impact: "LOW",
      schema_impact: false,
      prompt_impact: false,
      required_rerun: ["QA2"],
    };
  }
  if (p.includes("health")) {
    return {
      category: "HEALTH",
      reason: "Public/admin health surface. No session mint.",
      security_impact: "LOW",
      schema_impact: false,
      prompt_impact: false,
      required_rerun: ["QA0"],
    };
  }
  if (p.includes("/ai/") || p.includes("coach.") || p.includes("fact-tool")) {
    return {
      category: "AI_COACH",
      reason: "Coach/fact-tool mutation. Prompt/SSE contract must stay fail-closed; no fake ACK.",
      security_impact: "MEDIUM",
      schema_impact: false,
      prompt_impact: true,
      required_rerun: ["QA6", "QA7", "QA9"],
    };
  }
  if (p.includes("adapters.ingest")) {
    return {
      category: "ADAPTER_INGEST",
      reason: "Ingest controller wiring. Marketplace truth, not wallet mutation.",
      security_impact: "MEDIUM",
      schema_impact: false,
      prompt_impact: false,
      required_rerun: ["QA5", "QA8"],
    };
  }
  if (
    p.includes("app.module") ||
    p.includes("common.module") ||
    p.includes("wallet.module") ||
    p.includes("wallet/index.ts") ||
    p.includes("wallet.routes") ||
    p.includes("wallet.types") ||
    p.includes("wallet.events") ||
    p.includes("nest-provenance") ||
    p.includes("tsconfig.json") ||
    p.includes("admin-audit.core.cjs")
  ) {
    return {
      category: "MODULE_WIRING",
      reason: "Module/export/tsconfig wiring for the above surfaces. No independent money writer.",
      security_impact: "LOW",
      schema_impact: false,
      prompt_impact: false,
      required_rerun: ["QA0", "QA2"],
    };
  }
  return {
    category: "UNCLASSIFIED",
    reason: "Path did not match a known Engine drift class.",
    security_impact: "UNKNOWN",
    schema_impact: "UNKNOWN",
    prompt_impact: "UNKNOWN",
    required_rerun: ["QA0", "QA1", "QA2", "QA3", "QA4", "QA5", "QA6", "QA7", "QA8", "QA9"],
  };
}

function describePath(rel, kind) {
  let commits = [];
  try {
    const raw = git(["log", "--format=%H\t%s", predecessor + "..HEAD", "--", rel]);
    commits = raw
      ? raw.split(/\r?\n/).filter(Boolean).map((line) => {
          const tab = line.indexOf("\t");
          return {
            sha: line.slice(0, tab),
            subject: line.slice(tab + 1),
          };
        })
      : [];
  } catch {
    commits = [];
  }
  if (commits.length === 0) {
    try {
      const raw = git(["log", "-5", "--format=%H\t%s", "--", rel]);
      commits = raw
        ? raw.split(/\r?\n/).filter(Boolean).map((line) => {
            const tab = line.indexOf("\t");
            return {
              sha: line.slice(0, tab),
              subject: line.slice(tab + 1),
            };
          })
        : [];
    } catch {
      commits = [];
    }
  }
  const cls = classify(rel);
  return {
    path: rel.replace(/\\/g, "/"),
    kind,
    owning_commit: commits.length ? commits[commits.length - 1].sha : null,
    owning_subject: commits.length ? commits[commits.length - 1].subject : null,
    commit_count: commits.length,
    commits,
    ...cls,
  };
}

const paths = [
  ...added.map((p) => describePath(p, "added")),
  ...mutated.map((p) => describePath(p, "mutated")),
  ...missing.map((p) => describePath(p, "missing")),
];

const unexplained = paths.filter((p) => p.category === "UNCLASSIFIED");
const byCategory = {};
for (const row of paths) {
  byCategory[row.category] = (byCategory[row.category] || 0) + 1;
}

const inventory = {
  schema: "governance.recovery.engine-drift-inventory.v1",
  computed_at: new Date().toISOString(),
  predecessor_head_sha: predecessor,
  inventory_head_sha: git(["rev-parse", "HEAD"]),
  changed_paths: paths.length,
  expected_changed_paths: evidence.changed_paths,
  count_match: paths.length === evidence.changed_paths,
  by_category: byCategory,
  unexplained_count: unexplained.length,
  ACK_RECEIVED: 0,
  FINAL_ACCEPTANCE: "NOT_ISSUED",
  REBASE_REQUIRED: 1,
  note: "Classification only. Formal rebase + QA0-QA9 rerun are still required. Do not treat this file as an ACK.",
  required_rerun_matrix: {
    QA0: paths.filter((p) => p.required_rerun.includes("QA0")).map((p) => p.path),
    QA1: paths.filter((p) => p.required_rerun.includes("QA1")).map((p) => p.path),
    QA2: paths.filter((p) => p.required_rerun.includes("QA2")).map((p) => p.path),
    QA3: paths.filter((p) => p.required_rerun.includes("QA3")).map((p) => p.path),
    QA4: paths.filter((p) => p.required_rerun.includes("QA4")).map((p) => p.path),
    QA5: paths.filter((p) => p.required_rerun.includes("QA5")).map((p) => p.path),
    QA6: paths.filter((p) => p.required_rerun.includes("QA6")).map((p) => p.path),
    QA7: paths.filter((p) => p.required_rerun.includes("QA7")).map((p) => p.path),
    QA8: paths.filter((p) => p.required_rerun.includes("QA8")).map((p) => p.path),
    QA9: paths.filter((p) => p.required_rerun.includes("QA9")).map((p) => p.path),
  },
  paths,
};

fs.writeFileSync(outPath, JSON.stringify(inventory, null, 2) + "\n");

if (unexplained.length === 0 && inventory.count_match) {
  evidence.ack_eligibility.all_drift_explained = true;
  evidence.ack_eligibility.unexplained_protected_change = 0;
  evidence.ack_eligibility.ACK_RECEIVED = 0;
  evidence.ack_eligibility.FINAL_ACCEPTANCE = "NOT_ISSUED";
  evidence.inventory_ref = "governance/recovery/engine-drift-inventory.current.v1.json";
  evidence.note =
    "79-path inventory classified. ACK is not issued. Baseline hashes were not rewritten. Formal rebase still required before QA rerun.";
  fs.writeFileSync(evidencePath, JSON.stringify(evidence, null, 2) + "\n");
}

if (unexplained.length) {
  console.error("[engine-drift-inventory] UNCLASSIFIED", unexplained.map((p) => p.path));
  process.exit(1);
}
console.log(
  "[engine-drift-inventory] PASS · paths=" +
    paths.length +
    " · unexplained=0 · ACK_RECEIVED=0",
);
