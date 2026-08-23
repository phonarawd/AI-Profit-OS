/**
 * verify:rel-402-dependency-audit
 * CI에 pnpm audit가 있고, 임계/예외가 숨김 없이 문서화돼 있는지 검사.
 * 로컬 풀 스캔은 AIPO_AUDIT=1 일 때만.
 */
const fs = require("fs");
const path = require("path");
const { loadSpec, runAudit } = require("../security/dependency-audit.cjs");

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

const spec = loadSpec();
const pkg = read("package.json");
const catalog = read("tooling/verify/CATALOG.md");
const gate = read(".github/workflows/gate.yml");
const exceptionsMd = read("governance/security/AUDIT_EXCEPTIONS.md");
const evidence = read("governance/release-master/REL-402-DEPENDENCY-AUDIT.md");

if (spec.rel !== "REL-402") fails.push("spec.rel must be REL-402");
if (spec.tool !== "pnpm audit") fails.push("spec.tool must be pnpm audit");
if (spec.localFullScan !== false) fails.push("localFullScan must be false");
if (spec.ciRequired !== true) fails.push("ciRequired must be true");
if (spec.ignoreRegistryErrors !== false) {
  fails.push("ignoreRegistryErrors must be false");
}
if (!(spec.allowedAuditLevels || []).includes(spec.auditLevel)) {
  fails.push("auditLevel must be high or critical");
}
if (spec.exceptionsFile !== "governance/security/AUDIT_EXCEPTIONS.md") {
  fails.push("exceptionsFile path lock");
}
if (!Array.isArray(spec.exceptions)) fails.push("exceptions must be an array");

const ghsa = /^GHSA-[a-z0-9]{4}-[a-z0-9]{4}-[a-z0-9]{4}$/;
for (const ex of spec.exceptions) {
  const id = String((ex && ex.id) || "");
  const reason = String((ex && ex.reason) || "").trim();
  if (!ghsa.test(id)) fails.push("exception id must be GHSA-*: " + id);
  if (reason.length < 10) fails.push("exception reason too short: " + id);
  if (!exceptionsMd.includes(id)) {
    fails.push("AUDIT_EXCEPTIONS.md must record " + id);
  }
}

if (!exceptionsMd.includes("EXCEPTIONS: " + spec.exceptions.length)) {
  fails.push("AUDIT_EXCEPTIONS.md EXCEPTIONS count must match spec");
}
if (!exceptionsMd.includes("HIDDEN_IGNORE: 0")) {
  fails.push("AUDIT_EXCEPTIONS.md must lock HIDDEN_IGNORE: 0");
}

let pkgJson = {};
try {
  pkgJson = JSON.parse(pkg || "{}");
} catch (err) {
  fails.push("package.json parse: " + err.message);
}
const auditCfg = pkgJson.pnpm && pkgJson.pnpm.auditConfig;
const hidden = [
  ...((auditCfg && auditCfg.ignoreCves) || []),
  ...((auditCfg && auditCfg.ignoreGhsas) || []),
];
const documented = new Set(spec.exceptions.map((ex) => ex.id));
for (const id of hidden) {
  if (!documented.has(id)) {
    fails.push("hidden package.json audit ignore: " + id);
  }
}

const workspace = read("pnpm-workspace.yaml");
if (/\baudit\s*:/.test(workspace) && /ignore\s*:/.test(workspace)) {
  fails.push("do not hide audit ignores in pnpm-workspace.yaml");
}

if (!pkg.includes("verify:rel-402-dependency-audit")) {
  fails.push("package.json missing verify:rel-402-dependency-audit");
}
if (!catalog.includes("rel-402-dependency-audit")) {
  fails.push("CATALOG missing rel-402-dependency-audit");
}
if (!gate.includes("AIPO_AUDIT")) {
  fails.push("gate.yml must set AIPO_AUDIT for the CI scan");
}
if (!gate.includes("verify:rel-402-dependency-audit")) {
  fails.push("gate.yml must run verify:rel-402-dependency-audit");
}
if (gate.includes("ignore-registry-errors")) {
  fails.push("gate.yml must not swallow registry audit errors");
}
if (!evidence.includes("STATUS = COMPLETED")) {
  fails.push("REL-402 evidence must be COMPLETED");
}

const runScan =
  process.env.AIPO_AUDIT === "1" || process.env.AIPO_AUDIT === "true";
if (runScan) {
  if (!runAudit({ spec })) {
    fails.push("pnpm audit failed at auditLevel=" + spec.auditLevel);
  }
}

if (fails.length) {
  console.error("[verify:rel-402-dependency-audit] FAIL");
  for (const f of fails) console.error(" -", f);
  process.exit(1);
}
console.log(
  runScan
    ? "[verify:rel-402-dependency-audit] PASS (CI scan)"
    : "[verify:rel-402-dependency-audit] PASS (wiring · local full scan skipped)",
);
