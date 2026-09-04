/**
 * verify:rel-505-r7-backend-alignment
 * R7 대조 완료. CERT_ISSUED=1 금지(open conflict). apply 0. protected mutation 0.
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
  read("tooling/verify/fixtures/rel-505-r7-backend-alignment.v1.json") || "{}",
);
const plan = read(".cursor/plans/PUTDUK_RELEASE_MASTER.plan.md");
const cert = read("governance/release-master/R7_BACKEND_ALIGNMENT.md");
const pkg = read("package.json");
const catalog = read("tooling/verify/CATALOG.md");
const gate = read(".github/workflows/gate.yml");
const domain = read("tooling/verify/domain-by-path.cjs");

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

if (fixture.applyMigration !== 0) fails.push("applyMigration must be 0");
if (fixture.additiveRel !== "REL-508") fails.push("additiveRel must be REL-508");

const rebaseRequired = /REBASE_REQUIRED = 1/.test(
  read("governance/engine-acceptance/FINAL_ACCEPTANCE.md"),
);
for (const dep of fixture.deps || []) {
  if (dep === "REL-502" && rebaseRequired) continue;
  if (!todoCompleted(dep)) fails.push("EXIT_GATE: plan todo not completed " + dep);
  if (yamlStatus(dep) !== "COMPLETED") fails.push("EXIT_GATE: YAML not COMPLETED " + dep);
}

if (!todoCompleted("REL-505")) fails.push("rel-505 todo must be completed");
if (yamlStatus("REL-505") !== "COMPLETED") fails.push("REL-505 YAML must be COMPLETED");
if (yamlStatus("REL-508") !== "COMPLETED") fails.push("REL-508 YAML must be COMPLETED after Nest wire");
if (!todoCompleted("REL-508")) fails.push("rel-508 todo must be completed after Nest wire");

if (rebaseRequired) {
  if (fixture.certIssued !== 0) fails.push("fixture certIssued must be 0 while REL-502 rebase is required");
  if (!cert.includes("CERT_ISSUED = 0")) fails.push("R7 issuance must be revoked while REL-502 is NOT_ISSUED");
  if (!cert.includes("STALE_PENDING_REBASE = 1")) fails.push("R7 must stay stale while REL-502 rebase is pending");
} else {
  if (fixture.certIssued !== 1) fails.push("fixture certIssued must be 1 after REL-502 ISSUED");
  if (!cert.includes("CERT_ISSUED = 1") || cert.includes("CERT_ISSUED = 0")) {
    fails.push("R7 must be CERT_ISSUED=1 after REL-502 current-epoch ISSUED");
  }
  if (!cert.includes("STALE_PENDING_REBASE = 0")) {
    fails.push("R7 STALE_PENDING_REBASE must clear after current-epoch ISSUED");
  }
}
if (!cert.includes("OPEN_CONFLICT = 0")) {
  fails.push("current-fx conflict must be closed (not footnoted)");
}

if (!pkg.includes("verify:backend-data-alignment")) {
  fails.push("package.json missing verify:backend-data-alignment");
}
if (!pkg.includes("verify:rel-505-r7-backend-alignment")) {
  fails.push("package.json missing verify:rel-505-r7-backend-alignment");
}
if (!catalog.includes("backend-data-alignment") || !catalog.includes("rel-505-r7-backend-alignment")) {
  fails.push("CATALOG missing R7 verifies");
}
if (!gate.includes("verify:rel-505-r7-backend-alignment")) {
  fails.push("gate.yml must run verify:rel-505-r7-backend-alignment");
}
if (!domain.includes("rel-505-r7-backend-alignment.cjs")) {
  fails.push("domain-by-path must trigger rel-505");
}

if (fails.length === 0) {
  const run = spawnSync(
    process.execPath,
    [path.join(root, "tooling/verify/backend-data-alignment.cjs")],
    { cwd: root, encoding: "utf8", timeout: 180_000 },
  );
  if (run.status !== 0) {
    fails.push(
      "backend-data-alignment FAIL: " +
        String(run.stderr || run.stdout || "").split("\n")[0],
    );
  }
}

if (fails.length) {
  console.error("[verify:rel-505-r7-backend-alignment] FAIL");
  for (const f of fails) console.error(" - " + f);
  process.exit(1);
}
console.log(
  "[verify:rel-505-r7-backend-alignment] PASS (table · current-fx wired · Engine issuance mirrored fail-closed)",
);
