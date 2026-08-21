/**
 * verify:figma-code-bridge — Spark Dash Figma ↔ production path map
 * Visual quality is NOT declared PASS by this script.
 * FOUNDER_REVIEW_CANDIDATE must never be treated as APPROVED.
 */
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "../..");
const fails = [];

function read(rel) {
  const p = path.join(root, rel);
  if (!fs.existsSync(p)) {
    fails.push(`missing ${rel}`);
    return null;
  }
  return fs.readFileSync(p, "utf8");
}

const registryRel = "governance/figma/PUTDUK_FIGMA_PROJECT_REGISTRY.json";
const bridgeRel = "governance/figma/PUTDUK_DESIGN_SYSTEM_CODE_BRIDGE.json";
const bridgeMdRel = "governance/figma/PUTDUK_DESIGN_SYSTEM_CODE_BRIDGE.md";
const connectRel = "governance/figma/PUTDUK_CODE_CONNECT_CANDIDATES.json";
const evidenceDir = "governance/figma/evidence/auth-founder-review-candidate";

for (const rel of [registryRel, bridgeRel, bridgeMdRel, connectRel]) {
  if (!fs.existsSync(path.join(root, rel))) fails.push(`missing: ${rel}`);
}

if (fails.length) {
  console.error("[verify:figma-code-bridge] FAIL\n- " + fails.join("\n- "));
  process.exit(1);
}

const registry = JSON.parse(read(registryRel));
const bridge = JSON.parse(read(bridgeRel));
const connect = JSON.parse(read(connectRel));
const NODE_RE = /^\d+:\d+$/;

const AUTH_FRAMES = [
  "auth_login_desktop",
  "auth_login_mobile",
  "auth_signup_desktop",
  "auth_signup_mobile",
  "auth_complete_profile_desktop",
  "auth_complete_profile_mobile",
  "auth_onboarding_desktop",
  "auth_onboarding_mobile",
  "auth_flow",
  "auth_handoff",
];

const LOCKED = {
  account_hub_desktop: "192:194",
  account_hub_mobile: "192:434",
};

if (registry.fileKey !== "w7Yg8j2x9evuheOSSLqFw5") {
  fails.push("fileKey must stay w7Yg8j2x9evuheOSSLqFw5");
}
if (registry.approvedAuthority !== 2) {
  fails.push("approvedAuthority must stay 2");
}
if (!registry.codeConnect || registry.codeConnect.applied !== 0) {
  fails.push("Code Connect applied must stay 0");
}
if (registry.codeConnect.status !== "CANDIDATE_ONLY") {
  fails.push("codeConnect.status must stay CANDIDATE_ONLY");
}
if (connect.applied !== 0 || connect.status !== "CANDIDATE_ONLY") {
  fails.push("PUTDUK_CODE_CONNECT_CANDIDATES must stay CANDIDATE_ONLY / applied 0");
}
if (bridge.codeConnect.applied !== 0 || bridge.productionAuthVisualApply !== 0) {
  fails.push("bridge must keep Code Connect + production auth apply at 0");
}
if (bridge.rel207Started !== false) {
  fails.push("REL-207 must not be marked started");
}

for (const key of AUTH_FRAMES) {
  const frame = registry.candidateFrames && registry.candidateFrames[key];
  if (!frame) {
    fails.push(`missing auth candidate ${key}`);
    continue;
  }
  if (!NODE_RE.test(frame.nodeId)) {
    fails.push(`${key} invented/invalid nodeId ${frame.nodeId}`);
  }
  if (frame.classification !== "FOUNDER_REVIEW_CANDIDATE") {
    fails.push(`${key} must stay FOUNDER_REVIEW_CANDIDATE`);
  }
  if (frame.authority === true || frame.founderApproved === true || frame.locked === true) {
    fails.push(`${key} forged approval/lock`);
  }
}

for (const [key, nodeId] of Object.entries(LOCKED)) {
  const frame = registry.candidateFrames[key];
  if (!frame || frame.nodeId !== nodeId || frame.classification !== "FOUNDER_APPROVED_LOCKED") {
    fails.push(`Account Hub lock drifted: ${key}`);
  }
}

