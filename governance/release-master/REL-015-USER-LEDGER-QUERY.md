# REL-015 USER LEDGER QUERY EVIDENCE

```text
REL = REL-015
TITLE = 유저용 generic ledger/journal 조회 API
STATUS = COMPLETED
PLAN_LOCKED = TRUE
PROTECTED_SCOPE_MUTATION = TRUE
PRODUCTION_DB_MUTATION = 0
BALANCE_UPDATE_PATH = 0
HOME_VISUAL_REOPEN = 0
```

## IMPLEMENTATION

- GET `/api/v1/me/ledger/journals` · GET `/api/v1/me/ledger/journals/:journalId`
- JwtAuthGuard. query.userId 무시. 타인 403.
- amountUsdt decimal string. 페이지네이션. SELECT only.
- Admin ledger 경로와 권한 분리. 신규 잔액 UPDATE 0.
- Bootstrap spec: 401 / 빈목록 / 본인 목록 / 타인 403

## VERIFY

| command | result |
|---|---|
| `node tooling/verify/user-ledger-query.cjs` | PASS |
| `node tooling/verify/bucket-invariant.cjs` | PASS |
| `node tooling/verify/pg-module-scan.cjs` | PASS |
| `CI=true node tooling/verify/gate-fast.cjs` | PASS (10 steps) |
