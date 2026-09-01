/**
 * verify:b3-promotion — B-SEC DATABASE PROMOTION PATH
 * Closes promotion gates. Does NOT apply to production.
 * Isolated verify DB create is Founder Dashboard (agent confirm_cost blocked).
 */
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const root = path.resolve(__dirname, "../..");
const fails = [];

const ART =
  "governance/release-master/rel-b3-promotion/b3-promotion.v1.json";
const LEDGER = "governance/db-recon/b3-promotion-ledger.v1.json";
const INV = "governance/release-inventory/b3-promotion.v1.json";
const ALLOW = "tooling/e2e/fixtures/qa-allowlist.v1.json";
const PROD = "mgsytcetsiecllmhcyox";

function read(rel) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

function mustExist(rel) {
  if (!fs.existsSync(path.join(root, rel))) fails.push("missing: " + rel);
}

mustExist(ART);
mustExist(LEDGER);
mustExist(INV);
mustExist(ALLOW);

if (fails.length) {
  console.error("[verify:b3-promotion] FAIL\n- " + fails.join("\n- "));
  process.exit(1);
}

let art;
let ledger;
let inv;
let allow;
try {
  art = JSON.parse(read(ART));
  ledger = JSON.parse(read(LEDGER));
  inv = JSON.parse(read(INV));
  allow = JSON.parse(read(ALLOW));
} catch (err) {
  fails.push("parse: " + err.message);
}

if (art) {
  if (art.schema !== "production-release.b3-promotion.v1") {
    fails.push("artifact schema lock");
  }
  if (art.id !== "b-3-promotion") fails.push("artifact id");
  if (art.status !== "CLOSED") fails.push("status must be CLOSED");
  if (art.promotion_path_closed !== true) {
    fails.push("promotion_path_closed must be true");
  }
  if (art.production_project_ref !== PROD) {
    fails.push("production_project_ref lock");
  }
  if (art.production_db_apply_this_slice !== 0) {
    fails.push("production_db_apply_this_slice must be 0");
  }
  if (art.apply_migration_on_production !== 0) {
    fails.push("apply_migration_on_production must be 0");
  }
  if (art.reapply !== 0) fails.push("reapply must be 0");
  if (art.merge_branch_to_production !== 0) {
    fails.push("merge_branch_to_production must be 0");
  }
  if (art.rc_formal !== "NO") fails.push("rc_formal must stay NO");
  if (art.release_ready !== "NO") fails.push("release_ready must stay NO");

  const iv = art.isolated_verify_db || {};
  if (iv.exists !== "NO") {
    fails.push("isolated_verify_db.exists must be NO until Founder branch");
  }
  if (iv.usable !== "NO") fails.push("isolated_verify_db.usable must be NO");
  if (iv.branch_project_ref === PROD) {
    fails.push("branch_project_ref must not equal production");
  }
  if (iv.customer_data !== 0) fails.push("customer_data must be 0");
  if (!iv.create_attempt || iv.create_attempt.assumed_exists !== false) {
    fails.push("must not assume verify DB exists");
  }
  if (!iv.create_attempt || iv.create_attempt.result !== "FAIL") {
    fails.push("create_attempt result must record FAIL (honest)");
  }
  if (
    !iv.safe_alternative ||
    iv.safe_alternative.kind !== "FOUNDER_DASHBOARD_BRANCH_THEN_LEDGER"
  ) {
    fails.push("safe_alternative kind lock");
  }

  const st = art.staging_e2e || {};
  if (st.status !== "NOT_RUN") {
    fails.push("staging_e2e must be NOT_RUN while RC_FORMAL=NO");
  }
  if (st.requires && st.requires.rel_601_live_substitute !== false) {
    fails.push("REL-601 must not substitute live staging");
  }

  const gate = art.gateBProd || {};
  if (gate.owner !== "Founder only") fails.push("gateBProd owner");
  if (gate.blank_cell_prod_apply !== "FORBIDDEN") {
    fails.push("blank_cell_prod_apply must be FORBIDDEN");
  }
  if (gate.agent_prod_apply !== "FORBIDDEN") {
    fails.push("agent_prod_apply must be FORBIDDEN");
  }
}

