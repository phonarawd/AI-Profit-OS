/**
 * verify:dependency-integrity — 의존성 무결성 (CI job `dependency-integrity` · T2).
 *  1) lockfile 단일성: git 추적 lockfile 은 루트 pnpm-lock.yaml 하나만 (package-lock/yarn.lock/npm-shrinkwrap 0)
 *  2) 워크스페이스 참조 무결성: 모든 package.json 의 workspace:* 의존이 실제 워크스페이스 패키지 이름으로 해석되고 · 패키지 이름 중복 0 ·
 *     file:/link: 의존이 레포 밖을 가리키지 않으며 · packageManager/engines 가 .npmrc·.nvmrc 와 모순되지 않는다
 *  3) `pnpm dedupe --check`: 중복 해석 버전이 남아 있으면 FAIL (lockfile 재생성 필요 신호)
 * frozen install 성공은 CI setup 단계가 보장한다. 미사용/순환 의존 검사는 도구가 없어 후속 단계 표기 (quality/backend-ci.md).
 */
"use strict";
const { execFileSync, spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "../..");
const tag = "[verify:dependency-integrity]";
const fails = [];
const warns = [];

function tracked(patterns) {
  return execFileSync("git", ["ls-files", "-z", "--", ...patterns], { cwd: root, encoding: "utf8" })
    .split("\0")
    .filter(Boolean)
    .map((p) => p.replace(/\\/g, "/"));
}
function readJson(rel) {
  return JSON.parse(fs.readFileSync(path.join(root, rel), "utf8").replace(/^\uFEFF/, ""));
}
function globToRe(glob) {
  return new RegExp("^" + glob.replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*\*/g, ".*").replace(/\*/g, "[^/]*") + "$");
}

// 1) lockfile 단일성
const lockfiles = tracked(["pnpm-lock.yaml", "**/pnpm-lock.yaml", "**/package-lock.json", "**/yarn.lock", "**/npm-shrinkwrap.json", "package-lock.json", "yarn.lock", "npm-shrinkwrap.json"]);
const uniqueLocks = [...new Set(lockfiles)].filter((f) => !/node_modules/.test(f));
if (uniqueLocks.length !== 1 || uniqueLocks[0] !== "pnpm-lock.yaml") fails.push("tracked lockfiles must be exactly [pnpm-lock.yaml]; got " + JSON.stringify(uniqueLocks));

// 2) 워크스페이스 참조 무결성
const rootPkg = readJson("package.json");
const wsText = fs.readFileSync(path.join(root, "pnpm-workspace.yaml"), "utf8");
const globs = [...wsText.matchAll(/^\s*-\s*["']?([^"'\s#]+)["']?\s*$/gm)].map((m) => m[1]);
if (!globs.length) fails.push("pnpm-workspace.yaml has no packages globs");
const pkgFiles = tracked(["**/package.json", "package.json"]).filter((f) => !/node_modules/.test(f) && f !== "package.json");
const inWorkspace = pkgFiles.filter((f) => globs.some((g) => globToRe(g.replace(/\/+$/, "") + "/package.json").test(f)));
for (const g of globs) {
  if (!pkgFiles.some((f) => globToRe(g.replace(/\/+$/, "") + "/package.json").test(f))) warns.push("workspace glob matches no package: " + g + " (boundary rule owns the FAIL)");
}
const names = new Map();
const manifests = [];
for (const pj of ["package.json", ...inWorkspace]) {
  let j;
  try {
    j = readJson(pj);
  } catch (e) {
    fails.push(pj + " invalid JSON: " + e.message);
    continue;
  }
  manifests.push({ path: pj, json: j });
  if (pj !== "package.json") {
    if (!j.name) fails.push(pj + " missing name");
    else if (names.has(j.name)) fails.push("duplicate workspace package name " + j.name + ": " + names.get(j.name) + " and " + pj);
    else names.set(j.name, pj);
  }
}
for (const { path: pj, json: j } of manifests) {
  for (const field of ["dependencies", "devDependencies", "peerDependencies", "optionalDependencies"]) {
    for (const [dep, spec] of Object.entries(j[field] || {})) {
      const s = String(spec);
      if (s.startsWith("workspace:")) {
        if (!names.has(dep)) fails.push(pj + " " + field + ": " + dep + " uses workspace: protocol but no workspace package has that name");
      } else if (/^(file|link):/.test(s)) {
        const target = path.posix.normalize(path.posix.join(path.posix.dirname(pj), s.replace(/^(file|link):/, "")));
        if (target.startsWith("..")) fails.push(pj + " " + field + ": " + dep + " points outside the repository (" + s + ")");
        else if (!fs.existsSync(path.join(root, target))) fails.push(pj + " " + field + ": " + dep + " points to a missing path (" + s + ")");
      }
    }
  }
}
for (const pj of pkgFiles) {
  if (!inWorkspace.includes(pj) && !/^(tooling|governance|docs|quality)\//.test(pj)) fails.push(pj + " is a package.json outside every pnpm-workspace.yaml glob");
}
if (!/^pnpm@\d+\.\d+\.\d+$/.test(String(rootPkg.packageManager || ""))) fails.push("root packageManager must pin pnpm@x.y.z");
const npmrc = fs.existsSync(path.join(root, ".npmrc")) ? fs.readFileSync(path.join(root, ".npmrc"), "utf8") : "";
if (/\bshamefully-hoist\s*=\s*true/.test(npmrc)) fails.push(".npmrc shamefully-hoist=true hides resolution errors");
const nvmrc = fs.existsSync(path.join(root, ".nvmrc")) ? fs.readFileSync(path.join(root, ".nvmrc"), "utf8").trim() : "";
const nodeRange = String((rootPkg.engines || {}).node || "");
if (nvmrc && nodeRange) {
  const major = nvmrc.replace(/^v/, "").split(".")[0];
  if (!nodeRange.includes(major)) fails.push(".nvmrc " + nvmrc + " is outside engines.node " + nodeRange);
}

// 3) pnpm dedupe --check
const started = Date.now();
const dedupe = spawnSync("pnpm", ["dedupe", "--check"], { cwd: root, encoding: "utf8", shell: true, maxBuffer: 64 * 1024 * 1024 });
const dedupeElapsed = ((Date.now() - started) / 1000).toFixed(1);
if (dedupe.status !== 0) {
  process.stdout.write(dedupe.stdout || "");
  process.stderr.write(dedupe.stderr || "");
  fails.push("pnpm dedupe --check reports duplicate resolutions (exit " + dedupe.status + ") - regenerate the lockfile with pnpm dedupe");
} else console.log(tag + " pnpm dedupe --check clean (" + dedupeElapsed + "s)");

for (const w of warns) console.warn(tag + " WARN " + w);
if (fails.length) {
  console.error(tag + " FAIL\n- " + fails.join("\n- "));
  process.exit(1);
}
console.log(tag + " PASS (lockfile single · workspace refs " + names.size + " packages · dedupe clean)");
