# REL-502 FINAL ENGINE ACCEPTANCE

이 문서는 REL-004 sanity 와 별도다. REL-004 로 대체 금지.

```text
REL = REL-502
TITLE = FINAL ENGINE ACCEPTANCE
STATUS = ISSUED
CERT_ISSUED = 1
REL-004_SUBSTITUTE = 0
QA9_PREDECESSOR_VERDICT_AS_CURRENT = 0
PSM_REL_PENDING = 0
POST_PSM_PENDING = 3
PROTECTED_SCOPE_DRIFT = 0
REBASE_REQUIRED = 0
REBASE_APPLIED = 1
ACK_RECEIVED = 1
LOCAL_QA0_QA9_RERUN = 0
EVAL_DATASET_STATUS = MATCH
QA1_QA8_STATUS = COMPLETE_CURRENT_EPOCH
QA9_STATUS = COMPLETE_CURRENT_EPOCH
QA9_VERDICT = ENGINE_ACCEPTED_FOR_UI
DEFECTS_P0 = 0
DEFECTS_P1 = 0
CRITICAL_INVARIANT_BLOCKED = 0
NEXT = RC_FORMAL
BASELINE_ID = ea-baseline-74683b6e39a7-590263f0f273
PREDECESSOR_BASELINE_ID = ea-baseline-04ef3c7de4dd-2ff1760b7d72
REBASE_ID = ea-rebase-3c46ac2daaf9-590263f0f273
LIVE_AGGREGATE = 590263f0f273f214f14c8a8ad8489f79d21fbb0e71f71d480a94cbd026f82230
BASELINE_AGGREGATE = 590263f0f273f214f14c8a8ad8489f79d21fbb0e71f71d480a94cbd026f82230
PATH_COUNT_LIVE = 490
PATH_COUNT_BASELINE = 490
CHANGED_PATHS = 0
ADDED_PATHS = 0
MUTATED_PATHS = 0
MISSING_PATHS = 0
EXIT_GATE = recovery/release-provenance-20260831 @ 6aeecb8b23fbf1c8ecbbf4ecf1e858b59f3eadd8 · current-epoch QA0-QA9 COMPLETE · QA9 ENGINE_ACCEPTED_FOR_UI · FINAL_ACCEPTANCE ISSUED
```

## 판정

Human/PO는 `ACK APPROVED ENGINE_ACCEPTANCE_REBASE_V1`로
`3c46ac2daaf99d93d93f12c4e2085d51ccec564a`의 protected-scope drift를
predecessor baseline `ea-baseline-04ef3c7de4dd-2ff1760b7d72`에서 새 acceptance epoch로
formal rebase하는 것을 승인했다. 해당 ACK 원문은 `product-rebases.v1.json`에 보존되어 있다.

Formal rebase는 `ENGINE_ACCEPTANCE_REBASE_POLICY_V2`에 따라 적용되었고,
새 baseline은 `ea-baseline-74683b6e39a7-590263f0f273`,
rebase id는 `ea-rebase-3c46ac2daaf9-590263f0f273`이다.
Predecessor evidence/hash washing은 수행하지 않았으며 predecessor QA9 verdict는 history로만 유지한다.

Current epoch에서 QA0 → QA1~QA8 → QA9를 실제 GitHub Actions CI에서 재실행했다.
QA1~QA8은 모두 current baseline에서 `COMPLETE`이고,
QA9 역시 같은 baseline에서 `COMPLETE`이며 최종 verdict는
`ENGINE_ACCEPTED_FOR_UI` / `ALL_FORMULA_CONDITIONS_MET`이다.

QA9 formula 기준:
- mandatory QA1~QA8 complete = true
- critical invariant blocked / skipped / uncovered = 0 / 0 / 0
- defects P0 / P1 = 0 / 0
- baseline.valid = true
- acceptance_scope.unchanged = true
- evidence_integrity_valid = true

Live protected aggregate와 current baseline aggregate는 모두
`590263f0f273f214f14c8a8ad8489f79d21fbb0e71f71d480a94cbd026f82230`로 일치하며
current protected-scope drift는 0이다.

PSM=TRUE REL은 모두 COMPLETED이고 `PSM_REL_PENDING = 0`이다.
POST-001~003은 미래 변경 발생 시 다시 무효화할 수 있는 후속 트리거이며 현재 발급 차단 REL이 아니다.

따라서 `FINAL_ACCEPTANCE = ISSUED`이며 Engine acceptance 단계의 다음 상태는 `RC_FORMAL`이다.

Local fake QA0-QA9 PASS = 0.
REL-004 대체 = 0.
predecessor QA9 verdict current-authoritative 사용 = 0.
Product mutation을 green 추적에 사용하지 않았다.
이 인증은 Production migration apply 또는 Production deploy 승인을 의미하지 않는다.
