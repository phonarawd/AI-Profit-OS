/**
 * verify:gate-local-speed
 * 로컬 게이트 가속은 검사를 빼지 않는다. 스탬프/캐시/in-process 계약이 약화되면 FAIL.
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

const stamp = read("tooling/verify/lib/gate-stamp.cjs");
const cache = read("tooling/verify/lib/verify-input-cache.cjs");
const inproc = read("tooling/verify/lib/run-verify-in-process.cjs");
const runner = read("tooling/verify/gate-runner.cjs");
const runAll = read("tooling/verify/stubs/run-all.cjs");
const webLint = read("tooling/verify/web-lint.cjs");
const tiers = read("tooling/verify/gate-tiers.cjs");
const gate = read("tooling/verify/gate.cjs");
const domain = read("tooling/verify/domain-by-path.cjs");
const catalog = read("tooling/verify/CATALOG.md");
const pkg = read("package.json");
const preCommit = read(".husky/pre-commit");
const prePush = read(".husky/pre-push");

for (const [name, body] of [
  ["gate-stamp", stamp],
  ["verify-input-cache", cache],
]) {
  if (!body.includes("CI") || !body.includes("GITHUB_ACTIONS")) {
    fails.push(name + " must refuse skip on CI/GITHUB_ACTIONS");
  }
  if (!body.includes("AIPO_GATE_NO_STAMP")) {
    fails.push(name + " must honor AIPO_GATE_NO_STAMP");
  }
}

if (!stamp.includes("digest") || !stamp.includes("scripts")) {
  fails.push("stamp must key on digest + scripts");
}
if (!stamp.includes("every") && !stamp.includes("have.has")) {
  fails.push("stamp skip must require current scripts ⊆ stamped scripts");
}
if (!cache.includes("child_process") || !cache.includes("isUncacheable")) {
  fails.push("stub cache must treat child_process scripts as uncacheable");
}
if (!inproc.includes("spawnSync") || !inproc.includes("isUncacheable")) {
  fails.push("in-process runner must spawn child_process scripts");
}
if (!runner.includes('require("./lib/gate-stamp.cjs")') || !runner.includes("trySkip")) {
  fails.push("gate-runner must consult gate-stamp");
}
if (!runner.includes("stamp.write")) {
  fails.push("gate-runner must write stamp only after PASS");
}
if (!runAll.includes("run-verify-in-process") || !runAll.includes("runVerifyScript")) {
  fails.push("stubs/run-all must use in-process runner");
}
if (runAll.includes("spawnSync(process.execPath")) {
  fails.push("stubs/run-all must not spawn one node per stub");
}

if (!webLint.includes("_rel011_intentional_syntax_error.tsx")) {
  fails.push("web-lint must keep REL-011 syntax-error probe");
}
if (!webLint.includes("runLint([probeName])")) {
  fails.push("web-lint probe must lint the probe file only");
}
if (!webLint.includes("--cache") || !webLint.includes(".cache")) {
  fails.push("web-lint clean run must use eslint --cache under .cache");
}
if (!webLint.includes('runLint(["."])')) {
  fails.push("web-lint must still lint the full apps/web tree");
}

if (!tiers.includes('T2_CI = ["api-nest-build.cjs"')) {
  fails.push("T2_CI must always include api-nest-build.cjs");
}
const t1lib = require("./lib/t1-by-path.cjs");
if (t1lib.T1_PUSH.includes("api-nest-build.cjs")) {
  fails.push("api-nest-build must not stay in T1_PUSH always-list");
}
if (!tiers.includes("t1PushPlan") || !tiers.includes("./lib/t1-by-path.cjs")) {
  fails.push("T1 push extras must be path-aware via t1-by-path");
}
if (tiers.includes("next-build.cjs") || tiers.includes("opennext-build.cjs")) {
  fails.push("T2 must not keep next-build/opennext-build");
}
if (!tiers.includes('T2_CI = ["api-nest-build.cjs"]')) {
  fails.push("T2_CI must be api-nest-build only");
}
if (!gate.includes("api-nest-build.cjs") || !gate.includes('stepsForTier("full")')) {
  fails.push("T2 gate.cjs must use stepsForTier full + api-nest-build");
}
if (!domain.includes("^services\\/api-nest\\/") && !domain.includes("^services\\\\/api-nest\\\\/")) {
  fails.push("domain-by-path must trigger api-nest-build for services/api-nest/**");
}

if (!preCommit.includes("verify:gate:fast")) {
  fails.push("husky pre-commit must still run verify:gate:fast");
}
if (!prePush.includes("verify:gate:push")) {
  fails.push("husky pre-push must still run verify:gate:push");
}
if (preCommit.includes("--no-verify") || prePush.includes("--no-verify")) {
  fails.push("husky must not pass --no-verify");
}

if (!pkg.includes('"verify:gate-local-speed"')) {
  fails.push("package.json missing verify:gate-local-speed");
}
if (!catalog.includes("gate-local-speed")) {
  fails.push("CATALOG.md must list gate-local-speed");
}

const stampLib = require("./lib/gate-stamp.cjs");
const ciSkip = stampLib.trySkip("verify:gate:fast", ["stack-lock.cjs"], {
  env: { CI: "true" },
  cwd: root,
});
if (ciSkip.ok) fails.push("runtime: stamp must not skip when CI=true");

const forced = stampLib.trySkip("verify:gate:fast", ["stack-lock.cjs"], {
  env: { AIPO_GATE_NO_STAMP: "1" },
  cwd: root,
});
if (forced.ok) fails.push("runtime: stamp must not skip when AIPO_GATE_NO_STAMP=1");

if (fails.length) {
  console.error("[verify:gate-local-speed] FAIL\n- " + fails.join("\n- "));
  process.exit(1);
}
console.log(
  "[verify:gate-local-speed] PASS (stamp fail-closed · stub in-process · web-lint probe scoped · nest tsc path+T2)",
);
