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
BASELINE_ID = ea-baseline-0d8825e8f333-5ac0f4291966
PREDECESSOR_BASELINE_ID = ea-baseline-74683b6e39a7-590263f0f273
REBASE_ID = pending
LIVE_AGGREGATE = 7b46b6b27a89d0c36f3c9cf4acdcd545da93eae938602af83c3c86510773a4a1
BASELINE_AGGREGATE = 5ac0f4291966300b4e547c91aa1af172fb20b108f5d45f8612bd9b8f970c65a9
PATH_COUNT_LIVE = 491
PATH_COUNT_BASELINE = 491
CHANGED_PATHS = 1
ADDED_PATHS = 0
MUTATED_PATHS = 1
MISSING_PATHS = 0
EXIT_GATE = D1-S1E (2026-09-05) · services/api-nest/clock.core.cjs \b-anchor 보안수정(commit a1d5c151, CodeQL 51/52) 이 REBASE 없이 protected-scope 를 변경 · ENGINE_ACCEPTANCE_REBASE_V1 ACK 후 current-epoch QA0-QA9 재실행 전까지 ISSUED 금지
```

## 판정 (D1-S1E 정정, 2026-09-05, append 성격의 사실 정정)

**이전 기재(STATUS=ISSUED · PROTECTED_SCOPE_DRIFT=0)는 STALE이었다.** `ea-baseline-0d8825e8f333-5ac0f4291966`
rebase(2026-09-02) 이후, 같은 D1 감사 라인리지의 커밋 `a1d5c151`(CodeQL js/regex/missing-regexp-anchor
알림 51/52 수정 — `services/api-nest/clock.core.cjs`의 `DB_URL_DENY` 정규식에 `\b` 경계 추가)이
protected-scope root `services/api-nest`를 다시 변경했다. 이 사실은 D1-S1D 세션이 이미
`tooling/engine-acceptance/protected-scope-watch.cjs` 실행으로 발견해 기록했으나(`correctionEvent_D1S1D_02_codeqlProgressAndNewDefect`),
이 인증서 문서 자체는 정정되지 않은 채 `STATUS=ISSUED`로 남아 있었다. 이번 교정은 그 모순을
`git-safety.mdc`/본 태스크의 fail-closed 원칙에 따라 해소한다: hash를 몰래 맞추거나 rebase를
위조하지 않고, **문서가 스스로의 진짜 상태(NOT_ISSUED)를 다시 말하게** 만든다.

Human/PO 승인 ACK는 `product-rebases.v1.json`에 원문 그대로 보존되어 있으며,
그 마지막 승인된 product commit `ec3c9604d2ab7bb40338e45131a052f9b058b2c3`의 protected-scope 변경은
predecessor baseline `ea-baseline-74683b6e39a7-590263f0f273`에서
current baseline `ea-baseline-0d8825e8f333-5ac0f4291966`로 formal rebase되었다. **이 부분은 history로
보존되며 지우지 않는다.** 다만 그 baseline은 `a1d5c151` 이후 더 이상 live 상태와 일치하지 않는다.

live protected aggregate `7b46b6b27a89d0c36f3c9cf4acdcd545da93eae938602af83c3c86510773a4a1`는
baseline aggregate `5ac0f4291966300b4e547c91aa1af172fb20b108f5d45f8612bd9b8f970c65a9`와 다르다
(변경 경로 1개, 추가 0 · 변경 1 · 누락 0):

변경 경로 (1):
- services/api-nest/clock.core.cjs

이 변경은 `DB_URL_DENY` 정규식에 단어 경계(`\b`)를 추가한 CodeQL 보안 수정이며,
`tooling/verify/regression/clock-core-db-url-deny.regression.cjs`와 `verify:domain-clock`(35개 체크)으로
독립 검증되었다. 하지만 protected-scope 정책은 변경의 **크기**가 아니라 **root 자체 변경 여부**로
drift를 판정하므로, 이 1-line 수정도 formal `ENGINE_ACCEPTANCE_REBASE_V1` ACK + current-epoch
QA0-QA9 재실행 없이는 인증을 current-authoritative로 유지할 수 없다.

은폐 금지 · `STATUS = NOT_ISSUED` · `CERT_ISSUED = 0` · `PROTECTED_SCOPE_DRIFT = 1` · `REBASE_REQUIRED = 1`.

재발급 조건: Human/PO `ENGINE_ACCEPTANCE_REBASE_V1` ACK → rebase apply → current-epoch
QA1-QA8 COMPLETE(QA7은 실제 GitHub Actions run evidence 필요) → QA9 `ENGINE_ACCEPTED_FOR_UI` →
그때만 인증서 재발급(ISSUED). 이 세션은 그 ACK를 대리 작성하지 않았고, QA0-QA9를 로컬에서
가짜로 재실행하지 않았으며, baseline/aggregate 숫자를 발급 조건에 맞춰 역산하지 않았다 — 위
LIVE_AGGREGATE 값은 현재 HEAD에서 `governance/engine-acceptance/protected-scope.v1.json` 정의를
그대로 재계산한 실측값이다 (evidence: `_audit-d0-20260904/session-1e-correction/logs/d1s1e-rel502-diagnosis.log`).

Local fake QA0-QA9 PASS = 0. REL-004 대체 = 0.
Predecessor QA9 verdict current-authoritative 사용 = 0.
Product mutation을 green 추적에 사용하지 않았다.
이 인증은 Production migration apply, Production deploy, secret rotation 또는 Production 운영 변경 승인을 의미하지 않는다.

별도 사실: 이 세션은 `.cursor/plans/PUTDUK_RELEASE_MASTER.plan.md`의 REL-502 plan 항목 STATUS는
편집하지 않았다(현재도 `COMPLETED`로 기재되어 있다 — `tooling/verify/lib/rel-502-psm.cjs`의
`plan502Done=true`). 그 결과 `verify:rel-502-final-engine-acceptance`는 이 정정 이후에도
"REL-502 cannot be COMPLETED until current-epoch QA0-QA9 PASS" 사유로 계속 FAIL한다 — 이것은
이 정정이 만들어낸 새 결함이 아니라, 이미 있던 진짜 drift가 이제 정확히 하나의 원인으로 드러난
것이다. plan의 REL-502 STATUS를 되돌릴지는 release-phase 권한을 가진 Founder/PO의 결정이며,
이 세션은 그 결정을 대신하지 않는다.
