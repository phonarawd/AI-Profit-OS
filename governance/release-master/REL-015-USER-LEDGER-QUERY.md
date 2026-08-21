# REL-015 USER LEDGER QUERY EVIDENCE

```text
REL = REL-015
TITLE = 유저용 generic ledger/journal 조회 API
STATUS = COMPLETED
PLAN_LOCKED = TRUE
MASTER_STATUS_UPDATED = TRUE
LAST_COMPLETED_TODO = REL-015
FIRST_EXECUTION_TODO = REL-016
PROTECTED_SCOPE_MUTATION = TRUE
PRODUCTION_DB_MUTATION = 0
BALANCE_UPDATE_PATH = 0
HOME_VISUAL_REOPEN = 0
```

## IMPLEMENTATION

- GET `/api/v1/me/ledger/journals` · GET `/api/v1/me/ledger/journals/:journalId`
- JwtAuthGuard. query.userId 무시. 타인 403.
- amountUsdt decimal string. 페이지네이션. SELECT only.

## VERIFY

| command | result |
|---|---|
| `node tooling/verify/user-ledger-query.cjs` | PASS |
| `node tooling/verify/bucket-invariant.cjs` | PASS |
| `node tooling/verify/pg-module-scan.cjs` | PASS |
| `CI=true node tooling/verify/gate-fast.cjs` | PASS (10 steps) |
| GitHub `gate.yml` | SUCCESS `32400738598` |

## Git

```text
REMOTE_MAIN_BEFORE = 739bbbe0e375e1e4107d91b1bfdf814cf21f5936
BRANCH = rel/REL-015-user-ledger-query
HEAD_SHA = 62b9b6c
PR = https://github.com/phonarawd/AI-Profit-OS/pull/14
CI_RUN = https://github.com/phonarawd/AI-Profit-OS/actions/runs/32400738598
MERGE_METHOD = merge
MERGE_COMMIT = 2d235d1d7e894a73c576c7fa783c4b16819ecb86
REMOTE_MAIN_AFTER = 2d235d1d7e894a73c576c7fa783c4b16819ecb86
ADMIN_BYPASS_USED = 0
FORCE_PUSH_USAGE = 0
GIT_ADD_A_USAGE = 0
SECRET_CONTENT_READ_COUNT = 0
SECRET_RISK_STAGED = 0
PRODUCTION_DB_MUTATION = 0
PRODUCTION_DEPLOY = 0
```
