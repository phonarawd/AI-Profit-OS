/**
 * verify:rel-503-protected-scope-watch
 * ISSUED 이후 1파일 overlay 가 STALE 을 만드는지 기계 확인.
 * 제품 파일 기록 0. 은폐 금지.
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
  read("tooling/verify/fixtures/rel-503-protected-scope-watch.v1.json") || "{}",
);
const plan = read(".cursor/plans/PUTDUK_RELEASE_MASTER.plan.md");
const doc = read("governance/engine-acceptance/PROTECTED_SCOPE_STALE_WATCH.md");
const cert = read("governance/engine-acceptance/FINAL_ACCEPTANCE.md");
const pkg = read("package.json");
const catalog = read("tooling/verify/CATALOG.md");
const gate = read(".github/workflows/gate.yml");
const domain = read("tooling/verify/domain-by-path.cjs");
const watchSrc = read("tooling/engine-acceptance/protected-scope-watch.cjs");

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
  return /STATUS:\s*COMPLETED/.test(plan.slice(idx, idx + 240));
}

if (fixture.concealmentForbidden !== true) {
  fails.push("fixture concealmentForbidden must be true");
}
if (fixture.simulateOneFileChange !== true) {
  fails.push("fixture simulateOneFileChange must be true");
}
if (fixture.issuedMustStaleOnSimulatedChange !== true) {
  fails.push("fixture issuedMustStaleOnSimulatedChange must be true");
}
if (fixture.protectedScopeMutation !== false) {
  fails.push("REL-503 must stay non-PSM");
}

for (const dep of fixture.deps || []) {
  if (!todoCompleted(dep)) fails.push("EXIT_GATE: plan todo not completed " + dep);
  if (!yamlCompleted(dep)) fails.push("EXIT_GATE: YAML STATUS not COMPLETED " + dep);
}

for (const needle of [
  "STATUS = COMPLETED",
  "CONCEALMENT = FORBIDDEN",
  "SIMULATED_ONE_FILE_CHANGE = STALE",
  "LIVE_PRODUCT_MUTATION = 0",
  "REL-502_REBASE",
]) {
  if (!doc.includes(needle)) fails.push("stale-watch doc missing " + needle);
}

if (!watchSrc.includes("evaluateSimulatedOneFileChange")) {
  fails.push("watch script must export simulated one-file change");
}
if (!watchSrc.includes("concealment_forbidden")) {
  fails.push("watch script must declare concealment forbidden");
}

if (!pkg.includes("verify:rel-503-protected-scope-watch")) {
  fails.push("package.json missing verify:rel-503-protected-scope-watch");
}
if (!catalog.includes("rel-503-protected-scope-watch")) {
  fails.push("CATALOG missing rel-503-protected-scope-watch");
}
if (!gate.includes("verify:rel-503-protected-scope-watch")) {
  fails.push("gate.yml must run verify:rel-503-protected-scope-watch");
}
if (!domain.includes("rel-503-protected-scope-watch.cjs")) {
  fails.push("domain-by-path must trigger rel-503");
}

let watch;
try {
  watch = require("../engine-acceptance/protected-scope-watch.cjs");
} catch (err) {
  fails.push("watch load: " + String(err.message || err));
}

if (watch) {
  const live = watch.evaluateLive(root);
  if (live.concealment_forbidden !== true) {
    fails.push("live watch must set concealment_forbidden");
  }
  if (live.simulated !== false) fails.push("live watch must not be simulated");
  if (live.watch_status === "STALE") {
    fails.push("live ISSUED cert is STALE — concealment forbidden, rebase required");
  }

  const sim = watch.evaluateSimulatedOneFileChange(root);
  if (sim.simulated !== true) fails.push("simulated watch must set simulated=true");
  if (!sim.simulated_path) fails.push("simulated watch must name the overlay path");
  if (sim.changed_path_count !== 1) {
    fails.push("simulated change must be exactly 1 path");
  }
  const certIssued =
    /STATUS = ISSUED/.test(cert) && /CERT_ISSUED = 1/.test(cert);
  if (certIssued && sim.watch_status !== "STALE") {
    fails.push(
      "intentional 1-file change must make ISSUED cert STALE, got " +
        sim.watch_status,
    );
  }
  if (sim.watch_status === "CURRENT" && sim.drift === true) {
    fails.push("concealment: CURRENT while simulated drift");
  }
  if (sim.next !== "REL-502_REBASE" && sim.watch_status === "STALE") {
    fails.push("STALE next must be REL-502_REBASE");
  }
}

if (fails.length) {
  console.error("[verify:rel-503-protected-scope-watch] FAIL");
  for (const f of fails) console.error(" - " + f);
  process.exit(1);
}
console.log(
  "[verify:rel-503-protected-scope-watch] PASS (live CURRENT · simulated 1-file STALE · concealment 0)",
);
