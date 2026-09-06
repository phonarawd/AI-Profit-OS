/**
 * verify:s3-36-observability — S3 / 3.6 Phase H (code slice)
 * Health SHA + migration head, CodeQL workflow vs open alerts, mask/alerts.
 * Live alert send / live CodeQL alert API / backup restore stay S6.
 * launchYes must stay false.
 */
"use strict";

const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const root = path.resolve(__dirname, "../..");
const fails = [];
const fail = (msg) => fails.push(msg);

function read(rel) {
  const fp = path.join(root, rel);
  if (!fs.existsSync(fp)) {
    fail("missing: " + rel);
    return "";
  }
  return fs.readFileSync(fp, "utf8");
}

const matrixRel = "governance/observability/s3-36-connection-matrix.v1.json";
let matrix;
try {
  matrix = JSON.parse(read(matrixRel));
} catch (err) {
  fail("matrix JSON invalid: " + err.message);
  matrix = { checks: {} };
}

if (matrix.liveE2e !== "NOT_RUN") fail("matrix.liveE2e must stay NOT_RUN until S6");
if (matrix.productionDbApply !== false) fail("matrix must not claim production DB apply");
if (matrix.launchYes !== false) fail("matrix.launchYes must stay false");
if (matrix.stagingBrowser !== "NOT_RUN") fail("matrix.stagingBrowser must stay NOT_RUN");

for (const key of [
  "H1_live_alert_send",
  "H2_codeql_open_alerts_live",
  "H3_backup_restore_rehearsal",
  "H3_kill_switch_live_e2e",
]) {
  if (matrix.checks && matrix.checks[key] !== "NOT_RUN") {
    fail("matrix." + key + " must stay NOT_RUN");
  }
}
if (matrix.checks && matrix.checks.H2_workflow_green_is_not_open_alert_zero !== "code") {
  fail("matrix must keep workflow-green != open-alert-zero as a code contract");
}

const notes = JSON.stringify(matrix.notes || []);
if (!notes.includes("codeql_workflow success is not CODEQL_UNTRIAGED=0")) {
  fail("matrix notes must refuse workflow-green / open-alert confusion");
}

const healthPublic = read("services/api-nest/src/health.public.ts");
if (!healthPublic.includes("migrationHead") || !healthPublic.includes("sanitizeMigrationHead")) {
  fail("public health must expose a sanitized migrationHead");
}
if (!healthPublic.includes("sanitizeEnvironment") || !healthPublic.includes("environment")) {
  fail("public health must expose a sanitized environment");
}

const healthCtl = read("services/api-nest/src/health.controller.ts");
if (!healthCtl.includes("supabase_migrations.schema_migrations")) {
  fail("health controller must read supabase_migrations.schema_migrations");
}
if (!healthCtl.includes("readMigrationHead") || !healthCtl.includes("environment: env.nodeEnv")) {
  fail("health controller must pass environment and migration head");
}

const decision = read("tooling/release/production-release-decision.cjs");
if (!decision.includes("codeql_open_untriaged")) {
  fail("release decision must require codeql_open_untriaged separately");
}
if (!decision.includes("codeql_workflow !== \"success\"")) {
  fail("release decision must still check codeql_workflow");
}
if (!decision.includes("workflow green is not CODEQL_UNTRIAGED=0")) {
  fail("release decision must document workflow green != open alerts");
}

const decisionTest = read("tooling/verify/production-release-decision.cjs");
if (!decisionTest.includes("codeql_workflow_green_is_not_open_alert_zero")) {
  fail("decision tests must prove workflow green is not enough");
}

const codeql = read(".github/workflows/codeql.yml");
if (!codeql.includes("github/codeql-action/analyze") || !codeql.includes("javascript-typescript")) {
  fail("codeql.yml must keep JS/TS analyze");
}

const obsCore = read("packages/observability/observability.core.cjs");
if (!obsCore.includes("requestId") || !obsCore.includes("MASK.redacted")) {
  fail("obs core must keep requestId + redaction");
}

const pkg = read("package.json");
if (!pkg.includes('"verify:s3-36-observability"')) fail("package.json missing verify:s3-36-observability");
const domain = read("tooling/verify/domain-by-path.cjs");
if (!domain.includes("s3-36-observability.cjs")) fail("domain-by-path must trigger s3-36-observability.cjs");
const catalog = read("tooling/verify/CATALOG.md");
if (!catalog.includes("s3-36-observability")) fail("CATALOG.md must list s3-36-observability");

function run(rel, label) {
  const out = spawnSync(process.execPath, [rel], {
    cwd: root,
    encoding: "utf8",
    timeout: 60_000,
  });
  process.stdout.write(out.stdout || "");
  process.stderr.write(out.stderr || "");
  if (out.status !== 0) fail(label + " failed");
}

run("tooling/verify/observability.cjs", "verify:observability");
run("tooling/verify/production-release-decision.cjs", "verify:production-release-decision");

if (fails.length) {
  console.error("[verify:s3-36-observability] FAIL");
  for (const f of fails) console.error(" -", f);
  process.exit(1);
}
console.log(
  "[verify:s3-36-observability] PASS (H1 health head · H2 workflow!=alerts · LIVE=NOT_RUN)",
);
