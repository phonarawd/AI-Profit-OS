/**
 * 3-tier gate SSOT (ADR-016) · backend-only repository
 * T0 fast  — commit  : T0_ALWAYS + 변경 경로 도메인 검증기(domain-by-path)
 * T1 push  — push    : T0 + T1_PUSH (infra · domain stubs · backend/run-all)
 * T2 full  — CI/main : T1 + CI 전용 검사 (T2_CI = CI_JOBS 합집합 − T0 − T1 · backend-ci.yml 과 동일 집합)
 *
 * CI_JOBS 가 `.github/workflows/backend-ci.yml` job ↔ 검증기 매핑의 SSOT 다.
 * `verify:backend-ci-tiers-sync` 가 YAML 의 run 명령을 파싱해 job 별로 이 표와 동일한지(양방향) 검사한다.
 * 항목 표기: tooling/verify 기준 상대 파일 · `backend/run-all.cjs#<domain>` = 백엔드 도메인 러너 --domain 실행.
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
  "domain-clock.cjs",
  "db-recovery.cjs",
  "privacy-purge.cjs",
  "api-nest-build.cjs",
  "stubs/run-all.cjs",
  "backend/run-all.cjs",
];

/**
 * backend-ci.yml job → 검증기 (job 이름은 워크플로 job id 와 동일).
 * gate-fast job 은 `pnpm verify:gate:fast` 하나로 T0_ALWAYS + 변경 경로 도메인 검증기를 실행한다.
 * @type {Record<string, string[]>}
 */
const CI_JOBS = {
  "gate-fast": ["gate-fast.cjs"],
  "repository-boundary": [
    "../backend/repository-boundary.cjs",
    "backend-ownership-drift.cjs",
    "backend-ci-tiers-sync.cjs",
    "domain-by-path-ci.cjs",
    "../../scripts/verify-project-boundary.mjs",
    "../../scripts/verify-night-guard.mjs",
  ],
  "dependency-integrity": ["dependency-integrity.cjs", "workers-types.cjs"],
  "api-contract": [
    "schemas-contract.cjs",
    "price-denomination-contract.cjs",
    "home-money-read-contract.cjs",
    "no-fake-zero-status.cjs",
    "llm-adapter-contract.cjs",
    "coach-sse-error-canonical.cjs",
    "api-runtime-qa-canonical.cjs",
    "settlement-rule-parity.cjs",
    "user-opportunity-feed.cjs",
    "catalog-runtime-seed.cjs",
    "listing-legs-day1.cjs",
    "signup-ready-adapters.cjs",
    "market-partner-adapters.cjs",
    "market-partner-trust.cjs",
    "pricing-formula.cjs",
    "fx-snapshot-formula.cjs",
    "operator-footer.cjs",
  ],
  typecheck: ["api-nest-build.cjs", "workers-typecheck.cjs"],
  unit: ["unit-tests.cjs", "nest-production-provenance.cjs"],
  integration: [
    "auth-rate-limit.cjs",
    "user-ledger-query.cjs",
    "rel-501-money-red-team.cjs",
    "qa-env-isolation-guard.cjs",
    "participate-http.cjs",
    "execute-rule-loop.cjs",
    "auth-jwt-runtime.cjs",
  ],
  auth: [
    "backend/run-all.cjs#auth",
    "auth-session-cookie.cjs",
    "wallet-kyc-session-auth.cjs",
    "auth-identity-proof.runtime.cjs",
    "passkey-registration-hijack.runtime.cjs",
    "webauthn-user-presence.runtime.cjs",
    "webauthn-fallback-pointer.cjs",
    "privacy-purge.cjs",
    "admin-csrf-double-submit.cjs",
    "money-wallet-auth-remediation.cjs",
  ],
  "ledger-wallet": [
    "backend/run-all.cjs#ledger-wallet",
    "backend/run-all.cjs#deposit-withdraw",
    "bucket-invariant.cjs",
    "pg-module-scan.cjs",
    "min-holding-scope.cjs",
    "deposit-confirm-stages.cjs",
    "no-per-address-poll.cjs",
    "idempotency-conflict-detection.cjs",
    "committed-event-publication-durability.cjs",
    "tron-hd-derivation-fail-closed.runtime.cjs",
    "withdraw-stepup-security.cjs",
    "withdraw-stepup-security.runtime.cjs",
    "usdt-ingest-machine-auth.cjs",
    "adapter-ingest-fail-closed.cjs",
    "adapter-ingest-fail-closed.runtime.cjs",
  ],
  kyc: ["backend/run-all.cjs#kyc", "kyc-r2-only.cjs"],
  "matching-membership": [
    "backend/run-all.cjs#matching-membership",
    "backend/run-all.cjs#opportunity-engine",
    "backend/run-all.cjs#benefit-referral",
    "match-success-rule.cjs",
    "no-success-rate-as-rule.cjs",
    "domain-clock.cjs",
    "referral-ledger.cjs",
    "referral-ladder.cjs",
    "referral-idempotency.cjs",
    "mission-auto-payout.cjs",
    "mission-idempotency.cjs",
    "mission-no-manual-grant.cjs",
    "benefit-g4-ledger-separation.cjs",
    "ebay-resilience.cjs",
    "growth-public-surface.cjs",
  ],
  notification: [
    "backend/run-all.cjs#notification",
    "notification-prefs-default-on.cjs",
    "push-channel-prefs.cjs",
    "email-provider-resend.cjs",
    "pwa-push-badge.cjs",
  ],
  "ai-policy": [
    "backend/run-all.cjs#ai-policy",
    "llm-quota-degrade.cjs",
    "ai-coach-no-autonomy.cjs",
    "ai-general-no-money-tools.cjs",
    "ai-lane-router.cjs",
    "routing-coverage.cjs",
    "ai-scope-guard.cjs",
    "ai-guard-authority.cjs",
    "numeric-grounding.cjs",
    "fact-freshness.cjs",
    "answer-trace.cjs",
    "conversation-state-bounded.cjs",
    "reference-resolution.cjs",
    "no-ai-data-in-git.cjs",
    "twin-fact-separation.cjs",
    "age-tone-surfaces.cjs",
  ],
  "admin-rbac": [
    "backend/run-all.cjs#admin-rbac",
    "rel-400-admin-control-plane.cjs",
    "rel-405-rbac-audit.cjs",
    "rel-406-kill-switch.cjs",
    "rel-407-price-override.cjs",
    "rel-222-admin-ops.cjs",
    "rel-223-match-control.cjs",
    "rel-224-source-policy.cjs",
    "rel-409-r6-cert.cjs",
  ],
  migration: [
    "migrations-static.cjs",
    "migrations-applied-parity.cjs",
    "rel-504-migration-readiness.cjs",
    "staging-db-hardening.cjs",
    "db-hardening-readiness.cjs",
    "db-recovery.cjs",
    "db-recon-inventory.cjs",
    "live-schema-forensic.cjs",
    "b3-promotion.cjs",
    "staging-topology-readiness.cjs",
    "production-schema-parity.cjs",
    "staging-db-hardening-rehearsal.cjs",
    "qa-env-isolation-staging.cjs",
  ],
  "rust-engine": ["rust-engine.cjs"],
  "worker-build": [
    "worker-build.cjs",
    "cf-infra.cjs",
    "ebay-worker-deploy-path.cjs",
    "p0-ebay-secret-provisioning.cjs",
    "phase0-bootstrap.cjs",
    "root-domain-env.cjs",
    "domain-bootstrap.cjs",
  ],
  security: [
    "secrets.cjs",
    "rel-402-dependency-audit.cjs",
    "pnpm-audit.cjs",
    "rel-408-security-baseline.cjs",
    "rel-403-versioning.cjs",
    "workflow-action-pin.cjs",
  ],
  "release-evidence": [
    "rel-502-final-engine-acceptance.cjs",
    "rel-503-protected-scope-watch.cjs",
    "rel-505-r7-backend-alignment.cjs",
    "rel-508-current-fx-approx.cjs",
    "rel-506-r8-infra-core.cjs",
    "rel-600-staging.cjs",
    "rel-601-staging-regression.cjs",
    "rel-602-staging-rollback.cjs",
    "release-engine-truth-consistency.cjs",
    "engine-acceptance.cjs",
    "engine-drift-inventory.cjs",
    "release-acceptance.cjs",
    "release-manifest-identity-lock.cjs",
    "production-deploy-path-lock.cjs",
    "api-artifact-provenance.cjs",
    "api-artifact-runtime-qa.cjs",
    "fetch-acceptance-artifact.cjs",
    "require-accepted-sha.cjs",
    "release-fetch-deploy-hardening.cjs",
    "render-rollback-provenance.cjs",
    "render-api-promotion-readiness.cjs",
    "production-release-decision.cjs",
    "governance-observation-registry.cjs",
    "observability.cjs",
  ],
};

