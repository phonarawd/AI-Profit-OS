/**
 * verify:backend-ci-tiers-sync — backend-ci.yml ↔ gate-tiers.cjs CI_JOBS 동일 집합 검사 (CI job `repository-boundary` · T2).
 *
 *  - 워크플로의 모든 검증 job 이 CI_JOBS 에 있고, CI_JOBS 의 모든 job 이 워크플로에 있다 (backend-required 는 집계 job 으로 예외)
 *  - job 별 run 명령에서 추출한 검증기 집합 == CI_JOBS[job] (양방향 · pnpm verify:* → package.json → 파일)
 *  - backend/run-all.cjs --domain 합집합 == tooling/verify/backend 도메인 전부 (빠진 도메인 0)
 *  - 참조 파일 전부 존재 · package.json 에 없는 pnpm verify:* 0
 *  - backend-required: needs = 다른 모든 job · if: always()
 *  - 로컬 T2 (`pnpm verify:gate`) = T0 ∪ T1 ∪ T2_CI 가 CI 합집합(전개)과 동일
 * 결과: 불일치 1건 이상이면 exit 1.
 */
"use strict";
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "../..");
const verifyDir = __dirname;
const tag = "[verify:backend-ci-tiers-sync]";
const WORKFLOW_REL = ".github/workflows/backend-ci.yml";
const AGGREGATE_JOB = "backend-required";

const og = require("../backend/ownership-graph.cjs");
const tiers = require("./gate-tiers.cjs");
const pkg = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
const backendDomains = require("./backend/run-all.cjs").domains();

const fails = [];
const warns = [];

function relToVerify(fileFromRoot) {
  return path.posix.relative("tooling/verify", fileFromRoot.replace(/\\/g, "/"));
}

