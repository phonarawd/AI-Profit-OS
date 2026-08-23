# Admin Kill Switch 9 (REL-406)

STATUS: LOCKED
LOCKED_SWITCHES = 9
INVENTED_SWITCHES = 0
SERVER_ENFORCE = 1
UI_OWNER = REL-213
PRODUCTION_DB_APPLY = 0
HOME_GEOMETRY_DIFF = 0

9종은 코드 상수다. REL-400이 예약한 `GLOBAL_OPPORTUNITY_PAUSE` + Admin §9.5.5
도메인(participate/withdraw/deposit/all) + 기존 wrap 4종.

| id | path | wrap |
|---|---|---|
| `GLOBAL_OPPORTUNITY_PAUSE` | opportunity · matching | new |
| `GLOBAL_MATCHING_PAUSE` | matching | new |
| `GLOBAL_WITHDRAW_PAUSE` | withdraw | new |
| `GLOBAL_DEPOSIT_PAUSE` | deposit | new |
| `GLOBAL_ALL_PAUSE` | all paths | new |
| `MONEY_CIRCUIT` | withdraw · merge · matching | `money_circuit.open` |
| `PUSH_KILL` | push | `push_enabled === false` |
| `GROWTH_PAUSE` | growth | kill table SoT · ON만 `growth_control` 을 끈다 |
| `REFERRAL_ACCRUAL_HALT` | referral_accrual | `accrual_halted` |

## EXIT_GATE

UI 토글만 있고 서버가 무시하면 FAIL. `admin-kill-switch.core.cjs` `evaluatePath`
가 engaged=true 일 때 해당 유저 경로를 block 해야 한다.

## Rules

- 10번째 ID 창작 금지
- 두 번째 `money_circuit` 테이블 금지
- 토글 reason ≥ 10 · audit `applied`
- 유저 JWT → admin 200 금지
- production apply = REL-701-DB
