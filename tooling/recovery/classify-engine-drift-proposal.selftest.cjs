/**
 * 공식 classify() 회귀.
 * 분류 가능 ≠ 변경 안전성 승인 ≠ QA 완료 ≠ 플랫폼 운영 준비.
 * Human/PO ACK·rebase·ISSUED를 대신하지 않는다.
 */
"use strict";

const fs = require("fs");
const path = require("path");
const psm = require("../verify/lib/rel-502-psm.cjs");
const {
  classify,
  OPERATOR_MEMBERSHIP_PATHS,
  CATALOG_EXTERNAL_WRITE_PATHS,
  CLASSIFY_IS_NOT,
} = require("./lib/classify-engine-drift.cjs");

const root = path.resolve(__dirname, "../..");
const GEN_REL = "tooling/recovery/build-engine-drift-inventory.cjs";
const LIB_REL = "tooling/recovery/lib/classify-engine-drift.cjs";
const PROP_REL =
  "quality/contracts/operator-control/engine-drift-classification-proposal.v1.json";

const fails = [];

function expectEq(got, want, label) {
  if (got !== want) fails.push(label + " want " + want + " got " + got);
}

function expectCat(rel, want) {
  expectEq(classify(rel).category, want, rel);
}

if (CLASSIFY_IS_NOT.change_safety_approved !== false) {
  fails.push("CLASSIFY_IS_NOT.change_safety_approved must stay false");
}
if (CLASSIFY_IS_NOT.qa_complete !== false) {
  fails.push("CLASSIFY_IS_NOT.qa_complete must stay false");
}
if (CLASSIFY_IS_NOT.platform_ops_ready !== false) {
  fails.push("CLASSIFY_IS_NOT.platform_ops_ready must stay false");
}
if (CLASSIFY_IS_NOT.human_po_ack !== false) {
  fails.push("CLASSIFY_IS_NOT.human_po_ack must stay false");
}

const libSrc = fs.readFileSync(path.join(root, LIB_REL), "utf8");
const genSrc = fs.readFileSync(path.join(root, GEN_REL), "utf8");
if (!genSrc.includes('require("./lib/classify-engine-drift.cjs")')) {
  fails.push("official generator must use shared classify()");
}
if (!libSrc.includes('category: "UNCLASSIFIED"')) {
  fails.push("official classify lost UNCLASSIFIED fallback");
}
if (!libSrc.includes("admin-capabilities")) {
  fails.push("official classify lost ADMIN_SESSION matcher");
}
if (!libSrc.includes("jwt-revocation")) {
  fails.push("official classify missing approved jwt-revocation AUTH_SECURITY matcher");
}
if (!libSrc.includes("ledger-adjustment")) {
  fails.push("official classify missing approved ledger-adjustment LEDGER matcher");
}
if (libSrc.includes('"/membership/"') || libSrc.includes("'/membership/'")) {
  fails.push("directory matcher /membership/ is forbidden");
}
if (libSrc.includes('"/opportunities/"') || libSrc.includes("'/opportunities/'")) {
  fails.push("directory matcher /opportunities/ is forbidden");
}

const proposal = JSON.parse(fs.readFileSync(path.join(root, PROP_REL), "utf8"));
if (proposal.status !== "CLASSIFY_RULES_APPLIED") {
  fails.push("proposal.status must be CLASSIFY_RULES_APPLIED after classify apply");
}
if (proposal.official_generator_changed !== true) {
  fails.push("proposal must record official generator changed");
}
if (proposal.human_po_ack_issued === true || proposal.FINAL_ACCEPTANCE === "ISSUED") {
  fails.push("proposal must not claim ACK or ISSUED");
}

expectCat(
  "services/api-nest/src/membership/jwt-revocation.core.cjs",
  "AUTH_SECURITY",
);
expectCat(
  "services/api-nest/src/membership/ledger-adjustment.contract.cjs",
  "LEDGER",
);

for (const p of OPERATOR_MEMBERSHIP_PATHS) {
  expectCat(p, "OPERATOR_MEMBERSHIP");
}
for (const p of CATALOG_EXTERNAL_WRITE_PATHS) {
  expectCat(p, "CATALOG_EXTERNAL_WRITE");
}

expectCat(
  "services/api-nest/src/membership/not-in-allowlist.core.cjs",
  "UNCLASSIFIED",
);
expectCat(
  "services/api-nest/src/opportunities/unrelated.service.ts",
  "UNCLASSIFIED",
);
expectCat(
  "services/api-nest/src/adapters/adapters.user.service.ts",
  "UNCLASSIFIED",
);
expectCat("services/api-nest/src/foo/bar.ts", "UNCLASSIFIED");

