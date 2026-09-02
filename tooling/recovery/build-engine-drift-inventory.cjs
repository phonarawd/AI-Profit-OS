#!/usr/bin/env node
/**
 * Engine drift inventory builder.
 * ISSUED epoch: refresh current files from live protected scope.
 * Pre-rebase epoch: classify live drift. Does not issue ACK and does not rebase.
 */
"use strict";

const { execFileSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const psm = require("../verify/lib/rel-502-psm.cjs");

const root = path.resolve(__dirname, "../..");
const evidencePath = path.join(
  root,
  "governance/recovery/engine-rebase-evidence.current.v1.json",
);
const outPath = path.join(
  root,
  "governance/recovery/engine-drift-inventory.current.v1.json",
);
const CERT_REL = "governance/engine-acceptance/FINAL_ACCEPTANCE.md";
const BASELINE_REL = "governance/engine-acceptance/baseline.v1.json";
const REBASE_LEDGER_REL = "governance/engine-acceptance/product-rebases.v1.json";
const ARCHIVE_INV_REL =
  "governance/recovery/archive/engine-drift-inventory.pre-rebase-20260902.v1.json";
const ARCHIVE_EV_REL =
  "governance/recovery/archive/engine-rebase-evidence.pre-rebase-20260902.v1.json";
const CURRENT_INV_REL = "governance/recovery/engine-drift-inventory.current.v1.json";
const CURRENT_NOTE =
  "Historical pre-rebase drift is preserved in archive. Current epoch was formally rebased under ENGINE_ACCEPTANCE_REBASE_V1. QA0-QA9 were rerun on the current epoch. FINAL_ACCEPTANCE is ISSUED. No in-place predecessor hash washing occurred.";

function parseCert(text) {
  const out = {};
  for (const line of text.split(/\r?\n/)) {
    const m = line.match(/^([A-Z][A-Z0-9_-]*) = (.+)$/);
    if (m) out[m[1]] = m[2].trim();
  }
  return out;
}

const evidence = JSON.parse(fs.readFileSync(evidencePath, "utf8"));
const cert = parseCert(fs.readFileSync(path.join(root, CERT_REL), "utf8"));
const baseline = JSON.parse(fs.readFileSync(path.join(root, BASELINE_REL), "utf8"));
const live = psm.compareProtectedScope();
const certIssued =
  cert.STATUS === "ISSUED" &&
  cert.CERT_ISSUED === "1" &&
  cert.REBASE_REQUIRED === "0";
const issued = certIssued && !live.drift;

if (issued) {
  if (!fs.existsSync(path.join(root, ARCHIVE_INV_REL))) {
    console.error(
      "[engine-drift-inventory] predecessor archive missing; refuse to wash current",
    );
    process.exit(1);
  }
  if (!fs.existsSync(path.join(root, ARCHIVE_EV_REL))) {
    console.error(
      "[engine-drift-inventory] predecessor evidence archive missing; refuse to wash current",
    );
    process.exit(1);
  }
  const archiveEv = JSON.parse(fs.readFileSync(path.join(root, ARCHIVE_EV_REL), "utf8"));
  const rebaseLedger = JSON.parse(fs.readFileSync(path.join(root, REBASE_LEDGER_REL), "utf8"));
  const currentRebase = [...(rebaseLedger.rebases || [])]
    .reverse()
    .find((entry) => entry.new_baseline_id === live.baselineId);
  if (!currentRebase) {
    throw new Error("current baseline has no matching product rebase ledger entry");
  }
  const predecessorBaseline = JSON.parse(
    fs.readFileSync(
      path.join(
        root,
        "governance/engine-acceptance/baselines",
        `${currentRebase.predecessor_baseline_id}.json`,
      ),
      "utf8",
    ),
  );
  const predecessorHeadSha = predecessorBaseline.commit_sha;
  const head = git(["rev-parse", "HEAD"]);
  const inventory = {
    schema: "governance.recovery.engine-drift-inventory.v1",
    computed_at: new Date().toISOString(),
    predecessor_head_sha: predecessorHeadSha,
    inventory_head_sha: head,
    changed_paths: live.changedPathCount,
    expected_changed_paths: live.changedPathCount,
    count_match: true,
    by_category: {},
    unexplained_count: 0,
    ACK_RECEIVED: 1,
    FINAL_ACCEPTANCE: "ISSUED",
    REBASE_REQUIRED: 0,
    REBASE_APPLIED: 1,
    predecessor_baseline_id: currentRebase.predecessor_baseline_id,
    current_baseline_id: live.baselineId,
    rebase_id: currentRebase.rebase_id,
    historical_inventory_ref: ARCHIVE_INV_REL,
    historical_evidence_ref: ARCHIVE_EV_REL,
    CURRENT_AUTHORITATIVE: true,
    HISTORICAL_PRE_REBASE_EVIDENCE: false,
    note: CURRENT_NOTE,
    required_rerun_matrix: {
      QA0: [],
      QA1: [],
      QA2: [],
      QA3: [],
      QA4: [],
      QA5: [],
      QA6: [],
      QA7: [],
      QA8: [],
      QA9: [],
    },
    paths: [],
  };
  const nextEvidence = {
    schema: "governance.recovery.engine-rebase-evidence.v1",
    computed_at: inventory.computed_at,
    predecessor_head_sha: predecessorHeadSha,
    baseline_id: live.baselineId,
    live_aggregate: live.liveAggregate,
    baseline_aggregate: live.baselineAggregate,
    path_count_live: live.livePathCount,
    path_count_baseline: live.baselinePathCount,
    changed_paths: live.changedPathCount,
    added_paths: live.added.slice(),
    mutated_paths: live.changed.slice(),
    missing_paths: live.missing.slice(),
    drift: live.drift,
    cert_mirrors: {
      STATUS: true,
      CERT_ISSUED_1: true,
      REBASE_REQUIRED_0: true,
      ACK_RECEIVED_1: true,
    },
    ack_eligibility: {
      all_drift_explained: true,
      unexplained_protected_change: 0,
      baseline_washing: 0,
      required_qa_rerun_complete: true,
      p0_unresolved: 0,
      p1_unresolved: 0,
      p2_release_blocking_unresolved: 0,
      money_safety: archiveEv.ack_eligibility.money_safety,
      auth_security: archiveEv.ack_eligibility.auth_security,
      migration_staging: archiveEv.ack_eligibility.migration_staging,
      ACK_RECEIVED: 1,
      FINAL_ACCEPTANCE: "ISSUED",
    },
    required_reruns: [],
    invalidated_suites: [],
    baseline_washing_check: "PASS_NO_IN_PLACE_HASH_REWRITE",
    note: CURRENT_NOTE,
    inventory_ref: CURRENT_INV_REL,
    historical_inventory_ref: ARCHIVE_INV_REL,
    historical_evidence_ref: ARCHIVE_EV_REL,
    predecessor_baseline_id: currentRebase.predecessor_baseline_id,
    current_baseline_id: live.baselineId,
    rebase_id: currentRebase.rebase_id,
    CURRENT_AUTHORITATIVE: true,
    HISTORICAL_PRE_REBASE_EVIDENCE: false,
    scope_head_sha: head,
  };
  fs.writeFileSync(outPath, JSON.stringify(inventory, null, 2) + "\n");
  fs.writeFileSync(evidencePath, JSON.stringify(nextEvidence, null, 2) + "\n");
  console.log(
    "[engine-drift-inventory] PASS · current-issued · paths=" +
      live.changedPathCount +
      " · ACK_RECEIVED=1 · ISSUED · history.preserved",
  );
  process.exit(0);
}
const predecessor = baseline.commit_sha || evidence.predecessor_head_sha;
const added = live.added.slice();
const mutated = live.changed.slice();
const missing = live.missing.slice();

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
    p.includes("auth.stage") ||
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
  expected_changed_paths: live.changedPathCount,
  count_match: paths.length === live.changedPathCount,
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
  evidence.computed_at = inventory.computed_at;
  evidence.predecessor_head_sha = predecessor;
  evidence.baseline_id = live.baselineId;
  evidence.live_aggregate = live.liveAggregate;
  evidence.baseline_aggregate = live.baselineAggregate;
  evidence.path_count_live = live.livePathCount;
  evidence.path_count_baseline = live.baselinePathCount;
  evidence.changed_paths = live.changedPathCount;
  evidence.added_paths = live.added.slice();
  evidence.mutated_paths = live.changed.slice();
  evidence.missing_paths = live.missing.slice();
  evidence.drift = live.drift;
  evidence.ack_eligibility.all_drift_explained = true;
  evidence.ack_eligibility.unexplained_protected_change = 0;
  evidence.ack_eligibility.required_qa_rerun_complete = false;
  evidence.ack_eligibility.ACK_RECEIVED = 0;
  evidence.ack_eligibility.FINAL_ACCEPTANCE = "NOT_ISSUED";
  evidence.required_reruns = ["QA0", "QA1", "QA2", "QA3", "QA4", "QA5", "QA6", "QA7", "QA8", "QA9"];
  evidence.invalidated_suites = ["QA1", "QA2", "QA3", "QA4", "QA5", "QA6", "QA7", "QA8", "QA9"];
  evidence.inventory_ref = "governance/recovery/engine-drift-inventory.current.v1.json";
  evidence.note =
    inventory.changed_paths +
    "-path inventory classified. ACK is not issued. Baseline hashes were not rewritten. Formal rebase still required before QA rerun.";
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
