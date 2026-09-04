"use strict";

/**
 * verify:live-schema-forensic
 * Production apply / repair / SQL 재실행을 하지 않는다.
 * Git 51 / history 42 / no-history 13 / repair=false 를 잠근다.
 */
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const { worst, childVerdicts, VERDICT_RANK } = require("../recovery/build-live-schema-forensic.cjs");

const root = path.resolve(__dirname, "../..");
const fails = [];
const PROD = "mgsytcetsiecllmhcyox";
const ALLOWED = new Set([
  "EXACT_EQUIVALENT",
  "EQUIVALENT_WITH_NON_SEMANTIC_DIFFERENCE",
  "STRUCTURAL_DRIFT",
  "DATA_DRIFT",
  "UNVERIFIED",
]);
const THIRTEEN = [
  "source_observations",
  "canonical_products",
  "canonical_product_source_links",
  "match_results",
  "push_control",
  "push_subscriptions",
  "admin_audit_events",
  "admin_kill_switches",
  "opportunity_price_overrides",
  "admin_ops_intents",
  "admin_match_controls",
  "admin_policy_versions",
  "admin_policy_heads",
];
const NO_HISTORY = [
  "20260819210000",
  "20260819220000",
  "20260820013000",
  "20260821090000",
  "20260823160000",
  "20260823170000",
  "20260823180000",
  "20260823190000",
  "20260823200000",
  "20260823210000",
];

function readJson(rel) {
  const abs = path.join(root, rel);
  if (!fs.existsSync(abs)) {
    fails.push("missing: " + rel);
    return null;
  }
  try {
    return JSON.parse(fs.readFileSync(abs, "utf8"));
  } catch (err) {
    fails.push("parse " + rel + ": " + err.message);
    return null;
  }
}

function must(cond, msg) {
  if (!cond) fails.push(msg);
}

must(worst(["EXACT_EQUIVALENT", "UNVERIFIED"]) === "UNVERIFIED", "worst UNVERIFIED over EXACT");
must(
  worst(["UNVERIFIED", "STRUCTURAL_DRIFT"]) === "STRUCTURAL_DRIFT",
  "worst STRUCTURAL over UNVERIFIED",
);
must(worst(["DATA_DRIFT", "UNVERIFIED"]) === "DATA_DRIFT", "worst DATA over UNVERIFIED");
must(
  worst(["EXACT_EQUIVALENT", "EQUIVALENT_WITH_NON_SEMANTIC_DIFFERENCE"]) ===
    "EQUIVALENT_WITH_NON_SEMANTIC_DIFFERENCE",
  "worst equivalent over exact",
);
must(
  worst(["STRUCTURAL_DRIFT", "DATA_DRIFT", "UNVERIFIED"]) === "STRUCTURAL_DRIFT",
  "worst rank STRUCTURAL > DATA > UNVERIFIED",
);

const forensic = readJson("governance/db-recon/live-schema-forensic.v1.json");
const recon = readJson("governance/db-recon/migration-reconciliation.v1.json");
const hist = readJson("governance/db-recon/live-history-snapshot.v1.json");
const cols = readJson("governance/db-recon/live-columns-snapshot.v1.json");
const catalog = readJson("governance/db-recon/live-catalog-snapshot.v1.json");

must(fs.existsSync(path.join(root, "governance/db-recon/LIVE_SCHEMA_FORENSIC.md")), "missing LIVE_SCHEMA_FORENSIC.md");

