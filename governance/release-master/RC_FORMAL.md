# RC_FORMAL

Engine NEXT after FINAL_ACCEPTANCE ISSUED.
This record locks the release candidate. It does not by itself authorize Production deploy.
Production DB apply (REL-701-DB) was executed separately under explicit Founder authorization on 2026-09-04 and is recorded here as fact, not as authorization.

**Re-seal note (2026-09-04, same day)**: PR #217 (Night Guard founder-auth channel · REL-701-DB apply record · branch cleanup · RC re-seal docs) merged to `main` as merge commit `a3e5304d40d7b7042175177aab11f6b279f6214c`. No `apps/ services/ packages/ workers/ supabase/ schemas/` paths changed, but the production deploy gate (`tooling/release/require-accepted-sha.cjs`) requires an exact-SHA `release-acceptance` PASS with zero reuse across SHAs. `release-build` → `engine-acceptance`(full) → `release-acceptance` were re-run end-to-end on the new tip and PASSED. This record now binds to that new tip.

```text
RC = RC_FORMAL
STATUS = LOCKED
RC_SOURCE_SHA_BINDING = a3e5304d40d7b7042175177aab11f6b279f6214c
RC_BRANCH_POINTER = main (rel/rc-* pointer branch skipped this re-seal — not a require-accepted-sha.cjs input)
ENGINE_FINAL_ACCEPTANCE = ISSUED
ENGINE_BASELINE = ea-baseline-0d8825e8f333-5ac0f4291966
ENGINE_REBASE_ID = ea-rebase-ec3c9604d2ab-5ac0f4291966
ENGINE_QA9 = ENGINE_ACCEPTED_FOR_UI
PROTECTED_SCOPE_DRIFT = 0
HISTORICAL_82_PATH_EVIDENCE = PRESERVED
BASELINE_WASHING = 0
ONE_SHOT_ACCEPTANCE_WORKFLOWS = REMOVED
PRODUCTION_DB_APPLY = 1
PRODUCTION_DB_APPLY_OWNER = REL-701-DB
PRODUCTION_DB_APPLY_AT = 2026-09-04T02:33:15Z
PRODUCTION_DEPLOY = 0
PRODUCTION_SCHEMA_PARITY_MIGRATION = APPLIED_BY_REL-701-DB
APPLY_OWNER = REL-701-DB
NEXT = REL-701_FOUNDER_WORKFLOW_DISPATCH
PREDECESSOR_RC = 7c6a2b0abe259847b7b1d7939ce7e1d98e6f654f (superseded · main tip moved via PR #217 merge commit · re-seal required by exact-SHA production deploy gate, not by any protected-scope or engine-epoch change)
```

CI fields are bound to the exact source SHA above (main merge commit of PR #217, re-seal run).
They are not a substitute for Production deploy authorization.

```text
GATE = BOUND_TO_EXACT_SHA (run 33837441394 success)
CODEQL_WORKFLOW = BOUND_TO_EXACT_SHA (run 33837441385 success)
ENGINE_ACCEPTANCE_CI = BOUND_TO_EXACT_SHA (full · workflow_dispatch · run 33839618126 success)
RELEASE_BUILD = BOUND_TO_EXACT_SHA (run 33839611957 · release-bundle sha256 7c0a2ed577d36d88d61e99a70adb1cba1e6f8f9daca540fa93b2125a682e9bdc)
RELEASE_ACCEPTANCE = BOUND_TO_EXACT_SHA (run 33840579078 · verdict PASS · api artifact sha256 bfbaab67e0358e2eddf1d0e53ad2ac5c790766be2c26eec6400a8c57553b669d — unchanged digest, services/api-nest source untouched by PR #217)
DEPLOY_STAGING = SKIPPED_NOT_REQUIRED (not a require-accepted-sha.cjs input · predecessor bind run 33827845069 stays valid evidence for the superseded RC only)
EBAY_FAULT_INJECTION = NOT_TRIGGERED (no ebay-adapter path change in PR #217 diff · last verified at predecessor RC run 33826181368 success)
```

Evidence: `governance/release-master/evidence/release-acceptance-verdict-20260904-reseal/` (this re-seal) · `governance/release-master/evidence/release-acceptance-verdict-20260904/` (predecessor RC, preserved) · `governance/recovery/founder-gates-executed-20260904.md`.