if (ledger) {
  if (ledger.schema !== "governance.db-recon.b3-promotion-ledger.v1") {
    fails.push("ledger schema lock");
  }
  if (ledger.production_db_apply !== 0) {
    fails.push("ledger production_db_apply must be 0");
  }
  if (ledger.reapply !== 0) fails.push("ledger reapply must be 0");
  if (!ledger.isolated_verify_db || ledger.isolated_verify_db.exists !== "NO") {
    fails.push("ledger isolated_verify_db.exists must be NO");
  }
  const req = ledger.required_fields || [];
  const rows = ledger.promotion_candidates || [];
  if (!Array.isArray(rows) || rows.length !== 10) {
    fails.push("promotion_candidates must be 10 committedUnapplied");
  }
  const expected = [
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
  rows.forEach((row, i) => {
    for (const f of req) {
      if (row[f] === undefined || row[f] === null || row[f] === "") {
        fails.push("blank required field " + f + " on " + (row.id || i));
      }
    }
    if (row.prod_apply !== "FORBIDDEN") {
      fails.push(row.id + " prod_apply must be FORBIDDEN until gates");
    }
    if (row.verify_db_result === "PASS" && art.isolated_verify_db.exists === "NO") {
      fails.push(row.id + " cannot PASS verify_db while DB ABSENT");
    }
    if (row.version !== expected[i]) {
      fails.push("order drift at " + i + " expected " + expected[i]);
    }
    const fp = path.join(root, row.file || "");
    if (!fs.existsSync(fp)) {
      fails.push("missing migration file " + row.file);
      return;
    }
    const sql = fs.readFileSync(fp);
    const sqlText = sql.toString("utf8");
    if (!/APPLY_THIS_SLICE\s*=\s*NO/.test(sqlText)) {
      fails.push(row.id + " must keep APPLY_THIS_SLICE = NO");
    }
    const canonical = Buffer.from(sqlText.replace(/\r\n/g, "\n"), "utf8");
    const hash = crypto.createHash("sha256").update(canonical).digest("hex");
    if (hash !== row.sql_hash) {
      fails.push("sql_hash drift " + row.id);
    }
  });
  if (
    !ledger.staging_e2e ||
    ledger.staging_e2e.status !== "NOT_RUN" ||
    ledger.staging_e2e.rc_formal !== "NO"
  ) {
    fails.push("ledger staging_e2e must stay NOT_RUN / rc_formal NO");
  }
}

if (inv) {
  if (inv.promotion_path !== "CLOSED") fails.push("inventory path not CLOSED");
  if (inv.apply !== 0) fails.push("inventory apply must be 0");
  if (inv.production_db_apply !== 0) {
    fails.push("inventory production_db_apply must be 0");
  }
  if (inv.isolated_verify_db !== "EXISTS=NO") {
    fails.push("inventory must keep EXISTS=NO");
  }
}

if (allow) {
  if (allow.productionProjectRef !== PROD) {
    fails.push("qa-allowlist productionProjectRef drift");
  }
  const refs = allow.allowedProjectRefs || [];
  if (refs.includes(PROD)) {
    fails.push("production ref must not be in allowedProjectRefs");
  }
  const meta = allow.isolatedVerifyBranch;
  if (meta) {
    if (meta.parentProductionRef !== PROD) {
      fails.push("isolatedVerifyBranch parentProductionRef lock");
    }
    if (meta.status !== "ABSENT") {
      fails.push("isolatedVerifyBranch.status must be ABSENT until Founder create");
    }
    if (meta.projectRef) {
      fails.push("isolatedVerifyBranch.projectRef must be null while ABSENT");
    }
  }
}

const pkg = read("package.json");
const catalog = read("tooling/verify/CATALOG.md");
const domain = read("tooling/verify/domain-by-path.cjs");
if (!pkg.includes('"verify:b3-promotion"')) {
  fails.push("package.json missing verify:b3-promotion");
}
if (!catalog.includes("b3-promotion")) {
  fails.push("CATALOG.md must list b3-promotion");
}
if (!domain.includes("b3-promotion.cjs")) {
  fails.push("domain-by-path must trigger b3-promotion");
}

if (fails.length) {
  console.error("[verify:b3-promotion] FAIL\n- " + fails.join("\n- "));
  process.exit(1);
}

console.log(
  "[verify:b3-promotion] PASS (path CLOSED · verify DB ABSENT honest · prod apply 0 · ledger 10 · staging NOT_RUN)",
);
