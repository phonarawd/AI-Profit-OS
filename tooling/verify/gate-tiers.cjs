/**
 * 3-tier gate SSOT (ADR-016)
 * T0 fast  — commit (~10–30s)
 * T1 push  — push / 슬라이스 품질 (~1–3min)
 * T2 full  — CI / main 합격 (next+opennext 포함)
 */
const { scriptsForChangedFiles, getChangedFiles } = require("./domain-by-path.cjs");

/** @type {string[]} */
const T0_ALWAYS = [
  "stack-lock.cjs",
  "secrets.cjs",
  "plans-ssot.cjs",
  "brand-consumer.cjs",
];

/** @type {string[]} */
const T1_PUSH = [
  "settlement-rule-parity.cjs",
  "pg-module-scan.cjs",
  "brand-assets.cjs",
  "cf-infra.cjs",
  "ebay-worker-deploy-path.cjs",
  "p0-ebay-secret-provisioning.cjs",
  "nest-production-provenance.cjs",
  "workers-types.cjs",
  "phase0-bootstrap.cjs",
  "root-domain-env.cjs",
  "domain-bootstrap.cjs",
  "opennext-workers-origin.cjs",
  "next-major-pin.cjs",
  "tailwind-v4.cjs",
  "cloud-verify-lock.cjs",
  "putduk-theme-sync.cjs",
  "putduk-design-system.cjs",
  "no-lux.cjs",
  "dark-leak-guard.cjs",
  "cf-deploy-packages.cjs",
  "no-admin-in-web.cjs",
  "ia-tabs.cjs",
  "admin-routes.cjs",
  "admin-boundary.cjs",
  "domain-clock.cjs",
  "db-recovery.cjs",
  "privacy-purge.cjs",
  "api-nest-build.cjs",
  "stubs/run-all.cjs",
];

/** @type {string[]} */
const T2_CI = ["next-build.cjs", "opennext-build.cjs"];

function domainSteps() {
  const files = getChangedFiles();
  if (files.length === 0) return [];
  return scriptsForChangedFiles(files);
}

/** @param {"fast"|"push"|"full"} tier */
function stepsForTier(tier) {
  const steps = [...T0_ALWAYS];

  if (tier === "fast" || tier === "push" || tier === "full") {
    steps.push(...domainSteps());
  }
  if (tier === "push" || tier === "full") {
    steps.push(...T1_PUSH);
  }
  if (tier === "full") {
    steps.push(...T2_CI);
  }

  return [...new Set(steps)];
}

module.exports = {
  T0_ALWAYS,
  T1_PUSH,
  T2_CI,
  stepsForTier,
  domainSteps,
};