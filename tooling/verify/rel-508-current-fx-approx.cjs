/**
 * verify:rel-508-current-fx-approx
 * Nest POST /api/v1/me/current-fx/approx. Display-only. null not 0.
 * Does not require REL-503 CURRENT — this slice makes ISSUED STALE.
 */
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "../..");
const fails = [];

function read(rel) {
  const p = path.join(root, rel);
  if (!fs.existsSync(p)) {
    fails.push("missing: " + rel);
    return "";
  }
  return fs.readFileSync(p, "utf8");
}

const fixture = JSON.parse(
  read("tooling/verify/fixtures/rel-508-current-fx-approx.v1.json") || "{}",
);
const plan = read(".cursor/plans/PUTDUK_RELEASE_MASTER.plan.md");
const evidence = read("governance/release-master/REL-508-CURRENT-FX-APPROX.md");
const r7 = read("governance/release-master/R7_BACKEND_ALIGNMENT.md");
const pkg = read("package.json");
const catalog = read("tooling/verify/CATALOG.md");
const gate = read(".github/workflows/gate.yml");
const domain = read("tooling/verify/domain-by-path.cjs");
const routes = read("services/api-nest/src/opportunities/current-fx-approx.user.routes.ts");
const ctl = read("services/api-nest/src/opportunities/current-fx-approx.user.controller.ts");
const svc = read("services/api-nest/src/opportunities/current-fx-approx.service.ts");
const map = read("services/api-nest/src/opportunities/current-fx-approx.map.ts");
const fx = read("services/api-nest/src/opportunities/fx-snapshot.service.ts");
const schema = read("schemas/current-fx-approx.v1.json");
const mod = read("services/api-nest/src/opportunities/opportunities.module.ts");
const sdk = read("packages/sdk/src/current-fx/fetch.ts");

function todoCompleted(relId) {
  const id = relId.replace(/^REL-/i, "rel-").toLowerCase();
  const re = new RegExp(
    "- id: " + id + "\\r?\\n(?:.*\\r?\\n){0,3}\\s*status: (\\w+)",
  );
  const m = plan.match(re);
  return m && m[1] === "completed";
}

function yamlStatus(relId) {
  const idx = plan.indexOf("ID: " + relId);
  if (idx < 0) return "";
  const m = plan.slice(idx, idx + 240).match(/STATUS:\s*(\w+)/);
  return m ? m[1] : "";
}

if (fixture.protectedScopeMutation !== true) {
  fails.push("REL-508 must declare protectedScopeMutation true");
}

const rebaseRequired = /REBASE_REQUIRED = 1/.test(
  read("governance/engine-acceptance/FINAL_ACCEPTANCE.md"),
);
if (rebaseRequired) {
  if (fixture.certIssued !== 0) fails.push("fixture certIssued must be 0 while REL-502 rebase is required");
  if (fixture.stalePendingRebase !== true) fails.push("stalePendingRebase must be true while REL-502 is NOT_ISSUED");
} else {
  if (fixture.certIssued !== 1) fails.push("R7 certIssued must be 1 after REL-502 ISSUED");
  if (fixture.stalePendingRebase !== false) fails.push("stalePendingRebase must be false after rebase ISSUED");
}
for (const dep of fixture.deps || []) {
  if (dep === "REL-502" && rebaseRequired) continue;
  if (!todoCompleted(dep)) fails.push("dep todo not completed " + dep);
  if (yamlStatus(dep) !== "COMPLETED") fails.push("dep YAML not COMPLETED " + dep);
}
if (!todoCompleted("REL-508")) fails.push("rel-508 todo must be completed");
if (yamlStatus("REL-508") !== "COMPLETED") fails.push("REL-508 YAML must be COMPLETED");

for (const needle of [
  "STATUS = COMPLETED",
  "PROTECTED_SCOPE_MUTATION = TRUE",
  "STALE_PENDING_REBASE = 0",
  "CLIENT_FX_MATH = 0",
  "FABRICATE_KRW_ZERO = 0",
]) {
  if (!evidence.includes(needle)) fails.push("evidence missing " + needle);
}
if (rebaseRequired) {
  if (!r7.includes("STALE_PENDING_REBASE = 1") || !/CERT_ISSUED = 0/.test(r7)) {
    fails.push("R7 must mirror REL-502 NOT_ISSUED while rebase is required");
  }
} else if (!r7.includes("STALE_PENDING_REBASE = 0") || !/CERT_ISSUED = 1/.test(r7)) {
  fails.push("R7 must be CERT_ISSUED=1 and STALE_PENDING_REBASE=0 after ISSUED");
}

if (!routes.includes("me/current-fx/approx")) fails.push("route missing me/current-fx/approx");
if (!ctl.includes("JwtAuthGuard") || !ctl.includes("@Post")) {
  fails.push("controller must be JWT POST");
}
if (!svc.includes("approxKrwFromSnapshot") || !svc.includes("getLatestKrwDisplaySnapshot")) {
  fails.push("service must reuse snapshot formula");
}
if (!map.includes("return null") || map.includes('return "0"')) {
  fails.push("map must fail-closed to null, not 0");
}
if (/\bNumber\s*\(/.test(svc) || /\bparseFloat\s*\(/.test(svc)) {
  fails.push("service must not Number()/parseFloat money");
}
if (!fx.includes("getLatestKrwDisplaySnapshot")) {
  fails.push("FxSnapshotService missing getLatestKrwDisplaySnapshot");
}
if (!schema.includes("CurrentFxApproxV1") || !schema.includes("null")) {
  fails.push("schema must allow null KRW fields");
}
if (!mod.includes("CurrentFxApproxUserController") || !mod.includes("CurrentFxApproxService")) {
  fails.push("OpportunitiesModule must register current-fx");
}
if (!sdk.includes("/api/v1/me/current-fx/approx")) {
  fails.push("SDK path must stay /api/v1/me/current-fx/approx");
}

if (!pkg.includes("verify:rel-508-current-fx-approx")) {
  fails.push("package.json missing verify:rel-508-current-fx-approx");
}
if (!catalog.includes("rel-508-current-fx-approx")) {
  fails.push("CATALOG missing rel-508-current-fx-approx");
}
if (!gate.includes("verify:rel-508-current-fx-approx")) {
  fails.push("gate.yml must run verify:rel-508-current-fx-approx");
}
if (!domain.includes("rel-508-current-fx-approx.cjs")) {
  fails.push("domain-by-path must trigger rel-508");
}

if (fails.length) {
  console.error("[verify:rel-508-current-fx-approx] FAIL");
  for (const f of fails) console.error(" - " + f);
  process.exit(1);
}
console.log(
  "[verify:rel-508-current-fx-approx] PASS (Nest wire · null not 0 · STALE pending REL-502 rebase)",
);
