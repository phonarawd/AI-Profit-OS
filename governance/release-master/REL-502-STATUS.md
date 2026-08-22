# REL-502 — FINAL ENGINE ACCEPTANCE

STATUS: BLOCKED
DATE: 2026-08-22
PROTECTED_SCOPE_MUTATION: false
FINAL_ACCEPTANCE_ISSUED: NO
ENGINE_ACCEPTED_CURRENT_EPOCH: NO

## Why blocked

`ENGINE_ACCEPTANCE_REBASE_V1` is the only legal new-epoch path
(`freeze-baseline` in-place rewrite is forbidden).

Official dry-run against current HEAD failed:

```text
node tooling/engine-acceptance/rebase-acceptance-baseline.cjs --dry-run
  --predecessor ea-baseline-64b0f8a6d984-3657543f36b5
  --product-commit 9f087d0d7d4d4be34f48d5c32d761a1e2d4369d1

FAIL
  - eval_dataset_hash must remain MATCH to predecessor during product-only rebase
  - eval dataset drift during product-only rebase (live ≠ predecessor)
```

Ledger policy remains:

`eval_dataset_mutation_during_product_rebase = FORBIDDEN`

This task did not invent an eval-aware rebase, did not rewrite hashes
inside the predecessor baseline, and did not treat `64b0f8a6` evidence
as current-epoch COMPLETE.

## Epoch

| Field | Predecessor | Current live |
|---|---|---|
| HEAD / product commit | `64b0f8a6d984765a6b9a1533d4e6dd94ba8720c5` | `9f087d0d7d4d4be34f48d5c32d761a1e2d4369d1` |
| baseline_id | `ea-baseline-64b0f8a6d984-3657543f36b5` | (none — rebase not applied) |
| measuredAt | 2026-08-14 | 2026-08-22 inventory |
| pathCount | 374 | 438 |
| aggregate | `3657543f36b5370c1054ff84656e2e3b317f77101c2638beb1d4063e6a2954e2` | `6baee484bb304fb711772c25b3a23a9608a886d62b2262740f91eff6abb9a299` |
| computed new baseline id (dry-run only) | — | `ea-baseline-9f087d0d7d4d-6baee484bb30` (NOT written) |

OLD_BASELINE_PATH_COUNT = 374
CURRENT_PATH_COUNT = 438
ADDED_PATHS = 64
REMOVED_PATHS = 0
CHANGED_PATHS = 48
PROTECTED_DRIFT_RECONCILED = NO

## Hash gates

| Hash | Predecessor | Live | Gate |
|---|---|---|---|
| eval_dataset_hash | `83be4de5…6088` | `05d1b1ce…0091` | MISMATCH — rebase abort |
| acceptance_workflow_hash | `acb3dc37…7ab6` | `acb3dc37…7ab6` | MATCH |
| prompt_hash | `4b8b46a3…c189` | `6361e6b6…c8d0` | changed (allowed on product rebase) |
| schema_migration_hash | `a15f3a6f…e71` | `e114b658…a11` | changed |
| lockfile_hash | `3e4b2632…70a1` | `faf4c739…820c` | changed |
| protected_scope_clean | true | true | dirty PNG/`next-env` are outside roots |

## Eval semantic impact (why path count is not proof)

`eval_dataset_hash` hashes the whole `eval/` root.

Core QA7 files (`tooling/engine-acceptance/lib/qa7-constants.cjs` `EVAL_FILES`):

- `eval/g_no_money.jsonl` — unchanged
- `eval/p_fact.jsonl` — additive P-lane cases (`p_profit_no_invent`, execution progress/last participation). No money-authority rewrite.
- `eval/g_scope_escape.jsonl` — additive scope-redirect cases (`scope_jailbreak`, `scope_hidden_policy`)
- `eval/s_refuse.jsonl` — additive S-lane refuses (`s_takeover`, `s_kyc_bypass`, `s_launder`)

Additional `eval/` files not in QA7 `EVAL_FILES` but included in the directory hash:

- `eval/coach_ko_natural.jsonl`
- `eval/rel-300-fact-only.jsonl` … `eval/rel-305-bounded-memory.jsonl`

Commits: `fe938c7` (REL-300~305 fixtures), `d9c514a` (coach fact-routing harden).

Owner remains the existing P/G/S runtime. Second AI runtime was not created.
These additions still change `eval_dataset_hash`, so product-only rebase is illegal.