expectCat(
  "services/api-nest/src/common/admin-capabilities.ts",
  "ADMIN_SESSION",
);
expectCat("services/api-nest/src/auth/jwt-auth.guard.ts", "AUTH_SECURITY");
expectCat("services/api-nest/src/auth/auth.controller.ts", "AUTH_SECURITY");
expectCat("services/api-nest/src/ledger/posting.ts", "LEDGER");
expectCat(
  "services/api-nest/src/adapters/adapters.ingest.controller.ts",
  "ADAPTER_INGEST",
);
expectCat("services/api-nest/src/app.module.ts", "MODULE_WIRING");
expectCat("schemas/foo.v1.json", "CONTRACT_SCHEMA");
expectCat("supabase/migrations/x.sql", "DB_MIGRATION");
expectCat(
  "services/api-nest/src/wallet/withdraw-intent.service.ts",
  "MONEY_WALLET",
);
expectCat("services/api-nest/src/referral/referral.controller.ts", "REFERRAL");
expectCat("services/api-nest/src/ux-prefs/store.ts", "UX_PREFS");
expectCat("services/api-nest/src/health.controller.ts", "HEALTH");
expectCat("services/api-nest/src/ai/coach.orchestrator.ts", "AI_COACH");

expectEq(
  classify("services/api-nest/src/membership/jwt-revocation.core.cjs").required_rerun.join(","),
  "QA1,QA2,QA8",
  "jwt-revocation rerun",
);
expectEq(
  classify("services/api-nest/src/membership/ledger-adjustment.contract.cjs")
    .required_rerun.join(","),
  "QA3,QA4,QA8",
  "ledger-adjustment rerun",
);
expectEq(
  classify("services/api-nest/src/membership/operator-control.persist.cjs")
    .required_rerun.join(","),
  "QA0,QA1,QA2,QA8",
  "operator-membership rerun",
);
expectEq(
  classify("services/api-nest/catalog-external-write.core.cjs").required_rerun.join(","),
  "QA0,QA5,QA8",
  "catalog-external-write rerun",
);

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

const live = psm.compareProtectedScope();
const livePaths = [...live.added, ...live.changed, ...live.missing].map((p) =>
  p.replace(/\\/g, "/"),
);
if (livePaths.length !== live.changedPathCount) {
  fails.push("live path union != changedPathCount");
}

const officialCounts = {};
if (live.changedPathCount === 0) {
  // Current-epoch ISSUED: protected live drift is 0. The proposal remains a
  // classify-rule catalog, not a live-drift inventory. Do not require the
  // historical 71-path list to reappear as live drift.
  if (classify("services/api-nest/src/common/admin-capabilities.ts").category !== "ADMIN_SESSION") {
    fails.push("admin-capabilities must stay ADMIN_SESSION");
  }
} else {
  for (const p of livePaths) {
    const cat = classify(p).category;
    officialCounts[cat] = (officialCounts[cat] || 0) + 1;
    if (cat === "UNCLASSIFIED") fails.push("live still UNCLASSIFIED " + p);
    const want = proposed.get(p);
    if (!want) fails.push("proposal dropped live path " + p);
    else if (want !== cat) fails.push(p + " official=" + cat + " proposal=" + want);
  }
  for (const p of proposed.keys()) {
    if (!livePaths.includes(p)) {
      fails.push("proposal invented path outside live drift " + p);
    }
  }

  expectEq(officialCounts.ADMIN_SESSION, 8, "live ADMIN_SESSION");
  const adminCap = "services/api-nest/src/common/admin-capabilities.ts";
  if (!livePaths.includes(adminCap)) {
    fails.push("admin-capabilities missing from live drift");
  } else if (classify(adminCap).category !== "ADMIN_SESSION") {
    fails.push("admin-capabilities must stay ADMIN_SESSION");
  }
}

if (fails.length) {
  console.error("[classify-engine-drift] FAIL");
  for (const f of fails) console.error(" - " + f);
  process.exit(1);
}
console.log(
  "[classify-engine-drift] PASS · live=" +
    live.changedPathCount +
    " · " +
    Object.keys(officialCounts)
      .sort()
      .map((k) => k + "=" + officialCounts[k])
      .join(" · ") +
    " · classify≠safety≠QA",
);
