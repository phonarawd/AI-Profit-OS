/**
 * 3-tier gate SSOT (ADR-016) · backend-only repository
 * T0 fast  — commit
 * T1 push  — backend extras (no Next/Tailwind/admin-ui)
 * T2 full  — CI · api-nest-build (customer Next lives in putduk-web)
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
  "cf-infra.cjs",
  "ebay-worker-deploy-path.cjs",
  "p0-ebay-secret-provisioning.cjs",
  "nest-production-provenance.cjs",
  "workers-types.cjs",
  "phase0-bootstrap.cjs",
  "root-domain-env.cjs",
  "domain-bootstrap.cjs",
  "opennext-workers-origin.cjs",
  "domain-clock.cjs",
  "db-recovery.cjs",
  "privacy-purge.cjs",
  "api-nest-build.cjs",
  "stubs/run-all.cjs",
];

/** @type {string[]} */
const T2_CI = ["api-nest-build.cjs"];

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
