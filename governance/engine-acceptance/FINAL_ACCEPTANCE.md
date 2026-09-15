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
ACK_RECEIVED = 0
LOCAL_QA0_QA9_RERUN = 0
EVAL_DATASET_STATUS = MATCH
QA1_QA8_STATUS = STALE_PENDING_RERUN
QA9_STATUS = STALE_AGGREGATION
QA9_VERDICT = NOT_CURRENT
DEFECTS_P0 = 0
DEFECTS_P1 = 0
CRITICAL_INVARIANT_BLOCKED = 0
NEXT = QA1_DETERMINISTIC_TRUTH
BASELINE_ID = ea-baseline-35ec80eeb89d-77e54a036c46
PREDECESSOR_BASELINE_ID = ea-baseline-f295d67f1c3c-c2a6ea416128
REBASE_ID = ea-rebase-35ec80eeb89d-77e54a036c46
LIVE_AGGREGATE = 77e54a036c46db905040d6254fe8838bac1690e71d2cd3e5eeb8eca5e22a72a3
BASELINE_AGGREGATE = 77e54a036c46db905040d6254fe8838bac1690e71d2cd3e5eeb8eca5e22a72a3
PATH_COUNT_LIVE = 559
PATH_COUNT_BASELINE = 559
CHANGED_PATHS = 0
ADDED_PATHS = 0
MUTATED_PATHS = 0
MISSING_PATHS = 0
EXIT_GATE = ENGINE_ACCEPTANCE_REBASE_V1 apply @ 35ec80eeb89d4727db3544854a1f840109f4bdbb · ledger 4d2755b2b098ce9fd12b6c0dcd54dd9a9130fce9 · current-epoch QA1-QA9 pending · FINAL_ACCEPTANCE NOT_ISSUED
```

## 판정

Human/PO 승인 ACK는 `product-rebases.v1.json`에 원문 그대로 보존되어 있다:
`ACK APPROVED ENGINE_ACCEPTANCE_REBASE_V1: product SHA 35ec80eeb89d4727db3544854a1f840109f4bdbb; predecessor ea-baseline-f295d67f1c3c-c2a6ea416128; do not laundry old QA9 / ISSUED; not merge; not deploy; live mall tables exist ≠ schema QA-OK.`

공식 경로 `rebase-acceptance-baseline.cjs --apply`가 predecessor
`ea-baseline-f295d67f1c3c-c2a6ea416128`에서 current
`ea-baseline-35ec80eeb89d-77e54a036c46`로 새 epoch를 만들었다.
rebase id는 `ea-rebase-35ec80eeb89d-77e54a036c46`이다.
Predecessor evidence/hash washing은 수행하지 않았으며 predecessor QA9 verdict는 history로만 유지한다.

Current epoch QA1~QA8은 `STALE_PENDING_RERUN`이고 QA9는 `STALE_AGGREGATION`이다.
로컬 QA0-QA9 재실행 = 0. 발급 ACK(`ACK_RECEIVED`) = 0.

Live protected aggregate와 current baseline aggregate는 모두
`77e54a036c46db905040d6254fe8838bac1690e71d2cd3e5eeb8eca5e22a72a3`로 일치하며 current protected-scope drift는 0이다.

따라서 `FINAL_ACCEPTANCE = NOT_ISSUED`이며 다음 상태는 `QA1_DETERMINISTIC_TRUTH`이다.

Local fake QA0-QA9 PASS = 0. REL-004 대체 = 0.
Predecessor QA9 verdict current-authoritative 사용 = 0.
이 인증은 Production migration apply, Production deploy, secret rotation 또는 Production 운영 변경 승인을 의미하지 않는다.
