/**
 * verify:figma-project-registry — REL-009
 * Registry is committed. APPROVED_AUTHORITY stays 0. Home 46:2 is not authority.
 */
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "../..");
const fails = [];
const rel = "governance/figma/PUTDUK_FIGMA_PROJECT_REGISTRY.json";
const planRel = "governance/figma/TOKEN_SPARKDASH_COLLISION_PLAN.md";
const readerRel = "governance/figma/putduk-figma-registry.cjs";

function read(p) {
  return fs.readFileSync(path.join(root, p), "utf8");
}

for (const p of [rel, planRel, readerRel]) {
  if (!fs.existsSync(path.join(root, p))) fails.push(`missing: ${p}`);
}

if (fails.length) {
  console.error("[verify:figma-project-registry] FAIL\n- " + fails.join("\n- "));
  process.exit(1);
}

const registry = JSON.parse(read(rel));
const requiredNodeIds = {
  home_desktop_backup: "46:2",
  home_mobile_review: "72:762",
  opportunities_desktop: "76:2",
  opportunities_mobile: "116:28",
  opportunities_mobile_empty: "122:34",
  opportunity_room_desktop: "96:2",
  opportunity_room_mobile: "104:43",
  opportunity_room_mobile_scroll: "109:28",
  participate_confirmation_desktop: "103:315",
  execution_desktop_running: "155:222",
  execution_mobile_running: "140:34",
  execution_mobile_requeue: "140:142",
  execution_mobile_success: "140:250",
  execution_mobile_safestop: "140:358",
};

if (registry.fileKey !== "w7Yg8j2x9evuheOSSLqFw5") {
  fails.push("fileKey must stay w7Yg8j2x9evuheOSSLqFw5 (no re-request)");
}
if (registry.approvedAuthority !== 0) {
  fails.push("APPROVED_AUTHORITY must stay 0");
}
if (registry.home && registry.home.home_46_2_is_authority !== false) {
  fails.push("Home 46:2 must not be authority");
}
if (registry.codeConnect && registry.codeConnect.applied !== 0) {
  fails.push("Code Connect applied must stay 0");
}

const dumped = JSON.stringify(registry);
if (/"classification"\s*:\s*"APPROVED"/.test(dumped) || /"authority"\s*:\s*true/.test(dumped)) {
  fails.push("EXIT_GATE: forged APPROVED/authority=true frame");
}

for (const [key, nodeId] of Object.entries(requiredNodeIds)) {
  const frame = registry.candidateFrames && registry.candidateFrames[key];
  if (!frame || frame.nodeId !== nodeId) {
    fails.push(`missing/wrong node-id ${key} want ${nodeId}`);
  }
  if (frame && frame.authority === true) {
    fails.push(`${key} must not have authority`);
  }
  if (frame && frame.classification === "APPROVED") {
    fails.push(`${key} forged APPROVED`);
  }
}

const homeBackup = registry.candidateFrames.home_desktop_backup;
if (homeBackup.classification !== "BACKUP") {
  fails.push("46:2 must remain BACKUP");
}

const reader = require(path.join(root, readerRel));
if (reader.fileKey !== registry.fileKey) {
  fails.push("putduk-figma-registry.cjs must export the JSON registry");
}

const plan = read(planRel);
if (!plan.includes("APPLY_NOW = 0")) {
  fails.push("collision plan must remain APPLY_NOW = 0");
}
if (!plan.includes("HOME_RETROACTIVE_VISUAL_REDESIGN = NO")) {
  fails.push("collision plan must keep Home freeze");
}

const pkg = read("package.json");
const catalog = read("tooling/verify/CATALOG.md");
const domain = read("tooling/verify/domain-by-path.cjs");
if (!pkg.includes('"verify:figma-project-registry"')) {
  fails.push("package.json missing verify:figma-project-registry");
}
if (!catalog.includes("figma-project-registry")) {
  fails.push("CATALOG.md must list figma-project-registry");
}
if (!domain.includes("figma-project-registry.cjs")) {
  fails.push("domain-by-path must trigger figma-project-registry");
}

const homeFiles = [
  "apps/web/components/spark-dash-home/HomeDesktop.tsx",
  "apps/web/components/spark-dash-home/HomeMobile.tsx",
  "apps/web/components/spark-dash-home/spark-dash-home.css",
  "apps/web/components/spark-dash-home/spark-dash-mobile.css",
];
for (const f of homeFiles) {
  const r = require("child_process").spawnSync(
    "git",
    ["diff", "--name-only", "HEAD", "--", f],
    { cwd: root, encoding: "utf8" },
  );
  if ((r.stdout || "").trim()) {
    fails.push(`Home freeze touched: ${f}`);
  }
}

if (fails.length) {
  console.error("[verify:figma-project-registry] FAIL\n- " + fails.join("\n- "));
  process.exit(1);
}

console.log(
  "[verify:figma-project-registry] PASS (fileKey locked · APPROVED=0 · 46:2 BACKUP · Home freeze 0 · Code Connect candidate-only)",
);
