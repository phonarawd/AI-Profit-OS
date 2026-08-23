# REL-501 금융/red-team 풀매트릭스

```text
REL = REL-501
TITLE = 금융/red-team 풀매트릭스
STATUS = COMPLETED
PLAN_LOCKED = TRUE
PROTECTED_SCOPE_MUTATION = FALSE
ISOLATION_GUARD = 1
PRODUCTION_DB_WRITE = 0
REAL_LEDGER_MUTATION = 0
MCP_ONLY_DONE = 0
MODES = 7
GUARD_ABORT = 1
```

돈 경로 실패 모드를 가드 안에서만 친다.

- 모드: idempotency · double_submit · insufficient · stale · expired · blocked · replay
- `runMoneyMutationTest` PASS 전 콜백 0
- production URL / 빈 타깃 = fail-closed
- 로컬 allowlist는 in-process 시뮬레이터만. 실원장 mutation 0
- 제품 거절 코드에 바인딩. 신설 코드 0
- Playwright MCP 클릭만으로는 DONE이 아니다

의존 재실행: `qa-env-isolation-guard` · `money-unavailable` · `idempotency-conflict-detection` · `user-ledger-query`.
REL-500은 플랜 COMPLETED 필수. REL-502 재인증을 이 슬라이스로 대체하지 않는다.
