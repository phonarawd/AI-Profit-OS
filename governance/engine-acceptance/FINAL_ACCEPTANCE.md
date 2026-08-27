# REL-502 FINAL ENGINE ACCEPTANCE

이 문서는 REL-004 sanity 와 별도다. REL-004 로 대체 금지.

```text
REL = REL-502
TITLE = FINAL ENGINE ACCEPTANCE
STATUS = NOT_ISSUED
CERT_ISSUED = 0
REL-004_SUBSTITUTE = 0
QA9_PREDECESSOR_VERDICT_AS_CURRENT = 0
PSM_REL_PENDING = 0
POST_PSM_PENDING = 3
PROTECTED_SCOPE_DRIFT = 0
REBASE_REQUIRED = 1
REBASE_APPLIED = 1
ACK_RECEIVED = 1
LOCAL_QA0_QA9_RERUN = 0
EVAL_DATASET_STATUS = MATCH
QA1_QA8_STATUS = STALE_PENDING_RERUN
QA9_STATUS = STALE_AGGREGATION_PENDING_DISCOVERY
QA9_VERDICT = ENGINE_QA_INCOMPLETE
DEFECTS_P0 = 0
DEFECTS_P1 = 0
CRITICAL_INVARIANT_BLOCKED = 0
NEXT = QA1_DETERMINISTIC_TRUTH
BASELINE_ID = ea-baseline-cc627efc3ee2-defdfa5b6ac4
PREDECESSOR_BASELINE_ID = ea-baseline-04ef3c7de4dd-2ff1760b7d72
REBASE_ID = ea-rebase-cc627efc3ee2-defdfa5b6ac4
LIVE_AGGREGATE = defdfa5b6ac45ce3ea03ee2f392b9f8c1a89f84ec5826dede5def6c08b479d23
BASELINE_AGGREGATE = defdfa5b6ac45ce3ea03ee2f392b9f8c1a89f84ec5826dede5def6c08b479d23
PATH_COUNT_LIVE = 452
PATH_COUNT_BASELINE = 452
CHANGED_PATHS = 0
ADDED_PATHS = 0
MUTATED_PATHS = 0
MISSING_PATHS = 0
EXIT_GATE = Auth + Wallet rebase applied. Current-epoch QA1-QA8 and QA9 aggregation remain required; predecessor ISSUED is not current.
```

## 판정

위임된 Founder/PO ACK `ENGINE_ACCEPTANCE_REBASE_V1` 수신 · apply 완료.
새 epoch `ea-baseline-cc627efc3ee2-defdfa5b6ac4` 가 Auth + Wallet live protected-scope 를 pin 한다.
predecessor `ea-baseline-04ef3c7de4dd-2ff1760b7d72` QA9 `ENGINE_ACCEPTED_FOR_UI` 는 history 이며 current-authoritative 가 아니다.
`qa9_predecessor_verdict_as_current_authoritative = FORBIDDEN`.

변경 경로 (9 · predecessor 대비 이력 · 현재 epoch pin 이후 CHANGED_PATHS = 0):
- services/api-nest/src/auth/auth.controller.ts
- services/api-nest/src/auth/auth.module.ts
- services/api-nest/src/auth/auth.service.ts
- services/api-nest/src/config/nest-provenance.ts
- services/api-nest/src/health.controller.ts
- services/api-nest/src/wallet/krw-deposit.service.ts
- services/api-nest/src/wallet/resend-email.provider.ts
- services/api-nest/src/wallet/wallet-idempotency.selftest.ts
- services/api-nest/src/wallet/withdraw-intent.service.ts

현재 epoch QA1-QA8 / QA9 를 완료하지 않았다. evidence-manifest = `ENGINE_QA_INCOMPLETE`.
재발급 조건: current-epoch QA1-QA8 COMPLETE → QA9 `ENGINE_ACCEPTED_FOR_UI` → 그때만 인증서 재발급(ISSUED).
Local fake QA0-QA9 PASS = 0.
predecessor QA9 verdict 는 history · `qa9_predecessor_verdict_as_current_authoritative = FORBIDDEN`.
Product mutation을 green 추적에 사용하지 않았다.
