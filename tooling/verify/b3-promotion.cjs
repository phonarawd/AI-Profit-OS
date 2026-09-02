/**
 * verify:b3-promotion — B-SEC DATABASE PROMOTION PATH
 * Does NOT apply to Production.
 *
 * Current provider truth (2026-09-02):
 * - isolated Supabase branch exists and is usable
 * - customer data = 0
 * - Production/Staging public-table parity = 93/93
 * - staging infra runtime PASS
 * - full staging E2E remains NOT_RUN until RC_FORMAL + frontend binding
 */
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const root = path.resolve(__dirname, "../..");
const fails = [];

const ART = "governance/release-master/rel-b3-promotion/b3-promotion.v1.json";
const LEDGER = "governance/db-recon/b3-promotion-ledger.v1.json";
const INV = "governance/release-inventory/b3-promotion.v1.json";
const ALLOW = "tooling/e2e/fixtures/qa-allowlist.v1.json";
const PROD = "mgsytcetsiecllmhcyox";
const STAGE = "uluzxvdpynytytduuryy";

function read(rel) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}
function mustExist(rel) {
  if (!fs.existsSync(path.join(root, rel))) fails.push("missing: " + rel);
}

for (const rel of [ART, LEDGER, INV, ALLOW]) mustExist(rel);
if (fails.length) {
  console.error("[verify:b3-promotion] FAIL\n- " + fails.join("\n- "));
  process.exit(1);
}

let art, ledger, inv, allow;
try {
  art = JSON.parse(read(ART));
  ledger = JSON.parse(read(LEDGER));
  inv = JSON.parse(read(INV));
  allow = JSON.parse(read(ALLOW));
} catch (err) {
  fails.push("parse: " + err.message);
}

if (art) {
  if (art.schema !== "production-release.b3-promotion.v1") fails.push("artifact schema lock");
  if (art.id !== "b-3-promotion") fails.push("artifact id");
  if (art.status !== "CLOSED") fails.push("status must remain CLOSED to Production promotion");
  if (art.promotion_path_closed !== true) fails.push("promotion_path_closed must stay true until full gates");
  if (art.production_project_ref !== PROD) fails.push("production_project_ref lock");
  if (art.production_db_apply_this_slice !== 0) fails.push("production_db_apply_this_slice must be 0");
  if (art.apply_migration_on_production !== 0) fails.push("apply_migration_on_production must be 0");
  if (art.reapply !== 0) fails.push("reapply must be 0");
  if (art.merge_branch_to_production !== 0) fails.push("merge_branch_to_production must be 0");
  if (art.rc_formal !== "NO") fails.push("rc_formal must stay NO");
  if (art.release_ready !== "NO") fails.push("release_ready must stay NO");

  const iv = art.isolated_verify_db || {};
  if (iv.exists !== "YES") fails.push("isolated_verify_db.exists must be YES");
  if (iv.usable !== "YES") fails.push("isolated_verify_db.usable must be YES");
  if (iv.parent_production_ref !== PROD) fails.push("isolated verify parent ref");
  if (iv.branch_project_ref !== STAGE) fails.push("isolated verify staging ref");
  if (iv.branch_project_ref === PROD) fails.push("branch_project_ref must differ from production");
  if (iv.with_data !== false) fails.push("isolated verify with_data must be false");
  if (iv.customer_data !== 0) fails.push("customer_data must be 0");
  if (iv.preview_project_status !== "ACTIVE_HEALTHY") fails.push("isolated verify health");
  if (iv.public_table_count !== 93) fails.push("staging public table count must be 93");
  if (iv.production_public_table_count !== 93) fails.push("production public table count must be 93");
  if (iv.schema_parity !== "PASS") fails.push("schema parity must be PASS");
  if (iv.hardening_rehearsal !== "APPLY_PASS_ROLLBACK_PASS_REAPPLY_PASS") {
    fails.push("hardening rehearsal must be fully proven");
  }
  if (!iv.creation || iv.creation.result !== "SUCCESS") fails.push("branch creation result must be SUCCESS");
  if (!iv.creation || iv.creation.production_mutation !== 0) fails.push("branch creation production mutation must be 0");

  const st = art.staging_e2e || {};
  if (st.status !== "NOT_RUN") fails.push("full staging_e2e must remain NOT_RUN before RC_FORMAL");
  if (st.infra_runtime !== "PASS") fails.push("staging infra runtime must be PASS");
  if (st.requires?.isolated_verify_db_exists !== "YES") fails.push("staging E2E must require existing isolated DB");
  if (st.requires?.cloudflare_frontend_bound_to_staging !== "YES") {
    fails.push("staging E2E must require Cloudflare frontend binding");
  }
  if (st.requires?.rel_601_live_substitute !== false) fails.push("REL-601 must not substitute live staging");

  const gate = art.gateBProd || {};
  if (gate.owner !== "Founder only") fails.push("gateBProd owner");
  if (gate.blank_cell_prod_apply !== "FORBIDDEN") fails.push("blank_cell_prod_apply must be FORBIDDEN");
  if (gate.agent_prod_apply !== "FORBIDDEN") fails.push("agent_prod_apply must be FORBIDDEN");
}

