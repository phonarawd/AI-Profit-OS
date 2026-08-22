/**
 * verify:rel-222-admin-ops-mode — 3-mode + confirm + no ledger
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

const svc = read("services/api-nest/src/admin-control/ops-mode.service.ts");
for (const needle of [
  "LIVE",
  "DRY_RUN",
  "SIMULATION",
  "LIVE_CONFIRM_REQUIRED",
  "userJwtIssued: false",
  "ledgerWrite: false",
]) {
  if (!svc.includes(needle)) fails.push(`ops-mode missing ${needle}`);
}
if (svc.includes("signUser") || svc.includes("USER_JWT")) {
  fails.push("preview-as-user must not issue user JWT");
}

const ctrl = read(
  "services/api-nest/src/admin-control/ops-mode.admin.controller.ts",
);
if (!/@UseGuards\(AdminGuard\)/.test(ctrl)) {
  fails.push("ops-mode controller must use AdminGuard");
}

const page = read("apps/admin/app/admin/system-control/page.tsx");
if (!page.includes("/api/v1/admin/ops/mode")) {
  fails.push("system-control must consume server ops mode");
}

const pkg = read("package.json");
const catalog = read("tooling/verify/CATALOG.md");
if (!pkg.includes("verify:rel-222-admin-ops-mode")) {
  fails.push("package.json missing verify:rel-222-admin-ops-mode");
}
if (!catalog.includes("rel-222-admin-ops-mode")) {
  fails.push("CATALOG.md missing rel-222-admin-ops-mode");
}

if (fails.length) {
  console.error("[verify:rel-222-admin-ops-mode] FAIL");
  for (const f of fails) console.error(" -", f);
  process.exit(1);
}
console.log("[verify:rel-222-admin-ops-mode] PASS");
