/**
 * verify:rel-502-final-engine-acceptance
 * FINAL_ACCEPTANCE는 QA0-QA9가 현재 protected scope에서 재실행된 뒤에만 발급한다.
 * 이 스크립트는 판정기다. STALE을 PASS로 바꾸지 않는다.
 */
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "../..");
const fails = [];
const notes = [];

function read(rel) {
  const p = path.join(root, rel);
  return fs.existsSync(p) ? fs.readFileSync(p, "utf8") : "";
}

const {
  readJson,
  buildManifest,
} = require(path.join(root, "tooling/engine-acceptance/lib/hash-scope.cjs"));

const plan = read(".cursor/plans/PUTDUK_RELEASE_MASTER.plan.md");
const psmIds = [];
for (const raw of plan.split(/```yaml/)) {
  const block = raw.split(/```/)[0];
  const id = (block.match(/^\s*ID: (REL-[A-Z0-9-]+)\s*$/m) || [])[1];
  if (!id) continue;
  if (/^\s*PROTECTED_SCOPE_MUTATION: true\s*$/m.test(block)) psmIds.push(id);
}

const uniquePsm = [...new Set(psmIds)];
if (!uniquePsm.length) fails.push("PSM=TRUE REL collection empty");
for (const required of [
  "REL-003",
  "REL-008",
  "REL-010",
  "REL-015",
  "REL-016",
  "REL-401",
  "REL-405",
  "REL-406",
  "REL-407",
  "REL-408",
  "REL-222",
  "REL-223",
  "REL-224",
]) {
  if (!uniquePsm.includes(required)) {
    fails.push(`PSM collector missed ${required}`);
  }
}

const pendingPsm = [];
for (const id of uniquePsm) {
  const todoId = id.toLowerCase();
  const fm = plan.match(
    new RegExp(`- id: ${todoId}\\r?\\n(?:    [^\\n]*\\r?\\n)*?    status: (\\w+)`),
  );
  if (!fm || fm[1] !== "completed") pendingPsm.push(`${id}:${fm ? fm[1] : "missing"}`);
}

const scope = readJson("governance/engine-acceptance/protected-scope.v1.json");
const baseline = readJson("governance/engine-acceptance/baseline.v1.json");
const live = buildManifest(scope);
const drifted =
  live.aggregate !== baseline.protected_scope_manifest.aggregate;

notes.push(`psm_true_count=${uniquePsm.length}`);
notes.push(`psm_pending=${pendingPsm.join(",") || "0"}`);
notes.push(`baseline_id=${baseline.id}`);
notes.push(`baseline_commit=${baseline.commit_sha}`);
notes.push(`baseline_aggregate=${baseline.protected_scope_manifest.aggregate}`);
notes.push(`live_aggregate=${live.aggregate}`);
notes.push(`live_pathCount=${live.pathCount}`);
notes.push(`drifted=${drifted}`);

if (pendingPsm.length) {
  notes.push(`PSM=TRUE incomplete: ${pendingPsm.join(",")}`);
}
if (!drifted) {
  notes.push("protected scope matches last baseline");
} else {
  notes.push("QA0-QA9 last epoch is STALE against current protected scope");
}

const cert = "governance/engine-acceptance/FINAL_ACCEPTANCE.md";
if (fs.existsSync(path.join(root, cert)) && drifted) {
  fails.push(
    "FINAL_ACCEPTANCE.md exists while QA0-QA9 have not been rebased on the current protected scope",
  );
}

const statusPath = path.join(
  root,
  "governance/release-master/REL-502-STATUS.md",
);
if (!fs.existsSync(statusPath)) {
  fails.push("missing governance/release-master/REL-502-STATUS.md");
} else {
  const status = read("governance/release-master/REL-502-STATUS.md");
  if (drifted && !/BLOCKED|STALE/.test(status)) {
    fails.push("REL-502-STATUS.md must remain BLOCKED/STALE until rebase");
  }
  if (drifted && /FINAL ENGINE ACCEPTANCE\s*=\s*PASS/.test(status)) {
    fails.push("do not claim FINAL ENGINE ACCEPTANCE PASS while stale");
  }
}

if (fails.length) {
  console.error("[verify:rel-502-final-engine-acceptance] FAIL");
  for (const n of notes) console.error(" -", n);
  for (const f of fails) console.error(" -", f);
  process.exit(1);
}

if (drifted) {
  console.log(
    "[verify:rel-502-final-engine-acceptance] BLOCKED (honest · no FINAL_ACCEPTANCE · QA epoch STALE)",
  );
  for (const n of notes) console.log(" -", n);
  process.exit(0);
}

console.log("[verify:rel-502-final-engine-acceptance] PASS");
for (const n of notes) console.log(" -", n);
