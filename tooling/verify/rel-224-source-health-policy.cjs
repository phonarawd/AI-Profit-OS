/**
 * verify:rel-224-source-health-policy — real adapter health + version history
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

const svc = read("services/api-nest/src/admin-control/source-health.service.ts");
if (!svc.includes("AdaptersAdminService")) {
  fails.push("health must reuse AdaptersAdminService");
}
for (const st of ["UNKNOWN", "UNAVAILABLE", "HEALTHY", "DEGRADED", "FAILED"]) {
  if (!svc.includes(st)) fails.push(`missing health state ${st}`);
}
if (!svc.includes('"V1"') || !svc.includes('"V2"') || !svc.includes('"V3"')) {
  fails.push("policy versions V1/V2/V3 required");
}
if (!svc.includes("overwriteWithoutHistory: false")) {
  fails.push("history-less overwrite forbidden");
}
if (!svc.includes("FOUNDER_OVERRIDE_DENIED")) {
  fails.push("founder override must be role gated");
}
if (/100%|failureRate:\s*0/.test(svc)) {
  fails.push("must not manufacture healthy/0-failure metrics");
}

const ctrl = read(
  "services/api-nest/src/admin-control/source-health.admin.controller.ts",
);
if (!/@UseGuards\(AdminGuard\)/.test(ctrl)) {
  fails.push("source-health controller must use AdminGuard");
}

const page = read("apps/admin/app/admin/adapters/page.tsx");
if (!page.includes("/api/v1/admin/source-health")) {
  fails.push("adapters page must read source-health");
}

const pkg = read("package.json");
const catalog = read("tooling/verify/CATALOG.md");
if (!pkg.includes("verify:rel-224-source-health-policy")) {
  fails.push("package.json missing verify:rel-224-source-health-policy");
}
if (!catalog.includes("rel-224-source-health-policy")) {
  fails.push("CATALOG.md missing rel-224-source-health-policy");
}

if (fails.length) {
  console.error("[verify:rel-224-source-health-policy] FAIL");
  for (const f of fails) console.error(" -", f);
  process.exit(1);
}
console.log("[verify:rel-224-source-health-policy] PASS");
