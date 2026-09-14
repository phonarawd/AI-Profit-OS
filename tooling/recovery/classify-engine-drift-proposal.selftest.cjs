/**
 * 공식 classify()를 바꾸지 않는다.
 * 현재 규칙의 UNCLASSIFIED 40 + ADMIN_SESSION 1을 고정하고,
 * 승인 대기 분류안이 경로를 빠뜨리거나 보호범위를 줄이지 않는지 검사한다.
 */
"use strict";

const fs = require("fs");
const path = require("path");
const psm = require("../verify/lib/rel-502-psm.cjs");

const root = path.resolve(__dirname, "../..");
const GEN_REL = "tooling/recovery/build-engine-drift-inventory.cjs";
const PROP_REL =
  "quality/contracts/operator-control/engine-drift-classification-proposal.v1.json";

function officialClassify(rel) {
  const p = rel.replace(/\\/g, "/");
  if (p.includes("/migrations/") || p.endsWith(".sql")) return "DB_MIGRATION";
  if (p.startsWith("schemas/")) return "CONTRACT_SCHEMA";
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
    return "AUTH_SECURITY";
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
    return "ADMIN_SESSION";
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
    return "MONEY_WALLET";
  }
  if (p.includes("idempotency") || p.includes("/ledger/")) return "LEDGER";
  if (p.includes("referral")) return "REFERRAL";
  if (p.includes("ux-prefs")) return "UX_PREFS";
  if (p.includes("health")) return "HEALTH";
  if (p.includes("/ai/") || p.includes("coach.") || p.includes("fact-tool")) {
    return "AI_COACH";
  }
  if (p.includes("adapters.ingest")) return "ADAPTER_INGEST";
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
    return "MODULE_WIRING";
  }
  return "UNCLASSIFIED";
}

const fails = [];
const genSrc = fs.readFileSync(path.join(root, GEN_REL), "utf8");
if (!genSrc.includes('category: "UNCLASSIFIED"')) {
  fails.push("official generator lost UNCLASSIFIED fallback");
}
if (!genSrc.includes("admin-capabilities")) {
  fails.push("official generator lost ADMIN_SESSION matcher");
}
if (genSrc.includes("OPERATOR_MEMBERSHIP") || genSrc.includes("CATALOG_EXTERNAL_WRITE")) {
  fails.push("official generator was expanded without approval");
}

const proposal = JSON.parse(fs.readFileSync(path.join(root, PROP_REL), "utf8"));
if (proposal.status !== "NEEDS_APPROVAL") {
  fails.push("proposal.status must stay NEEDS_APPROVAL until classify rules are approved");
}
if (proposal.official_generator_changed !== false) {
  fails.push("proposal must record official generator unchanged");
}

const live = psm.compareProtectedScope();
const livePaths = [...live.added, ...live.changed, ...live.missing].map((p) =>
  p.replace(/\\/g, "/"),
);
if (livePaths.length !== live.changedPathCount) {
  fails.push("live path union != changedPathCount");
}

const officialCounts = {};
for (const p of livePaths) {
  const cat = officialClassify(p);
  officialCounts[cat] = (officialCounts[cat] || 0) + 1;
}
if (officialCounts.ADMIN_SESSION !== 1) {
  fails.push("official ADMIN_SESSION want 1 got " + officialCounts.ADMIN_SESSION);
}
if (officialCounts.UNCLASSIFIED !== live.changedPathCount - 1) {
  fails.push(
    "official UNCLASSIFIED want " +
      (live.changedPathCount - 1) +
      " got " +
      officialCounts.UNCLASSIFIED,
  );
}
const adminCap = "services/api-nest/src/common/admin-capabilities.ts";
if (!livePaths.includes(adminCap)) {
  fails.push("admin-capabilities missing from live drift");
} else if (officialClassify(adminCap) !== "ADMIN_SESSION") {
  fails.push("admin-capabilities must stay ADMIN_SESSION under official rules");
}

const proposed = new Map();
for (const row of proposal.existing_class_extensions || []) {
  for (const p of row.paths || []) proposed.set(p, row.category);
}
for (const row of proposal.new_categories || []) {
  for (const p of row.paths || []) proposed.set(p, row.category);
}
for (const p of proposal.official_rule_result.ADMIN_SESSION || []) {
  proposed.set(p, "ADMIN_SESSION");
}

for (const p of livePaths) {
  if (!proposed.has(p)) fails.push("proposal dropped live path " + p);
  if (proposed.get(p) === "UNCLASSIFIED") {
    fails.push("proposal still UNCLASSIFIED " + p);
  }
}
for (const p of proposed.keys()) {
  if (!livePaths.includes(p)) {
    fails.push("proposal invented path outside live drift " + p);
  }
}

const allProposedReruns = new Set();
for (const row of [
  ...(proposal.existing_class_extensions || []),
  ...(proposal.new_categories || []),
]) {
  for (const qa of row.required_rerun || []) allProposedReruns.add(qa);
}
for (const qa of ["QA0", "QA1", "QA2", "QA3", "QA4", "QA5", "QA8"]) {
  if (!allProposedReruns.has(qa)) {
    fails.push("proposal required_rerun missing " + qa);
  }
}

if (fails.length) {
  console.error("[classify-engine-drift-proposal] FAIL");
  for (const f of fails) console.error(" - " + f);
  process.exit(1);
}
console.log(
  "[classify-engine-drift-proposal] PASS · live=" +
    live.changedPathCount +
    " · official UNCLASSIFIED=" +
    officialCounts.UNCLASSIFIED +
    " · proposal mapped=" +
    proposed.size +
    " · generator unchanged",
);
