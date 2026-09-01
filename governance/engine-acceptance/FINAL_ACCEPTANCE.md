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
PROTECTED_SCOPE_DRIFT = 1
REBASE_REQUIRED = 1
REBASE_APPLIED = 0
ACK_RECEIVED = 0
LOCAL_QA0_QA9_RERUN = 0
EVAL_DATASET_STATUS = MATCH
QA1_QA8_STATUS = STALE_PENDING_REBASE
QA9_STATUS = STALE_PENDING_REBASE
QA9_VERDICT = NOT_CURRENT
DEFECTS_P0 = 0
DEFECTS_P1 = 0
CRITICAL_INVARIANT_BLOCKED = 0
NEXT = ENGINE_ACCEPTANCE_REBASE_V1
BASELINE_ID = ea-baseline-04ef3c7de4dd-2ff1760b7d72
PREDECESSOR_BASELINE_ID = ea-baseline-229e7777f9b0-2d4567b3a2c8
REBASE_ID = pending
LIVE_AGGREGATE = b296cd23f5f9cf1f60c631e13aad1324fd7eddfe85933c1ff9a9a2a16efea49e
BASELINE_AGGREGATE = 2ff1760b7d721205657991e1c775bf95fea4ae944dfb8e23a5b85de9813a36e8
PATH_COUNT_LIVE = 486
PATH_COUNT_BASELINE = 450
CHANGED_PATHS = 71
ADDED_PATHS = 36
MUTATED_PATHS = 35
MISSING_PATHS = 0
EXIT_GATE = recovery/release-provenance-20260831 @ 4b602748fdebc6ca49391804edccf4c564c0086c · ENGINE_ACCEPTANCE_REBASE_V1 ACK 후 QA0-QA9 재실행 전까지 ISSUED 금지
```

## 판정

recovery candidate `4b602748fdebc6ca49391804edccf4c564c0086c` 의 live protected-scope 는 baseline 과 다르다.
`LIVE_AGGREGATE = b296cd23f5f9cf1f60c631e13aad1324fd7eddfe85933c1ff9a9a2a16efea49e`
`PATH_COUNT_LIVE = 486` · `CHANGED_PATHS = 71` (added 36 · mutated 35 · missing 0).
live aggregate ≠ baseline → 이전 ISSUED 인증은 current-authoritative 가 아니다.
은폐 금지 · `STATUS = NOT_ISSUED` · `CERT_ISSUED = 0` · `PROTECTED_SCOPE_DRIFT = 1` · `REBASE_REQUIRED = 1`.
엔진 수락 workflow 는 HOLD_CONTROLLED_AMENDMENT · applied = 0.

변경 경로 집합은 `tooling/verify/lib/rel-502-psm.cjs` `compareProtectedScope()` 실측이다. 대표 추가: identity-proof.email / admin-session / withdraw-review / referral own-code / ux-prefs / health.public. 대표 변경: auth·wallet·admin-guard·ledger fingerprint.

재발급 조건: Human/PO `ENGINE_ACCEPTANCE_REBASE_V1` ACK → rebase apply → current-epoch QA1-QA8 COMPLETE → QA9 `ENGINE_ACCEPTED_FOR_UI` → 그때만 인증서 재발급(ISSUED).
Local fake QA0-QA9 PASS = 0.
predecessor QA9 verdict 는 history · `qa9_predecessor_verdict_as_current_authoritative = FORBIDDEN`.
Product mutation을 green 추적에 사용하지 않았다.
