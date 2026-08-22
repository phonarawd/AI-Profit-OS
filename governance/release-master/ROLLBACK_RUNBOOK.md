# Rollback runbook baseline — REL-408

연습 실행 = REL-602 (staging). production rollback 연습 아님.

## Known-good

- 브랜치 `rel/auth-track-a-integration` 의 직전 green commit
- Admin control-plane 코드 롤백: 해당 커밋 revert
- DB: 이 배치의 migration은 **미적용**. revert 시 원격 스키마 변경 0

## 절차 (staging 연습 · REL-602)

1. 트래픽을 known-good 워커로 되돌린다
2. 앱 배포만 롤백한다 (DB apply 없음)
3. Admin kill-switch / ops mode 메모리는 프로세스 재시작으로 초기화된다
4. money_circuit / push / growth 는 기존 owner 화면에서 확인한다

## 금지

- production apply_migration
- ledger / balance UPDATE로 복구
- 인증 약화