/** run 텍스트 → 검증기 항목 (tooling/verify 기준 · backend/run-all.cjs#domain) */
function extractSteps(run) {
  const out = [];
  const unknown = [];
  const lines = String(run || "")
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith("#"));
  for (const line of lines) {
    let matched = false;
    for (const m of line.matchAll(/\bpnpm\s+(verify:[A-Za-z0-9:_.-]+)((?:\s+[^&|;]+)?)/g)) {
      matched = true;
      const script = m[1];
      const args = m[2] || "";
      if (script === "verify:gate:fast") {
        out.push("gate-fast.cjs");
        continue;
      }
      const cmd = pkg.scripts[script];
      if (!cmd) {
        fails.push("package.json has no script " + script + " (used in " + WORKFLOW_REL + ")");
        continue;
      }
      const fm = cmd.match(/\bnode\s+(\S+)/);
      if (!fm) {
        fails.push(script + " does not run a node file: " + cmd);
        continue;
      }
      pushFile(fm[1], args, out);
    }
    for (const m of line.matchAll(/\bnode\s+((?:tooling|scripts)\/[^\s"'&|;]+)((?:\s+[^&|;]+)?)/g)) {
      matched = true;
      pushFile(m[1], m[2] || "", out);
    }
    if (!matched) unknown.push(line);
  }
  return { steps: out, unknown };
}

function pushFile(fileFromRoot, args, out) {
  const rel = relToVerify(fileFromRoot);
  if (!fs.existsSync(path.join(root, fileFromRoot))) fails.push("referenced file missing: " + fileFromRoot);
  if (rel === "backend/run-all.cjs") {
    const domains = [];
    for (const dm of args.matchAll(/--domain(?:=|\s+)([A-Za-z0-9,_-]+)/g)) domains.push(...dm[1].split(","));
    if (!domains.length) out.push(...backendDomains.map((d) => "backend/run-all.cjs#" + d));
    for (const d of domains) {
      if (!backendDomains.includes(d)) fails.push("backend/run-all.cjs --domain " + d + " is not a backend domain (" + backendDomains.join(", ") + ")");
      out.push("backend/run-all.cjs#" + d);
    }
    return;
  }
  out.push(rel);
}

const text = fs.readFileSync(path.join(root, WORKFLOW_REL), "utf8");
const wf = og.parseWorkflow(text);
const jobIds = wf.jobs.map((j) => j.id);
const ciJobIds = Object.keys(tiers.CI_JOBS);

for (const id of ciJobIds) if (!jobIds.includes(id)) fails.push("CI_JOBS job missing in workflow: " + id);
for (const id of jobIds) if (id !== AGGREGATE_JOB && !ciJobIds.includes(id)) fails.push("workflow job not in gate-tiers CI_JOBS: " + id);
if (!jobIds.includes(AGGREGATE_JOB)) fails.push("workflow must define aggregate job " + AGGREGATE_JOB);

const domainCoverage = new Set();
for (const job of wf.jobs) {
  if (job.id === AGGREGATE_JOB) {
    const needs = new Set(job.needs);
    for (const id of jobIds) if (id !== AGGREGATE_JOB && !needs.has(id)) fails.push(AGGREGATE_JOB + " must need " + id);
    for (const n of needs) if (!jobIds.includes(n)) fails.push(AGGREGATE_JOB + " needs unknown job " + n);
    if (!job.if || !/always\(\)/.test(job.if)) fails.push(AGGREGATE_JOB + " must run with if: always()");
    continue;
  }
  const expected = new Set(tiers.CI_JOBS[job.id] || []);
  const got = new Set();
  for (const step of job.steps) {
    if (step.run == null) continue;
    const { steps, unknown } = extractSteps(step.run);
    for (const s of steps) got.add(s);
    for (const u of unknown) {
      // 유틸 step (예: printf ... > .env) 는 허용하되 기록한다 — echo 만 있는 step 은 boundary 검사가 잡는다
      if (!/^(printf|mkdir|test |set |if |fi$|then$|else$|export )/.test(u)) warns.push(job.id + " step '" + (step.name || "(unnamed)") + "' has a non-verifier run line: " + u.slice(0, 80));
    }
  }
  for (const s of got) if (s.includes("#")) domainCoverage.add(s.split("#")[1]);
  for (const s of expected) if (!got.has(s)) fails.push("job " + job.id + " does not run " + s + " (CI_JOBS expects it)");
  for (const s of got) if (!expected.has(s)) fails.push("job " + job.id + " runs " + s + " which is not in CI_JOBS[" + job.id + "]");
  if (!job.timeout) fails.push("job " + job.id + " has no timeout-minutes");
}

for (const d of backendDomains) if (!domainCoverage.has(d)) fails.push("backend domain not covered by any CI job: " + d);

// 로컬 T2 == CI 합집합
const full = new Set(tiers.stepsForTier("full").flatMap(tiers.expandStep).filter((s) => !s.includes("#")));
const ci = new Set([...tiers.ciUnion()].filter((s) => !s.includes("#") && s !== "gate-fast.cjs"));
// stepsForTier 는 변경 경로 도메인 검증기를 포함할 수 있으므로 CI 쪽이 부족한 경우만 본다
for (const s of ci) if (!full.has(s)) fails.push("CI runs " + s + " but local T2 (pnpm verify:gate) does not");
for (const s of [...tiers.T0_ALWAYS, ...tiers.T1_PUSH.flatMap(tiers.expandStep), ...tiers.T2_CI]) {
  if (s.includes("#")) continue;
  if (!ci.has(s)) fails.push("local T2 runs " + s + " but no CI job does");
}
for (const s of tiers.T2_CI) if (!fs.existsSync(path.join(verifyDir, s))) fails.push("T2_CI file missing: " + s);

for (const w of warns) console.warn(tag + " WARN " + w);
if (fails.length) {
  console.error(tag + " FAIL\n- " + fails.join("\n- "));
  process.exit(1);
}
console.log(tag + " PASS (" + (jobIds.length - 1) + " verification jobs · T2_CI=" + tiers.T2_CI.length + " · domains " + backendDomains.length + "/" + backendDomains.length + " · local T2 == CI union)");
