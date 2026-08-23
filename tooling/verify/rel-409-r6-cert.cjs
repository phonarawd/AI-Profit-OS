/**
 * verify:rel-409-r6-cert
 * 12모듈+2b 전수. 의존 REL 미완료면 인증 금지.
 * 각 모듈 verify를 실제로 재실행한다. MCP-only 0.
 */
const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

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
  read("tooling/verify/fixtures/rel-409-r6-cert.v1.json") || "{}",
);
const plan = read(".cursor/plans/PUTDUK_RELEASE_MASTER.plan.md");
const routes = read("apps/admin/routes.ts");
const cert = read("governance/admin/R6_CERTIFICATION.md");

if (fixture.topLevel !== 12) fails.push("fixture topLevel must be 12");
if (fixture.child2b !== true) fails.push("fixture must require 2b");
if (fixture.sidebar13 !== 0) fails.push("sidebar13 must be 0");
if (!/ADMIN_TOP_LEVEL_COUNT\s*=\s*12/.test(routes)) {
  fails.push("ADMIN_TOP_LEVEL_COUNT must be 12");
}
if (!routes.includes('id: "2b"') || !routes.includes("/admin/execution-policy")) {
  fails.push("2b execution-policy child missing");
}
if (/id: 13/.test(routes)) fails.push("13th sidebar module forbidden");

const webAdmin = path.join(root, "apps/web/app/admin");
if (fs.existsSync(webAdmin)) fails.push("apps/web must not grow /admin");

// R6 known-severity budget is the admin cert + fixture, not the live
// engine-acceptance discovery ledger. QA4/QA5/QA8 must be allowed to
// record P1s during REL-502 without revoking an already-issued admin R6.
for (const sev of ["p0", "p1", "p2", "p3"]) {
  if (Number(fixture[sev]) !== 0) {
    fails.push("fixture " + sev + " budget must be 0");
  }
}

function todoCompleted(relId) {
  const id = relId.replace(/^REL-/i, "rel-").toLowerCase();
  const re = new RegExp(
    "- id: " + id + "\\r?\\n(?:.*\\r?\\n){0,3}\\s*status: (\\w+)",
  );
  const m = plan.match(re);
  return m && m[1] === "completed";
}

function yamlCompleted(relId) {
  const idx = plan.indexOf("ID: " + relId);
  if (idx < 0) return false;
  const slice = plan.slice(idx, idx + 240);
  return /STATUS:\s*COMPLETED/.test(slice);
}

for (const dep of fixture.deps || []) {
  if (!todoCompleted(dep)) {
    fails.push("EXIT_GATE: plan todo not completed " + dep);
  }
  if (!yamlCompleted(dep)) {
    fails.push("EXIT_GATE: YAML STATUS not COMPLETED " + dep);
  }
}

const modules = fixture.modules || [];
if (modules.length !== 13) {
  fails.push("must certify 12 modules + 2b (13 rows), got " + modules.length);
}
for (const mod of modules) {
  if (!routes.includes('"' + mod.href + '"')) {
    fails.push("routes missing " + mod.href);
  }
  if (!fs.existsSync(path.join(root, mod.page))) {
    fails.push("missing page " + mod.page);
  }
  if (!fs.existsSync(path.join(root, "tooling/verify", mod.verify))) {
    fails.push("missing verify " + mod.verify);
  }
}

const pkg = read("package.json");
const catalog = read("tooling/verify/CATALOG.md");
const gate = read(".github/workflows/gate.yml");
if (!pkg.includes("verify:rel-409-r6-cert")) {
  fails.push("package.json missing verify:rel-409-r6-cert");
}
if (!catalog.includes("rel-409-r6-cert")) {
  fails.push("CATALOG missing rel-409-r6-cert");
}
if (!gate.includes("verify:rel-409-r6-cert")) {
  fails.push("gate.yml must run verify:rel-409-r6-cert");
}
for (const needle of [
  "STATUS = COMPLETED",
  "MODULES = 12",
  "CHILD_2B = 1",
  "SIDEBAR_13 = 0",
  "KNOWN_P0 = 0",
  "KNOWN_P1 = 0",
  "KNOWN_P2 = 0",
  "KNOWN_P3 = 0",
  "EXIT_GATE",
]) {
  if (!cert.includes(needle)) fails.push("R6 cert missing " + needle);
}

const scripts = new Set();
for (const mod of modules) scripts.add(mod.verify);
for (const extra of fixture.extraVerifies || []) scripts.add(extra);

if (fails.length === 0) {
  for (const script of scripts) {
    const abs = path.join(root, "tooling/verify", script);
    const run = spawnSync(process.execPath, [abs], {
      cwd: root,
      encoding: "utf8",
      timeout: 60_000,
    });
    if (run.status !== 0) {
      fails.push(
        "re-run FAIL " +
          script +
          ": " +
          String(run.stderr || run.stdout || "").split("\n")[0],
      );
    }
  }
}

if (fails.length) {
  console.error("[verify:rel-409-r6-cert] FAIL");
  for (const f of fails) console.error(" - " + f);
  process.exit(1);
}
console.log(
  "[verify:rel-409-r6-cert] PASS (12+2b · deps completed · verifies re-run · admin KNOWN_P0-P3 0)",
);
