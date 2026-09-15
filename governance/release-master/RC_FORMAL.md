# RC_FORMAL

Engine NEXT after FINAL_ACCEPTANCE ISSUED.
This record locks the release candidate. It does not by itself authorize Production deploy.
Production DB apply (REL-701-DB) was executed separately under explicit Founder authorization on 2026-09-04 and is recorded here as fact, not as authorization.

```text
RC = RC_FORMAL
STATUS = LOCKED
RC_SOURCE_SHA_BINDING = 15f29abc80d8d33cc80ce87973a60e4e0b4be226
RC_BRANCH_POINTER = fix/admin-staff-ops-persist-20260916
ENGINE_FINAL_ACCEPTANCE = ISSUED
ENGINE_BASELINE = ea-baseline-009750f0bef8-60f2feeec9d3
ENGINE_REBASE_ID = ea-rebase-009750f0bef8-60f2feeec9d3
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
PREDECESSOR_RC = 1e66a77d28ac1a5da6e6d21d2e2e469f121fed20 (superseded · re-seal after ENGINE_ACCEPTANCE_REBASE_V1 ea-rebase-009750f0bef8-60f2feeec9d3 · current-epoch QA0-QA9 ISSUED on fix/admin-staff-ops-persist-20260916 15f29abc)
```

CI fields for the predecessor seal remain historical. Current-epoch engine-acceptance evidence is workflow_dispatch full 35030068563 on exact SHA 15f29abc (QA1-QA8 + formal QA7). This record does not invent a new release-bundle digest. ACK ENGINE_ACCEPTANCE_REBASE_V1 then PR230_MERGE_PROMOTE_STAFF allows PR 230 merge when required checks are actually green. This lock does not flip production_deploy and is not a consumer-launch claim.

```text
ENGINE_ACCEPTANCE_CI = BOUND_TO_EXACT_SHA (workflow_dispatch full 35030068563 success on 15f29abc)
PREDECESSOR_GATE = 7c6a2b0abe259847b7b1d7939ce7e1d98e6f654f (run 33826181360 success)
PREDECESSOR_RELEASE_BUILD = 5e37887b888aa2bcd4bb075ebcd956ea1c358322bdfbb7f10bdbe31df8ec6001
PREDECESSOR_RELEASE_ACCEPTANCE = run 33829217490 · verdict PASS
```

Evidence: `governance/engine-acceptance/FINAL_ACCEPTANCE.md` · `governance/recovery/engine-drift-inventory.current.v1.json`.
