/**
 * verify:rel-400-control-plane-spec — spec only, no implementation mix-in
 */
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "../..");
const fails = [];

function read(rel) {
  const p = path.join(root, rel);
  if (!fs.existsSync(p)) {
    fails.push(`missing: ${rel}`);
    return "";
  }
  return fs.readFileSync(p, "utf8");
}

const specRel = "governance/admin/control-plane-superset.md";
const spec = read(specRel);
const pkg = read("package.json");
const catalog = read("tooling/verify/CATALOG.md");

if (!spec) {
  console.error("[verify:rel-400-control-plane-spec] FAIL");
  for (const f of fails) console.error(" -", f);
  process.exit(1);
}

if (!spec.includes("STATUS: SPEC_ONLY")) {
  fails.push("spec must declare STATUS: SPEC_ONLY");
}
if (!spec.includes("IMPLEMENTATION_IN_THIS_REL: 0")) {
  fails.push("spec must keep implementation mix-in 0");
}

for (const needle of [
  "LIVE",
  "DRY_RUN",
  "SIMULATION",
  "/admin/system-control",
  "/admin/audit",
  "REL-213",
  "REL-214",
  "REL-405",
  "REL-406",
  "AdminGuard",
  "schemas/admin-rbac.v1.json",
  "USER_JWT_ADMIN_200 = 0",
  "GLOBAL_OPPORTUNITY_PAUSE",
  "preview → confirm",
  "MoneyCircuitService",
  "PushKillService",
  "AI observation ≠ domain audit",
  "유저앱(`apps/web`)에 Admin IA를 이식하지 않는다",
]) {
  if (!spec.includes(needle)) fails.push(`spec missing ${needle}`);
}

if (/```(?:ts|tsx|js)\n(?:import|export default|@Controller)/.test(spec)) {
  fails.push("spec must not mix implementation controllers/pages");
}
if (spec.includes("CREATE TABLE") || spec.includes("new RbacService")) {
  fails.push("spec must not create a second RBAC/audit owner");
}

if (!pkg.includes("verify:rel-400-control-plane-spec")) {
  fails.push("package.json missing verify:rel-400-control-plane-spec");
}
if (!catalog.includes("rel-400-control-plane-spec")) {
  fails.push("CATALOG.md missing rel-400-control-plane-spec");
}

if (fails.length) {
  console.error("[verify:rel-400-control-plane-spec] FAIL");
  for (const f of fails) console.error(" -", f);
  process.exit(1);
}
console.log("[verify:rel-400-control-plane-spec] PASS");
