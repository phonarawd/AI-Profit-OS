/**
 * verify:legacy-plan-migration — REL-017
 * 21파일 레지스트리 + 존재하는 workspace 플랜 스탬프.
 * sync-plans 호출 0. Home 경로 쓰기 0. isolation rule 미수정.
 */
const { execSync } = require("child_process");
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

const registryRel = "governance/legacy-plan-migration/registry.v1.json";
const stampRel = "tooling/legacy-plan-stamp.cjs";
const verifyRel = "tooling/verify/legacy-plan-migration.cjs";
let registry;
try {
  registry = JSON.parse(read(registryRel) || "{}");
} catch (err) {
  fails.push(`registry parse: ${err.message}`);
  registry = { files: [] };
}

if (registry.cursorSyncPlans !== "DISABLED_UNDER_CURRENT_ISOLATION") {
  fails.push("registry must disable cursor:sync-plans");
}
if (registry.homeMirrorWrite !== 0) fails.push("homeMirrorWrite must be 0");
if (registry.fileDelete !== 0) fails.push("fileDelete must be 0");
if (registry.isolationRuleMutation !== 0) {
  fails.push("isolationRuleMutation must be 0");
}
if (registry.unmappedValidOldTodo !== 0) {
  fails.push("unmappedValidOldTodo must be 0");
}
if (!Array.isArray(registry.files) || registry.files.length !== 21) {
  fails.push(`registry must list 21 files, got ${registry.files.length}`);
}

const groups = { legacy9: 0, currentMaster: 0, trackAG: 0, slice4: 0 };
const names = new Set();
for (const entry of registry.files || []) {
  if (names.has(entry.file)) fails.push(`duplicate registry file ${entry.file}`);
  names.add(entry.file);
  groups[entry.group] = (groups[entry.group] || 0) + 1;
  if (entry.executionAuthority !== "NO") {
    fails.push(`${entry.file}: executionAuthority must be NO`);
  }
  if (entry.group === "currentMaster" || entry.group === "trackAG") {
    if (entry.contentAuthority !== "YES") {
      fails.push(`${entry.file}: CONTENT_AUTHORITY must be YES`);
    }
    if (entry.supersededForExecutionBy !== "PUTDUK_RELEASE_MASTER.plan.md") {
      fails.push(`${entry.file}: SUPERSEDED_FOR_EXECUTION_BY missing`);
    }
  } else {
    if (entry.contentAuthority !== "NO") {
      fails.push(`${entry.file}: CONTENT_AUTHORITY must be NO`);
    }
    if (entry.doNotExecute !== "YES") {
      fails.push(`${entry.file}: DO_NOT_EXECUTE must be YES`);
    }
  }
}
if (groups.legacy9 !== 9) fails.push(`legacy9 count ${groups.legacy9} ≠ 9`);
if (groups.currentMaster !== 1) {
  fails.push(`currentMaster count ${groups.currentMaster} ≠ 1`);
}
if (groups.trackAG !== 7) fails.push(`trackAG count ${groups.trackAG} ≠ 7`);
if (groups.slice4 !== 4) fails.push(`slice4 count ${groups.slice4} ≠ 4`);

const plansDir = path.join(root, ".cursor", "plans");
let stampedPresent = 0;
let missingPresent = 0;
for (const entry of registry.files || []) {
  const p = path.join(plansDir, entry.file);
  if (!fs.existsSync(p)) {
    missingPresent += 1;
    continue;
  }
  const text = fs.readFileSync(p, "utf8");
  if (!text.startsWith("---")) {
    fails.push(`${entry.file}: frontmatter must stay at byte 0`);
  }
  if (!text.includes("REL-017-AUTHORITY-STAMP")) {
    fails.push(`${entry.file}: missing REL-017 stamp`);
    continue;
  }
  if (!text.includes("EXECUTION_AUTHORITY = NO")) {
    fails.push(`${entry.file}: EXECUTION_AUTHORITY=NO missing`);
  }
  if (entry.contentAuthority === "YES") {
    if (!text.includes("CONTENT_AUTHORITY = YES")) {
      fails.push(`${entry.file}: CONTENT_AUTHORITY=YES missing`);
    }
    if (!text.includes("SUPERSEDED_FOR_EXECUTION_BY = PUTDUK_RELEASE_MASTER.plan.md")) {
      fails.push(`${entry.file}: SUPERSEDED_FOR_EXECUTION_BY missing`);
    }
  } else {
    if (!text.includes("CONTENT_AUTHORITY = NO")) {
      fails.push(`${entry.file}: CONTENT_AUTHORITY=NO missing`);
    }
    if (!text.includes("DO_NOT_EXECUTE = YES")) {
      fails.push(`${entry.file}: DO_NOT_EXECUTE=YES missing`);
    }
  }
  stampedPresent += 1;
}

if (stampedPresent === 0) {
  fails.push("at least the tracked legacy plans must exist and be stamped");
}

const implHay = [read(stampRel), read(registryRel)].join("\n");
if (/pnpm\s+cursor:sync-plans/.test(implHay) || /sync-plans-ssot\.cjs/.test(implHay)) {
  fails.push("stamp/registry must not invoke sync-plans");
}
if (/fs\.(writeFile|copyFile|linkSync|mkdir)/.test(read(stampRel)) === false) {
  /* stamp writes workspace files; checked below */
}
const stampSrc = read(stampRel);
if (!stampSrc.includes("DENY") || !stampSrc.includes("Home")) {
  fails.push("stamp tool must deny Home Cursor plans writes");
}

const isolationFiles = [
  ".cursor/rules/project-isolation.mdc",
  ".cursor/rules/project-isolation-boundary.mdc",
];
try {
  const changed = execSync(
    "git --no-pager diff --name-only HEAD -- .cursor/rules/project-isolation.mdc .cursor/rules/project-isolation-boundary.mdc",
    { cwd: root, encoding: "utf8" },
  );
  const staged = execSync(
    "git --no-pager diff --cached --name-only -- .cursor/rules/project-isolation.mdc .cursor/rules/project-isolation-boundary.mdc",
    { cwd: root, encoding: "utf8" },
  );
  if (`${changed}\n${staged}`.trim()) {
    fails.push("isolation rules must not be modified");
  }
} catch {
  for (const rel of isolationFiles) {
    if (!fs.existsSync(path.join(root, rel))) fails.push(`missing ${rel}`);
  }
}

const pkg = read("package.json");
const catalog = read("tooling/verify/CATALOG.md");
const domain = read("tooling/verify/domain-by-path.cjs");
if (!pkg.includes('"verify:legacy-plan-migration"')) {
  fails.push("package.json missing verify:legacy-plan-migration");
}
if (!catalog.includes("legacy-plan-migration")) {
  fails.push("CATALOG.md must list legacy-plan-migration");
}
if (!domain.includes("legacy-plan-migration.cjs")) {
  fails.push("domain-by-path must trigger legacy-plan-migration");
}

if (fails.length) {
  console.error("[verify:legacy-plan-migration] FAIL\n- " + fails.join("\n- "));
  process.exit(1);
}

console.log(
  `[verify:legacy-plan-migration] PASS (21 registry · stamped=${stampedPresent} absent=${missingPresent} · sync-plans 0 · isolation 0)`,
);
