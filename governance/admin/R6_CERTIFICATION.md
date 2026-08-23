# Admin R6 Certification (REL-409)

```text
REL = REL-409
TITLE = Admin R6 Certification
STATUS = COMPLETED
PLAN_LOCKED = TRUE
PROTECTED_SCOPE_MUTATION = FALSE
MODULES = 12
CHILD_2B = 1
SIDEBAR_13 = 0
WEB_ADMIN = 0
KNOWN_P0 = 0
KNOWN_P1 = 0
KNOWN_P2 = 0
KNOWN_P3 = 0
PRODUCTION_DB_APPLY = 0
HOME_GEOMETRY_DIFF = 0
```

12 모듈 + 2b 전수. 의존 REL 200~224 · 400 · 405~408 이 COMPLETED 일 때만 발급.
각 모듈 `verify:rel-20x` / control-plane verify 를 이 슬라이스에서 재실행한다.

| id | href | owner REL |
|---|---|---|
| 1 | `/admin` | REL-201 |
| 2 | `/admin/opportunities` | REL-210 |
| 2b | `/admin/execution-policy` | REL-209 |
| 3 | `/admin/adapters` | REL-211 |
| 4 | `/admin/wallet` | REL-206 |
| 5 | `/admin/ledger` | REL-205 |
| 6 | `/admin/users` | REL-202 |
| 7 | `/admin/risk` | REL-208 |
| 8 | `/admin/compliance` | REL-207 |
| 9 | `/admin/system-control` | REL-213 |
| 10 | `/admin/ai-logs` | REL-215 |
| 11 | `/admin/growth` | REL-217 |
| 12 | `/admin/audit` | REL-214 |

Control-plane: REL-222 3-mode · REL-223 match verbs · REL-224 policy versions · REL-400 terms · REL-405 RBAC · REL-406 kill · REL-407 price layers · REL-408 security baseline.

## EXIT_GATE

의존 REL 미완료면 인증 금지. 사이드바 13번째 = FAIL. `apps/web/app/admin` = FAIL. known P0~P3 ≠ 0 이면 FAIL.
