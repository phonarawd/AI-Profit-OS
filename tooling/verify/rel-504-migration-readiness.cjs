/**
 * verify:rel-504-migration-readiness
 * READY만 검증. apply 흔적 있으면 FAIL. REL-502 미완료면 READY 금지.
 */
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "../..");
const fails = [];

function read(rel) {
  const p = path.join(root, rel);
  return fs.existsSync(p) ? fs.readFileSync(p, "utf8") : "";
}

const docRel = "governance/release-master/MIGRATION_READINESS.md";
if (!fs.existsSync(path.join(root, docRel))) fails.push(`missing: ${docRel}`);
const doc = read(docRel);
if (!/PRODUCTION_DB_WRITE:\s*0/.test(doc) || !/APPLY_MIGRATION:\s*0/.test(doc)) {
  fails.push("readiness doc must lock apply=0");
}
if (/STATUS:\s*READY\b/.test(doc) && !/REL-502/.test(doc)) {
  fails.push("READY without REL-502 is forbidden");
}
if (/STATUS:\s*READY\b/.test(doc)) {
  fails.push("READY is forbidden while REL-502 is BLOCKED");
}

const mig = "supabase/migrations/20260822140000_rel405_admin_control_plane.sql";
if (!fs.existsSync(path.join(root, mig))) fails.push(`missing: ${mig}`);
const sql = read(mig);
if (!/MIGRATION_FILE_CREATED != MIGRATION_APPLIED/.test(sql)) {
  fails.push("control-plane migration must keep apply≠created");
}
if (!/ENABLE ROW LEVEL SECURITY/.test(sql) || !/FORCE ROW LEVEL SECURITY/.test(sql)) {
  fails.push("new tables must enable+force RLS");
}

const blob = [
  read("governance/release-master/REL-408-SECURITY-BASELINE.md"),
  read("governance/release-master/SECURITY_BASELINE.md"),
  doc,
].join("\n");
if (/apply_migration\s*\(/.test(blob)) {
  fails.push("apply_migration call site found in readiness evidence");
}

if (fails.length) {
  console.error("[verify:rel-504-migration-readiness] FAIL");
  for (const f of fails) console.error(" -", f);
  process.exit(1);
}

console.log(
  "[verify:rel-504-migration-readiness] PASS (NOT_READY honest · apply 0 · RLS source present)",
);
