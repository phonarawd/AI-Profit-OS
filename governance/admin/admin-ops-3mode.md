# Admin Ops 3-mode (REL-222)

STATUS: LOCKED
LOCKED_MODES = 3
INVENTED_MODES = 0
SERVER_ENFORCE = 1
SIDEBAR_13 = 0
USER_JWT_MINT = 0
PRODUCTION_DB_APPLY = 0
HOME_GEOMETRY_DIFF = 0

Mode is a server flag. A client-only toggle is not authority.
Terms stay frozen in `control-plane-superset.md` (`IMPLEMENTATION_IN_THIS_REL: 0`).

| Mode | Persist intent apply | Ledger / money write | Confirm |
|---|---|---|---|
| `LIVE` | After preview + confirm | 0 in this REL | Required |
| `DRY_RUN` | 0 | Forbidden | Preview only |
| `SIMULATION` | 0 | Forbidden · isolated | Preview only |

Flow lock: `preview` → `confirm` → `apply` → `result` → `rollback`.
Families: `policy` · `bulk` · `execution_rule` · `wallet_operation` · `risk_threshold`.

## EXIT_GATE

- Missing / unknown mode = fail-closed. Must not become `LIVE`.
- `LIVE` without `confirm` = FAIL.
- `DRY_RUN` / `SIMULATION` that writes `ledger_*` = FAIL.
- Preview-As-User that mints a user JWT = FAIL.
- Capability 창작 0. `read("all")` / `write("all")` only.
- Sidebar 13번째 모듈 추가 = FAIL.

## Rules

- reason ≥ 10 + audit every stage
- audit payload money keys 0
- `AuthService.mintSession` 호출 0
- production apply = REL-701-DB
