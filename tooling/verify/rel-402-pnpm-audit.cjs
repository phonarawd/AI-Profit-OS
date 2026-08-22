/**
 * verify:rel-402-pnpm-audit — CI wiring. Local full scan is not forced.
 */
const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const root = path.resolve(__dirname, "../..");
const fails = [];
const full =
  process.argv.includes("--full") ||
  process.env.CI === "true" ||
  process.env.PNPM_AUDIT_FULL === "1";

function read(rel) {
  const p = path.join(root, rel);
  if (!fs.existsSync(p)) {
    fails.push(`missing: ${rel}`);
    return "";
  }
  return fs.readFileSync(p, "utf8");
}

const gate = read(".github/workflows/gate.yml");
const exceptionsRel = "governance/security/pnpm-audit-exceptions.json";
const exceptionsRaw = read(exceptionsRel);
const pkg = read("package.json");
const catalog = read("tooling/verify/CATALOG.md");

if (!gate.includes("verify:rel-402-pnpm-audit")) {
  fails.push("gate.yml must run verify:rel-402-pnpm-audit");
}
if (!pkg.includes("verify:rel-402-pnpm-audit")) {
  fails.push("package.json missing verify:rel-402-pnpm-audit");
}
if (!catalog.includes("rel-402-pnpm-audit")) {
  fails.push("CATALOG.md missing rel-402-pnpm-audit");
}

let exceptions;
try {
  exceptions = JSON.parse(exceptionsRaw || "{}");
} catch {
  fails.push("pnpm-audit-exceptions.json must be JSON");
  exceptions = { exceptions: [] };
}
if (!Array.isArray(exceptions.exceptions)) {
  fails.push("exceptions array required");
}
for (const item of exceptions.exceptions || []) {
  if (!item || typeof item !== "object") {
    fails.push("exception entries must be objects");
    continue;
  }
  if (!item.id || !item.reason || !item.expires) {
    fails.push(`exception missing id/reason/expires: ${JSON.stringify(item)}`);
  }
}

if (full && fails.length === 0) {
  const result = spawnSync(
    process.platform === "win32" ? "pnpm.cmd" : "pnpm",
    ["audit", "--audit-level", "high", "--json"],
    { cwd: root, encoding: "utf8", timeout: 120000 },
  );
  let report = {};
  try {
    report = JSON.parse(result.stdout || "{}");
  } catch {
    if (result.status !== 0) {
      fails.push("pnpm audit JSON parse failed");
    }
  }
  const advisories = report.advisories
    ? Object.values(report.advisories)
    : Array.isArray(report.vulnerabilities)
      ? Object.values(report.vulnerabilities)
      : [];
  const allowed = new Set(
    (exceptions.exceptions || []).map((item) => String(item.id)),
  );
  for (const adv of advisories) {
    const id = String(adv.id ?? adv.github_advisory_id ?? adv.ghadvisory ?? "");
    const severity = String(adv.severity || "").toLowerCase();
    if (severity !== "high" && severity !== "critical") continue;
    if (id && allowed.has(id)) continue;
    fails.push(
      `unexcepted ${severity} advisory ${id || "unknown"} ${adv.title || adv.name || ""}`.trim(),
    );
  }
}

if (fails.length) {
  console.error("[verify:rel-402-pnpm-audit] FAIL");
  for (const f of fails) console.error(" -", f);
  process.exit(1);
}
console.log(
  full
    ? "[verify:rel-402-pnpm-audit] PASS (CI/full)"
    : "[verify:rel-402-pnpm-audit] PASS (wiring · local full scan not forced)",
);