if (forensic) {
  must(forensic.schema === "governance.db-recon.live-schema-forensic.v1", "forensic schema lock");
  must(forensic.project_ref === PROD, "forensic project_ref");
  must(forensic.production_mutation === 0, "forensic production_mutation");
  must(forensic.apply === 0, "forensic.apply");
  must(forensic.reapply === 0, "forensic.reapply");
  must(forensic.history_rewrite === 0, "forensic.history_rewrite");
  must(forensic.history_repair_approved === false, "history_repair must stay false");
  must(forensic.pitr && forensic.pitr.status === "BLOCKED_EXTERNAL_EVIDENCE", "PITR must stay BLOCKED_EXTERNAL_EVIDENCE");
  must(forensic.production_release === "NO_GO_BACKUP_UNVERIFIED", "production_release lock");
  must(forensic.objects && typeof forensic.objects === "object", "forensic.objects");
  if (forensic.objects) {
    for (const name of THIRTEEN) {
      const obj = forensic.objects[name];
      must(Boolean(obj), "missing object " + name);
      if (!obj) continue;
      must(ALLOWED.has(obj.verdict), "bad verdict " + name + "=" + obj.verdict);
      must(obj.apply_this_slice === "NO", "APPLY_THIS_SLICE lock " + name);
      must(obj.history_present === false, "history_present must be false " + name);
      must(obj.exists_live === true, "exists_live " + name);
      must(Array.isArray(obj.grants.live_anon) && obj.grants.live_anon.length === 0, "anon grant leak " + name);
      must(
        Array.isArray(obj.grants.live_authenticated) && obj.grants.live_authenticated.length === 0,
        "authenticated grant leak " + name,
      );
    }
    const extra = Object.keys(forensic.objects).filter((k) => !THIRTEEN.includes(k));
    must(extra.length === 0, "unexpected objects: " + extra.join(","));
    const drift = THIRTEEN.filter((n) => forensic.objects[n] && forensic.objects[n].verdict === "STRUCTURAL_DRIFT");
    must(drift.length >= 1, "grant drift must remain visible as STRUCTURAL_DRIFT");
    must(
      !THIRTEEN.every((n) => forensic.objects[n] && forensic.objects[n].verdict === "EXACT_EQUIVALENT"),
      "cannot claim all 13 EXACT_EQUIVALENT while grants/history unresolved",
    );
    for (const name of THIRTEEN) {
      const obj = forensic.objects[name];
      if (!obj) continue;
      const children = childVerdicts(obj);
      must(obj.verdict === worst(children), "worst-child mismatch " + name + "=" + obj.verdict);
      if (children.includes("UNVERIFIED")) {
        must(
          obj.verdict !== "EXACT_EQUIVALENT",
          "child UNVERIFIED forbids parent EXACT " + name,
        );
        must(
          VERDICT_RANK[obj.verdict] >= VERDICT_RANK.UNVERIFIED,
          "child UNVERIFIED must propagate " + name,
        );
      }
    }
    must(
      forensic.objects.match_results && forensic.objects.match_results.functions.verdict === "UNVERIFIED",
      "match_results functions must stay UNVERIFIED until body compared",
    );
    must(
      forensic.objects.match_results.verdict !== "EXACT_EQUIVALENT",
      "match_results cannot be EXACT while functions.verdict=UNVERIFIED",
    );
  }
}

if (recon) {
  must(recon.schema === "governance.db-recon.migration-reconciliation.v1", "recon schema");
  must(recon.git_total === 51, "git_total must be 51");
  must(recon.history_total === 42, "history_total must be 42");
  must(recon.exact_match === 37, "exact_match must be 37");
  must(Array.isArray(recon.same_name_different_version) && recon.same_name_different_version.length === 4, "PTF pairs 4");
  must(Array.isArray(recon.git_only) && recon.git_only.length === 10, "git_only 10");
  must(Array.isArray(recon.history_version_only) && recon.history_version_only.length === 5, "history_version_only 5");
  must(recon.ptf_reapply === "FORBIDDEN", "ptf_reapply");
  must(recon.ten_no_apply_sql_reexecute === "FORBIDDEN", "ten sql reexecute");
  must(recon.history_repair && recon.history_repair.approved === false, "repair not approved");
  must(recon.history_repair.if_ever_considered.execute_now === false, "repair execute_now");
  must(Array.isArray(recon.no_history_live_schema) && recon.no_history_live_schema.length === 13, "no-history objects 13");
  for (const ver of NO_HISTORY) {
    must(
      recon.git_only.some((g) => g.version === ver),
      "git_only missing " + ver,
    );
  }
  must(
    recon.history_version_only.some((h) => h.version === "20260810212231"),
    "missing history-only idempotency 20260810212231",
  );
  must(
    Array.isArray(recon.zero_statement_history_marker) && recon.zero_statement_history_marker.length === 2,
    "zero-statement markers 2",
  );
}

if (hist) {
  must(hist.row_count === 42, "history snapshot row_count");
  must(Array.isArray(hist.rows) && hist.rows.length === 42, "history snapshot rows");
  must(
    hist.rows.some((r) => r.version === "20260811062000" && r.statement_count === 0),
    "zero-statement 20260811062000",
  );
}

if (cols) {
  for (const name of THIRTEEN) {
    must(Array.isArray(cols.tables[name]) && cols.tables[name].length > 0, "column snapshot " + name);
  }
}

if (catalog) {
  must(catalog.project_ref === PROD, "catalog project_ref");
  for (const name of THIRTEEN) must(Boolean(catalog.tables[name]), "catalog table " + name);
}

const md = fs.existsSync(path.join(root, "governance/db-recon/LIVE_SCHEMA_FORENSIC.md"))
  ? fs.readFileSync(path.join(root, "governance/db-recon/LIVE_SCHEMA_FORENSIC.md"), "utf8")
  : "";
must(md.includes("NO_GO_BACKUP_UNVERIFIED"), "md production verdict");
must(md.includes("history_repair_approved: false"), "md repair false");

try {
  execFileSync(process.execPath, [path.join(root, "tooling/recovery/compare-sql-columns.cjs")], {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
} catch (err) {
  fails.push("compare-sql-columns failed: " + (err.stderr || err.message));
}

if (fails.length) {
  console.error("[verify:live-schema-forensic] FAIL\n- " + fails.join("\n- "));
  process.exit(1);
}
console.log("[verify:live-schema-forensic] PASS");
