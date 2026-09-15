# RC_FORMAL

Engine NEXT after FINAL_ACCEPTANCE ISSUED.
This record locks the release candidate. It does not by itself authorize Production deploy.
Production DB apply (REL-701-DB) was executed separately under explicit Founder authorization on 2026-09-04 and is recorded here as fact, not as authorization.

```text
RC = RC_FORMAL
STATUS = LOCKED
RC_SOURCE_SHA_BINDING = 81b34e53b244ca5820eb44a5f53d226bca43ac11
RC_BRANCH_POINTER = qa/operator-mall-pg-20260915
ENGINE_FINAL_ACCEPTANCE = ISSUED
ENGINE_BASELINE = ea-baseline-f295d67f1c3c-c2a6ea416128
ENGINE_REBASE_ID = ea-rebase-f295d67f1c3c-c2a6ea416128
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
PREDECESSOR_RC = cb71cf91b6982471edab426ab06a14947a7f4de5 (superseded · re-seal after ENGINE_ACCEPTANCE_REBASE_V1 ea-rebase-f295d67f1c3c-c2a6ea416128 · current-epoch QA0-QA9 ISSUED on qa/operator-mall-pg-20260915 81b34e53)
```

CI fields for the predecessor seal remain historical. Current-epoch engine-acceptance evidence is PR push backend-ci 34971433168 plus engine-acceptance 34971433191 on exact SHA 81b34e53, plus workflow_dispatch qa7 34968710565 on ancestor SHA 9d51acab (formal QA7 authority). This record does not invent a new release-bundle digest. This QA-branch lock is not a main merge and does not authorize Production deploy.

```text
ENGINE_ACCEPTANCE_CI = BOUND_TO_EXACT_SHA (PR push 34971433168 backend-ci success · PR push 34971433191 engine-acceptance success · workflow_dispatch qa7 34968710565 success on 9d51acab)
PREDECESSOR_GATE = 7c6a2b0abe259847b7b1d7939ce7e1d98e6f654f (run 33826181360 success)
PREDECESSOR_RELEASE_BUILD = 5e37887b888aa2bcd4bb075ebcd956ea1c358322bdfbb7f10bdbe31df8ec6001
PREDECESSOR_RELEASE_ACCEPTANCE = run 33829217490 · verdict PASS
```

Evidence: `governance/engine-acceptance/FINAL_ACCEPTANCE.md` · `governance/recovery/engine-drift-inventory.current.v1.json`.