const home = registry.candidateFrames.home_desktop_backup;
if (!home || home.nodeId !== "46:2" || home.classification !== "BACKUP") {
  fails.push("Home 46:2 BACKUP drifted");
}

const seen = new Set();
for (const row of bridge.rows || []) {
  if (!row.figmaNodeId || !NODE_RE.test(row.figmaNodeId)) {
    fails.push(`bridge invented nodeId: ${row.figmaComponent}`);
  }
  if (seen.has(row.figmaNodeId + ":" + row.productionPath)) {
    fails.push(`duplicate bridge row ${row.figmaNodeId}`);
  }
  seen.add(row.figmaNodeId + ":" + row.productionPath);
  if (!row.productionPath || !fs.existsSync(path.join(root, row.productionPath))) {
    fails.push(`mapped production path missing: ${row.productionPath}`);
  }
  if (row.status === "APPROVED" || row.status === "FOUNDER_APPROVED_LOCKED") {
    fails.push(`bridge forged approval on ${row.figmaComponent}`);
  }
}

for (const item of connect.candidates || []) {
  if (!NODE_RE.test(item.figmaNodeId)) {
    fails.push(`code-connect candidate invented nodeId ${item.figmaComponent}`);
  }
  if (item.codePath && !fs.existsSync(path.join(root, item.codePath))) {
    fails.push(`code-connect path missing: ${item.codePath}`);
  }
}

const evidenceFiles = [
  "login-desktop.png",
  "login-mobile.png",
  "signup-desktop.png",
  "signup-mobile.png",
  "complete-profile-desktop.png",
  "complete-profile-mobile.png",
  "onboarding-desktop.png",
  "onboarding-mobile.png",
  "auth-flow.png",
];
for (const name of evidenceFiles) {
  const p = path.join(root, evidenceDir, name);
  if (!fs.existsSync(p) || fs.statSync(p).size < 1000) {
    fails.push(`evidence missing/too small: ${name}`);
  }
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
  if ((r.stdout || "").trim()) fails.push(`Home freeze touched: ${f}`);
}

const authBehavior = [
  "packages/ui/components/auth/AuthLogin.tsx",
  "packages/ui/components/auth/AuthSignup.tsx",
  "packages/ui/components/auth/AuthCompleteProfile.tsx",
  "apps/web/app/auth/login/LoginRuntime.tsx",
  "apps/web/app/auth/signup/SignupRuntime.tsx",
  "apps/web/app/auth/complete-profile/CompleteProfileRuntime.tsx",
  "packages/ui/components/onboarding/OnboardingFlow.tsx",
];
for (const f of authBehavior) {
  const r = require("child_process").spawnSync(
    "git",
    ["diff", "--name-only", "HEAD", "--", f],
    { cwd: root, encoding: "utf8" },
  );
  if ((r.stdout || "").trim()) {
    fails.push(`auth behavior mutated (visual apply leak): ${f}`);
  }
}

const md = read(bridgeMdRel);
for (const needle of [
  "FOUNDER_REVIEW_CANDIDATE",
  "CODE_CONNECT = CANDIDATE_ONLY",
  "B_complete ≠ verified",
  "REL_207_STARTED = NO",
]) {
  if (!md.includes(needle)) fails.push(`bridge MD missing ${needle}`);
}

const pkg = read("package.json");
const catalog = read("tooling/verify/CATALOG.md");
const domain = read("tooling/verify/domain-by-path.cjs");
if (!pkg.includes('"verify:figma-code-bridge"')) {
  fails.push("package.json missing verify:figma-code-bridge");
}
if (!catalog.includes("figma-code-bridge")) {
  fails.push("CATALOG.md must list figma-code-bridge");
}
if (!domain.includes("figma-code-bridge.cjs")) {
  fails.push("domain-by-path must trigger figma-code-bridge");
}

if (fails.length) {
  console.error("[verify:figma-code-bridge] FAIL\n- " + fails.join("\n- "));
  process.exit(1);
}

console.log(
  "[verify:figma-code-bridge] PASS (IDs consistent · paths exist · Auth candidate ≠ approved · Code Connect 0 · Home/Account Hub lock · auth behavior 0)",
);