## Protected mutation inventory (live vs 374-path baseline)

Added 64 paths include at least:

- REL-401: `services/api-nest/src/main.ts`, `services/api-nest/src/common/security-headers.ts`
- Admin/control-plane: `admin-control/**`, `admin.guard.ts`, `admin-capabilities.ts`, `app.module.ts`
- Opportunities / price layers / participate / admin+user services
- trades execution/module, `krw-deposit`, `withdraw-intent`, wallet module
- adapters admin/module
- migrations including `20260822140000_rel405_admin_control_plane.sql`
- push/WebAuthn/ledger-user-query/auth-rate-limit (PSM REL-010/015/016/020–022)

Changed 48 paths include money/match/AI/admin owners already listed above
plus `services/engine-rust/src/settlement_rule.rs` and AI coach/adapter files.

Removed 0.

## PSM collector

Official judge (`tooling/verify/rel-502-final-engine-acceptance.cjs`)
collects `ID: REL-*` blocks only.

- psm_true_count = 16
- psm_pending = 0

Completed PSM=TRUE: REL-003, REL-008, REL-010, REL-015, REL-016, REL-020,
REL-021, REL-022, REL-222, REL-223, REL-224, REL-401, REL-405, REL-406,
REL-407, REL-408.

REL-004 and REL-501 are dependencies and completed; they are not PSM=TRUE.

POST-001 / POST-002 / POST-003 yaml also say `PROTECTED_SCOPE_MUTATION: true`
but the REL-502 collector does not include `POST-*`. They remain later-queue
Master items. This task did not execute them.

## QA0–QA9 (current epoch)

No current epoch exists. Runners were not executed against the predecessor
baseline. Doing so would wash `64b0f8a6` results as current COMPLETE.

| Stage | Result | Evidence | CURRENT_HEAD | Remaining gap |
|---|---|---|---|---|
| QA0 | NOT_RUN | rebase dry-run FAIL (eval drift). No new `baseline.v1.json` | `9f087d0d7d4d4be34f48d5c32d761a1e2d4369d1` | legal epoch freeze |
| QA1 | NOT_RUN | predecessor `qa1-result.v1.json` is historical only | same | current-epoch runner |
| QA2 | NOT_RUN | historical only | same | current-epoch runner |
| QA3 | NOT_RUN | historical only | same | current-epoch runner |
| QA4 | NOT_RUN | historical only | same | current-epoch runner |
| QA5 | NOT_RUN | historical only | same | current-epoch runner |
| QA6 | NOT_RUN | historical only | same | current-epoch runner |
| QA7 | NOT_RUN | formal Actions publication requires current baseline + `workflow_dispatch`. PUSH=0 | same | current-epoch formal QA7 |
| QA8 | NOT_RUN | historical only | same | current-epoch runner |
| QA9 | NOT_RUN | no current discovery to aggregate | same | current-epoch aggregation |

QA0_QA9 = PASS is not claimed.

## Migration distinction

`supabase/migrations/20260822140000_rel405_admin_control_plane.sql`

| State | Value |
|---|---|
| MIGRATION_SOURCE_EXISTS | YES |
| MIGRATION_SOURCE_VALIDATED | NOT_THIS_TASK (REL-504 owner) |
| LOCAL_ISOLATED_APPLIED | NOT_RUN |
| STAGING_APPLIED | NO |
| PRODUCTION_APPLIED | NO |

REL-502 did not apply this migration to remote production.

## Runtime / browser / user JWT

Not owned to completion by REL-502 while the epoch cannot freeze.
Recorded as NOT_RUN, not zero:

- USER_JWT_ADMIN_200 = NOT_RUN
- RUNTIME_QA = NOT_RUN
- BROWSER_QA = NOT_RUN
- control-plane write→readback→audit = REL-503+ / admin runtime owners
- isolated DB persistence/RLS = REL-504 / REL-408
- security header HTTP smoke = REL-401 residual / REL-408
- Lighthouse full = REL-404
- real login→participation→settlement→wallet E2E = REL-507
- live provider QA = not REL-502

## Not done here

- New acceptance epoch apply
- QA0–QA9 current-epoch rerun
- `governance/engine-acceptance/FINAL_ACCEPTANCE.md`
- REL-503 / REL-504 / staging / production DB write / push