if (ledger) {
  if (ledger.schema !== "governance.db-recon.b3-promotion-ledger.v1") fails.push("ledger schema lock");
  if (ledger.production_db_apply !== 0) fails.push("ledger production_db_apply must be 0");
  if (ledger.reapply !== 0) fails.push("ledger reapply must be 0");

  const iv = ledger.isolated_verify_db || {};
  if (iv.exists !== "YES") fails.push("ledger isolated_verify_db.exists must be YES");
  if (iv.usable !== "YES") fails.push("ledger isolated_verify_db.usable must be YES");
  if (iv.branch_project_ref !== STAGE) fails.push("ledger staging ref");
  if (iv.parent_project_ref !== PROD) fails.push("ledger parent ref");
  if (iv.customer_data !== 0) fails.push("ledger customer data must be 0");
  if (iv.public_table_count !== 93 || iv.production_public_table_count !== 93) {
    fails.push("ledger 93/93 schema count");
  }
  if (iv.schema_parity !== "PASS") fails.push("ledger schema parity");

  const req = ledger.required_fields || [];
  const rows = ledger.promotion_candidates || [];
  if (!Array.isArray(rows) || rows.length !== 10) {
    fails.push("promotion_candidates must preserve 10 historical committedUnapplied rows");
  }
  const expected = [
    "20260819210000","20260819220000","20260820013000","20260821090000","20260823160000",
    "20260823170000","20260823180000","20260823190000","20260823200000","20260823210000"
  ];
  rows.forEach((row, i) => {
    for (const f of req) {
      if (row[f] === undefined || row[f] === null || row[f] === "") {
        fails.push("blank required field " + f + " on " + (row.id || i));
      }
    }
    if (row.prod_apply !== "FORBIDDEN") fails.push(row.id + " prod_apply must remain FORBIDDEN");
    if (row.version !== expected[i]) fails.push("order drift at " + i + " expected " + expected[i]);
    const fp = path.join(root, row.file || "");
    if (!fs.existsSync(fp)) {
      fails.push("missing migration file " + row.file);
      return;
    }
    const sqlText = fs.readFileSync(fp, "utf8");
    if (!/APPLY_THIS_SLICE\s*=\s*NO/.test(sqlText)) {
      fails.push(row.id + " must keep APPLY_THIS_SLICE = NO");
    }
    const canonical = Buffer.from(sqlText.replace(/\r\n/g, "\n"), "utf8");
    const hash = crypto.createHash("sha256").update(canonical).digest("hex");
    if (hash !== row.sql_hash) fails.push("sql_hash drift " + row.id);
  });

  if (
    !ledger.staging_e2e ||
    ledger.staging_e2e.status !== "NOT_RUN" ||
    ledger.staging_e2e.rc_formal !== "NO" ||
    ledger.staging_e2e.infra_runtime !== "PASS"
  ) {
    fails.push("ledger staging E2E boundary must be NOT_RUN / rc_formal NO / infra PASS");
  }
  const parity = ledger.schema_parity_recovery || {};
  if (parity.production_table_count !== 93 || parity.staging_table_count !== 93) {
    fails.push("schema parity recovery must be 93/93");
  }
  if (parity.missing_in_staging !== 0 || parity.staging_only !== 0) {
    fails.push("schema parity recovery differences must be 0");
  }
  if (parity.production_mutation !== 0) fails.push("schema parity recovery production mutation");
}

if (inv) {
  if (inv.promotion_path !== "VERIFY_DB_READY_STAGING_E2E_PENDING") {
    fails.push("inventory promotion path must reflect verify DB ready / E2E pending");
  }
  if (inv.apply !== 0) fails.push("inventory apply must be 0");
  if (inv.production_db_apply !== 0) fails.push("inventory production_db_apply must be 0");
  if (inv.isolated_verify_db !== "EXISTS=YES") fails.push("inventory isolated verify DB must exist");
  if (inv.usable_isolated_verify_env !== "YES") fails.push("inventory isolated verify env must be usable");
  if (inv.current_staging?.supabase_project_ref !== STAGE) fails.push("inventory staging ref");
  if (inv.current_staging?.schema_parity !== "93/93") fails.push("inventory schema parity");
  if (inv.current_staging?.customer_data !== 0) fails.push("inventory customer data");
  if (inv.staging_e2e !== "NOT_RUN (RC_FORMAL=NO · frontend staging binding pending)") {
    fails.push("inventory full staging E2E boundary");
  }
}

if (allow) {
  if (allow.productionProjectRef !== PROD) fails.push("qa-allowlist productionProjectRef drift");
  const refs = allow.allowedProjectRefs || [];
  if (refs.includes(PROD)) fails.push("production ref must not be in allowedProjectRefs");
  if (refs.length !== 1 || refs[0] !== STAGE) {
    fails.push("only isolated staging ref may be allowlisted");
  }
}

const pkg = read("package.json");
const catalog = read("tooling/verify/CATALOG.md");
const domain = read("tooling/verify/domain-by-path.cjs");
if (!pkg.includes('"verify:b3-promotion"')) fails.push("package.json missing verify:b3-promotion");
if (!catalog.includes("b3-promotion")) fails.push("CATALOG.md must list b3-promotion");
if (!domain.includes("b3-promotion.cjs")) fails.push("domain-by-path must trigger b3-promotion");

if (fails.length) {
  console.error("[verify:b3-promotion] FAIL\n- " + fails.join("\n- "));
  process.exit(1);
}

console.log(
  "[verify:b3-promotion] PASS (isolated verify DB READY · 93/93 · customer data 0 · Production apply 0 · full staging E2E NOT_RUN)",
);
