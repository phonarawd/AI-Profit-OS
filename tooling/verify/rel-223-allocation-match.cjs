/**
 * verify:rel-223-allocation-match — whitelist verbs + preview + no ledger
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

const svc = read("services/api-nest/src/admin-control/allocation.service.ts");
for (const verb of ["ALLOW", "BLOCK", "PAUSE", "CANCEL", "REASSIGN"]) {
  if (!svc.includes(`"${verb}"`)) fails.push(`missing verb ${verb}`);
}
for (const needle of [
  "PREVIEW_CONFIRM_REQUIRED",
  "VERB_FORBIDDEN",
  "BALANCE_UPDATE",
  "allSucceeded",
  "ledgerWrite: false",
  "BATCH_LIMIT",
]) {
  if (!svc.includes(needle)) fails.push(`allocation missing ${needle}`);
}
if (svc.includes("class MatchResult") || svc.includes("SECOND_MATCH")) {
  fails.push("must not create a second match owner");
}

const ctrl = read(
  "services/api-nest/src/admin-control/allocation.admin.controller.ts",
);
if (!/@UseGuards\(AdminGuard\)/.test(ctrl)) {
  fails.push("allocation controller must use AdminGuard");
}

const page = read("apps/admin/app/admin/opportunities/page.tsx");
if (!page.includes("/api/v1/admin/allocation/preview")) {
  fails.push("opportunities allocation tab must call preview");
}

const pkg = read("package.json");
const catalog = read("tooling/verify/CATALOG.md");
if (!pkg.includes("verify:rel-223-allocation-match")) {
  fails.push("package.json missing verify:rel-223-allocation-match");
}
if (!catalog.includes("rel-223-allocation-match")) {
  fails.push("CATALOG.md missing rel-223-allocation-match");
}

if (fails.length) {
  console.error("[verify:rel-223-allocation-match] FAIL");
  for (const f of fails) console.error(" -", f);
  process.exit(1);
}
console.log("[verify:rel-223-allocation-match] PASS");
