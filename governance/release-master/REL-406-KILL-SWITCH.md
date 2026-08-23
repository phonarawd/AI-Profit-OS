# REL-406 KILL SWITCH 9 EVIDENCE

```text
REL = REL-406
TITLE = Kill Switch 9종
STATUS = COMPLETED
PLAN_LOCKED = TRUE
PROTECTED_SCOPE_MUTATION = TRUE
LOCKED_SWITCHES = 9
INVENTED_SWITCHES = 0
SERVER_ENFORCE = 1
PRODUCTION_DB_APPLY = 0
HOME_GEOMETRY_DIFF = 0
```

## IMPLEMENTATION

- 9종 상수: `schemas/admin-kill-switch.v1.json` + `admin-kill-switch.core.cjs`
- 서버 강제: opportunity / matching / withdraw / deposit / merge / push / growth / referral
- wrap: `money_circuit` · `push_control` · `referral_program_config` (두 번째 회로 0)
- GROWTH_PAUSE ON만 growth를 끈다. OFF가 Growth 게이트를 우회하지 않는다
- audit: 토글 `result=applied` · deny는 REL-405 AdminGuard
- migration file-only: `20260823170000_admin_kill_switches.sql` (REL-701-DB apply)
- UI owner = REL-213 `/admin/system-control`

## VERIFY

| command | result |
|---|---|
| `node tooling/verify/rel-406-kill-switch.cjs` | PASS (9 ids · path enforce · audit · server guard) |

## ACCEPTANCE

9종 서버 강제. 스위치 ON이면 해당 경로 block.

## EXIT_GATE

UI 토글만 있고 서버 무시되면 FAIL — core evaluate + Nest assertPath/isBlocked 가 있다.
