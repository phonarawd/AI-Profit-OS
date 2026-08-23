# Admin Match Control (REL-223)

STATUS: LOCKED
LOCKED_VERBS = 5
INVENTED_VERBS = 0
SERVER_ENFORCE = 1
SIDEBAR_13 = 0
LEDGER_EDIT_VERBS = 0
PRODUCTION_DB_APPLY = 0
HOME_GEOMETRY_DIFF = 0

3-mode는 REL-222 서버 플래그를 재사용한다.

| Verb | 의미 |
|---|---|
| `ALLOW` | 해당 매칭/대량을 허용 |
| `BLOCK` | 차단 |
| `PAUSE` | 일시 정지 |
| `CANCEL` | 취소 |
| `REASSIGN` | 다른 대상에 재배정 (target uuid 필수) |

Kinds: `match` · `bulk` · `schedule` · `campaign`.
`bulk` / `schedule` / `campaign` 은 preview `impactCount >= 1` 없이 LIVE apply 불가.

금지 동사: `CREDIT` · `DEBIT` · `ADJUST` · `BALANCE_PATCH` · `LEDGER_EDIT` · `FORCE_SETTLE` · `WALLET_TOPUP`.

## EXIT_GATE

- 미허용 동사 통과 = FAIL
- preview 없는 LIVE apply = FAIL
- 숨은 잔액 수정 API = FAIL
- `ledger_*` write = FAIL
- 사이드바 13번째 = FAIL
- capability 창작 0. `read("all")` / `write("all")` only
