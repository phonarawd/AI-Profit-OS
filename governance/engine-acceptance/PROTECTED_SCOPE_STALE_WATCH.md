# Protected-scope STALE watch (REL-503)

```text
REL = REL-503
TITLE = protected-scope STALE 감시 상시화
STATUS = COMPLETED
PLAN_LOCKED = TRUE
PROTECTED_SCOPE_MUTATION = FALSE
CONCEALMENT = FORBIDDEN
SIMULATED_ONE_FILE_CHANGE = STALE
LIVE_PRODUCT_MUTATION = 0
```

ISSUED `FINAL_ACCEPTANCE.md` 이후 live protected-scope hash 가 current baseline 과 다르면 인증은 자동으로 STALE 이다. 은폐 금지.

## 감시

- 스크립트: `tooling/engine-acceptance/protected-scope-watch.cjs`
- 대조: live `protected-scope.v1.json` 해시 ↔ `baseline.v1.json` pin
- ISSUED + drift = `watch_status=STALE` · next = `REL-502_REBASE` · CI FAIL
- ISSUED + drift 0 = `CURRENT`
- 의도적 1파일 변경 증명은 메모리 overlay 만 (테스트 브랜치 / 제품 파일 미기록)

## 재인증 절차

1. watch 가 STALE 을 내면 현재 ISSUED 를 current-authoritative 로 쓰지 않는다.
2. 변경이 protected product 이면 `ENGINE_ACCEPTANCE_REBASE_V1` ACK 후 rebase apply.
3. 현재 epoch 로 QA1-QA8 재실행 · QA9 재집계.
4. L1 공식이 `ENGINE_ACCEPTED_FOR_UI` 일 때만 인증서를 다시 발급한다.
5. 해시/결함/BLOCKED 를 지워서 STALE 을 숨기지 않는다.

POST-001 · POST-002 · POST-003 이 이후 실행되어 protected 가 바뀌면 이 감시가 STALE 을 만든다.
