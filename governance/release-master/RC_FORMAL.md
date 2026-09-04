# RC_FORMAL

Engine NEXT after FINAL_ACCEPTANCE ISSUED.
This record locks the release candidate. It does not by itself authorize Production deploy.
Production DB apply (REL-701-DB) was executed separately under explicit Founder authorization on 2026-09-04 and is recorded here as fact, not as authorization.

```text
RC = RC_FORMAL
STATUS = LOCKED
RC_SOURCE_SHA_BINDING = 7c6a2b0abe259847b7b1d7939ce7e1d98e6f654f
RC_BRANCH_POINTER = rel/rc-20260904-7c6a2b0a
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
PREDECESSOR_RC = 84cb2ea05ddea0406d9b1f13cbe0b0781a744630 (superseded · re-seal after PO-ACKed rebase ea-rebase-ec3c9604d2ab-5ac0f4291966)
```

CI fields are bound to the exact source SHA above (main merge commit of PR #213).
They are not a substitute for Production deploy authorization.

```text
GATE = BOUND_TO_EXACT_SHA (run 33826181360 success)
ENGINE_ACCEPTANCE_CI = BOUND_TO_EXACT_SHA (full · workflow_dispatch · run 33827842691 success)
RELEASE_BUILD = BOUND_TO_EXACT_SHA (run 33827816052 · release-bundle sha256 5e37887b888aa2bcd4bb075ebcd956ea1c358322bdfbb7f10bdbe31df8ec6001)
RELEASE_ACCEPTANCE = BOUND_TO_EXACT_SHA (run 33829217490 · verdict PASS · api artifact sha256 bfbaab67e0358e2eddf1d0e53ad2ac5c790766be2c26eec6400a8c57553b669d)
DEPLOY_STAGING = BOUND_TO_EXACT_SHA (run 33827845069 · ai-profit-web-preview / ai-profit-ops-preview → staging API 7c6a2b0a)
RENDER_STAGING = BOUND_TO_EXACT_SHA (srv-dabph32fngtc73esj8rg · dep-dad2cgn10e5c73d1amrg · branch rel/rc-20260904-7c6a2b0a · autoDeploy off)
CODEQL_WORKFLOW = BOUND_TO_EXACT_SHA (run 33826181329 success)
EBAY_FAULT_INJECTION = BOUND_TO_EXACT_SHA (run 33826181368 success)
```

Evidence: `governance/release-master/evidence/release-acceptance-verdict-20260904/` · `governance/recovery/founder-gates-executed-20260904.md`.
