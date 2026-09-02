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
BASELINE_ID = ea-baseline-0d8825e8f333-5ac0f4291966
PREDECESSOR_BASELINE_ID = ea-baseline-74683b6e39a7-590263f0f273
REBASE_ID = ea-rebase-ec3c9604d2ab-5ac0f4291966
LIVE_AGGREGATE = 5ac0f4291966300b4e547c91aa1af172fb20b108f5d45f8612bd9b8f970c65a9
BASELINE_AGGREGATE = 5ac0f4291966300b4e547c91aa1af172fb20b108f5d45f8612bd9b8f970c65a9
PATH_COUNT_LIVE = 491
PATH_COUNT_BASELINE = 491
CHANGED_PATHS = 0
ADDED_PATHS = 0
MUTATED_PATHS = 0
MISSING_PATHS = 0
EXIT_GATE = recovery/release-provenance-20260831 @ b2c4755d6e3f56b4f44f198e595acf86086210c9 · current-epoch QA0-QA9 COMPLETE · QA9 ENGINE_ACCEPTED_FOR_UI · FINAL_ACCEPTANCE ISSUED
```

## 판정

Human/PO 승인 ACK는 `product-rebases.v1.json`에 원문 그대로 보존되어 있으며,
승인된 product commit `ec3c9604d2ab7bb40338e45131a052f9b058b2c3`의 protected-scope 변경은
predecessor baseline `ea-baseline-74683b6e39a7-590263f0f273`에서
current baseline `ea-baseline-0d8825e8f333-5ac0f4291966`로 formal rebase되었다.

Formal rebase는 `ENGINE_ACCEPTANCE_REBASE_POLICY_V2`에 따라 적용되었고,
rebase id는 `ea-rebase-ec3c9604d2ab-5ac0f4291966`이다. Predecessor evidence/hash washing은 수행하지 않았으며
predecessor QA9 verdict는 history로만 유지한다.

Current epoch의 QA1~QA8은 모두 같은 baseline에서 `COMPLETE`이고,
formal QA7은 GitHub Actions run `33663761106`의 실제 Actions evidence를 사용했다.
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
`5ac0f4291966300b4e547c91aa1af172fb20b108f5d45f8612bd9b8f970c65a9`로 일치하며 current protected-scope drift는 0이다.

PSM=TRUE REL pending은 0건이다. POST-001~003 계열 후속 트리거는
미래 변경 시 다시 무효화할 수 있는 후속 상태이며 current Engine acceptance 발급 차단 REL이 아니다.

따라서 `FINAL_ACCEPTANCE = ISSUED`이며 Engine acceptance 단계의 다음 상태는 `RC_FORMAL`이다.

Local fake QA0-QA9 PASS = 0. REL-004 대체 = 0.
Predecessor QA9 verdict current-authoritative 사용 = 0.
Product mutation을 green 추적에 사용하지 않았다.
이 인증은 Production migration apply, Production deploy, secret rotation 또는 Production 운영 변경 승인을 의미하지 않는다.
