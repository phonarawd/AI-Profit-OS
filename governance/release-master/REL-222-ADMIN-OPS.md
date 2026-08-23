# REL-222 ADMIN OPS 3-MODE EVIDENCE

```text
REL = REL-222
TITLE = 3-mode Admin Ops + Preview-As-User + Impact Simulation
STATUS = COMPLETED
PLAN_LOCKED = TRUE
PROTECTED_SCOPE_MUTATION = TRUE
LOCKED_MODES = 3
INVENTED_MODES = 0
SERVER_ENFORCE = 1
SIDEBAR_13 = 0
USER_JWT_MINT = 0
PRODUCTION_DB_APPLY = 0
HOME_GEOMETRY_DIFF = 0
```

## IMPLEMENTATION

- 3-mode 상수: `schemas/admin-ops-mode.v1.json` + `admin-ops.core.cjs`
- Nest: `GET/POST /api/v1/admin/ops/*` · capability `all` 재사용
- LIVE apply = confirm 필수. 모드 누락/미지 = fail-closed
- DRY_RUN / SIMULATION = 원장 persist 0
- Preview-As-User = 유저 존재 여부만. JWT mint 0 · money write 0
- migration file-only: `20260823190000_admin_ops_intents.sql` (REL-701-DB apply)
- 사이드바 12 유지. 13번째 모듈 0

## VERIFY

| command | result |
|---|---|
| `node tooling/verify/rel-222-admin-ops.cjs` | PASS (3 modes · LIVE confirm · ledger 0 · JWT mint 0) |

## ACCEPTANCE

3-mode 운영 경로 존재. SIMULATION 이 실원장을 바꾸지 않음.

## EXIT_GATE

SIMULATION 이 `ledger_*` 를 쓰면 FAIL. Preview-As-User 가 유저 JWT 를 만들면 FAIL.