/**
 * T1 항목의 CI 전개: stubs/run-all.cjs → live 목록 · backend/run-all.cjs → 모든 도메인 · gate-fast.cjs → T0_ALWAYS.
 * @param {string} step
 * @returns {string[]}
 */
function expandStep(step) {
  if (step === "gate-fast.cjs") return [...T0_ALWAYS];
  if (step === "stubs/run-all.cjs") return [...require("./stubs/run-all.cjs").live];
  if (step === "backend/run-all.cjs") return require("./backend/run-all.cjs").domains().map((d) => "backend/run-all.cjs#" + d);
  return [step];
}

/** CI job 합집합 (전개 후) */
function ciUnion() {
  const out = new Set();
  for (const steps of Object.values(CI_JOBS)) for (const s of steps) for (const e of expandStep(s)) out.add(e);
  return out;
}

/**
 * T2 = CI 전용 검사 = CI 합집합 − T0 − T1(전개).
 * 도메인 러너 항목(backend/run-all.cjs#d)은 T1 의 backend/run-all.cjs 가 전부 덮으므로 T2 에는 남지 않는다.
 * @type {string[]}
 */
const T2_CI = (() => {
  const covered = new Set([...T0_ALWAYS, ...T1_PUSH.flatMap(expandStep)]);
  return [...ciUnion()].filter((s) => !covered.has(s) && !s.includes("#") && s !== "gate-fast.cjs");
})();

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
  CI_JOBS,
  expandStep,
  ciUnion,
  stepsForTier,
  domainSteps,
};
