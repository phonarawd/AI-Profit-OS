# REL-004 ENGINE BASELINE SANITY CHECK EVIDENCE

```text
REL = REL-004
TITLE = ENGINE_BASELINE_SANITY_CHECK (경량, 정식 인증 아님)
STATUS = COMPLETED
PLAN_LOCKED = TRUE
MASTER_STATUS_UPDATED = TRUE
LAST_COMPLETED_TODO = REL-004
FIRST_EXECUTION_TODO = REL-005
FINAL_ENGINE_ACCEPTANCE = NO
REL_502_CERTIFICATE_ISSUED = 0
```

## Authority

```text
EXECUTION_BASE = origin/main
REMOTE_MAIN_SHA = f53e182f291f8c941e33671371075dec19142d36
WORKTREE = _tmp_r4
BRANCH_USED_FOR_VERIFY = rel/REL-004-engine-sanity (no unique commit · product mutation 0)
PRODUCT_DIFF_VS_MAIN = 0
```

Sanity only. This document is not FINAL ENGINE ACCEPTANCE and must not be cited as REL-502.

## CURRENT_SCOPE

Existing engine/money/bucket-invariant verify scripts only.
`settlement_rule` source edit = REL-008.
QA0-QA9 / `verify:engine-acceptance` = REL-502.
Local full test / E2E / release build = 0.

## Catalog selection

From `tooling/verify/CATALOG.md` engine/money/bucket-invariant live items:

| id | class | command |
|---|---|---|
| bucket-invariant | Money | `node tooling/verify/bucket-invariant.cjs` |
| withdraw-mode-default | Money | `node tooling/verify/withdraw-mode-default.cjs` |
| principal-withdraw-reachable | Money | `node tooling/verify/principal-withdraw-reachable.cjs` |
| principal-profit-abuse | Money | `node tooling/verify/principal-profit-abuse.cjs` |
| practice-non-withdrawable | Money | `node tooling/verify/practice-non-withdrawable.cjs` |
| home-money-read-contract | Money | `node tooling/verify/home-money-read-contract.cjs` |
| pg-module-scan | Money | `node tooling/verify/pg-module-scan.cjs` |
| match-success-rule | Engine | `node tooling/verify/match-success-rule.cjs` |
| participate-http | Engine | `node tooling/verify/participate-http.cjs` |
| execute-rule-loop | Engine | `node tooling/verify/execute-rule-loop.cjs` |
| simulation-gate | Engine | `node tooling/verify/simulation-gate.cjs` |
| home-state-truth | Engine | `node tooling/verify/home-state-truth.cjs` |
| no-fake-zero-status | Engine | `node tooling/verify/no-fake-zero-status.cjs` |

Not run (out of scope): `verify:engine-acceptance`, cargo build --release, next-build, E2E, Playwright.

## VERIFY

| command | cwd | result | elapsed_ms |
|---|---|---|---|
| bucket-invariant | `_tmp_r4` @ f53e182 | PASS | 3023 |
| withdraw-mode-default | `_tmp_r4` @ f53e182 | PASS | 151 |
| principal-withdraw-reachable | `_tmp_r4` @ f53e182 | PASS | 118 |
| principal-profit-abuse | `_tmp_r4` @ f53e182 | PASS | 284 |
| practice-non-withdrawable | `_tmp_r4` @ f53e182 | PASS | 201 |
| home-money-read-contract | `_tmp_r4` @ f53e182 | PASS | 149 |
| pg-module-scan | `_tmp_r4` @ f53e182 | PASS | 1824 |
| match-success-rule | `_tmp_r4` @ f53e182 | PASS | 144 |
| participate-http | `_tmp_r4` @ f53e182 | PASS | 102 |
| execute-rule-loop | `_tmp_r4` @ f53e182 | PASS | 124 |
| simulation-gate | `_tmp_r4` @ f53e182 | ENV_FAIL (MODULE_NOT_FOUND `@aipo/market-intelligence/money`) | 158 |
| simulation-gate | workspace with node_modules · sources identical to origin/main | PASS | — |
| home-state-truth | `_tmp_r4` @ f53e182 | PASS | 140 |
| no-fake-zero-status | `_tmp_r4` @ f53e182 | PASS | 123 |

### simulation-gate ENV_FAIL classification

Worktree `_tmp_r4` has no `node_modules` / pnpm workspace links.
`git diff --name-only origin/main -- tooling/verify/simulation-gate.cjs services/simulation-engine` = empty.
Same script PASS in the primary workspace with installed workspace packages.
Classification = `BLOCKED_LOCAL_*` environment, not a REL-003 product regression.
REL-003 revert = not required. REL-008 handoff = not required (settlement_rule not implicated).

## ACCEPTANCE

```text
SANITY_RESULT_DOCUMENT = EXISTS
FORMAL_ACCEPTANCE_CLAIM = 0
REL_502_SUBSTITUTE = 0
PRODUCT_FILES_CHANGED = 0
SETTLEMENT_RULE_SOURCE_EDIT = 0
PRODUCTION_DB_MUTATION = 0
PRODUCTION_DEPLOY = 0
HOME_VISUAL_CHANGE = 0
```

## Git / PR / CI

```text
GIT_MODEL = VERIFY_ONLY
PR = N/A
CI = N/A
MERGE = N/A
MAIN_AFTER = f53e182f291f8c941e33671371075dec19142d36 (unchanged)
GIT_ADD_A_USAGE = 0
FORCE_PUSH_USAGE = 0
SECRET_CONTENT_READ_COUNT = 0
SECRET_RISK_STAGED = 0
```

No product mutation. Evidence + Master stamp stay workspace-local (`PLAN_STAMP_SCOPE = WORKSPACE_ONLY`).

## Intentionally untouched

- `services/engine-rust/src/settlement_rule.rs`
- `services/engine-rust/settlement_rule.cjs`
- `services/api-nest/**`
- `supabase/migrations/**`
- Home Desktop/Mobile
- production DB / deploy

## EXIT_GATE

REL-004 PASS. Do not cite this file as REL-502.
REL-005 may start.
