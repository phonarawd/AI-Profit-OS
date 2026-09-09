/**
 * 3-tier gate SSOT (ADR-016)
 * T0 fast  — commit (~10–30s · stamp hit면 재실행 0)
 * T1 push  — push / 슬라이스 품질 (추가 목록만 경로 단위 · domainSteps 불변)
 * T2 full  — CI / main 합격 (T1 전체 + next+opennext+api-nest-build · stamp 0)
 */
const { scriptsForChangedFiles, getChangedFiles } = require("./domain-by-path.cjs");
const {
  T1_CORE_ALWAYS,
  T1_PUSH,
  t1Plan,
  collectLocalPushFiles,
} = require("./lib/t1-by-path.cjs");

/** @type {string[]} */
const T0_ALWAYS = [
  "stack-lock.cjs",
  "secrets.cjs",
  "plans-ssot.cjs",
  "brand-consumer.cjs",
];

/** @type {string[]} */
const T2_CI = ["api-nest-build.cjs", "next-build.cjs", "opennext-build.cjs"];

function domainSteps() {
  const files = getChangedFiles();
  if (files.length === 0) return [];
  return scriptsForChangedFiles(files);
}

function t1PushPlan() {
  if (String(process.env.GITHUB_ACTIONS || "") === "true") {
    try {
      return t1Plan(getChangedFiles());
    } catch {
      return t1Plan([], { failClosed: true });
    }
  }
  const files = collectLocalPushFiles();
  if (files === null) return t1Plan([], { failClosed: true });
  return t1Plan(files);
}

/** @param {"fast"|"push"|"full"} tier */
function stepsForTier(tier) {
  const steps = [...T0_ALWAYS];

  if (tier === "fast" || tier === "push" || tier === "full") {
    steps.push(...domainSteps());
  }
  if (tier === "push") {
    steps.push(...t1PushPlan().scripts);
  }
  if (tier === "full") {
    steps.push(...T1_PUSH);
  }
  if (tier === "full") {
    steps.push(...T2_CI);
  }

  return [...new Set(steps)];
}

module.exports = {
  T0_ALWAYS,
  T1_CORE_ALWAYS,
  T1_PUSH,
  T2_CI,
  stepsForTier,
  domainSteps,
  t1PushPlan,
};
