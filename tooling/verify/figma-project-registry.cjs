/**
 * verify:figma-project-registry — REL-009 + REL-131 lock
 * fileKey stays locked. Home 46:2 is not authority.
 * Only Founder-approved Account Hub frames may have authority.
 */
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "../..");
const fails = [];
const rel = "governance/figma/PUTDUK_FIGMA_PROJECT_REGISTRY.json";
const planRel = "governance/figma/TOKEN_SPARKDASH_COLLISION_PLAN.md";
const readerRel = "governance/figma/putduk-figma-registry.cjs";
const approvalRel =
  "governance/release-master/rel-131-account-figma-final/FOUNDER_APPROVAL.md";
const closeRel = "governance/release-master/REL-131-ACCOUNT-HUB-FIGMA.md";

const FOUNDER_APPROVED_LOCKED = {
  account_hub_desktop: "192:194",
  account_hub_mobile: "192:434",
};

const PRESERVED_SUPERSEDED = {
  account_hub_desktop_v1: "169:78",
  account_hub_mobile_v1: "169:288",
  account_hub_desktop_v2: "180:102",
  account_hub_mobile_v2: "180:430",
};

function read(p) {
  return fs.readFileSync(path.join(root, p), "utf8");
}

for (const p of [rel, planRel, readerRel, approvalRel, closeRel]) {
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
if (registry.approvedAuthority !== 2) {
  fails.push(
    "approvedAuthority must be 2 (REL-131 Desktop 192:194 + Mobile 192:434)",
  );
}
if (registry.home && registry.home.home_46_2_is_authority !== false) {
  fails.push("Home 46:2 must not be authority");
}
if (registry.codeConnect && registry.codeConnect.applied !== 0) {
  fails.push("Code Connect applied must stay 0");
}

for (const [key, nodeId] of Object.entries(requiredNodeIds)) {
  const frame = registry.candidateFrames && registry.candidateFrames[key];
  if (!frame || frame.nodeId !== nodeId) {
    fails.push(`missing/wrong node-id ${key} want ${nodeId}`);
  }
  if (frame && frame.authority === true) {
    fails.push(`${key} must not have authority`);
  }
  if (
    frame &&
    (frame.classification === "APPROVED" ||
      frame.classification === "FOUNDER_APPROVED_LOCKED")
  ) {
    fails.push(`${key} forged approval`);
  }
}

const homeBackup = registry.candidateFrames.home_desktop_backup;
if (homeBackup.classification !== "BACKUP") {
  fails.push("46:2 must remain BACKUP");
}

for (const [key, nodeId] of Object.entries(FOUNDER_APPROVED_LOCKED)) {
  const frame = registry.candidateFrames && registry.candidateFrames[key];
  if (!frame) {
    fails.push(`missing approved frame ${key}`);
    continue;
  }
  if (frame.nodeId !== nodeId) {
    fails.push(`${key} nodeId must stay ${nodeId}`);
  }
  if (frame.classification !== "FOUNDER_APPROVED_LOCKED") {
    fails.push(`${key} classification must be FOUNDER_APPROVED_LOCKED`);
  }
  if (frame.authority !== true) {
    fails.push(`${key} authority must be true`);
  }
  if (frame.locked !== true) {
    fails.push(`${key} locked must be true`);
  }
  if (frame.founderApproved !== true) {
    fails.push(`${key} founderApproved must be true`);
  }
}

for (const [key, nodeId] of Object.entries(PRESERVED_SUPERSEDED)) {
  const frame = registry.candidateFrames && registry.candidateFrames[key];
  if (!frame) {
    fails.push(`V1/V2 history missing: ${key}`);
    continue;
  }
  if (frame.nodeId !== nodeId) {
    fails.push(`${key} must stay ${nodeId}`);
  }
  if (frame.classification !== "SUPERSEDED") {
    fails.push(`${key} must remain SUPERSEDED`);
  }
  if (frame.authority === true) {
    fails.push(`${key} must not have authority`);
  }
}

for (const [key, frame] of Object.entries(registry.candidateFrames || {})) {
  if (FOUNDER_APPROVED_LOCKED[key]) continue;
  if (frame.authority === true) {
    fails.push(`EXIT_GATE: forged authority on ${key}`);
  }
  if (
    frame.classification === "APPROVED" ||
    frame.classification === "FOUNDER_APPROVED_LOCKED"
  ) {
    fails.push(`EXIT_GATE: forged approval on ${key}`);
  }
}

const rel131 = (registry.screenBindings || []).find((b) => b.rel === "REL-131");
if (!rel131) {
  fails.push("REL-131 screenBinding missing");
} else {
  if (rel131.apply !== false) {
    fails.push("REL-131 apply must stay false (lock ≠ production apply)");
  }
  if (rel131.status !== "FOUNDER_APPROVED_LOCKED") {
    fails.push("REL-131 screenBinding status must be FOUNDER_APPROVED_LOCKED");
  }
  const keys = rel131.frameKeys || [];
  if (
    !keys.includes("account_hub_desktop") ||
    !keys.includes("account_hub_mobile")
  ) {
    fails.push("REL-131 frameKeys must be account_hub_desktop + account_hub_mobile");
  }
}

const approval = read(approvalRel);
for (const needle of [
  "192:194",
  "192:434",
  "FOUNDER_APPROVED = YES",
  "LOCK_STATUS = LOCKED",
  "169:78",
  "169:288",
  "180:102",
  "180:430",
  "REL_132_STARTED = NO",
]) {
  if (!approval.includes(needle)) {
    fails.push(`FOUNDER_APPROVAL.md missing ${needle}`);
  }
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
  "[verify:figma-project-registry] PASS (fileKey locked · REL-131 192:194/192:434 FOUNDER_APPROVED_LOCKED · V1/V2 preserved · other frames candidate · 46:2 BACKUP · apply 0)",
);
