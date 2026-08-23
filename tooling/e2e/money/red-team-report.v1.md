# REL-501 money / red-team report

```text
REL = REL-501
STATUS = COMPLETED
ISOLATION_GUARD = 1
PRODUCTION_DB_WRITE = 0
REAL_LEDGER_MUTATION = 0
MCP_ONLY_DONE = 0
MODES = idempotency,double_submit,insufficient,stale,expired,blocked,replay
GUARD_ABORT = 1
```

가드 실패 시 전면 중단. 실원장 write 0. production ref `mgsytcetsiecllmhcyox` 쓰기 0.

| mode | 제품 신호 | 기대 |
|---|---|---|
| idempotency | `IDEMPOTENCY_KEY_CONFLICT` · `reused: true` | same payload = reuse · conflict payload = 409 |
| double_submit | participate `reused: true` | 두 번째 제출 extra side-effect 0 |
| insufficient | `INSUFFICIENT_BALANCE` · `INSUFFICIENT_PRINCIPAL` | reject · mutation 0 |
| stale | `PRICE_STALE` · `PRICE_STALE_DATA` | reject · mutation 0 |
| expired | `OPPORTUNITY_EXPIRED` | reject · mutation 0 |
| blocked | `MATCH_BLOCKED` · `WITHDRAW_BLOCKED` · `WITHDRAW_APPLY_BLOCKED` | reject · mutation 0 |
| replay | outbox crash-safe replay · reuse | 재실행 second write 0 |

새 거절 코드를 창작하지 않는다. `DOUBLE_SUBMIT` / `REPLAY_REJECTED` 신설 0.
